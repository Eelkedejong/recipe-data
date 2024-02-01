import prisma from "../db";
import { Request, Response, NextFunction } from 'express';


// Create a function that returns all possible types of all recipes from the user
// This function is used to generate the type filter in the frontend
// The function returns an array of strings
export const getRecipeTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id,
        type: {
          not: null
        }
      },
      select: {
        type: true
      }
    })

    // Create a new array with only the unique types
    const uniqueTypes = Array.from(new Set(types.map(item => item.type)))

    res.json({data: uniqueTypes})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Create a function that returns all possible tags of all recipes from the user
// This function is used to generate the tag filter in the frontend
// The function returns an array of strings
export const getRecipeTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.recipe.findMany({
      where: {
        belongsToId: req.user.id
      },
      select: {
        tags: true
      }
    })

    // Create a new array with only the unique tags
    const uniqueTags = Array.from(new Set(tags.map(item => item.tags).flat()))
    console.log('uniqueTags', uniqueTags)

    res.json({data: uniqueTags})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}