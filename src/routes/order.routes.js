import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import protect from '../middlewares/auth.middleware.js';

const router = express.Router();

// Order is important!
// router.route('/').post(protect, addOrderItems); // This handles the Place Order button
router.post('/', protect, orderController.addOrderItems);
router.route('/myorders').get(protect, orderController.getMyOrders);
router.route('/:id').get(protect, orderController.getOrderById);
router.route('/:id/pay').put(protect, orderController.updateOrderToPaid);
router.route('/summary').get(protect, orderController.getOrderSummary);


export default router;

