const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const taskWhere = {};
    if (projectId) taskWhere.projectId = projectId;

    // Basic counts
    const [totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'done' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'in_progress' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'todo' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'review' } }),
    ]);

    // Overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        ...taskWhere,
        status: { not: 'done' },
        deadline: { lt: new Date(), not: null },
      },
    });

    // Tasks by priority via groupBy
    const byPriorityRaw = await prisma.task.groupBy({
      by: ['priority'],
      where: taskWhere,
      _count: true,
    });
    const byPriority = {};
    byPriorityRaw.forEach((p) => { byPriority[p.priority] = p._count; });

    // Tasks by status via groupBy
    const byStatusRaw = await prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: true,
    });
    const byStatus = {};
    byStatusRaw.forEach((s) => { byStatus[s.status] = s._count; });

    // Tasks by member
    const byMemberRaw = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...taskWhere, assigneeId: { not: null } },
      _count: true,
    });
    const completedByMember = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...taskWhere, assigneeId: { not: null }, status: 'done' },
      _count: true,
    });
    const completedMap = {};
    completedByMember.forEach((c) => { completedMap[c.assigneeId] = c._count; });

    const memberIds = byMemberRaw.map((m) => m.assigneeId);
    const memberUsers = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true, avatarColor: true, role: true },
    });
    const memberMap = {};
    memberUsers.forEach((u) => { memberMap[u.id] = u; });

    const byMember = byMemberRaw
      .map((m) => ({
        _id: m.assigneeId,
        total: m._count,
        completed: completedMap[m.assigneeId] || 0,
        name: memberMap[m.assigneeId]?.name || 'Unknown',
        avatarColor: memberMap[m.assigneeId]?.avatarColor || '#6366f1',
        role: memberMap[m.assigneeId]?.role || '',
      }))
      .sort((a, b) => b.total - a.total);

    // Counts
    const [activeProjects, totalMembers] = await Promise.all([
      prisma.project.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Recent activity
    const recentActivity = await prisma.activity.findMany({
      include: { user: { select: { id: true, name: true, role: true, avatarColor: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Completed this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const completedThisWeek = await prisma.task.count({
      where: { ...taskWhere, status: 'done', updatedAt: { gte: weekStart } },
    });

    res.json({
      totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks,
      overdueTasks, completedThisWeek, activeProjects, totalMembers,
      byPriority, byStatus, byMember, recentActivity,
    });
  } catch (error) { next(error); }
});

module.exports = router;
