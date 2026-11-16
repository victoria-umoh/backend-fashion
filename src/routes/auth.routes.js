import express from 'express';
import {
  registerUser as register,
  authUser as login,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = express.Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/verify-email', authRateLimit, verifyEmail);
router.post('/resend-verification', authRateLimit, resendVerificationEmail);
router.post('/forgot-password', authRateLimit, requestPasswordReset);
router.post('/reset-password', authRateLimit, resetPassword);

export default router;