import { randomUUID } from 'node:crypto';
import prisma from "../db";
import { Request, Response, NextFunction } from 'express';
import { refreshShoppingList, buildListView } from '../modules/shopping-list';

/**
 * Create Shopping list. This is called when a new user is created.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export const createShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.shoppingList.create({
      data: {
        recipes: req.body.recipes,
        items: req.body.items,
        belongsToId: req.user.id
      }
    })

    res.json({data: list})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Get the shopping list
export const getShoppingList = async (req, res, next) => {
  try {
    const list = await prisma.shoppingList.findFirst({
      where: {
        belongsToId: req.user.id
      }
    })

    // Lists created before the generated view existed have nothing stored, so
    // the first read builds it.
    if (list && !list.generatedItems) {
      list.generatedItems = await refreshShoppingList(req.user.id) as never
    }

    res.json({data: list})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

/**
 * Updates the shopping list based on the request body.
 * If the shopping list is empty, adds all the recipes from the request body to the shopping list.
 * If the shopping list is not empty, compares the recipes in the request body with the recipes in the shopping list and updates them accordingly.
 * Finally, returns the updated shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns The updated shopping list.
 */
export const updateShoppingListRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the existing shopping list
    const shoppingList = await prisma.shoppingList.findFirst({
      where: {
        belongsToId: req.user.id
      }
    });

    // Track the recipes that need to be added to the shopping list
    let newRecipes = [];

    // If the shopping list is empty, add all the recipes from the request body to the newRecipes list
    if (shoppingList.recipes.length === 0) {
      newRecipes = req.body.recipes;
    } else {
      // If the shopping list is not empty, compare the recipes in the request body with the recipes in the shopping list
      req.body.recipes.forEach((recipe: { id: number, persons: number }) => {
        const existingRecipeIndex = shoppingList.recipes.findIndex((existingRecipe: { id: number, persons: number }) => existingRecipe.id === recipe.id);

        if (existingRecipeIndex !== -1) {
          shoppingList.recipes[existingRecipeIndex] = recipe;
        } else {
          newRecipes.push(recipe);
        }
      });
    }

    // Add the new recipes and ingredients to the shopping list
    const updatedList = await prisma.shoppingList.update({
      where: {
        belongsToId: req.user.id
      },
      data: {
        recipes: {
          set: [...shoppingList.recipes, ...newRecipes]
        }
      }
    });

    // The generated list is derived from these recipes, so it is rebuilt here
    // rather than left stale until something else happens to refresh it.
    const generatedItems = await refreshShoppingList(req.user.id);

    res.json({ data: { ...updatedList, generatedItems } });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};

/**
 * Removes recipes from the shopping list.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response with the updated shopping list.
 */
export const removeRecipeFromShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the existing shopping list
    const shoppingList = await prisma.shoppingList.findFirst({
      where: {
        belongsToId: req.user.id
      }
    });

    // Get the recipes from the shopping list
    const recipes = shoppingList.recipes;

    // Get the recipe IDs to be removed from the header
    const recipeIdsToRemove = req.body.ids

    // Remove the recipes from the shopping list
    const updatedList = await prisma.shoppingList.update({
      where: {
        belongsToId: req.user.id
      },
      data: {
        recipes: {
          set: recipes.filter((recipe: { id: number }) => !recipeIdsToRemove.includes(recipe.id))
        }
      } 
    });

    const generatedItems = await refreshShoppingList(req.user.id);

    res.json({ data: { ...updatedList, generatedItems } });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
}

/**
 * Updates the items and extra items in the shopping list for the authenticated user.
 * 
 * @param req - The request object containing the user ID and the updated items.
 * @param res - The response object to send the updated shopping list.
 * @param next - The next function to handle errors.
 */
export const updateShoppingListItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedList = await prisma.shoppingList.update({
      where: {
        belongsToId: req.user.id
      },
      data: {
        items: {
          set: req.body.items
        },
        extraItems: {
          set: req.body.extraItems
        }
      },
    });

    res.json({ data: updatedList });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
}

/**
 * Delete the Shopping list. Should be called when a user is deleted.
 * 
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @returns A JSON response containing the deleted shopping list data.
 */
export const deleteShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedList = await prisma.shoppingList.delete({
      where: {
        belongsToId: req.user.id
      }
    })

    res.json({data: deletedList})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}




/**
 * GET /list/view - the list as it should be rendered.
 *
 * Generated lines merged with the edits made on top of them, hand-added items
 * sitting in their chosen aisle. The frontend renders this directly rather
 * than combining two shapes itself.
 */
export const getShoppingListView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: await buildListView(req.user.id) })
  } catch (e) {
    (e as { type?: string }).type = 'next'
    next(e)
  }
}

/**
 * PUT /list/state - shopping-time edits.
 *
 * Ticking a line off, removing one already at home, and items added by hand.
 * Stored apart from the generated list so adding a recipe does not undo them.
 */
export const updateShoppingListState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overrides = typeof req.body.overrides === 'object' && req.body.overrides !== null
      ? req.body.overrides
      : {}

    const extras = Array.isArray(req.body.extras)
      ? req.body.extras
          .filter((extra: { name?: unknown }) => typeof extra?.name === 'string' && extra.name.trim())
          .map((extra: { id?: unknown; name: string; categorySlug?: unknown; checked?: unknown }) => ({
            // An id is generated here when the client did not send one, so a
            // line keeps its identity once it exists.
            id: typeof extra.id === 'string' && extra.id ? extra.id : randomUUID(),
            name: extra.name.trim(),
            categorySlug: typeof extra.categorySlug === 'string' ? extra.categorySlug : null,
            checked: Boolean(extra.checked)
          }))
      : []

    await prisma.shoppingList.updateMany({
      where: { belongsToId: req.user.id },
      data: { listState: { overrides, extras } as never }
    })

    res.json({ data: await buildListView(req.user.id) })
  } catch (e) {
    (e as { type?: string }).type = 'next'
    next(e)
  }
}
