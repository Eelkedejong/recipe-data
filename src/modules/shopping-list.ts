import prisma from '../db';
import { mergeQuantities, formatQuantity } from './units';

/**
 * Builds a shopping list from the recipes on it.
 *
 * Three things happen per ingredient, in order:
 *
 *   1. amounts are scaled to the number of people the list asks for
 *   2. amounts that can be converted are summed; the rest stay on their own
 *      lines (see units.ts - guessing is the failure mode we avoid)
 *   3. ingredients are grouped into supermarket aisles, in walking order
 *
 * Rows not linked to the catalog are kept and grouped under "Overig". They
 * cannot merge with anything, because nothing says two hand-typed strings
 * mean the same thing - but leaving them out would silently lose them.
 */

export interface GeneratedItem {
  /**
   * Stable identity for this line across rebuilds. Catalog-linked rows key on
   * the ingredient id, unlinked ones on their text - which is the best that
   * can be done when nothing says two typed strings mean the same thing.
   */
  key: string;
  ingredientId: string | null;
  /** Display name, pluralised when the total calls for it. */
  name: string;
  /** Formatted amounts. More than one when they could not be summed. */
  quantities: string[];
  /** Which recipes contributed, so the UI can explain a line. */
  recipeIds: number[];
}

export interface GeneratedGroup {
  categorySlug: string;
  categoryName: string;
  sortOrder: number;
  items: GeneratedItem[];
}

/**
 * Bumped whenever the generated shape changes. A stored list from an older
 * version is rebuilt rather than rendered, which is what stops a cache
 * written before a field existed from being served without it.
 */
export const GENERATED_VERSION = 2;

export interface GeneratedList {
  version: number;
  generatedAt: string;
  groups: GeneratedGroup[];
  /** Rows with no catalog link, counted so the UI can nudge an admin. */
  unlinkedCount: number;
}

/** Where ingredients with no category end up. */
const FALLBACK_CATEGORY = {
  slug: 'other',
  nameNl: 'Overig',
  sortOrder: 1000,
};

interface RecipeRow {
  ingredientId?: unknown;
  name?: unknown;
  ingredient?: unknown;
  amount?: unknown;
  unit?: unknown;
}

/** Groups by catalog id, falling back to the typed text for unlinked rows. */
const keyFor = (row: RecipeRow, name: string): string =>
  typeof row.ingredientId === 'string' && row.ingredientId
    ? `id:${row.ingredientId}`
    : `text:${name.toLowerCase()}`;

