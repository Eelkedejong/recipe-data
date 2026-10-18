import prisma from "../db";
import { Request, Response, NextFunction } from 'express';

/**
 * Returns all unique meal types from the user's recipes
 * This function is used to generate the meal type filter in the frontend
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id
      },
      select: {
        typeOfMeal: true
      }
    });

    // Flatten the array of arrays and get unique values
    const uniqueTypes = Array.from(new Set(recipes.flatMap(recipe => recipe.typeOfMeal)));

    res.json({data: uniqueTypes});
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Returns all unique dish types from the user's recipes
 * This function is used to generate the dish type filter in the frontend
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeDishTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id
      },
      select: {
        typeOfDish: true
      }
    });

    // Flatten the array of arrays and get unique values
    const uniqueDishTypes = Array.from(new Set(recipes.flatMap(recipe => recipe.typeOfDish)));

    res.json({data: uniqueDishTypes});
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Returns all unique cuisines from the user's recipes
 * This function is used to generate the cuisine filter in the frontend
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id
      },
      select: {
        cuisine: true
      }
    });

    // Flatten the array of arrays and get unique values
    const uniqueCuisines = Array.from(new Set(recipes.flatMap(recipe => recipe.cuisine)));

    res.json({data: uniqueCuisines});
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Returns all unique tags from the user's recipes
 * This function is used to generate the tag filter in the frontend
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id
      },
      select: {
        tags: true
      }
    });

    // Create a new array with only the unique tags
    const uniqueTags = Array.from(new Set(tags.flatMap(item => item.tags)));

    res.json({data: uniqueTags});
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};
/**
 * Returns the ingredients that actually appear in the user's recipes.
 *
 * The filter UI is built from this rather than from the whole catalog, so it
 * never offers a choice that would return nothing.
 */
export const getRecipeIngredients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const used = await prisma.ingredient.findMany({
      where: { recipeLinks: { some: { recipe: { belongsToId: req.user.id } } } },
      orderBy: { nameNl: 'asc' },
      select: {
        slug: true,
        nameNl: true,
        nameNlPlural: true,
        _count: { select: { recipeLinks: true } }
      }
    });

    res.json({ data: used });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};
