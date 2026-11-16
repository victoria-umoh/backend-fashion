import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';


export const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
  if (!decoded || typeof decoded !== 'object' || !decoded.id) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user || (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    res.status(401);
    throw new Error('Not authorized, token is no longer valid');
  }
  req.user = user;
  next();
});

// 2. AUTHORIZE: Checks the specific role (Do they have the right rank?)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403);
    throw new Error(`Access denied: Required role [${roles}]`);
  };
};

export default protect;
