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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecipe = exports.updateRecipe = exports.createRecipe = exports.getRecipe = exports.getRecipes = void 0;
var db_1 = __importDefault(require("../db"));
/**
 * Retrieves recipes based on the provided query parameters.
 *
 * Available options:
 *  - TypeOfMeal is an array of strings
 *  - TypeOfDish is an array of strings
 *  - Cuisine is an array of strings
 *  - Tags is an array of strings
 *  - Time is a single value (number). time is in minutes
 *  - Time works as a maximum value. So if time is 30, recipes with time 30 or less will be returned.
 *  - IsChildFriendly and IsVegetarian are boolean filters
 *  - Page is a single value (number). page is used for pagination.
 *    Page query param is used to get the current page.
 *  - Limit is a single value (number). limit is used for how many items should be returned per page.
 *    Default limit is 9. This can be changed by adding a limit query to the url.
 *  - Offset is calculated based on page and limit.
 *  - Count is the total number of items that match the query.
 *  - TotalPages is calculated based on count and limit.
 *
 * Example queries:
 * - /api/recipe?tags=vegan,healthy&typeOfMeal=breakfast&time=30
 * - /api/recipe/?tags=Oven,Italiaans&typeOfMeal=Diner&time=60&isVegetarian=true
 * - /api/recipe/?cuisine=Italian,French&typeOfDish=pasta,main&time=60&page=1&limit=9
 *
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function to call.
 */
