import prisma from "../db";
import { Request, Response, NextFunction } from 'express';

// Function to get the user recipes.
// Incluced option to filter based on tags and type.
// type is a single value (string)
// tags is an array of strings
// time is a single value (number). time is in minutes
// time works as a maximum value. So if time is 30, recipes with time 30 or less will be returned.
// page is a single value (number). page is used for pagination. 
// page query param is used to get the current page.
// limit is a single value (number). limit is used for how many items should be returned per page
// Default limit is 9. This can be changed by adding a limit query to the url.
// offset is calculated based on page and limit.
// count is the total number of items that match the query.
// totalPages is calculated based on count and limit.
// Example: /api/recipe?tags=vegan,healthy&type=breakfast&time=30
// Example: /api/recipe/?tags=Oven,Italiaans&type=Diner&time=60
// Example: /api/recipe/?tags=Oven,Italiaans&type=Diner&time=60&page=1&limit=9
export const getRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : []; // Added option to enter multiple ids
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const type = req.query.type;
    const time = req.query.time ? parseInt(req.query.time) : 0;
    const search = req.query.search ? req.query.search.split(',') : [];
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 9;
    const offset = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        recipes: {
          where: {
            AND: [
              ids.length > 0 ? { id: { in: ids.map((id: string) => parseInt(id)) } } : {}, // Only return recipes with specified ids
              tags.length > 0 ? { tags: { hasEvery: tags } } : {},
              type ? { type: type } : {},
              time > 0 ? { time: { lte: time } } : {},
              search.length > 0 ? { OR: [
                { name: { contains: search[0], mode: 'insensitive' } },
                { description: { contains: search[0], mode: 'insensitive' } },
                // Search for both the lowercase and uppercase version of the tag.
                { tags: { hasSome: search.map((tag: string) => tag.toLowerCase()) } },
                { tags: { hasSome: search.map((tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1)) } }
              ] } : {},
            ]
          },
          orderBy: {
            id: 'desc'
          },
          skip: offset,
          take: limit,
        }
      }
    });

    const count = await prisma.recipe.count({
      where: {
        AND: [
          ids.length > 0 ? { id: { in: ids.map((id: string) => parseInt(id)) } } : {}, // Only count recipes with specified ids
          tags.length > 0 ? { tags: { hasEvery: tags } } : {},
          type ? { type: type } : {},
          time > 0 ? { time: { lte: time } } : {}
        ]
      }
    });

    const totalPages = Math.ceil(count / limit);

    res.json({data: user.recipes, count, page, limit, totalPages});
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

// Get one recipes based on id
export const getRecipe = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        belongsToId: req.user.id
      }
    })

    res.json({data: recipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Create one recipe
export const createRecipe = async (req: Request, res: Response, next: NextFunction) => {
  const url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        url: url,
        image: req.body.image,
        persons: req.body.persons,
        tags: req.body.tags,
        time: req.body.time,
        difficulty: req.body.difficulty,
        type: req.body.type,
        ingredients: req.body.ingredients,
        isPublic: req.body.isPublic,
        steps: req.body.steps,
        belongsToId: req.user.id
      }
    })

    res.json({data: recipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Update one recipe
export const updateRecipe = async (req: Request, res: Response, next: NextFunction) => {
  // convert the name in a url
  let url = req.body.url; // Store the current URL

  if (req.body.name) {
    url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); // Update the URL if the name is provided
  }

  try {
    const updatedRecipe = await prisma.recipe.update({
      where: {
        id_belongsToId: {
          id: parseInt(req.params.id),
          belongsToId: req.user.id
        }
      }, 
      data: {
        name: req.body.name,
        description: req.body.description,
        url: url,
        image: req.body.image,
        persons: req.body.persons,
        tags: req.body.tags,
        time: req.body.time,
        difficulty: req.body.difficulty,
        type: req.body.type,
        ingredients: req.body.ingredients,
        isPublic: req.body.isPublic,
        steps: req.body.steps,
      }
    })

    res.json({data: updatedRecipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}
 
// Delete one recipe
export const deleteRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedRecipe = await prisma.recipe.delete({
      where: {
        id_belongsToId: {
          id: parseInt(req.params.id),
          belongsToId: req.user.id
        }
      }
    })

    res.json({data: deletedRecipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}



