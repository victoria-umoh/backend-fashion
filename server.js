import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
dotenv.config();

import connectDB from './src/config/db.js';
import app from './src/app.js';
import authRoutes from './src/routes/auth.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';

const PORT = process.env.PORT || 5000;

// Middleware (already in app.js but need to be before routes in server.js)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Additional routes not in app.js
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Static Folder for images
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Database Connection & Server Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to database:', error);
  process.exit(1);
});