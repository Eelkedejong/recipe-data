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

export interface GeneratedList {
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
      (entry): entry is { id: number; persons?: number } =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === 'number',
    );

  if (entries.length === 0) {
    return { generatedAt: new Date().toISOString(), groups: [], unlinkedCount: 0 };
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

    for (const row of recipe.ingredients as RecipeRow[]) {
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
    generatedAt: new Date().toISOString(),
    groups: ordered,
    unlinkedCount,
  };
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
