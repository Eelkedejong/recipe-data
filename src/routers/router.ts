import { Router } from 'express'
import { body, oneOf, validationResult } from "express-validator";
import { handleInputErrors } from '../modules/errors'
import { getRecipes, getRecipe, updateRecipe, createRecipe, deleteRecipe } from '../handlers/recipe';
import { createShoppingList, deleteShoppingList, getShoppingList, updateShoppingListRecipes, updateShoppingListItems, removeRecipeFromShoppingList, getShoppingListView, updateShoppingListState, refineShoppingList } from '../handlers/shopping-list';
import { getRecipeTypes, getRecipeTags, getRecipeDishTypes, getRecipeCuisines } from '../handlers/filters';
import { createIngredient, updateIngredient, deleteIngredient, setAliases, createCategory, updateCategory } from '../handlers/ingredient';
import { requireAdmin } from '../modules/auth';
import { getMe } from '../handlers/user';

const router = Router()

// The signed-in user, role included.
router.get('/me', getMe)

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
  body('nameNlPlural').optional({ values: 'null' }),
  body('categoryId').optional({ values: 'null' }),
  body('baseUnit').optional({ values: 'null' }),
  // null is meaningful here - it means "unknown", as opposed to false - so
  // the validator has to let it through. Bare .optional() only skips undefined.
  body('isVegetarian').optional({ values: 'null' }).isBoolean(),
  body('isVegan').optional({ values: 'null' }).isBoolean(),
  body('seasonMonths').optional().isArray(),
  handleInputErrors,
  createIngredient
)

router.put('/ingredient/:slug',
  requireAdmin,
  body('nameNl').isString().trim().notEmpty(),
  body('nameNlPlural').optional({ values: 'null' }),
  body('categoryId').optional({ values: 'null' }),
  body('baseUnit').optional({ values: 'null' }),
  // null is meaningful here - it means "unknown", as opposed to false - so
  // the validator has to let it through. Bare .optional() only skips undefined.
  body('isVegetarian').optional({ values: 'null' }).isBoolean(),
  body('isVegan').optional({ values: 'null' }).isBoolean(),
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
  body('recipes').optional().isArray(),
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

// The list as rendered: generated lines plus the edits made on top of them.
router.get('/list/view', getShoppingListView)

// What the in-store view saves: ticked lines and quick-added extras.
router.put('/list/state',
  body('ticked').optional(),
  body('extras').optional().isArray(),
  handleInputErrors,
  updateShoppingListState
)

// What the shopping list page's save button sends: the whole refinement.
router.put('/list/refine',
  body('recipes').optional().isArray(),
  body('extras').optional().isArray(),
  handleInputErrors,
  refineShoppingList
)

router.delete('/list', deleteShoppingList)

export default router