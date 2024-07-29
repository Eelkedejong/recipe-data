/**
 * Create a function that returns all possible types of all recipes from the user
 * This function is used to generate the type filter in the frontend
 * The function returns an array of strings
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a function that returns all possible tags of all recipes from the user
 * This function is used to generate the tag filter in the frontend
 * The function returns an array of strings
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTags: (req: Request, res: Response, next: NextFunction) => Promise<void>;
