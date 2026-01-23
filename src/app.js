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

// CORS Configuration
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));

const allowedOrigins = [
  'http://localhost:3000',               // Local React (Standard)
  'http://localhost:5173',               // Local Vite (If you used Vite)
  'https://fashion-frontend.netlify.app' // Live Production
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
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


