const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log the error (with stack functionality for non-production)
  logger.error(err.message, { 
    stack: err.stack, 
    url: req.originalUrl, 
    method: req.method,
    code: err.code 
  });

  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    status: statusCode
  };

  // Prisma known request error
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    response.status = 400;
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      response.message = `Duplicate value for ${field}`;
      response.code = 'DUPLICATE_VALUE';
    } else if (err.code === 'P2025') {
      response.status = 404;
      response.message = 'Record not found';
      response.code = 'NOT_FOUND';
    } else {
      response.message = 'Database error';
      response.code = 'DB_ERROR';
    }
    return res.status(response.status).json(response);
  }

  // Prisma validation error
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid data provided', 
      code: 'VALIDATION_ERROR', 
      status: 400 
    });
  }

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      success: false, 
      message: 'File too large. Max size is 10MB', 
      code: 'FILE_TOO_LARGE', 
      status: 400 
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token', 
      code: 'INVALID_TOKEN', 
      status: 401 
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Token expired', 
      code: 'TOKEN_EXPIRED', 
      status: 401 
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 400,
      errors: err.issues
    });
  }

  // Production: Hide stack trace, sanitize message if 500
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    response.message = 'Internal Server Error';
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
