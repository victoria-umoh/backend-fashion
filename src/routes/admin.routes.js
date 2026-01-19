import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middlewares/auth.middleware.js'; 
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
  getAllUsers
} from '../controllers/admin/admin.controller.js';
import { 
  getOrders, 
  updateOrderToDelivered,
  adminMarkOrderAsPaid
} from '../controllers/admin/order.controller.js';

const router = express.Router();

// --- Middleware Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') 
      ? cb(null, true) 
      : cb(new Error('Only image files are allowed'), false);
  },
});

// --- Dashboard Stats ---
router.get('/stats', protect, authorize('admin'), getDashboardStats);

// --- User Management ---
router.get('/users', protect, authorize('admin'), getAllUsers);

// --- Product Management ---
router.route('/products')
  .post(protect, authorize('admin'), upload.single('image'), createProduct);

router.route('/products/:id')
  .put(protect, authorize('admin'), upload.single('image'), updateProduct)
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