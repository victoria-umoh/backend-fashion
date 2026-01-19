import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { validateCoupon } from '../controllers/admin/admin.controller.js';

const router = express.Router();

// @route   POST /api/coupons/validate
// @desc    Validate coupon code (for customers during checkout)
// @access  Private
router.post('/validate', protect, validateCoupon);

export default router;
