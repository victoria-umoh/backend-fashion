import asyncHandler from 'express-async-handler';
import Order from '../models/order.model.js';
import {
  reconcilePaystackPayment,
  verifyPaystackTransaction,
} from '../services/paystack.service.js';
import { sendOrderConfirmation } from '../services/order-notification.service.js';

export const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(reference)) {
    return res.status(400).json({ message: 'Invalid payment reference.' });
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: 'Online payments are not configured yet.' });
  }

  const order = await Order.findOne({
    'paymentResult.id': reference,
    user: req.user._id,
  });
  if (!order) return res.status(404).json({ message: 'Payment order not found.' });
  const transaction = await verifyPaystackTransaction(reference);
  const result = await reconcilePaystackPayment(order, transaction);
  if (result.refundStatus) {
    return res.status(409).json({
      message: result.message || 'A refund is being processed for this payment.',
      refundStatus: result.refundStatus,
    });
  }
  if (result.newlyPaid) {
    sendOrderConfirmation(result.order._id).catch((error) => {
      console.error(`Order confirmation notification failed for ${result.order._id}:`, error.message);
    });
  }
  return res.json(result.order);
});
