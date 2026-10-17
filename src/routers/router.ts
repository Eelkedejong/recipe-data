import { Router } from 'express'
import { body, oneOf, validationResult } from "express-validator";
import { handleInputErrors } from '../modules/errors'
import { getRecipes, getRecipe, updateRecipe, createRecipe, deleteRecipe } from '../handlers/recipe';
import { createShoppingList, deleteShoppingList, getShoppingList, updateShoppingListRecipes, updateShoppingListItems, removeRecipeFromShoppingList } from '../handlers/shopping-list';
import { getRecipeTypes, getRecipeTags, getRecipeDishTypes, getRecipeCuisines } from '../handlers/filters';
import { createIngredient, updateIngredient, deleteIngredient, setAliases, createCategory, updateCategory } from '../handlers/ingredient';
import { requireAdmin } from '../modules/auth';

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
  body('typeOfMeal').optional(),
  body('typeOfDish').optional(),
  body('cuisine').optional(),
  body('isChildFriendly').optional().isBoolean(),
  body('isVegetarian').optional().isBoolean(),
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
  body('typeOfMeal').optional(),
  body('typeOfDish').optional(),
  body('cuisine').optional(),
  body('isChildFriendly').optional().isBoolean(),
  body('isVegetarian').optional().isBoolean(),
  body('ingredients').optional(),
  body('steps').optional(),
  handleInputErrors, 
  updateRecipe
)

router.delete('/recipe/:id', deleteRecipe)

// Recipe types
router.get('/recipe-tags', getRecipeTags)
router.get('/recipe-types', getRecipeTypes)
router.get('/recipe-dish-types', getRecipeDishTypes)
router.get('/recipe-cuisines', getRecipeCuisines)

// Ingredient catalog writes. Reading is public (see public.ts); only admins
// may change the catalog, since it is shared by every user.
router.post('/ingredient',
  requireAdmin,
  body('slug').isString().trim().notEmpty(),
  body('nameNl').isString().trim().notEmpty(),
  body('nameNlPlural').optional(),
  body('categoryId').optional(),
  body('baseUnit').optional(),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('seasonMonths').optional().isArray(),
  handleInputErrors,
  createIngredient
)

router.put('/ingredient/:slug',
  requireAdmin,
  body('nameNl').isString().trim().notEmpty(),
  body('nameNlPlural').optional(),
  body('categoryId').optional(),
  body('baseUnit').optional(),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('seasonMonths').optional().isArray(),
  handleInputErrors,
  updateIngredient
)

router.delete('/ingredient/:slug', requireAdmin, deleteIngredient)

router.put('/ingredient/:slug/aliases',
  requireAdmin,
  body('aliases').isArray(),
  handleInputErrors,
  setAliases
)

router.post('/ingredient-category',
  requireAdmin,
  body('slug').isString().trim().notEmpty(),
  body('nameNl').isString().trim().notEmpty(),
  body('sortOrder').isInt(),
  handleInputErrors,
  createCategory
)

router.put('/ingredient-category/:slug',
  requireAdmin,
  body('nameNl').isString().trim().notEmpty(),
  body('sortOrder').isInt(),
  handleInputErrors,
  updateCategory
)

// Shopping list routes
router.get('/list', getShoppingList)

router.post('/list',
  body('recipes').optional(),
  body('items').optional(),
  handleInputErrors, 
  createShoppingList
)

router.put('/list/recipes',
body('recipes').optional(),
  handleInputErrors, 
  updateShoppingListRecipes
)

router.put('/list/recipes/remove',
body('recipes').optional(),
  handleInputErrors, 
  removeRecipeFromShoppingList
)

router.put('/list/items',
body('items').optional(),
  handleInputErrors, 
  updateShoppingListItems
)

router.delete('/list', deleteShoppingList)

export default router