export const generateShoppingList = async (userId: string): Promise<GeneratedList> => {
  const list = await prisma.shoppingList.findFirst({
    where: { belongsToId: userId },
    select: { recipes: true },
  });

  // Existing lists contain entries with no id - {"persons":3} and the like -
  // so anything without a usable one is dropped rather than passed to Prisma,
  // which rejects undefined inside an `in` array.
  const entries = (Array.isArray(list?.recipes) ? (list!.recipes as unknown[]) : [])
    .filter(
      (entry): entry is { id: number; persons?: number; excludedRows?: unknown } =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === 'number',
    );

  if (entries.length === 0) {
    return {
      version: GENERATED_VERSION,
      generatedAt: new Date().toISOString(),
      groups: [],
      unlinkedCount: 0,
    };
  }

  const recipes = await prisma.recipe.findMany({
    where: { id: { in: entries.map((entry) => entry.id) } },
    select: { id: true, persons: true, ingredients: true },
  });

  const catalog = await prisma.ingredient.findMany({
    select: {
      id: true,
      nameNl: true,
      nameNlPlural: true,
      category: { select: { slug: true, nameNl: true, sortOrder: true } },
    },
  });
  const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));

  interface Bucket {
    key: string;
    ingredientId: string | null;
    name: string;
    plural: string | null;
    category: { slug: string; nameNl: string; sortOrder: number };
    inputs: { amount: unknown; unit: string }[];
    recipeIds: Set<number>;
  }

  const buckets = new Map<string, Bucket>();
  let unlinkedCount = 0;

  for (const recipe of recipes) {
    if (!Array.isArray(recipe.ingredients)) continue;

    const wanted = entries.find((entry) => entry.id === recipe.id)?.persons;
    // Scaling only applies when both numbers are usable; otherwise the recipe
    // is taken as written rather than multiplied by a guess.
    const scale =
      wanted && recipe.persons && recipe.persons > 0 ? wanted / recipe.persons : 1;

    // Rows the user unchecked for this recipe, either on the detail page when
    // adding it or afterwards on the shopping list.
    const entry = entries.find((candidate) => candidate.id === recipe.id);
    const excluded = new Set(
      Array.isArray(entry?.excludedRows) ? (entry!.excludedRows as unknown[]) : [],
    );

    for (const row of recipe.ingredients as RecipeRow[]) {
      if (excluded.has((row as { id?: unknown }).id)) continue;

      const typed =
        (typeof row.name === 'string' && row.name) ||
        (typeof row.ingredient === 'string' && row.ingredient) ||
        '';
      if (!typed) continue;

      const linked =
        typeof row.ingredientId === 'string' ? byId.get(row.ingredientId) : undefined;
      if (!linked) unlinkedCount += 1;

      const key = keyFor(row, typed);
      let bucket = buckets.get(key);

      if (!bucket) {
        bucket = {
          key,
          ingredientId: linked?.id ?? null,
          name: linked?.nameNl ?? typed,
          plural: linked?.nameNlPlural ?? null,
          category: linked?.category ?? FALLBACK_CATEGORY,
          inputs: [],
          recipeIds: new Set(),
        };
        buckets.set(key, bucket);
      }

      const amount =
        typeof row.amount === 'number'
          ? row.amount * scale
          : typeof row.amount === 'string' && row.amount.trim() !== ''
            ? Number(row.amount.replace(',', '.')) * scale
            : row.amount;

      bucket.inputs.push({
        amount,
        unit: typeof row.unit === 'string' ? row.unit : '',
      });
      bucket.recipeIds.add(recipe.id);
    }
  }

  const groups = new Map<string, GeneratedGroup>();

  for (const bucket of buckets.values()) {
    const { merged, separate } = mergeQuantities(bucket.inputs);

    const quantities = [
      ...merged.map((entry) => formatQuantity(entry.amount, entry.unit)),
      // Amounts that could not be converted keep exactly what was written.
      ...separate.map((entry) =>
        [entry.amount, entry.unit].filter((part) => part !== '' && part != null).join(' ').trim(),
      ),
    ].filter(Boolean);

    // A total above one takes the plural, when the catalog records one.
    const total = merged.reduce((sum, entry) => sum + entry.amount, 0);
    const name = total > 1 && bucket.plural ? bucket.plural : bucket.name;

    const group = groups.get(bucket.category.slug) ?? {
      categorySlug: bucket.category.slug,
      categoryName: bucket.category.nameNl,
      sortOrder: bucket.category.sortOrder,
      items: [],
    };

    group.items.push({
      key: bucket.key,
      ingredientId: bucket.ingredientId,
      name,
      quantities,
      recipeIds: [...bucket.recipeIds].sort((a, b) => a - b),
    });

    groups.set(bucket.category.slug, group);
  }

  const ordered = [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  ordered.forEach((group) => group.items.sort((a, b) => a.name.localeCompare(b.name)));

  return {
    version: GENERATED_VERSION,
    generatedAt: new Date().toISOString(),
    groups: ordered,
    unlinkedCount,
  };
};

/**
 * The lists currently holding a given recipe.
 *
 * Every list is looked at rather than just the recipe owner's: a public recipe
 * can sit on someone else's list, and that list has the same stale cache.
 */
const listsHolding = async (recipeId: number) => {
  const lists = await prisma.shoppingList.findMany({
    select: { id: true, belongsToId: true, recipes: true },
  });

  return lists.filter((list) =>
    (Array.isArray(list.recipes) ? (list.recipes as { id?: unknown }[]) : []).some(
      (entry) => entry?.id === recipeId,
    ),
  );
};

/**
 * Rebuilds every list holding this recipe. Called when the recipe changes.
 *
 * The generated lines are a cache rebuilt only when a list's own recipes
 * change, so without this an edit to a recipe - a renamed ingredient, a
 * different amount, a changed serving count - never reaches the grocery list
 * of anyone who already had it.
 */
export const refreshListsContaining = async (recipeId: number): Promise<number> => {
  const holding = await listsHolding(recipeId);

  for (const list of holding) {
    await refreshShoppingList(list.belongsToId);
  }

  return holding.length;
};

/**
 * Takes a deleted recipe off every shopping list that still references it.
 *
 * The lists keep recipe ids inside a Json column, so nothing cascades when a
 * recipe is deleted, and its ingredients would otherwise sit on somebody's
 * grocery list for good.
 */
