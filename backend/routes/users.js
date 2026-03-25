const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const upload = require('../middleware/upload');

const userSelect = {
  id: true, name: true, email: true, role: true,
  isAdmin: true, avatarColor: true, avatarUrl: true, isActive: true,
  notificationPrefs: true, createdAt: true, updatedAt: true,
};

// GET /api/users — with per-user aggregate stats
router.get('/', protect, async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active !== undefined) where.isActive = active === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        ...userSelect,
        assignedTasks: {
          select: { status: true, deadline: true },
        },
        memberProjects: { select: { id: true } },
        activities: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const result = users.map((u) => {
      const tasks = u.assignedTasks || [];
      const taskStats = {
        total: tasks.length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        completed: tasks.filter((t) => t.status === 'done').length,
        overdue: tasks.filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < now).length,
      };
      return {
        id: u.id, name: u.name, email: u.email, role: u.role,
        isAdmin: u.isAdmin, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl,
        isActive: u.isActive, notificationPrefs: u.notificationPrefs,
        createdAt: u.createdAt, updatedAt: u.updatedAt,
        taskStats,
        projectCount: u.memberProjects?.length || 0,
        lastActiveAt: u.activities?.[0]?.createdAt || u.updatedAt,
      };
    });

    res.json(result);
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

// POST /api/users — admin create user
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

// PUT /api/users/:id — admin update
router.put('/:id', protect, validate(updateUserSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });

    // Non-admins can only update themselves (name)
    if (!req.user.isAdmin && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, role, email, isActive, avatarColor, isAdmin, password } = req.validated;
    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined && req.user.isAdmin) data.role = role;
    if (email !== undefined && req.user.isAdmin) data.email = email.toLowerCase();
    if (isActive !== undefined && req.user.isAdmin) data.isActive = isActive;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;
    if (isAdmin !== undefined && req.user.isAdmin) data.isAdmin = isAdmin;
    if (password && req.user.isAdmin) data.password = await bcrypt.hash(password, 10);

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

// POST /api/users/:id/avatar — upload avatar image
router.post('/:id/avatar', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // Only allow own avatar or admin
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { avatarUrl },
      select: userSelect,
    });
    res.json({ avatarUrl, user });
  } catch (error) { next(error); }
});

// PATCH /api/users/me/notification-preferences
router.patch('/me/notification-preferences', protect, async (req, res, next) => {
  try {
    const prefs = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationPrefs: prefs },
      select: userSelect,
    });
    res.json(user);
  } catch (error) { next(error); }
});

// GET /api/users/me/export — export all user data
router.get('/me/export', protect, async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignees: { some: { id: req.user.id } } },
      include: {
        subtasks: true,
        comments: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, color: true } },
        assignees: { select: { name: true } },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json({
      exportedAt: new Date().toISOString(),
      user,
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        project: t.project?.name,
        assignees: t.assignees.map((a) => a.name),
        subtasks: t.subtasks.map((s) => ({ title: s.title, completed: s.completed })),
        comments: t.comments.map((c) => ({ text: c.text, author: c.user?.name, createdAt: c.createdAt })),
      })),
    });
  } catch (error) { next(error); }
});

module.exports = router;
