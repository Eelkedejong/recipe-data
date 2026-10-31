import defaultPrisma from '../db';

/**
 * The client to work through. Defaults to the application's own, but a script
 * targeting another database must pass its client: these functions used to
 * reach for the singleton regardless, so a script pointed at production wrote
 * its index rows to whatever DATABASE_URL happened to name instead.
 */
type Db = typeof defaultPrisma;

/**
 * Keeps the RecipeIngredient index and a recipe's diet flags in step with its
 * ingredients.
 *
 * The index is derived from Recipe.ingredients and exists only so recipes can
 * be filtered by ingredient without querying a JSON column. It is rebuildable
 * at any time, which is why a drift bug here is never worse than running the
 * rebuild script.
 */

interface RecipeRow {
  ingredientId?: unknown;
}

/** The catalog ids a recipe's rows point at, deduplicated. */
const linkedIds = (ingredients: unknown): string[] => {
  if (!Array.isArray(ingredients)) return [];

  return [
    ...new Set(
      (ingredients as RecipeRow[])
        .map((row) => row?.ingredientId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
};

/**
 * Rewrites the index rows for one recipe.
 *
 * Ids pointing at ingredients that no longer exist are skipped rather than
 * failing the write: a recipe keeps working when a catalog entry is deleted,
 * and the row's stored name carries the display text anyway.
 */
export const syncRecipeIngredients = async (
  recipeId: number,
  ingredients: unknown,
  prisma: Db = defaultPrisma,
): Promise<void> => {
  const ids = linkedIds(ingredients);

  const known = ids.length
    ? (
        await prisma.ingredient.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        })
      ).map((ingredient) => ingredient.id)
    : [];

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.recipeIngredient.createMany({
      data: known.map((ingredientId) => ({ recipeId, ingredientId })),
      skipDuplicates: true,
    }),
  ]);
};

export interface DietFlags {
  isVegetarian: boolean;
  isVegan: boolean;
  /** False when something could not be judged, so the flags were left alone. */
  derived: boolean;
}

/**
 * Works out a recipe's diet flags from its ingredients.
 *
 * Only answers when every row is linked to the catalog AND every one of those
 * ingredients has a definite answer. A single unlinked row, or one ingredient
 * recorded as "unknown", means the recipe cannot be judged - and silently
 * flipping a recipe to vegetarian because the bacon was not recognised would
 * be worse than the manual flag it replaces.
 */
export const deriveDietFlags = async (
  ingredients: unknown,
  prisma: Db = defaultPrisma,
): Promise<DietFlags | null> => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return null;

  const rows = ingredients as RecipeRow[];
  const ids = linkedIds(ingredients);

  // Any row without a catalog link makes the recipe unjudgeable.
  if (ids.length === 0 || rows.some((row) => typeof row?.ingredientId !== 'string')) {
    return null;
  }

  const linked = await prisma.ingredient.findMany({
    where: { id: { in: ids } },
    select: { id: true, isVegetarian: true, isVegan: true },
  });

  // An id pointing at a deleted ingredient is also an unknown.
  if (linked.length !== ids.length) return null;
  if (linked.some((ingredient) => ingredient.isVegetarian === null)) return null;

  const isVegetarian = linked.every((ingredient) => ingredient.isVegetarian === true);

  // Vegan is only claimed when every ingredient says so outright; one unknown
  // is enough to leave it false rather than guess.
  const isVegan =
    isVegetarian && linked.every((ingredient) => ingredient.isVegan === true);

  return { isVegetarian, isVegan, derived: true };
};

/**
 * Syncs the index and, where the ingredients allow it, the diet flags.
 *
 * Returns what was written so a caller can tell the user whether the flags
 * were derived or left as they set them.
 */
export const syncRecipe = async (
  recipeId: number,
  ingredients: unknown,
  prisma: Db = defaultPrisma,
): Promise<DietFlags | null> => {
  await syncRecipeIngredients(recipeId, ingredients, prisma);

  const flags = await deriveDietFlags(ingredients, prisma);
  if (!flags) return null;

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      isVegetarian: flags.isVegetarian,
      isVegan: flags.isVegan,
      dietFlagsDerived: true,
    },
  });

  return flags;
};
