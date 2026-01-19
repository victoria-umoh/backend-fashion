import express from 'express';
import { initializePayment } from '../controllers/payment.controller.js';
import { verifyPayment } from '../controllers/verifypayment.controller.js';

const router = express.Router();

// Initialize a Paystack transaction (server-side)
router.post('/initialize', initializePayment);

// Verify a Paystack transaction (server-side)
router.get('/verify/:reference', verifyPayment);

export default router;