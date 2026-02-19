const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(4).optional(),
  avatarColor: z.string().optional(),
  isAdmin: z.boolean().optional().default(false),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  avatarColor: z.string().optional(),
  isAdmin: z.boolean().optional(),
  password: z.string().min(4).optional(),
});

module.exports = { createUserSchema, updateUserSchema };
