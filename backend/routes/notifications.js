const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// GET /api/notifications — paginated, unread first
// Supports: ?page=, ?limit=, ?unreadOnly=true
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = '1', limit = '30', unreadOnly } = req.query;
    const take = Math.min(parseInt(limit) || 30, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page) || 1,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) { next(error); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });
    res.json({ count });
  } catch (error) { next(error); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted' });
  } catch (error) { next(error); }
});

module.exports = router;
