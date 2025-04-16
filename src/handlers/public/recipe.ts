import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

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
    const tags = req.query.tags ? req.query.tags.toString().split(',') : [];
    const typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString().split(',') : [];
    const typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString().split(',') : [];
    const cuisine = req.query.cuisine ? req.query.cuisine.toString().split(',') : [];
    const time = req.query.time ? parseInt(req.query.time as string) : 0;
    const isChildFriendly = req.query.isChildFriendly === 'true';
    const isVegetarian = req.query.isVegetarian === 'true';
    const search = req.query.search ? (req.query.search as string).split(',') : [];
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
    const offset = (page - 1) * limit;

    // Build where clause object based on filter conditions
    const whereClause: Prisma.RecipeWhereInput = {
      isPublic: true, // Base condition - always filter for public recipes
    };
    
    // Add optional conditions only if they're provided
    if (tags.length > 0) {
      whereClause.tags = { hasEvery: tags };
    }
    
    if (typeOfMeal.length > 0) {
      whereClause.typeOfMeal = { hasSome: typeOfMeal };
    }
    
    if (typeOfDish.length > 0) {
      whereClause.typeOfDish = { hasSome: typeOfDish };
    }
    
    if (cuisine.length > 0) {
      whereClause.cuisine = { hasSome: cuisine };
    }
    
    if (time > 0) {
      whereClause.time = { lte: time };
    }
    
    if (req.query.isChildFriendly !== undefined) {
      whereClause.isChildFriendly = isChildFriendly;
    }
    
    if (req.query.isVegetarian !== undefined) {
      whereClause.isVegetarian = isVegetarian;
    }
    
    if (search.length > 0) {
      whereClause.OR = [
        { name: { contains: search[0], mode: 'insensitive' } },
        { description: { contains: search[0], mode: 'insensitive' } },
        { tags: { hasSome: search.map((tag: string) => tag.toLowerCase()) } },
        { tags: { hasSome: search.map((tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1)) } }
      ];
    }

    // Query recipes
    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
    });

    // For count, create a separate where clause without the search condition
    const countWhereClause = { ...whereClause };
    delete countWhereClause.OR; // Remove search condition for accurate pagination
    
    const count = await prisma.recipe.count({
      where: countWhereClause
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