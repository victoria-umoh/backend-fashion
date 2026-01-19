import express from "express";
import multer from 'multer';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import adminOnly from "../middlewares/role.middleware.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);
router.route('/:id/reviews').post(protect, createProductReview);

// Admin routes
router.post("/", protect, adminOnly, upload.single('image'), createProduct);
router.put("/:id", protect, adminOnly, upload.single('image'), updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
