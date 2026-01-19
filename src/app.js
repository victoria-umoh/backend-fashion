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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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


