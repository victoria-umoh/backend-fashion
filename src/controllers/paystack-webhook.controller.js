import asyncHandler from 'express-async-handler';
import Order from '../models/order.model.js';
import { verifyPaystackWebhookSignature } from '../services/paystack-webhook.service.js';
import {
  reconcilePaystackPayment,
  verifyPaystackTransaction,
} from '../services/paystack.service.js';
import { sendOrderConfirmation } from '../services/order-notification.service.js';

export const handlePaystackWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.get('x-paystack-signature');
  if (!secret) return res.status(503).json({ message: 'Payment webhooks are not configured.' });
  if (!signature || !req.rawBody) {
    return res.status(400).json({ message: 'Missing webhook signature or request body.' });
  }
  if (!verifyPaystackWebhookSignature(req.rawBody, signature, secret)) {
    return res.status(401).json({ message: 'Invalid webhook signature.' });
  }

  if (req.body?.event !== 'charge.success') return res.json({ received: true });
  const reference = req.body?.data?.reference;
  if (typeof reference !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(reference)) {
    return res.status(400).json({ message: 'Invalid payment reference.' });
  }

  const order = await Order.findOne({ 'paymentResult.id': reference });
  if (!order) return res.status(404).json({ message: 'Payment order not found.' });
  const transaction = await verifyPaystackTransaction(reference);
  const result = await reconcilePaystackPayment(order, transaction);
  if (result.newlyPaid) {
    sendOrderConfirmation(result.order._id).catch((error) => {
      console.error(`Order confirmation notification failed for ${result.order._id}:`, error.message);
    });
  }
  return res.json({
    received: true,
    orderId: result.order._id,
    refundStatus: result.refundStatus || undefined,
  });
});
