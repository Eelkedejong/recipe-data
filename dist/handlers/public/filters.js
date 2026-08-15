"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeCuisines = exports.getRecipeDishTypes = exports.getRecipeTypes = exports.getRecipeTags = void 0;
const db_1 = __importDefault(require("../../db"));
/**
 * Returns all unique tags from public recipes, with optional filtering by meal type, dish type, or cuisine
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeTags = async (req, res, next) => {
    const typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString() : undefined;
    const typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString() : undefined;
    const cuisine = req.query.cuisine ? req.query.cuisine.toString() : undefined;
    try {
        // Build the where clause
        const whereClause = {
            isPublic: true
        };
        // Add optional filters
        if (typeOfMeal) {
            whereClause.typeOfMeal = { has: typeOfMeal };
        }
        if (typeOfDish) {
            whereClause.typeOfDish = { has: typeOfDish };
        }
        if (cuisine) {
            whereClause.cuisine = { has: cuisine };
        }
        const tags = await db_1.default.recipe.findMany({
            where: whereClause,
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
/**
 * Returns all unique meal types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeTypes = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                isPublic: true
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
 * Returns all unique dish types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeDishTypes = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                isPublic: true
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
 * Returns all unique cuisines from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
const getRecipeCuisines = async (req, res, next) => {
    try {
        const recipes = await db_1.default.recipe.findMany({
            where: {
                isPublic: true
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
//# sourceMappingURL=filters.js.map