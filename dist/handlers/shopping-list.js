"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShoppingList = exports.updateIngredientByRecipeShoppingList = exports.updateShoppingListItems = exports.removeRecipeFromShoppingList = exports.updateShoppingListRecipes = exports.getShoppingList = exports.createShoppingList = void 0;
var db_1 = __importDefault(require("../db"));
/**
 * Create Shopping list. This is called when a new user is created.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var createShoppingList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var list, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.shoppingList.create({
                        data: {
                            recipes: req.body.recipes,
                            items: req.body.items,
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                list = _a.sent();
                res.json({ data: list });
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                e_1.type = 'next';
                next(e_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.createShoppingList = createShoppingList;
// Get the shopping list
var getShoppingList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var list, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.shoppingList.findFirst({
                        where: {
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                list = _a.sent();
                res.json({ data: list });
                return [3 /*break*/, 3];
            case 2:
                e_2 = _a.sent();
                e_2.type = 'next';
                next(e_2);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
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
var updateShoppingListRecipes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var shoppingList_1, newRecipes_1, updatedList, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db_1.default.shoppingList.findFirst({
                        where: {
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                shoppingList_1 = _a.sent();
                newRecipes_1 = [];
                // If the shopping list is empty, add all the recipes from the request body to the newRecipes list
                if (shoppingList_1.recipes.length === 0) {
                    newRecipes_1 = req.body.recipes;
                }
                else {
                    // If the shopping list is not empty, compare the recipes in the request body with the recipes in the shopping list
                    req.body.recipes.forEach(function (recipe) {
                        var existingRecipeIndex = shoppingList_1.recipes.findIndex(function (existingRecipe) { return existingRecipe.id === recipe.id; });
                        if (existingRecipeIndex !== -1) {
                            shoppingList_1.recipes[existingRecipeIndex] = recipe;
                        }
                        else {
                            newRecipes_1.push(recipe);
                        }
                    });
                }
                return [4 /*yield*/, db_1.default.shoppingList.update({
                        where: {
                            belongsToId: req.user.id
                        },
                        data: {
                            recipes: {
                                set: __spreadArray(__spreadArray([], shoppingList_1.recipes, true), newRecipes_1, true)
                            }
                        }
                    })];
            case 2:
                updatedList = _a.sent();
                // Return the updated shopping list
                res.json({ data: updatedList });
                return [3 /*break*/, 4];
            case 3:
                e_3 = _a.sent();
                e_3.type = 'next';
                next(e_3);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.updateShoppingListRecipes = updateShoppingListRecipes;
/**
 * Removes recipes from the shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response with the updated shopping list.
 */
var removeRecipeFromShoppingList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var shoppingList, recipes, recipeIdsToRemove_1, updatedList, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db_1.default.shoppingList.findFirst({
                        where: {
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                shoppingList = _a.sent();
                recipes = shoppingList.recipes;
                recipeIdsToRemove_1 = req.body.ids;
                return [4 /*yield*/, db_1.default.shoppingList.update({
                        where: {
                            belongsToId: req.user.id
                        },
                        data: {
                            recipes: {
                                set: recipes.filter(function (recipe) { return !recipeIdsToRemove_1.includes(recipe.id); })
                            }
                        }
                    })];
            case 2:
                updatedList = _a.sent();
                res.json({ data: updatedList });
                return [3 /*break*/, 4];
            case 3:
                e_4 = _a.sent();
                e_4.type = 'next';
                next(e_4);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.removeRecipeFromShoppingList = removeRecipeFromShoppingList;
/**
 * Updates the items and extra items in the shopping list for the authenticated user.
 *
 * @param req - The request object containing the user ID and the updated items.
 * @param res - The response object to send the updated shopping list.
 * @param next - The next function to handle errors.
 */
var updateShoppingListItems = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var updatedList, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.shoppingList.update({
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
                    })];
            case 1:
                updatedList = _a.sent();
                res.json({ data: updatedList });
                return [3 /*break*/, 3];
            case 2:
                e_5 = _a.sent();
                e_5.type = 'next';
                next(e_5);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.updateShoppingListItems = updateShoppingListItems;
// OLD FUNCTION @TODO: Permenantly remove this function
var updateIngredientByRecipeShoppingList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var shoppingList, recipes, newIngredients;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.default.shoppingList.findFirst({
                    where: {
                        belongsToId: req.user.id
                    }
                })];
            case 1:
                shoppingList = _a.sent();
                recipes = shoppingList.recipes;
                newIngredients = [];
                recipes.map(function (recipe) { return __awaiter(void 0, void 0, void 0, function () {
                    var recipeIngredients;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, db_1.default.recipe.findUnique({
                                    where: {
                                        id: recipe.id
                                    },
                                    select: {
                                        persons: true,
                                        ingredients: true
                                    }
                                })];
                            case 1:
                                recipeIngredients = _a.sent();
                                // Multiply the ingredient amounts by the number of persons
                                if (Array.isArray(recipeIngredients.ingredients)) {
                                    recipeIngredients.ingredients.forEach(function (ingredient) {
                                        if (recipe.persons !== recipeIngredients.persons) {
                                            ingredient.amount = ingredient.amount * (recipe.persons / recipeIngredients.persons);
                                        }
                                        // Check if the ingredient already exists in the newIngredients list
                                        var existingIngredient = newIngredients.find(function (newIngredient) { return newIngredient.ingredient === ingredient.ingredient; });
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
                                return [2 /*return*/];
                        }
                    });
                }); });
                // Convert the ingredients to a string, starting with the amound, then the unit, then the ingredient
                newIngredients = newIngredients.map(function (ingredient) {
                    return "".concat(ingredient.amount, " ").concat(ingredient.unit, " ").concat(ingredient.ingredient);
                });
                return [2 /*return*/];
        }
    });
}); };
exports.updateIngredientByRecipeShoppingList = updateIngredientByRecipeShoppingList;
/**
 * Delete the Shopping list. Should be called when a user is deleted.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @returns A JSON response containing the deleted shopping list data.
 */
var deleteShoppingList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var deletedList, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.shoppingList.delete({
                        where: {
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                deletedList = _a.sent();
                res.json({ data: deletedList });
                return [3 /*break*/, 3];
            case 2:
                e_6 = _a.sent();
                e_6.type = 'next';
                next(e_6);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteShoppingList = deleteShoppingList;
//# sourceMappingURL=shopping-list.js.map