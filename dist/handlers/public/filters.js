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
exports.getRecipeCuisines = exports.getRecipeDishTypes = exports.getRecipeTypes = exports.getRecipeTags = void 0;
var db_1 = __importDefault(require("../../db"));
/**
 * Returns all unique tags from public recipes, with optional filtering by meal type, dish type, or cuisine
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var getRecipeTags = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var typeOfMeal, typeOfDish, cuisine, whereClause, tags, uniqueTags, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                typeOfMeal = req.query.typeOfMeal ? req.query.typeOfMeal.toString() : undefined;
                typeOfDish = req.query.typeOfDish ? req.query.typeOfDish.toString() : undefined;
                cuisine = req.query.cuisine ? req.query.cuisine.toString() : undefined;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                whereClause = {
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
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: whereClause,
                        select: {
                            tags: true
                        }
                    })];
            case 2:
                tags = _a.sent();
                uniqueTags = Array.from(new Set(tags.flatMap(function (item) { return item.tags; })));
                res.json({ data: uniqueTags });
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
exports.getRecipeTags = getRecipeTags;
/**
 * Returns all unique meal types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var getRecipeTypes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var recipes, uniqueTypes, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: {
                            isPublic: true
                        },
                        select: {
                            typeOfMeal: true
                        }
                    })];
            case 1:
                recipes = _a.sent();
                uniqueTypes = Array.from(new Set(recipes.flatMap(function (recipe) { return recipe.typeOfMeal; })));
                res.json({ data: uniqueTypes });
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
exports.getRecipeTypes = getRecipeTypes;
/**
 * Returns all unique dish types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var getRecipeDishTypes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var recipes, uniqueDishTypes, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: {
                            isPublic: true
                        },
                        select: {
                            typeOfDish: true
                        }
                    })];
            case 1:
                recipes = _a.sent();
                uniqueDishTypes = Array.from(new Set(recipes.flatMap(function (recipe) { return recipe.typeOfDish; })));
                res.json({ data: uniqueDishTypes });
                return [3 /*break*/, 3];
            case 2:
                e_3 = _a.sent();
                e_3.type = 'next';
                next(e_3);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRecipeDishTypes = getRecipeDishTypes;
/**
 * Returns all unique cuisines from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
var getRecipeCuisines = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var recipes, uniqueCuisines, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.default.recipe.findMany({
                        where: {
                            isPublic: true
                        },
                        select: {
                            cuisine: true
                        }
                    })];
            case 1:
                recipes = _a.sent();
                uniqueCuisines = Array.from(new Set(recipes.flatMap(function (recipe) { return recipe.cuisine; })));
                res.json({ data: uniqueCuisines });
                return [3 /*break*/, 3];
            case 2:
                e_4 = _a.sent();
                e_4.type = 'next';
                next(e_4);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRecipeCuisines = getRecipeCuisines;
//# sourceMappingURL=filters.js.map