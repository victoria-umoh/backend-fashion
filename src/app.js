import express from "express";
import cors from "cors";
import morgan from "morgan";
import errorHandler from "./middlewares/error.middleware.js";

import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Normalize URLs by removing trailing slashes
const normalizeUrl = (url) => url?.replace(/\/$/, '') || url;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://fashion-frontend.netlify.app',
  process.env.FRONTEND_URL
].map(normalizeUrl).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Normalize origin for comparison
    const normalizedOrigin = normalizeUrl(origin);
    
    if (!allowedOrigins.includes(normalizedOrigin)) {
      return callback(new Error('CORS Policy block'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan("dev"));

// Serve static files
app.use(express.static('public'));

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorHandler);

// Health Check
app.get("/", (req, res) => { res.send("Victoria Fashion API is running...");});
app.get("/api/health", (req, res) => {
  res.json({ status: 'API is running successfully', timestamp: new Date() });
});

export default app;


