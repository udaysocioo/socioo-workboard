const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');

/**
 * @typedef {Object} ServiceResponse
 * @property {boolean} success
 * @property {string} message
 * @property {Object} [data]
 */

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Zod Schemas
const loginSchema = z.object({
  pin: z.string().min(1, 'PIN is required'),
  userId: z.string().optional()
});

const employeeLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const updatePinSchema = z.object({
  currentPin: z.string().min(1, 'Current PIN is required'),
  newPin: z.string().min(4, 'New PIN must be at least 4 characters')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4, 'New password must be at least 4 characters')
});

/**
 * Admin login with PIN + select user
 * @route POST /api/auth/login
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.login = async (req, res, next) => {
  try {
    const { pin, userId } = loginSchema.parse(req.body);

    if (pin !== process.env.ADMIN_PIN) {
      const error = new Error('Invalid PIN');
      error.statusCode = 401;
      error.code = 'INVALID_PIN';
      throw error;
    }

    // If userId provided, log in as that user
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      if (!user.isActive) {
        const error = new Error('Account is deactivated');
        error.statusCode = 403;
        error.code = 'ACCOUNT_DEACTIVATED';
        throw error;
      }

      return res.json({
        success: true,
        token: generateToken(user._id),
        user
      });
    }

    // If no userId, return list of users to select from
    const users = await User.find({ isActive: true }).sort('name');
    res.json({ 
      success: true, 
      users, 
      message: 'PIN verified. Select a user to continue.' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Employee login with email + password
 * @route POST /api/auth/employee-login
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.employeeLogin = async (req, res, next) => {
  try {
    const { email, password } = employeeLoginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.password) {
      const error = new Error('No password set. Ask your admin to set a password for your account.');
      error.statusCode = 401;
      error.code = 'NO_PASSWORD_SET';
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      token: generateToken(user._id),
      user: userObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify token and get current user
 * @route GET /api/auth/me
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getMe = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update admin PIN (admin only)
 * @route PUT /api/auth/pin
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updatePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = updatePinSchema.parse(req.body);

    if (currentPin !== process.env.ADMIN_PIN) {
      const error = new Error('Current PIN is incorrect');
      error.statusCode = 401;
      error.code = 'INVALID_PIN';
      throw error;
    }

    process.env.ADMIN_PIN = newPin;

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Change own password (any authenticated user)
 * @route PUT /api/auth/password
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user._id).select('+password');

    // If user has existing password, verify current password
    if (user.password) {
      if (!currentPassword) {
        const error = new Error('Current password is required');
        error.statusCode = 400;
        error.code = 'PASSWORD_REQUIRED';
        throw error;
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 401;
        error.code = 'INVALID_PASSWORD';
        throw error;
      }
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
