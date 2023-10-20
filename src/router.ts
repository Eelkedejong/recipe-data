import { Router } from 'express'
import { body, oneOf, validationResult } from "express-validator";
import { handleInputErrors } from './modules/middleware'
import { getRecipes, getRecipe, updateRecipe, createRecipe, deleteRecipe } from './handlers/recipe';

const router = Router()

// Recipe routes

router.get('/recipe', getRecipes)

router.get('/recipe/:id', getRecipe)

router.post('/recipe', 
  body('name').isString(),
  body('description').optional(),
  body('persons').isInt(),
  body('carb').isString(),
  body('time').isString(),
  body('ingredients').optional(),
  handleInputErrors, 
  createRecipe
)

router.put('/recipe/:id', 
  body('name').optional(),
  body('description').optional(),
  body('persons').optional(),
  body('carb').optional(),
  body('time').optional(),
  body('ingredients').optional(),
  handleInputErrors, 
  updateRecipe
)

router.delete('/recipe/:id', deleteRecipe)

// Shopping list routes

// TODO: add routes

export default router