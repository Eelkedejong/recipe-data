import rateLimit from 'express-rate-limit'

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // one minute
  max: 50, // 50 requests per IP per window
  message: 'Too many requests, please try again later.',
});