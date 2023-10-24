import nodemailer from "nodemailer"
import jwt from "jsonwebtoken";
import prisma from "../db"
import { hashPassword, createJWT, comparePasswords, createJWTWithExpiration } from "../modules/auth"
import { error } from "console"

export const createNewUser = async (req, res, next) => {
  try {
    // As we don't want to store passwords as plain text, we use the hash password function we made.
    const hash = await hashPassword(req.body.password)

    // Fill the data with content from the request body.
    // Await is used because we interact with a db and a network.
    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        email: req.body.email,
        password: hash
      }
    })

    // Create a token from our auth module
    const token = createJWT(user)

    // Fill the reponse with the JWT (Jason web token) 
    // This token containts a user id and username (see auth.ts createJWT function)
    res.json({ token })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

export const signIn = async (req, res, next) => {
  try  {
    // We are not querying for a combination of a username and password
    // We are simply checkout: does this username exist.
    const user = await prisma.user.findUnique({
      where: {
        email: req.body.email
      }
    })

    if (!user) {
      res.status(401);
      res.json({message: "Invalid email"})
      return;
    }

    // Check the password of the request to the one that the username found in the database.
    // First is plain text, second is a hash.
    const isValid = await comparePasswords(req.body.password, user.password)

    if (!isValid) {
      res.status(401);
      res.json({message: "Invalid password"});
      return;
    }

    // If the user is logged in, give them a token.
    const token = createJWT(user) 
    res.json({ token })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

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
      res.json({message: "Invalid email"})
      return;
    }

    // Create a token from our auth module
    const token = createJWTWithExpiration(user)

    const subject = 'Password reset link'
    const resetLink = `http://localhost:5173/reset-password/${user.id}?token=${token}`

    try {
      const transporter = nodemailer.createTransport({
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
          html: `<b>${'click the following link to reset password:'} <a href="${resetLink}"> Reset password</a></b>`,
      }, (error, info) => {
        if (error) {
          console.log(error);
        }
        console.log(`Message sent: ${info.response}`);
      });

      console.log("email sent sucessfully");
  } catch (error) {
      console.log(error, "email not sent");
  }

  res.json({ message: "email send" })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

export const updatePassword = async (req, res, next) => {
console.log('password', req.body.password)

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
