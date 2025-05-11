/**
 * Returns all unique meal types from the user's recipes
 * This function is used to generate the meal type filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique dish types from the user's recipes
 * This function is used to generate the dish type filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeDishTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique cuisines from the user's recipes
 * This function is used to generate the cuisine filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeCuisines: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique tags from the user's recipes
 * This function is used to generate the tag filter in the frontend
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTags: (req: Request, res: Response, next: NextFunction) => Promise<void>;
