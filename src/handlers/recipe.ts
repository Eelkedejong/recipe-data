import prisma from "../db";
import { Request, Response, NextFunction } from 'express';
import { syncRecipe } from '../modules/recipe-ingredients';
import { removeRecipeFromLists, refreshListsContaining } from '../modules/shopping-list';
import { withRowIds } from '../modules/recipe-rows'
import { resolveIsPublic, PUBLISH_REFUSED } from '../modules/publishing'
import { buildRecipeWhere, parsePaging, RECIPE_ORDER } from '../modules/recipe-query'

/**
 * The url-safe form of a recipe name.
 *
 * Called inside the try blocks below: it used to run before them, so a
 * request with no name threw a TypeError that nothing caught and the client
 * got a 500 where a 400 was the right answer. The validator now requires a
 * name, and this stays defensive anyway.
 */
const toUrlSlug = (name: unknown): string =>
  String(name ?? '').toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')


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
    // Same filter builder as the public listing in handlers/public/recipe.ts.
    // The only difference between the two is the scope below.
    const where = buildRecipeWhere(req.query as Record<string, unknown>, {
      belongsToId: req.user.id,
    });
    const { page, limit, offset } = parsePaging(req.query as Record<string, unknown>);

    const [recipes, count] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: RECIPE_ORDER,
        skip: offset,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ]);

    res.json({ data: recipes, count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Retrieves one of the signed-in user's own recipes.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
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

    // Used to answer 200 with data: null, which a client cannot tell apart
    // from a recipe that exists but is empty. The public handler already
    // answered 404 here.
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    res.json({data: recipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

/**
 * Creates a new recipe.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const createRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = toUrlSlug(req.body.name)
    const ingredients = withRowIds(req.body.ingredients)

    // Only admins put recipes on the public side. Refused rather than silently
    // downgraded, so a future admin UI cannot quietly fail to publish.
    const publishing = await resolveIsPublic(req.user.id, req.body.isPublic)

    if (!publishing.allowed) {
      return res.status(403).json({ message: PUBLISH_REFUSED })
    }

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
        isPublic: publishing.isPublic ?? false,
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
  try {
    // Keep the stored url unless a new name came with the request.
    const url = req.body.name ? toUrlSlug(req.body.name) : req.body.url

    const ingredients = withRowIds(req.body.ingredients)

    const publishing = await resolveIsPublic(req.user.id, req.body.isPublic)

    if (!publishing.allowed) {
      return res.status(403).json({ message: PUBLISH_REFUSED })
    }

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
        isPublic: publishing.isPublic,
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