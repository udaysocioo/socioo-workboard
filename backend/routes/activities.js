const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// GET /api/activities
// Supports: ?page=, ?limit=, ?targetType=, ?userId=, ?projectId=, ?from=, ?to=, ?action=
router.get('/', protect, async (req, res, next) => {
  try {
    const { limit = '50', page = '1', targetType, userId, projectId, from, to, action } = req.query;
    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where = {};

    if (targetType) where.targetType = targetType;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    // Date range
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Filter by projectId: activities whose metadata contains projectId,
    // or whose targetType is 'project' and targetId matches
    if (projectId) {
      where.OR = [
        { targetType: 'project', targetId: projectId },
        { metadata: { path: ['projectId'], equals: projectId } },
      ];
      // Also find tasks that belong to this project, then filter activities for those tasks
      const projectTasks = await prisma.task.findMany({
        where: { projectId },
        select: { id: true },
      });
      const taskIds = projectTasks.map((t) => t.id);
      if (taskIds.length > 0) {
        where.OR.push({ targetType: 'task', targetId: { in: taskIds } });
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true, avatarColor: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      pagination: {
        page: Math.max(parseInt(page) || 1, 1),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) { next(error); }
});

// GET /api/activities/export — CSV export
router.get('/export', protect, async (req, res, next) => {
  try {
    const { targetType, userId, projectId, from, to, action } = req.query;
    const where = {};

    if (targetType) where.targetType = targetType;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
    if (projectId) {
      const projectTasks = await prisma.task.findMany({
        where: { projectId },
        select: { id: true },
      });
      const taskIds = projectTasks.map((t) => t.id);
      where.OR = [
        { targetType: 'project', targetId: projectId },
        { metadata: { path: ['projectId'], equals: projectId } },
      ];
      if (taskIds.length > 0) {
        where.OR.push({ targetType: 'task', targetId: { in: taskIds } });
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    // Build CSV
    const header = 'Date,User,Action,Type,Details\n';
    const rows = activities.map((a) => {
      const date = new Date(a.createdAt).toISOString();
      const user = (a.user?.name || '').replace(/"/g, '""');
      const action = (a.action || '').replace(/"/g, '""');
      const type = (a.targetType || '').replace(/"/g, '""');
      const details = (a.details || '').replace(/"/g, '""');
      return `"${date}","${user}","${action}","${type}","${details}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activity-log.csv');
    res.send(header + rows);
  } catch (error) { next(error); }
});

module.exports = router;
