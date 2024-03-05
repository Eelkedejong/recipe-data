import { Router } from 'express'
import { getRecipes, getRecipe } from '../handlers/public/recipe';
import { getRecipeTags } from '../handlers/public/filters';

const publicRouter = Router()

publicRouter.get('/recipe', getRecipes)

publicRouter.get('/recipe/:id', getRecipe)

publicRouter.get('/recipe-tags', getRecipeTags)

export default publicRouter