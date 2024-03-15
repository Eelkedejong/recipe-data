import merge from 'lodash.merge'

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const stage = process.env.STAGE || 'local'

let envConfig

if (stage === 'production') {
  envConfig = require('./prod').default
} else if (stage === 'test') {
  envConfig = require('./test').default
} else {
  envConfig = require('./local').default
}

export default merge({
  // Set default variables
  stage,
  env: process.env.NODE_ENV,
  port: 3001,
  secrets: {
    jwt: process.env.JWT_SECRET,
    dbURL: process.env.DATABASE_URL
  }
}, envConfig)