import axios from 'axios';
import Order from '../../models/order.model.js';
import asyncHandler from 'express-async-handler';
import sendEmail from '../../utils/sendEmail.js';

// @desc    Admin manually marks COD order as Paid
// @route   PUT /api/admin/orders/:id/pay
// @access  Private/Admin
export const adminMarkOrderAsPaid = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      // Logic: If it was COD, we are now confirming we got the cash
      order.isPaid = true;
      order.paidAt = Date.now();
      
      // We record that an admin did this manually
      order.paymentResult = {
        id: `MANUAL_CONFIRM_${Date.now()}`,
        status: 'COMPLETED',
        update_time: Date.now(),
        email_address: req.user.email, // Admin's email
      };

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// @desc    Update order to delivered
// @route   PUT /api/admin/orders/:id/deliver
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


// @desc    Get dashboard stats
// @route   GET /api/orders/stats
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  
  // Calculate Total Revenue
  const sales = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPrice' },
      },
    },
  ]);

  const totalRevenue = sales.length > 0 ? sales[0].totalRevenue : 0;

  res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue: totalRevenue.toFixed(2),
  });
});


export const getOrders = asyncHandler(async (req, res) => {
  const allOrders = await Order.find({}).populate('user', 'name');
  
  // Only send orders that actually have a linked user
  const validOrders = allOrders.filter(order => order.user !== null);
  
  res.json(validOrders);
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

