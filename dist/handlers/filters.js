"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeTags = exports.getRecipeCuisines = exports.getRecipeDishTypes = exports.getRecipeTypes = void 0;
const db_1 = __importDefault(require("../db"));
/**
 * Returns all unique meal types from the user's recipes
 * This function is used to generate the meal type filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeTypes = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                belongsToId: req.user.id
            },
            select: {
                typeOfMeal: true
            }
        });
        // Flatten the array of arrays and get unique values
        const uniqueTypes = Array.from(new Set(recipes.flatMap(recipe => recipe.typeOfMeal)));
        res.json({ data: uniqueTypes });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.getRecipeTypes = getRecipeTypes;
/**
 * Returns all unique dish types from the user's recipes
 * This function is used to generate the dish type filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeDishTypes = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                belongsToId: req.user.id
            },
            select: {
                typeOfDish: true
            }
        });
        // Flatten the array of arrays and get unique values
        const uniqueDishTypes = Array.from(new Set(recipes.flatMap(recipe => recipe.typeOfDish)));
        res.json({ data: uniqueDishTypes });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.getRecipeDishTypes = getRecipeDishTypes;
/**
 * Returns all unique cuisines from the user's recipes
 * This function is used to generate the cuisine filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeCuisines = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                belongsToId: req.user.id
            },
            select: {
                cuisine: true
            }
        });
        // Flatten the array of arrays and get unique values
        const uniqueCuisines = Array.from(new Set(recipes.flatMap(recipe => recipe.cuisine)));
        res.json({ data: uniqueCuisines });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.getRecipeCuisines = getRecipeCuisines;
/**
 * Returns all unique tags from the user's recipes
 * This function is used to generate the tag filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeTags = async (req, res, next) => {
    try {
        const tags = await db_1.default.recipe.findMany({
            where: {
                belongsToId: req.user.id
            },
            select: {
                tags: true
            }
        });
        // Create a new array with only the unique tags
        const uniqueTags = Array.from(new Set(tags.flatMap(item => item.tags)));
        res.json({ data: uniqueTags });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.getRecipeTags = getRecipeTags;
//# sourceMappingURL=filters.js.map