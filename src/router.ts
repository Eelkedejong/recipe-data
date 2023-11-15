import { Router } from 'express'
import { body, oneOf, validationResult } from "express-validator";
import { handleInputErrors } from './modules/middleware'
import { getRecipes, getRecipe, updateRecipe, createRecipe, deleteRecipe } from './handlers/recipe';
import { getRecipeTypes, getRecipeTags } from './handlers/filters';


const router = Router()

// Recipe routes

router.get('/recipe', getRecipes)

router.get('/recipe/:id', getRecipe)

router.post('/recipe',
  body('name').optional(),
  body('description').optional(),
  body('image').optional(),
  body('persons').optional(),
  body('tags').optional(),
  body('time').optional(),
  body('difficulty').optional(),
  body('type').optional(),
  body('ingredients').optional(),
  body('steps').optional(),
  handleInputErrors, 
  createRecipe
)

router.put('/recipe/:id',
  body('name').optional(),
  body('description').optional(),
  body('image').optional(),
  body('persons').optional(),
  body('tags').optional(),
  body('time').optional(),
  body('difficulty').optional(),
  body('type').optional(),
  body('ingredients').optional(),
  body('steps').optional(),
  handleInputErrors, 
  updateRecipe
)

router.delete('/recipe/:id', deleteRecipe)

// Recipe types
router.get('/recipe-types', getRecipeTypes)
router.get('/recipe-tags', getRecipeTags)

// Shopping list routes

// TODO: add routes

export default router