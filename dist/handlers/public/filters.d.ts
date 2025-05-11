/**
 * Returns all unique tags from public recipes, with optional filtering by meal type, dish type, or cuisine
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTags: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique meal types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique dish types from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeDishTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Returns all unique cuisines from public recipes
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const getRecipeCuisines: (req: Request, res: Response, next: NextFunction) => Promise<void>;
