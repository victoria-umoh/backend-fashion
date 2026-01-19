import express from 'express';
import { verifyPayment } from '../controllers/verifypayment.controller.js';
import protect from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/verify/:reference', protect, verifyPayment);

export default router;