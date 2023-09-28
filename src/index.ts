// Use the dotenv module to make variables in the .env file globally accessable. 
// This needs to run in the entry point of the server.
import * as dotenv from 'dotenv'
dotenv.config()

import app from './server'

app.listen(3001, () => {
  console.log('started on http://localhost:3001')
})