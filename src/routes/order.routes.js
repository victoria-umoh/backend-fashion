import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/quote', protect, orderController.quoteOrder);
router.route('/summary').get(protect, authorize('admin'), orderController.getOrderSummary);
router.post('/', protect, orderController.addOrderItems);
router.route('/myorders').get(protect, orderController.getMyOrders);
router.route('/:id').get(protect, orderController.getOrderById);

export default router;

