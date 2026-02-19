const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');

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

    // Check PIN against environment variable
    if (pin !== (process.env.ADMIN_PIN || '1234')) {
      const error = new Error('Invalid PIN');
      error.statusCode = 401;
      error.code = 'INVALID_PIN';
      throw error;
    }

    // If userId provided, log in as that user
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
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

      // Remove password from response
      const userObj = { ...user };
      delete userObj.password;

      return res.json({
        success: true,
        token: generateToken(user.id),
        user: userObj
      });
    }

    // If no userId, return list of users to select from
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarColor: true,
          isAdmin: true
      }
    });

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

    // Find user by email (case insensitive handled by ensuring db is clean or using insensitive mode if supported)
    // Prisma Postgres case insensitive: mode: 'insensitive'
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated');
      error.statusCode = 403;
      error.code = 'ACCOUNT_DEACTIVATED';
      throw error;
    }

    if (!user.password) {
      const error = new Error('No password set. Ask your admin to set a password for your account.');
      error.statusCode = 401;
      error.code = 'NO_PASSWORD_SET';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Remove password from response
    const userObj = { ...user };
    delete userObj.password;

    res.json({
      success: true,
      token: generateToken(user.id),
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

    // NOTE: This only updates the PIN for the running process. 
    // In production (Render/Vercel), environment variables are immutable at runtime.
    // This endpoint effectively does nothing persistent in that environment.
    process.env.ADMIN_PIN = newPin;

    res.json({ success: true, message: 'PIN updated successfully (Runtime only)' });
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

    // Get user with password to verify
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // If user has existing password, verify current password
    if (user.password) {
      if (!currentPassword) {
        const error = new Error('Current password is required');
        error.statusCode = 400;
        error.code = 'PASSWORD_REQUIRED';
        throw error;
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 401;
        error.code = 'INVALID_PASSWORD';
        throw error;
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
