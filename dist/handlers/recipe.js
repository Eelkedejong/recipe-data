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
// Function to get the user recipes.
// Incluced option to filter based on tags and type.
// type is a single value (string)
// tags is an array of strings
// time is a single value (number). time is in minutes
// time works as a maximum value. So if time is 30, recipes with time 30 or less will be returned.
// page is a single value (number). page is used for pagination. 
// page query param is used to get the current page.
// limit is a single value (number). limit is used for how many items should be returned per page
// Default limit is 9. This can be changed by adding a limit query to the url.
// offset is calculated based on page and limit.
// count is the total number of items that match the query.
// totalPages is calculated based on count and limit.
// Example: /api/recipe?tags=vegan,healthy&type=breakfast&time=30
// Example: /api/recipe/?tags=Oven,Italiaans&type=Diner&time=60
// Example: /api/recipe/?tags=Oven,Italiaans&type=Diner&time=60&page=1&limit=9
var getRecipes = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var ids, tags, type, time, search, page, limit, offset, user, count, totalPages, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                ids = req.query.ids ? req.query.ids.split(',') : [];
                tags = req.query.tags ? req.query.tags.split(',') : [];
                type = req.query.type;
                time = req.query.time ? parseInt(req.query.time) : 0;
                search = req.query.search ? req.query.search.split(',') : [];
                page = req.query.page ? parseInt(req.query.page) : 1;
                limit = req.query.limit ? parseInt(req.query.limit) : 12;
                offset = (page - 1) * limit;
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: {
                            id: req.user.id
                        },
                        include: {
                            recipes: {
                                where: {
                                    AND: [
                                        ids.length > 0 ? { id: { in: ids.map(function (id) { return parseInt(id); }) } } : {},
                                        tags.length > 0 ? { tags: { hasEvery: tags } } : {},
                                        type ? { type: type } : {},
                                        time > 0 ? { time: { lte: time } } : {},
                                        search.length > 0 ? { OR: [
                                                { name: { contains: search[0], mode: 'insensitive' } },
                                                { description: { contains: search[0], mode: 'insensitive' } },
                                                // Search for both the lowercase and uppercase version of the tag.
                                                { tags: { hasSome: search.map(function (tag) { return tag.toLowerCase(); }) } },
                                                { tags: { hasSome: search.map(function (tag) { return tag.charAt(0).toUpperCase() + tag.slice(1); }) } }
                                            ] } : {},
                                    ]
                                },
                                orderBy: {
                                    id: 'desc'
                                },
                                skip: offset,
                                take: limit,
                            }
                        }
                    })];
            case 1:
                user = _a.sent();
                return [4 /*yield*/, db_1.default.recipe.count({
                        where: {
                            AND: [
                                ids.length > 0 ? { id: { in: ids.map(function (id) { return parseInt(id); }) } } : {},
                                tags.length > 0 ? { tags: { hasEvery: tags } } : {},
                                type ? { type: type } : {},
                                time > 0 ? { time: { lte: time } } : {}
                            ]
                        }
                    })];
            case 2:
                count = _a.sent();
                totalPages = Math.ceil(count / limit);
                res.json({ data: user.recipes, count: count, page: page, limit: limit, totalPages: totalPages });
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
// Get one recipes based on id
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
// Create one recipe
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
                            difficulty: req.body.difficulty,
                            type: req.body.type,
                            ingredients: req.body.ingredients,
                            isPublic: req.body.isPublic,
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
// Update one recipe
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
                            difficulty: req.body.difficulty,
                            type: req.body.type,
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
// Delete one recipe
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