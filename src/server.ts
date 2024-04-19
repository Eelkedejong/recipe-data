import express from 'express'
import router from './routers/router'
import publicRouter from './routers/public'
import cors from 'cors'
import morgan from 'morgan'
import { protect } from './modules/auth'
import { limiter } from './modules/limiter'
import { createNewUser, signIn } from './handlers/user';
import { passwordResetRequest, updatePassword } from './handlers/password-reset';

const app = express();

// Enable cors
app.use(cors()) 
// Use Morgan for logging
app.use(morgan('dev'))
// Use express.json so users can send json from the client.
app.use(express.json())
// Use urlencoded for url param encoding and decoding.
app.use(express.urlencoded({extended: true}))
// Add Rate limiter
app.use(limiter)

// Todo: remove/rewrite this (for testing only)
app.get("/", (req, res) => {
  res.status(200)
  res.json({message: 'server is live'})
});

// This adds a default path to the api paths. 
// Protect is the authentication function before accessing the router.
app.use('/api', protect, router)

// This adds a default path to the public api paths.
app.use('/public', publicRouter)

// This sets this handler including the path for how to call them for a post request to create new users and sign in.
// Unlike above router, these are not protected (as the user has no token yet)
app.post('/user', createNewUser)
app.post('/signin', signIn)
app.post('/forgot-password', passwordResetRequest)
app.post('/password-reset/:id', updatePassword)

export default app