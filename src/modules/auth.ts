import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

// Function that uses bcrypt to compare a password string with a hash
export const comparePasswords = (password, hash) => {
  return bcrypt.compare(password, hash)
}

// Function that created a hased password from a password string.
// The "5" is a salt. this gives different variety of the output (makes the combination harder to guess.)
export const hashPassword = (password) => {
  return bcrypt.hash(password, 5)
}

// Create a jason web token.
export const createJWT = (user) => {
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username 
    },
    process.env.JWT_SECRET
  );
  return token;
};

// Create a jason web token with an expiration date.
export const createJWTWithExpiration = (user) => {
  const token = jwt.sign(
    { 
      id: user.id
    },
    process.env.JWT_PW_RESET,
    { 
      expiresIn: '12h' 
    }
  );
  return token;
}

// The protect function that sits before each request.
export const protect = (req, res, next) => {
  // Get the bearer token from the request header
  const bearer = req.headers.authorization

  // If there is no bearer token. You get a 401 not authorized status.
  if (!bearer) {
    res.status(401)
    res.send('not authorized')
    return
  }

  // grab the token off the bearer to see if there's an actual token.
  // This checks purely on formatting of the token.
  const [, token] = bearer.split(' ') 
  if (!token) {
    res.status(401)
    res.send('no valid token')
    return
  }

  // lastly check on actual security code.
  // Use try catch in case something goes wrong. We don't want the server to break because someone messed up.
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // user is set in the createJWT() function above.
    req.user = payload
    next()
    return
  } catch (e) {
    console.error(e);
    res.status(401);
    res.send("Wrong token");
    return;
  }
}


