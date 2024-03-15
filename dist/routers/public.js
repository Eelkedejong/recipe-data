"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var recipe_1 = require("../handlers/public/recipe");
var filters_1 = require("../handlers/public/filters");
var publicRouter = (0, express_1.Router)();
publicRouter.get('/recipe', recipe_1.getRecipes);
publicRouter.get('/recipe/:id', recipe_1.getRecipe);
publicRouter.get('/recipe-tags', filters_1.getRecipeTags);
exports.default = publicRouter;
//# sourceMappingURL=public.js.map