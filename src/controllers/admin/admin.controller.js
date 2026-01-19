import asyncHandler from 'express-async-handler';
import Order from '../../models/order.model.js';
import Product from '../../models/product.model.js';
import User from '../../models/user.model.js';
import Coupon from '../../models/coupon.model.js';

// @desc    Get all dashboard data (Stats, Recent Orders, Low Stock, Chart Data)
// @route   GET /api/admin/stats 
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  // 1. Get General Counts
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  
  // 2. Calculate Total Lifetime Revenue
  const sales = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ]);
  const totalRevenue = sales.length > 0 ? sales[0].totalRevenue : 0;

  // 3. Fetch 7-Day Chart Data (MOVED INSIDE THE FUNCTION)
  const salesData = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        total: { $sum: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 7 }
  ]);

  // 4. Fetch 5 Most Recent Orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 }) 
    .limit(5)
    .populate('user', 'name');

  // 5. Fetch Low Stock Products
  const lowStockProducts = await Product.find({ countInStock: { $lt: 5 } })
    .select('name countInStock price')
    .limit(10);

  // 6. Send EVERYTING in one single combined response
  res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue: Number(totalRevenue).toFixed(2),
    recentOrders,
    lowStockProducts,
    salesData // <--- This is what your chart uses!
  });
});

// @desc    Validate coupon code
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = asyncHandler(async (req, res) => {
  const { name, cartTotal } = req.body;
  const coupon = await Coupon.findOne({ name: name.toUpperCase() });

  if (coupon && coupon.isActive && coupon.expiry > new Date()) {
    // Calculate discount amount based on cart total
    const discountAmount = cartTotal ? (cartTotal * coupon.discount) / 100 : 0;
    
    res.json({
      name: coupon.name,
      discount: coupon.discount,
      discountAmount: Number(discountAmount.toFixed(2)),
    });
  } else {
    res.status(404);
    throw new Error('Invalid or expired coupon code');
  }
});


// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({});
  res.json(coupons);
});

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = asyncHandler(async (req, res) => {
  const { name, expiry, discount } = req.body;

  const couponExists = await Coupon.findOne({ name });
  if (couponExists) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = await Coupon.create({ name, expiry, discount });
  res.status(201).json(coupon);
});

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (coupon) {
    coupon.name = req.body.name || coupon.name;
    coupon.expiry = req.body.expiry || coupon.expiry;
    coupon.discount = req.body.discount || coupon.discount;

    const updatedCoupon = await coupon.save();
    res.json(updatedCoupon);
  } else {
    res.status(404);
    throw new Error('Coupon not found');
  }
});


// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (coupon) {
    await coupon.deleteOne();
    res.json({ message: 'Coupon removed' });
  } else {
    res.status(404);
    throw new Error('Coupon not found');
  }
});


// @desc    Coupon Status
// @route   Status /api/coupons/status
// @access  Private/Admin
export const getCouponStatus = asyncHandler(async (req, res) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  
  // Set hours to 0 to compare dates accurately without time interference
  today.setHours(0, 0, 0, 0);
  
  return expiry < today ? { label: 'Expired', color: 'danger' } : { label: 'Active', color: 'success' };
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});