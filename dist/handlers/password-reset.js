"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.passwordResetRequest = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../modules/auth");
/**
 * Handles the password reset request.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
const passwordResetRequest = async (req, res, next) => {
    try {
        // Check if the user exists based on email in the body of the api call
        const user = await db_1.default.user.findUnique({
            where: {
                email: req.body.email
            }
        });
        if (!user) {
            res.status(401);
            res.json({ message: "No user with that email." });
            return;
        }
        // Create a token from our auth module
        const token = (0, auth_1.createJWTWithExpiration)(user);
        const frontendUrl = process.env.FRONTEND_URL;
        console.log('frontendUrl', frontendUrl);
        const subject = 'Password reset link';
        const resetLink = `${frontendUrl}/reset-password/${user.id}?token=${token}`;
        try {
            const transporter = nodemailer_1.default.createTransport({
                service: process.env.SERVICE,
                auth: {
                    user: process.env.MAIL,
                    pass: process.env.PASS,
                },
            });
            await transporter.sendMail({
                from: process.env.MAIL,
                to: req.body.email,
                subject: subject,
                html: `${'click the following link to reset password:'} <a href="${resetLink}"> Reset password</a>`,
            }, (error, info) => {
                if (error) {
                    console.log(error);
                }
                console.log(`Message sent: ${info.response}`);
            });
            console.log("email sent sucessfully");
        }
        catch (error) {
            console.log(error, "email not sent");
        }
        res.json({ message: "email send" });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.passwordResetRequest = passwordResetRequest;
/**
 * Updates the password for a user.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the password is updated.
 */
const updatePassword = async (req, res, next) => {
    try {
        const user = await db_1.default.user.findUnique({
            where: {
                id: req.params.id
            }
        });
        if (!user) {
            res.status(401);
            res.json({ message: "Invalid user" });
            return;
        }
        // Check if the token is valid
        const payload = jsonwebtoken_1.default.verify(req.query.token, process.env.JWT_PW_RESET);
        // If the token is valid, update the password
        const hash = await (0, auth_1.hashPassword)(req.body.password);
        // Update the user with the new password
        await db_1.default.user.update({
            where: {
                id: req.params.id
            },
            data: {
                password: hash
            }
        });
        // Send the new password to the user.
        res.json({ message: "password succesfully updated" });
    }
    catch (e) {
        e.type = 'next';
        next(e);
    }
};
exports.updatePassword = updatePassword;
//# sourceMappingURL=password-reset.js.map