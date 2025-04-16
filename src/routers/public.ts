import { Router } from 'express'
import { getRecipes, getRecipe } from '../handlers/public/recipe';
import { getRecipeTags, getRecipeTypes, getRecipeDishTypes, getRecipeCuisines } from '../handlers/public/filters';

const publicRouter = Router()

publicRouter.get('/recipe', getRecipes)

publicRouter.get('/recipe/:id', getRecipe)

publicRouter.get('/recipe-tags', getRecipeTags)
publicRouter.get('/recipe-types', getRecipeTypes)
publicRouter.get('/recipe-dish-types', getRecipeDishTypes)
publicRouter.get('/recipe-cuisines', getRecipeCuisines)

export default publicRouter