var getRecipes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var ids, tags, typeOfMeal, typeOfDish, cuisine, time, isChildFriendly, isVegetarian, search, page, limit, offset, conditions, whereInput, totalCount, recipes, totalPages, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                ids = req.query.ids ? req.query.ids.toString().split(',') : [];
                tags = req.query.tags ? req.query.tags.toString().split(',') : [];
                typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString().split(',') : [];
                typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString().split(',') : [];
                cuisine = req.query.cuisine ? req.query.cuisine.toString().split(',') : [];
                time = req.query.time ? parseInt(req.query.time) : 0;
                isChildFriendly = req.query.isChildFriendly ? req.query.isChildFriendly === 'true' : undefined;
                isVegetarian = req.query.isVegetarian ? req.query.isVegetarian === 'true' : undefined;
                search = req.query.search ? req.query.search.split(',') : [];
                page = req.query.page ? parseInt(req.query.page) : 1;
                limit = req.query.limit ? parseInt(req.query.limit) : 12;
                offset = (page - 1) * limit;
                conditions = [];
                if (ids.length > 0) {
                    conditions.push({ id: { in: ids.map(function (id) { return parseInt(id); }) } });
                }
                if (tags.length > 0) {
                    conditions.push({ tags: { hasEvery: tags } });
                }
                if (typeOfMeal.length > 0) {
                    conditions.push({ typeOfMeal: { hasSome: typeOfMeal } });
                }
                if (typeOfDish.length > 0) {
                    conditions.push({ typeOfDish: { hasSome: typeOfDish } });
                }
                if (cuisine.length > 0) {
                    conditions.push({ cuisine: { hasSome: cuisine } });
                }
                if (time > 0) {
                    conditions.push({ time: { lte: time } });
                }
                if (isChildFriendly !== undefined) {
                    conditions.push({ isChildFriendly: isChildFriendly });
                }
                if (isVegetarian !== undefined) {
                    conditions.push({ isVegetarian: isVegetarian });
                }
                if (search.length > 0) {
                    conditions.push({
                        OR: [
                            { name: { contains: search[0], mode: 'insensitive' } },
                            { description: { contains: search[0], mode: 'insensitive' } },
                            { tags: { hasSome: search.map(function (tag) { return tag.toLowerCase(); }) } },
                            { tags: { hasSome: search.map(function (tag) { return tag.charAt(0).toUpperCase() + tag.slice(1); }) } }
                        ]
                    });
                }
                // Always add the user ID condition
                conditions.push({ belongsToId: req.user.id });
                whereInput = conditions.length > 0 ? { AND: conditions } : {};
                return [4 /*yield*/, db_1.default.recipe.count({
                        where: whereInput
                    })];
            case 1:
                totalCount = _a.sent();
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: whereInput,
                        orderBy: {
                            id: 'desc'
                        },
                        skip: offset,
                        take: limit
                    })];
            case 2:
                recipes = _a.sent();
                totalPages = Math.ceil(totalCount / limit);
                res.json({
                    data: recipes,
                    count: totalCount,
                    page: page,
                    limit: limit,
                    totalPages: totalPages
                });
                return [3 /*break*/, 4];
            case 3:
                e_1 = _a.sent();
                e_1.type = 'next';
                next(e_1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getRecipes = getRecipes;
/**
 * Retrieves a recipe by its ID.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the recipe is retrieved.
 */
var getRecipe = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, recipe, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                return [4 /*yield*/, db_1.default.recipe.findFirst({
                        where: {
                            id: id,
                            belongsToId: req.user.id
                        }
                    })];
            case 1:
                recipe = _a.sent();
                res.json({ data: recipe });
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
exports.getRecipe = getRecipe;
/**
 * Creates a new recipe.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var createRecipe = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var url, recipe, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.recipe.create({
                        data: {
                            name: req.body.name,
                            description: req.body.description,
                            url: url,
                            image: req.body.image,
                            persons: req.body.persons,
                            tags: req.body.tags,
                            time: req.body.time,
                            typeOfMeal: req.body.typeOfMeal || [],
                            typeOfDish: req.body.typeOfDish || [],
                            cuisine: req.body.cuisine || [],
                            isChildFriendly: req.body.isChildFriendly || false,
                            isVegetarian: req.body.isVegetarian || false,
                            ingredients: req.body.ingredients,
                            isPublic: req.body.isPublic || false,
                            steps: req.body.steps,
                            belongsToId: req.user.id
                        }
                    })];
            case 2:
                recipe = _a.sent();
                res.json({ data: recipe });
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
exports.createRecipe = createRecipe;
/**
 * Updates a recipe in the database.
 *
 * @param req - The request object containing the recipe data.
 * @param res - The response object used to send the updated recipe data.
 * @param next - The next function to be called in the middleware chain.
 */
var updateRecipe = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var url, updatedRecipe, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = req.body.url;
                if (req.body.name) {
                    url = req.body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); // Update the URL if the name is provided
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.recipe.update({
                        where: {
                            id_belongsToId: {
                                id: parseInt(req.params.id),
                                belongsToId: req.user.id
                            }
                        },
                        data: {
                            name: req.body.name,
                            description: req.body.description,
                            url: url,
                            image: req.body.image,
                            persons: req.body.persons,
                            tags: req.body.tags,
                            time: req.body.time,
                            typeOfMeal: req.body.typeOfMeal,
                            typeOfDish: req.body.typeOfDish,
                            cuisine: req.body.cuisine,
                            isChildFriendly: req.body.isChildFriendly,
                            isVegetarian: req.body.isVegetarian,
                            ingredients: req.body.ingredients,
                            isPublic: req.body.isPublic,
                            steps: req.body.steps,
                        }
                    })];
            case 2:
                updatedRecipe = _a.sent();
                res.json({ data: updatedRecipe });
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
exports.updateRecipe = updateRecipe;
/**
 * Deletes a recipe.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the deleted recipe data.
 */
var deleteRecipe = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var deletedRecipe, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.recipe.delete({
                        where: {
                            id_belongsToId: {
                                id: parseInt(req.params.id),
                                belongsToId: req.user.id
                            }
                        }
                    })];
            case 1:
                deletedRecipe = _a.sent();
                res.json({ data: deletedRecipe });
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
exports.deleteRecipe = deleteRecipe;
//# sourceMappingURL=recipe.js.map