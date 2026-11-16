import { rateLimit } from 'express-rate-limit';

const createLimiter = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message },
});

export const authRateLimit = createLimiter(10, 'Too many authentication attempts. Try again later.');
export const paymentRateLimit = createLimiter(20, 'Too many payment requests. Try again later.');
