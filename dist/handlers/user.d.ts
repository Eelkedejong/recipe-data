/**
 * Creates a new user with the provided username, email, and password.
 *
 * @param req - The request object containing the user data.
 * @param res - The response object used to send the server response.
 * @param next - The next function used to pass the error to the error handling middleware.
 * @returns A JSON response containing a JWT token and the username of the created user.
 * @throws If there is an error during the user creation process.
 */
export declare const createNewUser: (req: any, res: any, next: any) => Promise<void>;
/**
 * Sign in a user.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the sign-in process is complete.
 */
export declare const signIn: (req: any, res: any, next: any) => Promise<void>;
