import express from 'express'
import router from './router'
import morgan from 'morgan'
import { protect } from './modules/auth'
import { createNewUser, signIn } from './handlers/user';

const app = express();

// Use Morgan for logging
app.use(morgan('dev'))
// Use express.json so users can send json from the client.
app.use(express.json())
// Use urlencoded for url param encoding and decoding.
app.use(express.urlencoded({extended: true}))

// Todo: remove/rewrite this (for testing only)
app.get("/", (req, res) => {
  res.status(200)
  res.json({message: 'hello'})
});

// This adds a default path to the api paths. 
// Protect is the authentication function before accessing the router.
app.use('/api', protect, router)

// This sets this handler including the path for how to call them for a post request to create new users and sign in.
// Unlike above router, these are not protected (as the user has no token yet)
app.post('/user', createNewUser)
app.post('/signin', signIn)

export default app