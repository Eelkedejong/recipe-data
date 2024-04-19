import prisma from "../db"
import { hashPassword, createJWT, comparePasswords } from "../modules/auth"
import { error } from "console"

export const createNewUser = async (req, res, next) => {
  try {
    // As we don't want to store passwords as plain text, we use the hash password function we made.
    const hash = await hashPassword(req.body.password)

    // Check if there is a user with the same username
    const userExists = await prisma.user.findUnique({
      where: {
        username: req.body.username
      }
    })

    if (userExists) {
      // Send an error message if the user already exists.
      res.status(401);
      res.json({message: "There is already a user with that username."})
      return;
    }

    // Check if there is a user with the same email
    const emailExists = await prisma.user.findUnique({
      where: {
        email: req.body.email
      }
    })

    if (emailExists) {
      res.status(401);
      res.json({message: "The email address is already used by another account."})
      return;
    }

    // Do a check if the email is formatted correctly
    const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailFormat.test(req.body.email)) {
      res.status(401);
      res.json({message: "The email address is not formatted correctly."})
      return;
    }

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
    res.json({ token: token, username: user.username })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

export const signIn = async (req, res, next) => {
  console.log(req.body)
  const { body } = req;

  try  {
    // First, try to find the user by username
    let user = await prisma.user.findUnique({
      where: { username: body.loginname }
    })

    // If no user was found, try to find the user by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: body.loginname }
      })
    }

    if (!user) {
      res.status(401);
      res.json({message: "The username, email or password did not match. Please try again."})
      return;
    }

    // Check the password of the request to the one that the username found in the database.
    // First is plain text, second is a hash.
    const isValid = await comparePasswords(body.password, user.password)

    if (!isValid) {
      res.status(401);
      res.json({message: "The username, email or password did not match. Please try again."});
      return;
    }

    // If the user is logged in, give them a token.
    const token = createJWT(user) 
    res.json({ token: token, username: user.username })
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}
