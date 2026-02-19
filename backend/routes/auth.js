const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { pinLoginSchema, employeeLoginSchema, changePasswordSchema, updatePinSchema } = require('../validators/auth.validator');

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

// POST /api/auth/login — Admin PIN login
router.post('/login', validate(pinLoginSchema), async (req, res, next) => {
  try {
    const { pin, userId } = req.validated;

    if (pin !== process.env.ADMIN_PIN) {
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);
      return res.json({ token: accessToken, refreshToken, user });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: userSelect,
      orderBy: { name: 'asc' },
    });
    res.json({ users, message: 'PIN verified. Select a user to continue.' });
  } catch (error) { next(error); }
});

// POST /api/auth/employee-login
router.post('/employee-login', validate(employeeLoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...userSelect, password: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.password) {
      return res.status(401).json({ message: 'No password set. Ask your admin to set a password for your account.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const { password: _, ...safeUser } = user;
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);
    res.json({ token: accessToken, refreshToken, user: safeUser });
  } catch (error) { next(error); }
});

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
