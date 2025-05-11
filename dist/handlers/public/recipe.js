"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getRecipe = exports.getRecipes = void 0;
var db_1 = __importDefault(require("../../db"));
/**
 * Get all Public recipes
 * See handlers/recipe.ts for the functional docs for this function
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var getRecipes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var tags, typeOfMeal, typeOfDish, cuisine, time, isChildFriendly, isVegetarian, search, page, limit, offset, whereClause, recipes, countWhereClause, count, totalPages, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                tags = req.query.tags ? req.query.tags.toString().split(',') : [];
                typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString().split(',') : [];
                typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString().split(',') : [];
                cuisine = req.query.cuisine ? req.query.cuisine.toString().split(',') : [];
                time = req.query.time ? parseInt(req.query.time) : 0;
                isChildFriendly = req.query.isChildFriendly === 'true';
                isVegetarian = req.query.isVegetarian === 'true';
                search = req.query.search ? req.query.search.split(',') : [];
                page = req.query.page ? parseInt(req.query.page) : 1;
                limit = req.query.limit ? parseInt(req.query.limit) : 12;
                offset = (page - 1) * limit;
                whereClause = {
                    isPublic: true, // Base condition - always filter for public recipes
                };
                // Add optional conditions only if they're provided
                if (tags.length > 0) {
                    whereClause.tags = { hasEvery: tags };
                }
                if (typeOfMeal.length > 0) {
                    whereClause.typeOfMeal = { hasSome: typeOfMeal };
                }
                if (typeOfDish.length > 0) {
                    whereClause.typeOfDish = { hasSome: typeOfDish };
                }
                if (cuisine.length > 0) {
                    whereClause.cuisine = { hasSome: cuisine };
                }
                if (time > 0) {
                    whereClause.time = { lte: time };
                }
                if (req.query.isChildFriendly !== undefined) {
                    whereClause.isChildFriendly = isChildFriendly;
                }
                if (req.query.isVegetarian !== undefined) {
                    whereClause.isVegetarian = isVegetarian;
                }
                if (search.length > 0) {
                    whereClause.OR = [
                        { name: { contains: search[0], mode: 'insensitive' } },
                        { description: { contains: search[0], mode: 'insensitive' } },
                        { tags: { hasSome: search.map(function (tag) { return tag.toLowerCase(); }) } },
                        { tags: { hasSome: search.map(function (tag) { return tag.charAt(0).toUpperCase() + tag.slice(1); }) } }
                    ];
                }
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: whereClause,
                        skip: offset,
                        take: limit,
                    })];
            case 1:
                recipes = _a.sent();
                countWhereClause = __assign({}, whereClause);
                delete countWhereClause.OR; // Remove search condition for accurate pagination
                return [4 /*yield*/, db_1.default.recipe.count({
                        where: countWhereClause
                    })];
            case 2:
                count = _a.sent();
                totalPages = Math.ceil(count / limit);
                res.json({ data: recipes, count: count, page: page, limit: limit, totalPages: totalPages });
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
 * Retrieves a recipe by its ID if it is public.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the recipe data if found, or an error message if not found.
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
                            isPublic: true // Only return the recipe if it is public
                        }
                    })];
            case 1:
                recipe = _a.sent();
                if (!recipe) {
                    return [2 /*return*/, res.status(404).json({ message: 'Recipe not found' })];
                }
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
//# sourceMappingURL=recipe.js.map