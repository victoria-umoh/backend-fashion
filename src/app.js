import express from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import errorHandler from "./middlewares/error.middleware.js";

import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();

const normalizeUrl = (url) => url?.replace(/\/$/, '') || url;
const configuredOrigins = () => [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
  ...(process.env.NODE_ENV === 'production' ? [] : [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ]),
].map((origin) => normalizeUrl(origin?.trim())).filter(Boolean);

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeUrl(origin);
    if (!configuredOrigins().includes(normalizedOrigin)) {
      return callback(Object.assign(new Error('Origin is not allowed by CORS policy.'), { statusCode: 403 }));
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => {
    if (req.originalUrl === '/api/payments/webhook') req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((req, res, next) => {
  req.body ??= {};
  next();
});
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve static files
app.use(express.static('public'));

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get("/", (req, res) => { res.send("Victoria Fashion API is running...");});
app.get("/api/health", (req, res) => {
  res.json({ status: 'API is running successfully', timestamp: new Date() });
});

app.use((req, res, next) => {
  next(Object.assign(new Error('Route not found.'), { statusCode: 404 }));
});
app.use(errorHandler);

export default app;


