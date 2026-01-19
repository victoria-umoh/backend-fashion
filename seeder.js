import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import products from './data/products.js';
import Product from './src/models/product.model.js';
import connectDB from './src/config/db.js';

dotenv.config();
await connectDB();

const importData = async () => {
  try {
    await Product.deleteMany(); // Clears existing products

    await Product.insertMany(products);

    console.log('Data Imported!'.green.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log('Data Destroyed!'.red.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}

// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import Product from "./models/product.model.js";
// import products from "./data/products.js";

// dotenv.config();

// const seedProducts = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     await Product.deleteMany(); // clear existing products
//     await Product.insertMany(products);
//     console.log("Products seeded!");
//     process.exit();
//   } catch (error) {
//     console.error(error);
//     process.exit(1);
//   }
// };

// seedProducts();

// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import Product from "./src/product.model.js";
// import products from "./data/products.js";

// dotenv.config();
// console.log("Number of products in file:", products.length);
// const seedProducts = async () => {
//   try {
//     // 1. Explicitly wait for connection
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("Database connected...");

//     // 2. Clear out the old "Stock"
//     const deleted = await Product.deleteMany();
//     console.log(`${deleted.deletedCount} products removed.`);

//     // 3. Verify the length of your array before inserting
//     console.log(`Attempting to seed ${products.length} products...`);

//     // 4. Insert
//     const createdProducts = await Product.insertMany(products);
    
//     console.log(`${createdProducts.length} Products seeded successfully!`);
//     process.exit();
//   } catch (error) {
//     console.error("Seeding Error:", error);
//     process.exit(1);
//   }
// };

// seedProducts();