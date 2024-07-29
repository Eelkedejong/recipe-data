/**
 * Get all Public recipes
 * See handlers/recipe.ts for the functional docs for this function
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Retrieves a recipe by its ID if it is public.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the recipe data if found, or an error message if not found.
 */
export declare const getRecipe: (req: Request, res: Response, next: NextFunction) => Promise<any>;
