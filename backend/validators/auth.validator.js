const { z } = require('zod');

const pinLoginSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 characters'),
  userId: z.string().optional(),
});

const employeeLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4, 'New password must be at least 4 characters'),
});

const updatePinSchema = z.object({
  currentPin: z.string().min(4),
  newPin: z.string().min(4, 'New PIN must be at least 4 characters'),
});

module.exports = { pinLoginSchema, employeeLoginSchema, changePasswordSchema, updatePinSchema };
