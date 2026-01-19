import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
// import asyncHandler from 'express-async-handler';


// JWT helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ================= REGISTER =================
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.error('Register error:', error);
    next(error);
  }
};

// ================= LOGIN =================
export const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && await user.matchPassword(password)) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, 
        token: generateToken(user._id),
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};


// ================= GET PROFILE =================
export const getUserProfile = async (req, res, next) => {
  try { if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    } const user = await User.findById(req.user._id).select('-password');

    if (user) {
      return res.json(user);
    } else {
      return res.status(404).json({ message: 'User not found' });
    } } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
};