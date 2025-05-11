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
export declare const getRecipes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Retrieves a recipe by its ID.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the recipe is retrieved.
 */
export declare const getRecipe: (req: any, res: any, next: any) => Promise<void>;
/**
 * Creates a new recipe.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const createRecipe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Updates a recipe in the database.
 *
 * @param req - The request object containing the recipe data.
 * @param res - The response object used to send the updated recipe data.
 * @param next - The next function to be called in the middleware chain.
 */
export declare const updateRecipe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Deletes a recipe.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response containing the deleted recipe data.
 */
export declare const deleteRecipe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
