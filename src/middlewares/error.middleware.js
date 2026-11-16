const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  console.error(`Error: ${err.message}`);

  // 1. Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // 2. Mongoose duplicate key (e.g., same Coupon Name)
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // 3. Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }
  if (err.name === 'MulterError') {
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be 5 MB or smaller.'
      : 'Invalid image upload.';
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }

  res.status(err.statusCode || statusCode).json({
    message: process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'Server error'
      : message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export default errorHandler;