import { randomUUID } from 'node:crypto';
import prisma from "../db";
import { Request, Response, NextFunction } from 'express';
import { refreshShoppingList, buildListView, ListState } from '../modules/shopping-list';

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
    const shoppingList = await prisma.shoppingList.findFirst({
      where: { belongsToId: req.user.id },
      select: { recipes: true }
    });

    const existing = Array.isArray(shoppingList?.recipes)
      ? (shoppingList!.recipes as { id?: number }[])
      : [];

    const incoming = Array.isArray(req.body.recipes) ? req.body.recipes : [];

    // Only entries with a real id are kept. The recipe detail page used to
    // send { persons } with no id, which broke every read of this list.
    const clean = (entry: { id?: unknown; persons?: unknown; excludedRows?: unknown }) => ({
      id: Number(entry.id),
      persons: Number(entry.persons) || undefined,
      excludedRows: Array.isArray(entry.excludedRows)
        ? entry.excludedRows.filter((row) => typeof row === 'number')
        : []
    });

    const usable = incoming
      .filter((entry: { id?: unknown }) => Number.isInteger(Number(entry?.id)))
      .map(clean);

    const incomingIds = new Set(usable.map((entry) => entry.id));

    // Adding a recipe that is already on the list replaces it, so the newest
    // persons count and ticks win.
    const recipes = [
      ...existing.filter(
        (entry) => Number.isInteger(entry?.id) && !incomingIds.has(entry.id as number)
      ),
      ...usable
    ];

    const updatedList = await prisma.shoppingList.update({
      where: { belongsToId: req.user.id },
      data: { recipes: { set: recipes } }
    });

    // The generated list is derived from these recipes, so it is rebuilt here
    // rather than left stale until something else happens to refresh it.
    const generatedItems = await refreshShoppingList(req.user.id);

    res.json({ data: { ...updatedList, generatedItems } });
  } catch (e) {
    (e as { type?: string }).type = 'next';
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
    const ticked = typeof req.body.ticked === 'object' && req.body.ticked !== null
      ? req.body.ticked
      : {}

    const extras = Array.isArray(req.body.extras)
      ? req.body.extras
          .filter((extra: { name?: unknown }) => typeof extra?.name === 'string' && extra.name.trim())
          .map((extra: { id?: unknown; name: string; categorySlug?: unknown; ticked?: unknown }) => ({
            id: typeof extra.id === 'string' && extra.id ? extra.id : randomUUID(),
            name: extra.name.trim(),
            categorySlug: typeof extra.categorySlug === 'string' ? extra.categorySlug : null,
            ticked: Boolean(extra.ticked)
          }))
      : []

    await prisma.shoppingList.updateMany({
      where: { belongsToId: req.user.id },
      data: { listState: { ticked, extras } as never }
    })

    res.json({ data: await buildListView(req.user.id) })
  } catch (e) {
    (e as { type?: string }).type = 'next'
    next(e)
  }
}

/**
 * PUT /list/refine - what the shopping list page saves.
 *
 * Replaces the recipes on the list (with their persons count and unchecked
 * rows) and the extra items, in one write. Edits on that page are local until
 * the user presses save, so this is a full replace rather than a patch.
 */
export const refineShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipes = (Array.isArray(req.body.recipes) ? req.body.recipes : [])
      .filter((entry: { id?: unknown }) => Number.isInteger(Number(entry?.id)))
      .map((entry: { id?: unknown; persons?: unknown; excludedRows?: unknown }) => ({
        id: Number(entry.id),
        persons: Number(entry.persons) || undefined,
        excludedRows: Array.isArray(entry.excludedRows)
          ? entry.excludedRows.filter((row: unknown) => typeof row === 'number')
          : []
      }))

    const current = await prisma.shoppingList.findFirst({
      where: { belongsToId: req.user.id },
      select: { listState: true }
    })
    const state = (current?.listState as unknown as ListState | null) ?? { ticked: {}, extras: [] }

    const extras = Array.isArray(req.body.extras)
      ? req.body.extras
          .filter((extra: { name?: unknown }) => typeof extra?.name === 'string' && extra.name.trim())
          .map((extra: { id?: unknown; name: string; categorySlug?: unknown; ticked?: unknown }) => ({
            id: typeof extra.id === 'string' && extra.id ? extra.id : randomUUID(),
            name: extra.name.trim(),
            categorySlug: typeof extra.categorySlug === 'string' ? extra.categorySlug : null,
            ticked: Boolean(extra.ticked)
          }))
      : state.extras

    await prisma.shoppingList.update({
      where: { belongsToId: req.user.id },
      data: { recipes: { set: recipes }, listState: { ...state, extras } as never }
    })

    await refreshShoppingList(req.user.id)

    res.json({ data: await buildListView(req.user.id) })
  } catch (e) {
    (e as { type?: string }).type = 'next'
    next(e)
  }
}
