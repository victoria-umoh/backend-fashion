// import mongoose from "mongoose";

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB connected successfully");
//   } catch (error) {
//     console.error("MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// export default connectDB;

// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // Set Mongoose options
        mongoose.set('strictQuery', false);
        mongoose.set('bufferCommands', false); // Disable buffering - fail fast if not connected
        
        console.log('Attempting to connect to MongoDB...');
        console.log('URI:', process.env.MONGO_URI?.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials
        
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Fail after 10 seconds
            socketTimeoutMS: 45000,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });
        
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        console.error('Please check:');
        console.error('  1. MongoDB Atlas IP whitelist (add 0.0.0.0/0)');
        console.error('  2. Cluster is active (not paused)');
        console.error('  3. Credentials are correct');
        console.error('  4. Network/firewall allows MongoDB connections');
        process.exit(1);
    }
};

export default connectDB;