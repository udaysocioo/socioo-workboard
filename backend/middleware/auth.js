const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token', code: 'NO_TOKEN', status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Use Mongoose to find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found', code: 'USER_NOT_FOUND', status: 401 });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED', status: 403 });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid', code: 'INVALID_TOKEN', status: 401 });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required', code: 'FORBIDDEN', status: 403 });
  }
};

const managerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Manager or Admin access required', code: 'FORBIDDEN', status: 403 });
  }
};

module.exports = { protect, adminOnly, managerOrAdmin };
