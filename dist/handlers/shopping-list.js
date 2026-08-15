"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShoppingList = exports.updateIngredientByRecipeShoppingList = exports.updateShoppingListItems = exports.removeRecipeFromShoppingList = exports.updateShoppingListRecipes = exports.getShoppingList = exports.createShoppingList = void 0;
const db_1 = __importDefault(require("../db"));
/**
 * Create Shopping list. This is called when a new user is created.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const createShoppingList = async (req, res, next) => {
    try {
        const list = await db_1.default.shoppingList.create({
            data: {
                recipes: req.body.recipes,
                items: req.body.items,
                belongsToId: req.user.id
            }
        });
        res.json({ data: list });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.createShoppingList = createShoppingList;
// Get the shopping list
const getShoppingList = async (req, res, next) => {
    try {
        const list = await db_1.default.shoppingList.findFirst({
            where: {
                belongsToId: req.user.id
            }
        });
        res.json({ data: list });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.getShoppingList = getShoppingList;
/**
 * Updates the shopping list based on the request body.
 * If the shopping list is empty, adds all the recipes from the request body to the shopping list.
 * If the shopping list is not empty, compares the recipes in the request body with the recipes in the shopping list and updates them accordingly.
 * Finally, returns the updated shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns The updated shopping list.
 */
const updateShoppingListRecipes = async (req, res, next) => {
    try {
        // Get the existing shopping list
        const shoppingList = await db_1.default.shoppingList.findFirst({
            where: {
                belongsToId: req.user.id
            }
        });
        // Track the recipes that need to be added to the shopping list
        let newRecipes = [];
        // If the shopping list is empty, add all the recipes from the request body to the newRecipes list
        if (shoppingList.recipes.length === 0) {
            newRecipes = req.body.recipes;
        }
        else {
            // If the shopping list is not empty, compare the recipes in the request body with the recipes in the shopping list
            req.body.recipes.forEach((recipe) => {
                const existingRecipeIndex = shoppingList.recipes.findIndex((existingRecipe) => existingRecipe.id === recipe.id);
                if (existingRecipeIndex !== -1) {
                    shoppingList.recipes[existingRecipeIndex] = recipe;
                }
                else {
                    newRecipes.push(recipe);
                }
            });
        }
        // Add the new recipes and ingredients to the shopping list
        const updatedList = await db_1.default.shoppingList.update({
            where: {
                belongsToId: req.user.id
            },
            data: {
                recipes: {
                    set: [...shoppingList.recipes, ...newRecipes]
                }
            }
        });
        // Return the updated shopping list
        res.json({ data: updatedList });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.updateShoppingListRecipes = updateShoppingListRecipes;
/**
 * Removes recipes from the shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response with the updated shopping list.
 */
const removeRecipeFromShoppingList = async (req, res, next) => {
    try {
        // Get the existing shopping list
        const shoppingList = await db_1.default.shoppingList.findFirst({
            where: {
                belongsToId: req.user.id
            }
        });
        // Get the recipes from the shopping list
        const recipes = shoppingList.recipes;
        // Get the recipe IDs to be removed from the header
        const recipeIdsToRemove = req.body.ids;
        // Remove the recipes from the shopping list
        const updatedList = await db_1.default.shoppingList.update({
            where: {
                belongsToId: req.user.id
            },
            data: {
                recipes: {
                    set: recipes.filter((recipe) => !recipeIdsToRemove.includes(recipe.id))
                }
            }
        });
        res.json({ data: updatedList });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.removeRecipeFromShoppingList = removeRecipeFromShoppingList;
/**
 * Updates the items and extra items in the shopping list for the authenticated user.
 *
 * @param req - The request object containing the user ID and the updated items.
 * @param res - The response object to send the updated shopping list.
 * @param next - The next function to handle errors.
 */
const updateShoppingListItems = async (req, res, next) => {
    try {
        const updatedList = await db_1.default.shoppingList.update({
            where: {
                belongsToId: req.user.id
            },
            data: {
                items: {
                    set: req.body.items
                },
                extraItems: {
                    set: req.body.extraItems
                }
            },
        });
        res.json({ data: updatedList });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.updateShoppingListItems = updateShoppingListItems;
// OLD FUNCTION @TODO: Permenantly remove this function
const updateIngredientByRecipeShoppingList = async (req, res, next) => {
    // Get the existing shopping list
    const shoppingList = await db_1.default.shoppingList.findFirst({
        where: {
            belongsToId: req.user.id
        }
    });
    // Get the recipes from the shopping list
    const recipes = shoppingList.recipes;
    // Track the ingredients that need to be added to the shopping list
    let newIngredients = [];
    recipes.map(async (recipe) => {
        const recipeIngredients = await db_1.default.recipe.findUnique({
            where: {
                id: recipe.id
            },
            select: {
                persons: true,
                ingredients: true
            }
        });
        // Multiply the ingredient amounts by the number of persons
        if (Array.isArray(recipeIngredients.ingredients)) {
            recipeIngredients.ingredients.forEach((ingredient) => {
                if (recipe.persons !== recipeIngredients.persons) {
                    ingredient.amount = ingredient.amount * (recipe.persons / recipeIngredients.persons);
                }
                // Check if the ingredient already exists in the newIngredients list
                const existingIngredient = newIngredients.find((newIngredient) => newIngredient.ingredient === ingredient.ingredient);
                if (existingIngredient) {
                    // If the ingredient already exists, add the amounts together
                    existingIngredient.amount += ingredient.amount;
                }
                else {
                    // If the ingredient doesn't exist, add it to the newIngredients list
                    newIngredients.push(ingredient);
                }
            });
        }
        else {
            // Handle the case where recipeIngredients.ingredients is not an array
            console.log('recipeIngredients.ingredients is not an array');
        }
    });
    // Convert the ingredients to a string, starting with the amound, then the unit, then the ingredient
    newIngredients = newIngredients.map((ingredient) => {
        return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
    });
};
exports.updateIngredientByRecipeShoppingList = updateIngredientByRecipeShoppingList;
/**
 * Delete the Shopping list. Should be called when a user is deleted.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @returns A JSON response containing the deleted shopping list data.
 */
const deleteShoppingList = async (req, res, next) => {
    try {
        const deletedList = await db_1.default.shoppingList.delete({
            where: {
                belongsToId: req.user.id
            }
        });
        res.json({ data: deletedList });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.deleteShoppingList = deleteShoppingList;
//# sourceMappingURL=shopping-list.js.map