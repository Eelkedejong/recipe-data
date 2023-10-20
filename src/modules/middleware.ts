import { validationResult } from "express-validator";

// This functions checks if there are validation errors, 
// and then settings a response code and shows the error in the response.
export const handleInputErrors = (req, res, next) => {
  const errors = validationResult(req)
  console.log('errors', errors)

  if (!errors.isEmpty()) {
    // 400 status code means the request contains the wrong thing.
    res.status(400);
    res.json({ errors: errors.array() });
  } else {
    //If there are no errors: continue with the next middleware or route handler.
    next()
  }
}