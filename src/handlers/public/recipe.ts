import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';
import { buildRecipeWhere, parsePaging, RECIPE_ORDER } from '../../modules/recipe-query';

/**
 * Get all Public recipes
 * See handlers/recipe.ts for the functional docs for this function
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Same filter builder as the authenticated listing in handlers/recipe.ts.
    // The only difference between the two is the scope below.
    const where = buildRecipeWhere(req.query as Record<string, unknown>, { isPublic: true });
    const { page, limit, offset } = parsePaging(req.query as Record<string, unknown>);

    const [recipes, count] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: RECIPE_ORDER,
        skip: offset,
        take: limit,
      }),
      // Counted against the same clause the rows were fetched with. It used to
      // strip the search condition first, so a search returned three recipes
      // and offered pages for twenty-two.
      prisma.recipe.count({ where }),
    ]);

    res.json({ data: recipes, count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Retrieves a recipe by its ID if it is public.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the recipe data if found, or an error message if not found.
 */
export const getRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        isPublic: true // Only return the recipe if it is public
      }
    });

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.json({ data: recipe });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
}