import prisma from "../db";
import { Request, Response, NextFunction } from 'express';
import { syncRecipe } from '../modules/recipe-ingredients';
import { removeRecipeFromLists, refreshListsContaining } from '../modules/shopping-list';


/**
 * Retrieves recipes based on the provided query parameters.
 * 
 * Available options:
 *  - TypeOfMeal is an array of strings
 *  - TypeOfDish is an array of strings
 *  - Cuisine is an array of strings
 *  - Tags is an array of strings
 *  - Time is a single value (number). time is in minutes
 *  - Time works as a maximum value. So if time is 30, recipes with time 30 or less will be returned.
 *  - IsChildFriendly and IsVegetarian are boolean filters
 *  - Page is a single value (number). page is used for pagination. 
 *    Page query param is used to get the current page.
 *  - Limit is a single value (number). limit is used for how many items should be returned per page.
 *    Default limit is 9. This can be changed by adding a limit query to the url.
 *  - Offset is calculated based on page and limit.
 *  - Count is the total number of items that match the query.
 *  - TotalPages is calculated based on count and limit.
 * 
 * Example queries:
 * - /api/recipe?tags=vegan,healthy&typeOfMeal=breakfast&time=30
 * - /api/recipe/?tags=Oven,Italiaans&typeOfMeal=Diner&time=60&isVegetarian=true
 * - /api/recipe/?cuisine=Italian,French&typeOfDish=pasta,main&time=60&page=1&limit=9
 * 
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function to call.
 */
