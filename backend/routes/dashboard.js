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

    // Tasks by member (many-to-many: count per assignee)
    const tasksWithAssignees = await prisma.task.findMany({
      where: { ...taskWhere, assignees: { some: {} } },
      select: { id: true, status: true, assignees: { select: { id: true } } },
    });
    const memberCounts = {};
    tasksWithAssignees.forEach((t) => {
      t.assignees.forEach((a) => {
        if (!memberCounts[a.id]) memberCounts[a.id] = { total: 0, completed: 0 };
        memberCounts[a.id].total++;
        if (t.status === 'done') memberCounts[a.id].completed++;
      });
    });

    const memberIds = Object.keys(memberCounts);
    const memberUsers = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true, avatarColor: true, role: true },
    });
    const memberMap = {};
    memberUsers.forEach((u) => { memberMap[u.id] = u; });

    const byMember = memberIds
      .map((id) => ({
        _id: id,
        total: memberCounts[id].total,
        completed: memberCounts[id].completed,
        name: memberMap[id]?.name || 'Unknown',
        avatarColor: memberMap[id]?.avatarColor || '#6366f1',
        role: memberMap[id]?.role || '',
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
