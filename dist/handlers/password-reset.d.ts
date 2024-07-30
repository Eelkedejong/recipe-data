/**
 * Handles the password reset request.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export declare const passwordResetRequest: (req: any, res: any, next: any) => Promise<void>;
/**
 * Updates the password for a user.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the password is updated.
 */
export declare const updatePassword: (req: any, res: any, next: any) => Promise<void>;
