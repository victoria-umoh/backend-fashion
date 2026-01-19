import Product from "../../models/product.model.js";
import asyncHandler from "express-async-handler";
import { uploadImage } from "../../utils/uploadImage.js";


// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.remove();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/admin/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, 
    price, 
    description, 
    image, 
    brand, 
    sizes,
    colors,
    category, 
    countInStock 
  } = req.body;

  // let imageUrl = image || '/images/sample.jpg';
  let imageUrl = image ;

  // Handle file upload if present
  if (req.file) {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    imageUrl = await uploadImage(dataURI);
  }

  const product = new Product({
    name: name || 'Unnamed Product',
    price: price || 0,
    image: imageUrl,
    brand: brand || 'Generic',
    sizes: sizes && sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
    colors: colors || [],
    category: category || 'General',
    countInStock: countInStock || 0,
    description: description || 'No description provided',
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  console.log('Admin updateProduct called for ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('File present:', !!req.file);
  
  const { 
    name, 
    price, 
    description, 
    image, 
    brand, 
    sizes,
    colors,
    category, 
    countInStock 
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    console.log('Product found, updating...');
    
    // Handle file upload if present
    if (req.file) {
      console.log('Uploading new image...');
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      product.image = await uploadImage(dataURI);
      console.log('Image uploaded:', product.image);
    } else if (image) {
      product.image = image;
      console.log('Using provided image URL:', image);
    }

    product.name = name || product.name;
    product.price = price !== undefined ? price : product.price;
    product.description = description || product.description;
    product.brand = brand || product.brand;
    product.sizes = sizes || product.sizes;
    product.colors = colors || product.colors;
    product.category = category || product.category;
    product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;

    const updatedProduct = await product.save();
    console.log('Product updated successfully');
    res.json(updatedProduct);
  } else {
    console.error('Product not found:', req.params.id);
    res.status(404);
    throw new Error('Product not found');
  }
});

export { deleteProduct, createProduct, updateProduct };