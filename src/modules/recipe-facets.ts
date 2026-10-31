import { Prisma } from '@prisma/client';
import defaultPrisma from '../db';

type Db = typeof defaultPrisma;

/**
 * The lists the filter UI is built from: which meal types, dish types,
 * cuisines and tags actually occur in the recipes you can see.
 *
 * All four endpoints are the same four steps - select one array column,
 * flatten, deduplicate, return - and existed twice, once per router. The
 * copies drifted: only the public tags endpoint narrowed by the other
 * filters, and only the authenticated ingredients endpoint returned counts.
 * Sharing the implementation settles both.
 */

/** Array columns on Recipe that the filter UI reads. */
export type FacetColumn = 'typeOfMeal' | 'typeOfDish' | 'cuisine' | 'tags';

/**
 * Narrows the facet list by the filters already chosen, so picking "Diner"
 * leaves only the tags that still lead somewhere.
 *
 * Single values rather than lists, matching what the UI sends.
 */
export const narrowBy = (query: Record<string, unknown>): Prisma.RecipeWhereInput => {
  const where: Prisma.RecipeWhereInput = {};

  if (query.typeOfMeal) where.typeOfMeal = { has: query.typeOfMeal.toString() };
  if (query.typeOfDish) where.typeOfDish = { has: query.typeOfDish.toString() };
  if (query.cuisine) where.cuisine = { has: query.cuisine.toString() };

  return where;
};

/** The distinct values of one array column across the matching recipes. */
export const uniqueFacetValues = async (
  column: FacetColumn,
  where: Prisma.RecipeWhereInput,
  prisma: Db = defaultPrisma,
): Promise<string[]> => {
  // The column is chosen at runtime, so Prisma widens the row type to every
  // selectable field. The cast narrows it back to what was actually selected.
  const rows = (await prisma.recipe.findMany({
    where,
    select: { [column]: true },
  })) as unknown as Record<FacetColumn, string[]>[];

  return [...new Set(rows.flatMap((row) => row[column] ?? []))];
};

/**
 * An Express handler for one facet.
 *
 * `scope` comes from the router rather than the request - `belongsToId` for
 * the authenticated side, `isPublic: true` for the public one - so it cannot
 * be influenced by a query string.
 */
export const facetHandler =
  (column: FacetColumn, scope: (req: { user?: { id: string } }) => Prisma.RecipeWhereInput) =>
  async (req, res, next) => {
    try {
      const where = { ...scope(req), ...narrowBy(req.query) };

      res.json({ data: await uniqueFacetValues(column, where) });
    } catch (e) {
      e.type = 'next';
      next(e);
    }
  };

/**
 * The ingredients that actually appear in these recipes.
 *
 * The filter UI is built from this rather than from the whole catalog, so it
 * never offers a choice that would return nothing. The count comes along so
 * the UI can show how many recipes each one leads to.
 */
export const usedIngredientsHandler =
  (recipeScope: (req: { user?: { id: string } }) => Prisma.RecipeWhereInput) =>
  async (req, res, next) => {
    try {
      const used = await defaultPrisma.ingredient.findMany({
        where: { recipeLinks: { some: { recipe: recipeScope(req) } } },
        orderBy: { nameNl: 'asc' },
        select: {
          slug: true,
          nameNl: true,
          nameNlPlural: true,
          _count: { select: { recipeLinks: true } },
        },
      });

      res.json({ data: used });
    } catch (e) {
      e.type = 'next';
      next(e);
    }
  };
