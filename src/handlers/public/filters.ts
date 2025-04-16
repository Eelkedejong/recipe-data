import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Returns all unique tags from public recipes, with optional filtering by meal type, dish type, or cuisine
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeTags = async (req: Request, res: Response, next: NextFunction) => {
  const typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString() : undefined;
  const typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString() : undefined;
  const cuisine = req.query.cuisine ? req.query.cuisine.toString() : undefined;

  try {
    // Build the where clause
    const whereClause: Prisma.RecipeWhereInput = {
      isPublic: true
    };

    // Add optional filters
    if (typeOfMeal) {
      whereClause.typeOfMeal = { has: typeOfMeal };
    }
    
    if (typeOfDish) {
      whereClause.typeOfDish = { has: typeOfDish };
    }
    
    if (cuisine) {
      whereClause.cuisine = { has: cuisine };
    }

    const tags = await prisma.recipe.findMany({
      where: whereClause,
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
 * Returns all unique meal types from public recipes
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isPublic: true
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
 * Returns all unique dish types from public recipes
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeDishTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isPublic: true
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
 * Returns all unique cuisines from public recipes
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const getRecipeCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isPublic: true
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