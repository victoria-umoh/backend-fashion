import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import asyncHandler from 'express-async-handler';
import sendEmail from '../utils/sendEmail.js';
import { supportsTransactions } from '../config/db.js';
import {
  buildOrderQuote,
  decrementInventory,
  normalizeShippingAddress,
  restoreInventory,
} from '../services/checkout.service.js';
import { sendOrderConfirmation } from '../services/order-notification.service.js';

export const quoteOrder = asyncHandler(async (req, res) => {
  const quote = await buildOrderQuote(req.body);
  res.json(quote);
});

export const addOrderItems = asyncHandler(async (req, res) => {
  if (req.body.paymentMethod !== 'COD') {
    res.status(400);
    throw new Error('Online orders must use the secure payment initialization endpoint.');
  }

  const quote = await buildOrderQuote(req.body);
  const shippingAddress = normalizeShippingAddress(req.body.shippingAddress);
  const orderData = {
    ...quote,
    user: req.user._id,
    shippingAddress,
    paymentMethod: 'COD',
    isPaid: false,
  };
  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    let createdOrder;
    try {
      await session.withTransaction(async () => {
        await decrementInventory(quote.orderItems, session);
        [createdOrder] = await Order.create([orderData], { session });
      });
    } finally {
      await session.endSession();
    }
    sendOrderConfirmation(createdOrder._id).catch((error) => {
      console.error(`Order confirmation notification failed for ${createdOrder._id}:`, error.message);
    });
    return res.status(201).json(createdOrder);
  }

  const reservedStock = await decrementInventory(quote.orderItems);
  try {
    const createdOrder = await Order.create(orderData);
    sendOrderConfirmation(createdOrder._id).catch((error) => {
      console.error(`Order confirmation notification failed for ${createdOrder._id}:`, error.message);
    });
    res.status(201).json(createdOrder);
  } catch (error) {
    await restoreInventory(reservedStock);
    throw error;
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  // Finds orders where user matches req.user._id (from protect middleware)
  // const orders = await Order.find({ user: req.user._id });
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === 'undefined') {
    res.status(400);
    throw new Error('Invalid order ID');
  }
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You are not allowed to view this order.');
  }
  res.json(order);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
    .populate('user', 'name')
    .populate('orderItems.product', 'name image'); // This also fetches product details
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};


// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = asyncHandler(async (req, res) => {
  // const order = await Order.findById(req.params.id);
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    // --- SEND EMAIL NOTIFICATION ---
    try {
      await sendEmail({
        email: order.user.email,
        subject: `Your Order #${order._id.toString().slice(-8)} has been Delivered!`,
        message: `
          <h1>Great news, ${order.user.name}!</h1>
          <p>Your package has been officially marked as <strong>Delivered</strong>.</p>
          <p>We hope you enjoy your purchase! If you have any issues, reply to this email.</p>
          <br />
          <a href="${process.env.FRONTEND_URL}/order/${order._id}" style="padding: 10px 20px; background-color: black; color: white; text-decoration: none; border-radius: 5px;">View Order Details</a>
        `,
      });
    } catch (error) {
      console.error("Email failed to send, but order was updated.");
    }

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});


// @desc    Get dashboard summary stats
// @route   GET /api/orders/summary
// @access  Private/Admin
export const getOrderSummary = asyncHandler(async (req, res) => {
  const users = await User.countDocuments(); // Count all registered users
  const [totalOrders, sales] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } },
    ]),
  ]);
  const totalSales = sales[0]?.totalSales || 0;

  res.json({
    totalSales: totalSales.toFixed(2),
    totalOrders,
    totalUsers: users,
  });
});