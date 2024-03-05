import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';

export const getRecipeTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.recipe.findMany({
      where: {
        isPublic: true
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