import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in the backend .env before starting the server.');
}
if (process.env.NODE_ENV === 'production') {
  const requiredProductionConfig = [
    'MONGO_URI',
    'FRONTEND_URL',
    'PAYSTACK_SECRET_KEY',
    'EMAIL_USER',
    'EMAIL_PASS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'SHIPPING_FEE',
    'FREE_SHIPPING_THRESHOLD',
    'TAX_PERCENT',
  ];
  const missingConfig = requiredProductionConfig.filter((key) => !process.env[key]);
  if (missingConfig.length) {
    throw new Error(`Missing production configuration: ${missingConfig.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (!process.env.PAYSTACK_SECRET_KEY.startsWith('sk_live_')) {
    throw new Error('A live Paystack secret key must be configured in production.');
  }
  const frontendUrl = new URL(process.env.FRONTEND_URL);
  if (frontendUrl.protocol !== 'https:' || frontendUrl.origin !== process.env.FRONTEND_URL.replace(/\/$/, '')) {
    throw new Error('FRONTEND_URL must be an HTTPS origin without a path in production.');
  }
  for (const key of ['SHIPPING_FEE', 'FREE_SHIPPING_THRESHOLD', 'TAX_PERCENT']) {
    const value = Number(process.env[key]);
    if (!Number.isFinite(value) || value < 0 || (key === 'TAX_PERCENT' && value > 100)) {
      throw new Error(`${key} must be a valid non-negative number${key === 'TAX_PERCENT' ? ' no greater than 100' : ''}.`);
    }
  }
}

import connectDB, { supportsTransactions } from './src/config/db.js';
import app from './src/app.js';

const PORT = process.env.PORT || 5000;

// Database Connection & Server Start
connectDB().then(() => {
  if (process.env.NODE_ENV === 'production' && !supportsTransactions()) {
    throw new Error('Production MongoDB must support transactions (replica set or sharded cluster).');
  }
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to database:', error);
  process.exit(1);
});