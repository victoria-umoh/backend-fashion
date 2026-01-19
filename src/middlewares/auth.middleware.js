import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';


export const protect = asyncHandler(async (req, res, next) => {
  let token;
  token = req.headers.authorization?.startsWith('Bearer') 
          ? req.headers.authorization.split(' ')[1] 
          : null;

  console.log('Auth check - Token present:', !!token);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Attach the user to the request object (excluding password)
      req.user = await User.findById(decoded.id).select('-password');
      console.log('User authenticated:', req.user?._id, 'Role:', req.user?.role);
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    console.error('No token provided');
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// 2. AUTHORIZE: Checks the specific role (Do they have the right rank?)
export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorization check - User role:', req.user?.role, 'Required:', roles);
    // We check if the user's role (from the database) matches the allowed roles
    if (req.user && roles.includes(req.user.role)) {
      console.log('Authorization successful');
      next();
    } else {
      console.error('Authorization failed - User role:', req.user?.role, 'Required:', roles);
      res.status(403); // Forbidden
      throw new Error(`Access denied: Required role [${roles}]`);
    }
  };
};

export default protect;
