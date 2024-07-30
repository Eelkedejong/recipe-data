import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';

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
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const type = req.query.type;
    const time = req.query.time ? parseInt(req.query.time) : 0;
    const search = req.query.search ? req.query.search.split(',') : [];
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 12;
    const offset = (page - 1) * limit;

    // Query recipes without user-specific filtering
    const recipes = await prisma.recipe.findMany({
      where: {
        AND: [
          { isPublic: true }, // Filter for public recipes
          tags.length > 0 ? { tags: { hasEvery: tags } } : {},
          type ? { type: type } : {},
          time > 0 ? { time: { lte: time } } : {},
          search.length > 0 ? {
            OR: [
              { name: { contains: search[0], mode: 'insensitive' } },
              { description: { contains: search[0], mode: 'insensitive' } },
              // Search for both the lowercase and uppercase version of the tag.
              { tags: { hasSome: search.map((tag: string) => tag.toLowerCase()) } },
              { tags: { hasSome: search.map((tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1)) } }
            ]
          } : {},
        ]
      },
      skip: offset,
      take: limit,
    });

    const count = await prisma.recipe.count({
      where: {
        AND: [
          { isPublic: true }, // Filter for public recipes
          tags.length > 0 ? { tags: { hasEvery: tags } } : {},
          type ? { type: type } : {},
          time > 0 ? { time: { lte: time } } : {}
        ]
      }
    });

    const totalPages = Math.ceil(count / limit);

    res.json({ data: recipes, count, page, limit, totalPages });
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