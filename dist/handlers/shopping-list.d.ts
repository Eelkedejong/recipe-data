/**
 * Create Shopping list. This is called when a new user is created.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 */
export declare const createShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getShoppingList: (req: any, res: any, next: any) => Promise<void>;
/**
 * Updates the shopping list based on the request body.
 * If the shopping list is empty, adds all the recipes from the request body to the shopping list.
 * If the shopping list is not empty, compares the recipes in the request body with the recipes in the shopping list and updates them accordingly.
 * Finally, returns the updated shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns The updated shopping list.
 */
export declare const updateShoppingListRecipes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Removes recipes from the shopping list.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next function.
 * @returns A JSON response with the updated shopping list.
 */
export declare const removeRecipeFromShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Updates the items and extra items in the shopping list for the authenticated user.
 *
 * @param req - The request object containing the user ID and the updated items.
 * @param res - The response object to send the updated shopping list.
 * @param next - The next function to handle errors.
 */
export declare const updateShoppingListItems: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateIngredientByRecipeShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete the Shopping list. Should be called when a user is deleted.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @returns A JSON response containing the deleted shopping list data.
 */
export declare const deleteShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
