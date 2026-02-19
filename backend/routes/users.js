const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');

const userSelect = {
  id: true, name: true, email: true, role: true,
  isAdmin: true, avatarColor: true, isActive: true,
  createdAt: true, updatedAt: true,
};

// GET /api/users
router.get('/', protect, async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active !== undefined) where.isActive = active === 'true';

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) { next(error); }
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userSelect });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) { next(error); }
});

// POST /api/users
router.post('/', protect, adminOnly, validate(createUserSchema), async (req, res, next) => {
  try {
    const { name, role, email, password, avatarColor, isAdmin } = req.validated;

    const data = { name, role, email: email.toLowerCase(), isAdmin };
    if (password) data.password = await bcrypt.hash(password, 10);
    if (avatarColor) data.avatarColor = avatarColor;

    const user = await prisma.user.create({ data, select: userSelect });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'user_added',
        targetType: 'user', targetId: user.id,
        details: `Added team member "${user.name}" as ${user.role}`,
      },
    });

    res.status(201).json(user);
  } catch (error) { next(error); }
});

// PUT /api/users/:id
router.put('/:id', protect, adminOnly, validate(updateUserSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const { name, role, email, isActive, avatarColor, isAdmin, password } = req.validated;
    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (email !== undefined) data.email = email.toLowerCase();
    if (isActive !== undefined) data.isActive = isActive;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;
    if (isAdmin !== undefined) data.isAdmin = isAdmin;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: userSelect });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'user_updated',
        targetType: 'user', targetId: user.id,
        details: `Updated team member "${user.name}"`,
      },
    });

    res.json(user);
  } catch (error) { next(error); }
});

// DELETE /api/users/:id — soft delete
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) { next(error); }
});

module.exports = router;