export const getRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = req.query.ids ? req.query.ids.toString().split(',') : []; 
    const tags = req.query.tags ? req.query.tags.toString().split(',') : [];
    const typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString().split(',') : [];
    const typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString().split(',') : [];
    const cuisine = req.query.cuisine ? req.query.cuisine.toString().split(',') : [];
    const time = req.query.time ? parseInt(req.query.time as string) : 0;
    const isChildFriendly = req.query.isChildFriendly ? req.query.isChildFriendly === 'true' : undefined;
    const isVegetarian = req.query.isVegetarian ? req.query.isVegetarian === 'true' : undefined;
    const search = req.query.search ? (req.query.search as string).split(',') : [];
    const ingredients = req.query.ingredients ? req.query.ingredients.toString().split(',') : [];
    const excludeIngredients = req.query.excludeIngredients
      ? req.query.excludeIngredients.toString().split(',')
      : [];
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
    const offset = (page - 1) * limit;

    // Build up conditions for the where clause
    const conditions = [];
    
    if (ids.length > 0) {
      // Anything that is not a number is dropped rather than passed on as NaN,
      // which Prisma rejects outright - one bad id used to fail the whole
      // request instead of just not matching.
      const numericIds = ids.map((id) => parseInt(id)).filter(Number.isInteger);
      if (numericIds.length > 0) {
        conditions.push({ id: { in: numericIds } });
      }
    }
    
    if (tags.length > 0) {
      conditions.push({ tags: { hasEvery: tags } });
    }
    
    if (typeOfMeal.length > 0) {
      conditions.push({ typeOfMeal: { hasSome: typeOfMeal } });
    }
    
    if (typeOfDish.length > 0) {
      conditions.push({ typeOfDish: { hasSome: typeOfDish } });
    }
    
    if (cuisine.length > 0) {
      conditions.push({ cuisine: { hasSome: cuisine } });
    }
    
    if (time > 0) {
      conditions.push({ time: { lte: time } });
    }
    
    if (isChildFriendly !== undefined) {
      conditions.push({ isChildFriendly });
    }
    
    // Both filters go through the derived index rather than the JSON column,
    // which is why that table exists. Slugs rather than ids, so the query
    // string stays readable and survives a reseed.
    if (ingredients.length > 0) {
      // Every named ingredient must be present, not just one of them.
      conditions.push({
        AND: ingredients.map((slug) => ({
          ingredientLinks: { some: { ingredient: { slug } } }
        }))
      });
    }

    if (excludeIngredients.length > 0) {
      conditions.push({
        ingredientLinks: { none: { ingredient: { slug: { in: excludeIngredients } } } }
      });
    }

    if (isVegetarian !== undefined) {
      conditions.push({ isVegetarian });
    }
    
    if (search.length > 0) {
      conditions.push({
        OR: [
          { name: { contains: search[0], mode: 'insensitive' } },
          { description: { contains: search[0], mode: 'insensitive' } },
          { tags: { hasSome: search.map(tag => tag.toLowerCase()) } },
          { tags: { hasSome: search.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)) } }
        ]
      });
    }
    
    // Always add the user ID condition
    conditions.push({ belongsToId: req.user.id });

    // Create a proper where clause with the conditions
    const whereInput = conditions.length > 0 ? { AND: conditions } : {};

    // First, get the total count of recipes matching the filters
    const totalCount = await prisma.recipe.count({
      where: whereInput
    });

    // Then get the paginated recipes
    const recipes = await prisma.recipe.findMany({
      where: whereInput,
      orderBy: {
        id: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      data: recipes, 
      count: totalCount, 
      page, 
      limit, 
      totalPages
    });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Retrieves a recipe by its ID.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the recipe is retrieved.
 */
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

/**
 * Makes sure every ingredient row has an id that is unique within the recipe.
 *
 * A shopping list remembers unticked rows by id, so an id has to keep meaning
 * the same row. Ids that arrive are therefore kept exactly as sent and only
 * missing or colliding ones are filled in - never renumbered, which would move
 * an exclusion onto a different ingredient.
 */
const withRowIds = (ingredients: unknown): unknown => {
  if (!Array.isArray(ingredients)) return ingredients

  const taken = new Set<number>()
  let next =
    ingredients.reduce(
      (highest: number, row) =>
        Number.isInteger((row as { id?: unknown })?.id) && (row as { id: number }).id > highest
          ? (row as { id: number }).id
          : highest,
      0,
    ) + 1

  return ingredients.map((row) => {
    const stored = (row as { id?: unknown })?.id

    if (typeof stored === 'number' && Number.isInteger(stored) && stored > 0 && !taken.has(stored)) {
      taken.add(stored)
      return row
    }

    const id = next++
    taken.add(id)
    return { ...(row as object), id }
  })
}

/**
 * Creates a new recipe.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const createRecipe = async (req: Request, res: Response, next: NextFunction) => {
  const url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
  const ingredients = withRowIds(req.body.ingredients)

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
        typeOfMeal: req.body.typeOfMeal || [],
        typeOfDish: req.body.typeOfDish || [],
        cuisine: req.body.cuisine || [],
        isChildFriendly: req.body.isChildFriendly || false,
        isVegetarian: req.body.isVegetarian || false,
        ingredients: ingredients as never,
        isPublic: req.body.isPublic || false,
        steps: req.body.steps,
        belongsToId: req.user.id
      }
    })

    // The ingredient index and the diet flags are both derived from the
    // ingredients, so they are kept in step here rather than by a later job.
    const dietFlags = await syncRecipe(recipe.id, ingredients)

    res.json({data: { ...recipe, ...(dietFlags ?? {}) }})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

/**
 * Updates a recipe in the database.
 * 
 * @param req - The request object containing the recipe data.
 * @param res - The response object used to send the updated recipe data.
 * @param next - The next function to be called in the middleware chain.
 */
export const updateRecipe = async (req: Request, res: Response, next: NextFunction) => {
  // convert the name in a url
  let url = req.body.url; // Store the current URL

  if (req.body.name) {
    url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); // Update the URL if the name is provided
  }

  const ingredients = withRowIds(req.body.ingredients)

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
        typeOfMeal: req.body.typeOfMeal,
        typeOfDish: req.body.typeOfDish,
        cuisine: req.body.cuisine,
        isChildFriendly: req.body.isChildFriendly,
        isVegetarian: req.body.isVegetarian,
        ingredients: ingredients as never,
        isPublic: req.body.isPublic,
        steps: req.body.steps,
      }
    })

    const dietFlags = await syncRecipe(updatedRecipe.id, ingredients)

    // Anyone already holding this recipe on a shopping list is looking at
    // lines generated from the old version, so those are rebuilt here.
    await refreshListsContaining(updatedRecipe.id)

    res.json({data: { ...updatedRecipe, ...(dietFlags ?? {}) }})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}
 
/**
 * Deletes a recipe.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the deleted recipe data.
 */
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

    // The index rows go with it through the schema's cascade, but shopping
    // lists hold recipe ids in a Json column, so those are cleaned up here.
    await removeRecipeFromLists(deletedRecipe.id)

    res.json({data: deletedRecipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}