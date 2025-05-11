"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var express_validator_1 = require("express-validator");
var errors_1 = require("../modules/errors");
var recipe_1 = require("../handlers/recipe");
var shopping_list_1 = require("../handlers/shopping-list");
var filters_1 = require("../handlers/filters");
var router = (0, express_1.Router)();
// Recipe routes
router.get('/recipe', recipe_1.getRecipes);
router.get('/recipe/:id', recipe_1.getRecipe);
router.post('/recipe', (0, express_validator_1.body)('name').optional(), (0, express_validator_1.body)('description').optional(), (0, express_validator_1.body)('image').optional(), (0, express_validator_1.body)('persons').optional(), (0, express_validator_1.body)('tags').optional(), (0, express_validator_1.body)('time').optional(), (0, express_validator_1.body)('typeOfMeal').optional(), (0, express_validator_1.body)('typeOfDish').optional(), (0, express_validator_1.body)('cuisine').optional(), (0, express_validator_1.body)('isChildFriendly').optional().isBoolean(), (0, express_validator_1.body)('isVegetarian').optional().isBoolean(), (0, express_validator_1.body)('ingredients').optional(), (0, express_validator_1.body)('steps').optional(), errors_1.handleInputErrors, recipe_1.createRecipe);
router.put('/recipe/:id', (0, express_validator_1.body)('name').optional(), (0, express_validator_1.body)('description').optional(), (0, express_validator_1.body)('image').optional(), (0, express_validator_1.body)('persons').optional(), (0, express_validator_1.body)('tags').optional(), (0, express_validator_1.body)('time').optional(), (0, express_validator_1.body)('typeOfMeal').optional(), (0, express_validator_1.body)('typeOfDish').optional(), (0, express_validator_1.body)('cuisine').optional(), (0, express_validator_1.body)('isChildFriendly').optional().isBoolean(), (0, express_validator_1.body)('isVegetarian').optional().isBoolean(), (0, express_validator_1.body)('ingredients').optional(), (0, express_validator_1.body)('steps').optional(), errors_1.handleInputErrors, recipe_1.updateRecipe);
router.delete('/recipe/:id', recipe_1.deleteRecipe);
// Recipe types
router.get('/recipe-tags', filters_1.getRecipeTags);
router.get('/recipe-types', filters_1.getRecipeTypes);
router.get('/recipe-dish-types', filters_1.getRecipeDishTypes);
router.get('/recipe-cuisines', filters_1.getRecipeCuisines);
// Shopping list routes
router.get('/list', shopping_list_1.getShoppingList);
router.post('/list', (0, express_validator_1.body)('recipes').optional(), (0, express_validator_1.body)('items').optional(), errors_1.handleInputErrors, shopping_list_1.createShoppingList);
router.put('/list/recipes', (0, express_validator_1.body)('recipes').optional(), errors_1.handleInputErrors, shopping_list_1.updateShoppingListRecipes);
router.put('/list/recipes/remove', (0, express_validator_1.body)('recipes').optional(), errors_1.handleInputErrors, shopping_list_1.removeRecipeFromShoppingList);
router.put('/list/items', (0, express_validator_1.body)('items').optional(), errors_1.handleInputErrors, shopping_list_1.updateShoppingListItems);
router.delete('/list', shopping_list_1.deleteShoppingList);
exports.default = router;
//# sourceMappingURL=router.js.map