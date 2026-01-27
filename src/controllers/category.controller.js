import Category from '../models/category.model.js';

// @desc    Get all categories
// @route   GET /api/categories
export const getCategories = async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
};

// @desc    Create a category (Admin only)
export const createCategory = async (req, res) => {
  const { name, image, description } = req.body;
  const categoryExists = await Category.findOne({ name });

  if (categoryExists) {
    return res.status(400).json({ message: 'Category already exists' });
  }

  const category = await Category.create({ name, image, description });
  res.status(201).json(category);
};