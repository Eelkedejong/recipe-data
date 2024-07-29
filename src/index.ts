import * as dotenv from 'dotenv'
dotenv.config()

import config from './config'
import app from './server'

// Localhost server (for development and testing only)
app.listen(config.port, () => {
  console.log(`started on http://localhost:${config.port}`)
})