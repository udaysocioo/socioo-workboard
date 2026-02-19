const { z } = require('zod');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Zod Schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  role: z.string().min(1, 'Role is required'),
  avatarColor: z.string().optional(),
  profilePicture: z.string().optional(),
  isAdmin: z.boolean().optional()
});

const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional()
});

/**
 * Get all users
 * @route GET /api/users
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    const users = await User.find(filter).sort('name');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user
 * @route GET /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create user (admin sets name, role, email, password)
 * @route POST /api/users
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.createUser = async (req, res, next) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    // Check if email already exists (if provided)
    if (validatedData.email) {
      const existing = await User.findOne({ email: validatedData.email.toLowerCase() });
      if (existing) {
        const error = new Error('A user with this email already exists');
        error.statusCode = 400;
        error.code = 'EMAIL_EXISTS';
        throw error;
      }
    }

    const userData = {
      name: validatedData.name,
      role: validatedData.role,
      email: validatedData.email,
      password: validatedData.password,
      password: validatedData.password,
      avatarColor: validatedData.avatarColor,
      profilePicture: validatedData.profilePicture,
      isAdmin: validatedData.isAdmin
    };

    const user = await User.create(userData);

    await Activity.create({
      user: req.user._id,
      action: 'user_added',
      targetType: 'user',
      targetId: user._id,
      details: `Added team member "${user.name}" as ${user.role}`
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('User creation failed:', error);
    next(error);
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateUser = async (req, res, next) => {
  try {
    // console.log('Update User Request Body:', req.body); // Uncomment for deep debugging
    const validatedData = updateUserSchema.parse(req.body);
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check email uniqueness if changing email
    if (validatedData.email && validatedData.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ 
        email: validatedData.email.toLowerCase(), 
        _id: { $ne: user._id } 
      });
      if (existing) {
        const error = new Error('A user with this email already exists');
        error.statusCode = 400;
        error.code = 'EMAIL_EXISTS';
        throw error;
      }
    }

    Object.assign(user, validatedData);
    await user.save();

    try {
      await Activity.create({
        user: req.user._id,
        action: 'user_updated',
        targetType: 'user',
        targetId: user._id,
        details: `Updated team member "${user.name}"`
      });
    } catch (activityError) {
      console.error('Failed to create activity log for user update:', activityError);
    }

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ success: true, data: userObj });
  } catch (error) {
    console.error('User update failed:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: error.errors 
      });
    }
    next(error);
  }
};

/**
 * Delete user (soft delete - deactivate)
 * @route DELETE /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
