import { Router } from 'express'
import { getRecipes, getRecipe } from '../handlers/public/recipe';

const publicRouter = Router()

publicRouter.get('/recipe', getRecipes)

publicRouter.get('/recipe/:id', getRecipe)

export default publicRouter