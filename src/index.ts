// Use the dotenv module to make variables in the .env file globally accessable. 
// This needs to run in the entry point of the server.
import * as dotenv from 'dotenv'
dotenv.config()

import config from './config'
import app from './server'

app.listen(config.port, () => {
  console.log(`started on http://localhost:${config.port}`)
})