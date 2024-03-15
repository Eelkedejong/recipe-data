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
export declare const removeRecipeFromShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateShoppingListItems: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateIngredientByRecipeShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteShoppingList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
