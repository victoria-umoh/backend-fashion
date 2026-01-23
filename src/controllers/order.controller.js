import axios from 'axios';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import asyncHandler from 'express-async-handler';
import sendEmail from '../utils/sendEmail.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  // Same as addOrderItems
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    itemsSize,
    taxPrice,
    shippingPrice,
    discountAmount,
    couponCode,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else {
    const order = new Order({
      orderItems: orderItems.map((x) => ({
        ...x,
        product: x._id,
        _id: undefined
      })),
      user: req.user._id, 
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      discountAmount: discountAmount || 0,
      couponCode: couponCode || '',
      totalPrice,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const addOrderItems = asyncHandler(async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        itemsSize,
        taxPrice,
        shippingPrice,
        discountAmount,
        couponCode,
        totalPrice,
        paymentResult, // Incoming from frontend after successful payment
    } = req.body;

    if (orderItems && orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }

    // --- STOCK CHECK: Verify all items have sufficient stock ---
    for (const item of orderItems) {
        const product = await Product.findById(item.product || item._id);
        
        if (!product) {
            res.status(404);
            throw new Error(`Product not found: ${item.name}`);
        }

        if (product.countInStock < item.qty) {
            res.status(400);
            throw new Error(`Sorry, only ${product.countInStock} units of ${product.name} are left.`);
        }
    }

    // All items have sufficient stock, proceed with order creation
    const order = new Order({
        user: req.user._id,
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        itemsSize,
        taxPrice,
        shippingPrice,
        discountAmount: discountAmount || 0,
        couponCode: couponCode || '',
        totalPrice,
        // If it's not COD, mark as paid immediately using the gateway results
        isPaid: paymentMethod !== 'COD',
        paidAt: paymentMethod !== 'COD' ? Date.now() : null,
        paymentResult: paymentResult, 
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
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
  console.log('Fetching order with ID:', req.params.id);
  
  // Validate ID format
  if (!req.params.id || req.params.id === 'undefined') {
    res.status(400);
    throw new Error('Invalid order ID');
  }
  
  // .populate helps us get the user name and email associated with the order
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
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


// @desc    Update order to paid or set payment method
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      const { payment_mode, reference, payment_id } = req.body;

      // 1. Handle Cash on Delivery
      if (payment_mode === 'COD') {
        order.paymentMethod = 'Cash on Delivery';
        order.isPaid = false; // Not paid yet
      } 
      
      // 2. Handle Online Payments (Paystack or PayPal)
      else {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentMethod = payment_mode; // 'Paystack' or 'PayPal'
        
        // Store the transaction reference from the gateway
        order.paymentResult = {
          id: reference || payment_id,
          status: 'succeeded',
          update_time: Date.now(),
          email_address: req.user.email,
        };
      }

      const updatedOrder = await order.save();

    // Add this inside your updateOrderToPaid function after order.save()
    const sendOrderConfirmation = async (order) => {
      // Create a string for the items list
      const itemsHtml = order.orderItems.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} (x${item.qty})</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.price * item.qty).toFixed(2)}</td>
        </tr>
      `).join('');

      await sendEmail({
        email: order.user.email,
        subject: `Order Confirmed - #${order._id.toString().slice(-8)}`,
        message: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #333;">Thank you for your order, ${order.user.name}!</h2>
            <p>We've received your payment and are getting your items ready.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead style="background: #f8f9fa;">
                <tr>
                  <th style="text-align: left; padding: 10px;">Item</th>
                  <th style="text-align: right; padding: 10px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; font-weight: bold; font-size: 1.2rem;">
              Total Paid: ₦${order.totalPrice.toFixed(2)}
            </div>
            
            <p style="margin-top: 30px;">You can track your order status anytime in your profile.</p>
            <a href="${process.env.FRONTEND_URL}/order/${order._id}" 
              style="display: inline-block; padding: 12px 25px; background-color: #000; color: #fff; text-decoration: none; border-radius: 50px;">
              View Full Invoice
            </a>
          </div>
        `,
      });
    };
    await sendOrderConfirmation(updatedOrder);

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  const orders = await Order.find({});
  const users = await User.countDocuments(); // Count all registered users

  // Calculate Total Revenue from all orders
  const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
  const totalOrders = orders.length;

  res.json({
    totalSales: totalSales.toFixed(2),
    totalOrders,
    totalUsers: users,
  });
});