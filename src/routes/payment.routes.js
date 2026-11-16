import express from 'express';
import { initializePayment } from '../controllers/payment.controller.js';
import { verifyPayment } from '../controllers/verifypayment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { paymentRateLimit } from '../middlewares/rate-limit.middleware.js';
import { handlePaystackWebhook } from '../controllers/paystack-webhook.controller.js';

const router = express.Router();

// Initialize a Paystack transaction (server-side)
router.post('/initialize', paymentRateLimit, protect, initializePayment);

router.post('/webhook', handlePaystackWebhook);

// Verify a Paystack transaction (server-side)
router.get('/verify/:reference', paymentRateLimit, protect, verifyPayment);

export default router;