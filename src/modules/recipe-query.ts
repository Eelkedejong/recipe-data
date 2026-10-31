import { Prisma } from '@prisma/client';

/**
 * Turns recipe filter query parameters into Prisma conditions.
 *
 * Why this exists: the authenticated and public recipe listings are separate
 * handlers that differ only in *whose* recipes they may return. They used to
 * duplicate this filter logic, and it drifted three times - ingredient
 * filtering shipped to the authenticated side only, the public listing lost
 * its ordering, and the public count stopped matching its own query. Sharing
 * the builder makes that class of bug structurally impossible rather than
 * something to remember.
 *
 * Deliberately pure and database-free: everything here is testable without a
 * connection, which is most of why the drift went unnoticed before.
 */

/** One `AND` condition per filter, so they compose without clobbering. */
type Condition = Prisma.RecipeWhereInput;

/** Reads a comma-separated query value. Absent or empty yields []. */
const list = (value: unknown): string[] =>
  value ? value.toString().split(',').filter((part) => part !== '') : [];

/**
 * Reads a boolean filter.
 *
 * `undefined` means "not filtered". An empty value (`?isVegetarian=`) counts
 * as not filtered rather than as `false` - the two handlers disagreed about
 * this, and treating an empty value as `false` silently hides every
 * vegetarian recipe.
 */
const boolean = (value: unknown): boolean | undefined =>
  value ? value.toString() === 'true' : undefined;

/** Pagination, clamped so a hand-edited query string cannot ask for everything. */
export interface Paging {
  page: number;
  limit: number;
  offset: number;
}

export const parsePaging = (query: Record<string, unknown>): Paging => {
  const rawPage = parseInt(query.page as string);
  const rawLimit = parseInt(query.limit as string);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 12;

  return { page, limit, offset: (page - 1) * limit };
};

/**
 * The filter conditions for a recipe listing, without any visibility scope.
 *
 * The caller adds that itself - `belongsToId` for the authenticated listing,
 * `isPublic: true` for the public one - which is the only thing the two
 * listings should differ by.
 */
export const buildRecipeConditions = (query: Record<string, unknown>): Condition[] => {
  const conditions: Condition[] = [];

  const ids = list(query.ids);
  if (ids.length > 0) {
    // Anything non-numeric is dropped rather than passed on as NaN, which
    // Prisma rejects outright - one bad id used to fail the whole request
    // instead of simply not matching.
    const numericIds = ids.map((id) => parseInt(id)).filter(Number.isInteger);
    if (numericIds.length > 0) {
      conditions.push({ id: { in: numericIds } });
    }
  }

  const tags = list(query.tags);
  if (tags.length > 0) {
    // Every tag must be present; the other array filters match any.
    conditions.push({ tags: { hasEvery: tags } });
  }

  const typeOfMeal = list(query.typeOfMeal);
  if (typeOfMeal.length > 0) {
    conditions.push({ typeOfMeal: { hasSome: typeOfMeal } });
  }

  const typeOfDish = list(query.typeOfDish);
  if (typeOfDish.length > 0) {
    conditions.push({ typeOfDish: { hasSome: typeOfDish } });
  }

  const cuisine = list(query.cuisine);
  if (cuisine.length > 0) {
    conditions.push({ cuisine: { hasSome: cuisine } });
  }

  const time = parseInt(query.time as string);
  if (Number.isInteger(time) && time > 0) {
    // A maximum, not an exact match: "something in under 30 minutes".
    conditions.push({ time: { lte: time } });
  }

  const isChildFriendly = boolean(query.isChildFriendly);
  if (isChildFriendly !== undefined) {
    conditions.push({ isChildFriendly });
  }

  const isVegetarian = boolean(query.isVegetarian);
  if (isVegetarian !== undefined) {
    conditions.push({ isVegetarian });
  }

  // Both ingredient filters go through the RecipeIngredient index rather than
  // the JSON column, which is the whole reason that table exists. Slugs
  // rather than ids, so the query string stays readable and survives a
  // reseed.
  const ingredients = list(query.ingredients);
  if (ingredients.length > 0) {
    // Every named ingredient must be present, not just one of them.
    conditions.push({
      AND: ingredients.map((slug) => ({
        ingredientLinks: { some: { ingredient: { slug } } },
      })),
    });
  }

  const excludeIngredients = list(query.excludeIngredients);
  if (excludeIngredients.length > 0) {
    conditions.push({
      ingredientLinks: { none: { ingredient: { slug: { in: excludeIngredients } } } },
    });
  }

  const search = list(query.search);
  if (search.length > 0) {
    // Only the first term searches name and description; the whole list is
    // matched against tags. Tags are stored capitalised inconsistently, hence
    // the two spellings.
    conditions.push({
      OR: [
        { name: { contains: search[0], mode: 'insensitive' } },
        { description: { contains: search[0], mode: 'insensitive' } },
        { tags: { hasSome: search.map((tag) => tag.toLowerCase()) } },
        { tags: { hasSome: search.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1)) } },
      ],
    });
  }

  return conditions;
};

/**
 * The complete where clause: the filters plus the caller's visibility scope.
 *
 * Scope is a separate argument rather than another query parameter precisely
 * so it cannot be influenced by the request.
 */
export const buildRecipeWhere = (
  query: Record<string, unknown>,
  scope: Prisma.RecipeWhereInput,
): Prisma.RecipeWhereInput => ({
  AND: [...buildRecipeConditions(query), scope],
});

/**
 * Newest first, and always set.
 *
 * Postgres gives no ordering guarantee without this, so paging through an
 * unordered query can show the same recipe twice and never show another. The
 * public listing had no ordering at all.
 */
export const RECIPE_ORDER: Prisma.RecipeOrderByWithRelationInput = { id: 'desc' };
