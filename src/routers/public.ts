import { Router } from 'express'
import { getRecipes, getRecipe } from '../handlers/public/recipe';
import { getRecipeTags, getRecipeTypes, getRecipeDishTypes, getRecipeCuisines } from '../handlers/public/filters';
import { getCatalog, getIngredient, getCategories } from '../handlers/ingredient';

const publicRouter = Router()

publicRouter.get('/recipe', getRecipes)

publicRouter.get('/recipe/:id', getRecipe)

publicRouter.get('/recipe-tags', getRecipeTags)
publicRouter.get('/recipe-types', getRecipeTypes)
publicRouter.get('/recipe-dish-types', getRecipeDishTypes)
publicRouter.get('/recipe-cuisines', getRecipeCuisines)

// Ingredient catalog. Global, admin-curated, read by everyone including
// signed-out visitors - the whole catalog in one cached response.
publicRouter.get('/ingredient', getCatalog)
publicRouter.get('/ingredient-category', getCategories)
publicRouter.get('/ingredient/:slug', getIngredient)

export default publicRouter