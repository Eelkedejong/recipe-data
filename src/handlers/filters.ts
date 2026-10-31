import { facetHandler, usedIngredientsHandler } from '../modules/recipe-facets';

/**
 * Filter lists for the signed-in user's own recipes.
 *
 * The public equivalents live in handlers/public/filters.ts and differ only
 * in the scope below; everything else comes from modules/recipe-facets.ts.
 */
const mine = (req: { user?: { id: string } }) => ({ belongsToId: req.user.id });

export const getRecipeTypes = facetHandler('typeOfMeal', mine);
export const getRecipeDishTypes = facetHandler('typeOfDish', mine);
export const getRecipeCuisines = facetHandler('cuisine', mine);
export const getRecipeTags = facetHandler('tags', mine);
export const getRecipeIngredients = usedIngredientsHandler(mine);