export const removeRecipeFromLists = async (recipeId: number): Promise<number> => {
  const holding = await listsHolding(recipeId);

  for (const list of holding) {
    const entries = Array.isArray(list.recipes) ? (list.recipes as { id?: unknown }[]) : [];

    await prisma.shoppingList.update({
      where: { id: list.id },
      data: { recipes: { set: entries.filter((entry) => entry?.id !== recipeId) as never } },
    });

    await refreshShoppingList(list.belongsToId);
  }

  return holding.length;
};

/** Regenerates and stores the list. Called whenever its recipes change. */
export const refreshShoppingList = async (userId: string): Promise<GeneratedList> => {
  const generated = await generateShoppingList(userId);

  await prisma.shoppingList.updateMany({
    where: { belongsToId: userId },
    data: { generatedItems: generated as never },
  });

  return generated;
};


/**
 * Shopping-time edits. Deliberately separate from the generated list, which
 * is thrown away and rebuilt whenever the recipes change.
 */
export interface ListState {
  /** Ticked off in the shop, keyed by GeneratedItem.key. Hidden by default,
   *  but revealable - ticking is not deleting. */
  ticked: Record<string, boolean>;
  /** Added by hand, each sitting in a chosen aisle rather than a bucket of its own. */
  extras: {
    id: string;
    name: string;
    categorySlug: string | null;
    ticked?: boolean;
  }[];
}

const EMPTY_STATE: ListState = { ticked: {}, extras: [] };

export interface ViewItem extends GeneratedItem {
  ticked: boolean;
  /** True for a hand-added item, which has no recipe behind it. */
  manual: boolean;
}

export interface ViewGroup {
  categorySlug: string;
  categoryName: string;
  sortOrder: number;
  items: ViewItem[];
}

/**
 * The list as it should be rendered: generated lines merged with the edits
 * made on top of them, and hand-added items sitting in the aisle they were
 * put in rather than collected at the end.
 */
export const buildListView = async (
  userId: string,
): Promise<{
  groups: ViewGroup[];
  unlinkedCount: number;
  generatedAt: string;
  /** Returned so an edit can be sent back whole; removed lines are not in
   *  `groups`, so the client could not reconstruct it otherwise. */
  state: ListState;
  /** How many lines are ticked off, so the in-store view can offer to show them. */
  tickedCount: number;
}> => {
  const list = await prisma.shoppingList.findFirst({
    where: { belongsToId: userId },
    select: { generatedItems: true, listState: true },
  });

  const stored = list?.generatedItems as unknown as GeneratedList | null;
  const generated =
    stored && stored.version === GENERATED_VERSION
      ? stored
      : await refreshShoppingList(userId);
  const state = {
    ...EMPTY_STATE,
    ...((list?.listState as unknown as ListState | null) ?? {}),
  };

  const categories = await prisma.ingredientCategory.findMany({
    select: { slug: true, nameNl: true, sortOrder: true },
  });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  const groups = new Map<string, ViewGroup>();

  for (const group of generated.groups) {
    // Everything is returned, ticked or not: the in-store view hides ticked
    // lines itself and can reveal them again without another request.
    const items = group.items.map((item) => ({
      ...item,
      ticked: Boolean(state.ticked[item.key]),
      manual: false,
    }));

    if (items.length) {
      groups.set(group.categorySlug, { ...group, items });
    }
  }

  for (const extra of state.extras) {
    const slug = extra.categorySlug ?? 'other';
    const category = categoryBySlug.get(slug) ?? {
      slug,
      nameNl: FALLBACK_CATEGORY.nameNl,
      sortOrder: FALLBACK_CATEGORY.sortOrder,
    };

    const group = groups.get(slug) ?? {
      categorySlug: slug,
      categoryName: category.nameNl,
      sortOrder: category.sortOrder,
      items: [],
    };

    group.items.push({
      key: `extra:${extra.id}`,
      ingredientId: null,
      name: extra.name,
      quantities: [],
      recipeIds: [],
      ticked: Boolean(extra.ticked),
      manual: true,
    });

    groups.set(slug, group);
  }

  const ordered = [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  ordered.forEach((group) => group.items.sort((a, b) => a.name.localeCompare(b.name)));

  const tickedCount = [...generated.groups.flatMap((group) => group.items)].filter(
    (item) => state.ticked[item.key],
  ).length + state.extras.filter((extra) => extra.ticked).length;

  return {
    groups: ordered,
    unlinkedCount: generated.unlinkedCount,
    generatedAt: generated.generatedAt,
    state,
    tickedCount,
  };
};
