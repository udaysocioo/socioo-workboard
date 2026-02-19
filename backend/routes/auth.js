const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { pinLoginSchema, employeeLoginSchema, changePasswordSchema, updatePinSchema } = require('../validators/auth.validator');
const authController = require('../controllers/authController');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

const userSelect = {
  id: true, name: true, email: true, role: true,
  isAdmin: true, avatarColor: true, isActive: true,
  createdAt: true, updatedAt: true,
};

const authController = require('../controllers/authController');

// POST /api/auth/login — Email + Password login
router.post('/login', authController.login);

// POST /api/auth/refresh — Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required' });

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId }, select: userSelect });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    const accessToken = generateAccessToken(user.id);
    res.json({ token: accessToken, user });
  } catch (error) { next(error); }
});

// POST /api/auth/logout — Revoke refresh token
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) { next(error); }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/pin
router.put('/pin', protect, adminOnly, validate(updatePinSchema), async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.validated;
    if (currentPin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ message: 'Current PIN is incorrect' });
    }
    process.env.ADMIN_PIN = newPin;
    res.json({ message: 'PIN updated successfully' });
  } catch (error) { next(error); }
});

// PUT /api/auth/password
router.put('/password', protect, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validated;
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, password: true } });

    if (user.password && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });
    } else if (user.password && !currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (error) { next(error); }
});

module.exports = router;
