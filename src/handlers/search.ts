import prisma from "../db";
import { Request, Response, NextFunction } from 'express';

// Write a search function for searching the database for recipes.
// The search should be able to search for:
// - recipe name
// - recipe description
// - recipe tags
// - recipe ingredients
export const getSearchResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search ? req.query.search.split(',') : [];
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 12;
    const offset = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        recipes: {
          where: {
            AND: [ 
              search.length > 0 ? { OR: [
                { name: { contains: search[0], mode: 'insensitive' } },
                { description: { contains: search[0], mode: 'insensitive' } },
                // Search for both the lowercase and uppercase version of the tag.
                { tags: { hasSome: search.map((tag: string) => tag.toLowerCase()) } },
                { tags: { hasSome: search.map((tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1)) } }
              ] } : {},
            ]
          },
          skip: offset,
          take: limit,
        }
      }
    });

    res.json({ data: user?.recipes ?? [], page, limit });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
}







