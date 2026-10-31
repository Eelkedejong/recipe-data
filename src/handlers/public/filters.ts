import { facetHandler, usedIngredientsHandler } from '../../modules/recipe-facets';

/**
 * Filter lists for the public recipe browser.
 *
 * The authenticated equivalents live in handlers/filters.ts and differ only
 * in the scope below; everything else comes from modules/recipe-facets.ts.
 */
const published = () => ({ isPublic: true });

export const getRecipeTypes = facetHandler('typeOfMeal', published);
export const getRecipeDishTypes = facetHandler('typeOfDish', published);
export const getRecipeCuisines = facetHandler('cuisine', published);
export const getRecipeTags = facetHandler('tags', published);
export const getRecipeIngredients = usedIngredientsHandler(published);
