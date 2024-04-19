import prisma from "../../db";
import { Request, Response, NextFunction } from 'express';

export const getRecipeTags = async (req: Request, res: Response, next: NextFunction) => {
  const type = req.query.type

  try {
    const tags = await prisma.recipe.findMany({
      where: {
        isPublic: true,
        type: type ? type : undefined
      },
      select: {
        tags: true
      }
    })

    // Create a new array with only the unique tags
    const uniqueTags = Array.from(new Set(tags.map(item => item.tags).flat()))

    res.json({data: uniqueTags})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}