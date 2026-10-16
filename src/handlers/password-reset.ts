import nodemailer from "nodemailer"
import jwt from "jsonwebtoken";
import prisma from "../db"
import { hashPassword, createJWTWithExpiration } from "../modules/auth"

/**
 * Handles the password reset request.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export const passwordResetRequest = async (req, res, next) => {
  try {
    // Check if the user exists based on email in the body of the api call
    const user = await prisma.user.findUnique({
      where: {
        email: req.body.email
      }
    })

    if (!user) {
      res.status(401);
      res.json({message: "No user with that email."})
      return;
    }

    // Create a token from our auth module
    const token = createJWTWithExpiration(user)
    const frontendUrl = process.env.FRONTEND_URL
    console.log('frontendUrl', frontendUrl)

    const subject = 'Password reset link'
    const resetLink = `${frontendUrl}/reset-password/${user.id}?token=${token}`

    const transporter = nodemailer.createTransport({
      service: process.env.SERVICE,
      auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: process.env.MAIL,
        to: req.body.email,
        subject: subject,
        html: `click the following link to reset password: <a href="${resetLink}">Reset password</a>`,
      });

      console.log(`Message sent: ${info.messageId}`);
    } catch (error) {
      console.error("email not sent", error);
      res.status(502);
      res.json({ message: "Could not send the password reset email." });
      return;
    }

    res.json({ message: "email send" })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

/**
 * Updates the password for a user.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the password is updated.
 */
export const updatePassword = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.params.id
      }
    })

    if (!user) {
      res.status(401);
      res.json({message: "Invalid user"})
      return;
    }

    // Check if the token is valid
    const payload = jwt.verify(req.query.token, process.env.JWT_PW_RESET)

    // If the token is valid, update the password
    const hash = await hashPassword(req.body.password)

    // Update the user with the new password
    await prisma.user.update({
      where: {
        id: req.params.id
      },
      data: {
        password: hash
      }
    })

    // Send the new password to the user.
    res.json({ message: "password succesfully updated" })

  } catch (e) {
    e.type = 'next'
    next(e)
  }
}