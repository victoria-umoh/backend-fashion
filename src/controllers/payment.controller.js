import axios from 'axios';
import asyncHandler from 'express-async-handler';
import Order from '../models/order.model.js';
import {
  buildOrderQuote,
  normalizeShippingAddress,
} from '../services/checkout.service.js';

const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

export const initializePayment = asyncHandler(async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: 'Online payments are not configured yet.' });
  }
  if (!req.user?.email) {
    return res.status(400).json({ message: 'A valid account email is required for payment.' });
  }

  const quote = await buildOrderQuote(req.body);
  const shippingAddress = normalizeShippingAddress(req.body.shippingAddress);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const order = await Order.create({
    ...quote,
    user: req.user._id,
    shippingAddress,
    paymentMethod: 'Paystack',
    isPaid: false,
    expiresAt,
  });

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = new URL('/payment/callback', frontendUrl);
    callbackUrl.searchParams.set('orderId', order._id.toString());
    const { data: response } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: Math.round(order.totalPrice * 100),
        currency: 'NGN',
        callback_url: callbackUrl.toString(),
        metadata: { orderId: order._id.toString() },
      },
      { headers: paystackHeaders() }
    );

    if (!response.status || !response.data?.authorization_url || !response.data?.reference) {
      throw Object.assign(new Error('Payment provider did not return a valid checkout session.'), {
        statusCode: 502,
      });
    }

    order.paymentResult = {
      id: response.data.reference,
      status: 'initialized',
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    };
    await order.save();
    return res.status(201).json({
      orderId: order._id,
      reference: response.data.reference,
      authorizationUrl: response.data.authorization_url,
    });
  } catch (error) {
    await Order.deleteOne({ _id: order._id, isPaid: false });
    if (error.response) {
      return res.status(502).json({ message: 'Unable to initialize payment. Please try again.' });
    }
    throw error;
  }
});

export default { initializePayment };
