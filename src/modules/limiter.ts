import rateLimit from 'express-rate-limit'

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 10 minutes
  max: 50, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});