import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js'; 
import { uploadSingleImage } from '../middlewares/image-upload.middleware.js';
import { 
  deleteProduct, 
  createProduct, 
  updateProduct 
} from '../controllers/admin/product.controller.js';
import { 
  getDashboardStats, 
  deleteCoupon, 
  createCoupon, 
  getCoupons, 
  updateCoupon,
  getCouponStatus,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/admin/admin.controller.js';
import { 
  getOrders, 
  updateOrderToDelivered,
  adminMarkOrderAsPaid
} from '../controllers/admin/order.controller.js';

const router = express.Router();

// --- Dashboard Stats ---
router.get('/stats', protect, authorize('admin'), getDashboardStats);

// --- User Management ---
router.route('/users')
  .get(protect, authorize('admin'), getAllUsers)
  .post(protect, authorize('admin'), createUser);
router.route('/users/:id')
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

// --- Product Management ---
router.route('/products')
  .post(protect, authorize('admin'), uploadSingleImage, createProduct);

router.route('/products/:id')
  .put(protect, authorize('admin'), uploadSingleImage, updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

// --- Order Management ---
router.get('/orders', protect, authorize('admin'), getOrders);
router.put('/orders/:id/deliver', protect, authorize('admin'), updateOrderToDelivered);
router.put('/orders/:id/pay', protect, authorize('admin'), adminMarkOrderAsPaid);

// --- Coupon Management ---
// Note: Customer coupon validation is in /api/coupons/validate
// Admin Coupon CRUD
router.route('/coupons')
  .get(protect, authorize('admin'), getCoupons)
  .post(protect, authorize('admin'), createCoupon);

router.route('/coupons/:id')
  .put(protect, authorize('admin'), updateCoupon)
  .get(protect, authorize('admin'), getCouponStatus)
  .delete(protect, authorize('admin'), deleteCoupon);

export default router;