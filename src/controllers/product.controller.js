import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { uploadImage } from "../utils/uploadImage.js";
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
// export const getProducts = async (req, res, next) => {
//   try {
//     const products = await Product.find({});
//     console.log(`Found ${products.length} products`);
//     if (products.length > 0) {
//       console.log('Sample product image:', products[0].image);
//     }
//     res.status(200).json(products);
//   } catch (error) {
//     console.error('Get products error:', error);
//     next(error);
//   }
// };

export const getProducts = async (req, res) => {
  const { keyword = '', category = '', sort = 'newest' } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const filter = {};
  const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  const normalizedCategory = typeof category === 'string' ? category.trim() : '';

  if (normalizedKeyword) {
    const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name', 'brand', 'category'].map((field) => ({
      [field]: { $regex: escapedKeyword, $options: 'i' },
    }));
  }

  if (normalizedCategory) {
    filter.category = normalizedCategory;
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    rating: { rating: -1 },
    name: { name: 1 },
  };
  const sortBy = sortOptions[sort] || sortOptions.newest;

  if (Object.keys(req.query).length === 0) {
    return res.json(await Product.find({}).sort(sortBy));
  }

  const [products, total, categories] = await Promise.all([
    Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
    Product.distinct('category'),
  ]);

  res.json({
    products,
    total,
    page,
    pages: Math.ceil(total / limit),
    categories: categories.filter((value) => typeof value === 'string' && value.trim()).sort(),
  });
};


/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = async (req, res, next) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log('Product found - Image URL:', product.image);
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    console.log('Creating product...');
    console.log('File received:', req.file ? 'Yes' : 'No');
    console.log('Request body:', req.body);
    
    let imageUrl = req.body.image || '/assets/images/clean-blank-shirt-hanger.jpg';

    if (req.file) {
      // Upload to Cloudinary
      console.log('Uploading to Cloudinary...');
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await uploadImage(dataURI);
      imageUrl = result;
      console.log('Image uploaded to:', imageUrl);
    }

    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      image: imageUrl,
      brand: req.body.brand,
      category: req.body.category,
      countInStock: req.body.countInStock,
      sizes: req.body.sizes,
      colors: req.body.colors,
    });

    const createdProduct = await product.save();
    console.log('Image URL saved:', createdProduct.image);
    console.log('Product created:', createdProduct._id);
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Create product error:', error);
    next(error);
  }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    console.log('Updating product:', req.params.id);
    console.log('File received:', req.file ? 'Yes' : 'No');
    console.log('Request body:', req.body);

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Handle image update
    if (req.file) {
      console.log('Uploading new image to Cloudinary...');
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await uploadImage(dataURI);
      product.image = result;
      console.log('New image uploaded to:', result);
    } else if (req.body.image) {
      product.image = req.body.image;
      console.log('Using provided image URL:', req.body.image);
    }

    // Update other fields
    product.name = req.body.name || product.name;
    product.price = req.body.price !== undefined ? req.body.price : product.price;
    product.description = req.body.description || product.description;
    product.brand = req.body.brand || product.brand;
    product.category = req.body.category || product.category;
    product.countInStock = req.body.countInStock !== undefined ? req.body.countInStock : product.countInStock;
    product.sizes = req.body.sizes || product.sizes;
    product.colors = req.body.colors || product.colors;
    product.promoPrice = req.body.promoPrice !== undefined ? req.body.promoPrice : product.promoPrice;
    product.onSale = req.body.onSale !== undefined ? req.body.onSale : product.onSale;

    const updatedProduct = await product.save();
    console.log('Updated image URL:', updatedProduct.image);
    console.log('Product updated successfully');
    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    next(error);
  }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
export const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (product) {
    // 1. Check if the user has already reviewed this product
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed');
    }

    // 2. CHECK FOR VERIFIED PURCHASE
    // Look for a paid order that contains this product ID
    const hasBought = await Order.findOne({
      user: req.user._id,
      isPaid: true,
      'orderItems.product': req.params.id,
    });

    if (!hasBought) {
      res.status(400);
      throw new Error('You can only review products you have purchased and paid for.');
    }

    // 3. If they passed both checks, create the review
    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('reviews.user', 'name');

  if (product) {
    res.json(product.reviews);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});