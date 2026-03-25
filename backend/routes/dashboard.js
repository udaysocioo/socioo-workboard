const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// ─── helpers ────────────────────────────────────────────────────────
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function weekStart() { return daysAgo(7); }

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/stats
// ═══════════════════════════════════════════════════════════════════
router.get('/stats', protect, async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const taskWhere = {};
    if (projectId) taskWhere.projectId = projectId;

    const now = new Date();
    const thisWeekStart = weekStart();
    const lastWeekStart = daysAgo(14);
    const thisMonthStart = daysAgo(30);

    // ── basic counts ──────────────────────────────────────────────
    const [
      totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'done' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'in_progress' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'todo' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'review' } }),
    ]);

    // overdue
    const overdueTasks = await prisma.task.count({
      where: {
        ...taskWhere,
        status: { not: 'done' },
        deadline: { lt: now, not: null },
      },
    });

    // completed this week / month
    const completedThisWeek = await prisma.task.count({
      where: { ...taskWhere, status: 'done', updatedAt: { gte: thisWeekStart } },
    });
    const completedThisMonth = await prisma.task.count({
      where: { ...taskWhere, status: 'done', updatedAt: { gte: thisMonthStart } },
    });

    // projects + members
    const [activeProjects, totalMembers] = await Promise.all([
      prisma.project.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // ── week-over-week comparison ─────────────────────────────────
    // last week counts (7-14 days ago)
    const [
      prevTotal, prevCompleted, prevInProgress, prevOverdue,
      prevTodo, prevReview, prevCompletedWeek,
    ] = await Promise.all([
      prisma.task.count({ where: { ...taskWhere, createdAt: { lt: thisWeekStart } } }),
      prisma.task.count({ where: { ...taskWhere, status: 'done', updatedAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
      prisma.task.count({ where: { ...taskWhere, status: 'in_progress', updatedAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
      // approximate prev overdue by counting tasks that were overdue as of last week start
      prisma.task.count({
        where: {
          ...taskWhere,
          status: { not: 'done' },
          deadline: { lt: thisWeekStart, not: null },
        },
      }),
      prisma.task.count({ where: { ...taskWhere, status: 'todo', updatedAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
      prisma.task.count({ where: { ...taskWhere, status: 'review', updatedAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
      prisma.task.count({ where: { ...taskWhere, status: 'done', updatedAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
    ]);

    const weekOverWeekChange = {
      totalTasks: pctChange(totalTasks, prevTotal || totalTasks),
      completed: pctChange(completedThisWeek, prevCompletedWeek),
      inProgress: pctChange(inProgressTasks, prevInProgress || inProgressTasks),
      overdue: pctChange(overdueTasks, prevOverdue || overdueTasks),
      todo: pctChange(todoTasks, prevTodo || todoTasks),
      review: pctChange(reviewTasks, prevReview || reviewTasks),
    };

    // ── overdue by project ────────────────────────────────────────
    const overdueRaw = await prisma.task.findMany({
      where: {
        status: { not: 'done' },
        deadline: { lt: now, not: null },
      },
      select: { projectId: true, project: { select: { name: true } } },
    });
    const overdueMap = {};
    overdueRaw.forEach((t) => {
      if (!overdueMap[t.projectId]) {
        overdueMap[t.projectId] = { projectId: t.projectId, projectName: t.project.name, count: 0 };
      }
      overdueMap[t.projectId].count++;
    });
    const overdueByProject = Object.values(overdueMap).sort((a, b) => b.count - a.count);

    // ── upcoming deadlines (next 72 hours) ────────────────────────
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        status: { not: 'done' },
        deadline: { gte: now, lte: in72h },
      },
      include: {
        assignees: { select: { id: true, name: true, avatarColor: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 20,
    });

    // also get already-overdue tasks for the panel
    const overdueSoonTasks = await prisma.task.findMany({
      where: {
        status: { not: 'done' },
        deadline: { lt: now, not: null },
      },
      include: {
        assignees: { select: { id: true, name: true, avatarColor: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { deadline: 'desc' },
      take: 10,
    });

    // ── by priority / status / member (keep existing) ─────────────
    const byPriorityRaw = await prisma.task.groupBy({
      by: ['priority'],
      where: taskWhere,
      _count: true,
    });
    const byPriority = {};
    byPriorityRaw.forEach((p) => { byPriority[p.priority] = p._count; });

    const byStatusRaw = await prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: true,
    });
    const byStatus = {};
    byStatusRaw.forEach((s) => { byStatus[s.status] = s._count; });

    // by member
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

    // recent activity
    const recentActivity = await prisma.activity.findMany({
      include: { user: { select: { id: true, name: true, role: true, avatarColor: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks,
      overdueTasks, completedThisWeek, completedThisMonth,
      activeProjects, totalMembers,
      weekOverWeekChange,
      overdueByProject,
      upcomingDeadlines: [...overdueSoonTasks, ...upcomingDeadlines],
      byPriority, byStatus, byMember, recentActivity,
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/charts
// ═══════════════════════════════════════════════════════════════════
router.get('/charts', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const since = daysAgo(days);

    // ── workload distribution (per member breakdown by status) ────
    const allAssignedTasks = await prisma.task.findMany({
      where: { assignees: { some: {} } },
      select: { status: true, assignees: { select: { id: true, name: true, avatarColor: true } } },
    });
    const workloadMap = {};
    allAssignedTasks.forEach((t) => {
      t.assignees.forEach((a) => {
        if (!workloadMap[a.id]) {
          workloadMap[a.id] = { userId: a.id, name: a.name, avatar: a.avatarColor, todo: 0, inProgress: 0, review: 0, done: 0 };
        }
        const bucket = workloadMap[a.id];
        if (t.status === 'todo') bucket.todo++;
        else if (t.status === 'in_progress') bucket.inProgress++;
        else if (t.status === 'review') bucket.review++;
        else if (t.status === 'done') bucket.done++;
      });
    });
    const workloadDistribution = Object.values(workloadMap).sort((a, b) =>
      (b.todo + b.inProgress + b.review + b.done) - (a.todo + a.inProgress + a.review + a.done)
    );

    // ── tasks by priority ─────────────────────────────────────────
    const byPriorityRaw = await prisma.task.groupBy({
      by: ['priority'],
      _count: true,
    });
    const tasksByPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    byPriorityRaw.forEach((p) => { tasksByPriority[p.priority] = p._count; });

    // ── task velocity (created vs completed per day) ──────────────
    const recentTasks = await prisma.task.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const recentDone = await prisma.task.findMany({
      where: { status: 'done', updatedAt: { gte: since } },
      select: { updatedAt: true },
    });

    // build date buckets
    const velocityMap = {};
    for (let i = 0; i < days; i++) {
      const d = daysAgo(days - 1 - i);
      velocityMap[dateKey(d)] = { date: dateKey(d), created: 0, completed: 0 };
    }
    recentTasks.forEach((t) => {
      const k = dateKey(new Date(t.createdAt));
      if (velocityMap[k]) velocityMap[k].created++;
    });
    recentDone.forEach((t) => {
      const k = dateKey(new Date(t.updatedAt));
      if (velocityMap[k]) velocityMap[k].completed++;
    });
    const taskVelocity = Object.values(velocityMap);

    // ── project progress ──────────────────────────────────────────
    const projects = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        tasks: { select: { id: true, status: true, deadline: true } },
        members: { select: { id: true, name: true, avatarColor: true } },
      },
    });
    const now = new Date();
    const projectProgress = projects.map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status === 'done').length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const nearestDeadline = p.tasks
        .filter((t) => t.deadline && t.status !== 'done')
        .map((t) => new Date(t.deadline))
        .sort((a, b) => a - b)[0];
      const daysUntilDeadline = nearestDeadline
        ? Math.ceil((nearestDeadline - now) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        status: p.status,
        totalTasks: total,
        completedTasks: completed,
        progressPercent: pct,
        members: p.members,
        daysUntilDeadline,
      };
    });

    // ── burndown (current week) ───────────────────────────────────
    const weekStartDate = daysAgo(6); // last 7 days including today
    const weekTasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdAt: { lte: new Date() } },
        ],
      },
      select: { status: true, createdAt: true, updatedAt: true },
    });
    const totalOpen = weekTasks.filter((t) => t.status !== 'done').length + weekTasks.filter((t) => t.status === 'done').length;
    const burndownData = [];
    for (let i = 0; i <= 6; i++) {
      const d = daysAgo(6 - i);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      // completed by this date
      const completedByDate = weekTasks.filter((t) =>
        t.status === 'done' && new Date(t.updatedAt) <= dEnd
      ).length;
      const remaining = totalOpen - completedByDate;
      const idealRemaining = Math.round(totalOpen - (totalOpen / 6) * i);
      burndownData.push({
        date: dateKey(d),
        actual: Math.max(0, remaining),
        ideal: Math.max(0, idealRemaining),
      });
    }

    res.json({
      workloadDistribution,
      tasksByPriority,
      taskVelocity,
      projectProgress,
      burndownData,
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/feed
// ═══════════════════════════════════════════════════════════════════
router.get('/feed', protect, async (req, res, next) => {
  try {
    // last 10 activity entries
    const activities = await prisma.activity.findMany({
      include: {
        user: { select: { id: true, name: true, avatarColor: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // last 5 comments
    const recentComments = await prisma.comment.findMany({
      include: {
        user: { select: { id: true, name: true, avatarColor: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({ activities, recentComments });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/my-productivity
// ═══════════════════════════════════════════════════════════════════
router.get('/my-productivity', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Start of current week (Monday)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    // Completed this week
    const completedThisWeek = await prisma.activity.count({
      where: {
        userId,
        action: 'task_completed',
        createdAt: { gte: weekStart },
      },
    });

    // Completed this month (last 30 days)
    const monthStart = daysAgo(30);
    const completedThisMonth = await prisma.activity.count({
      where: {
        userId,
        action: 'task_completed',
        createdAt: { gte: monthStart },
      },
    });

    // Average per day this month
    const avgPerDay = completedThisMonth > 0 ? Math.round((completedThisMonth / 30) * 10) / 10 : 0;

    // Completion streak: count consecutive days with at least one task_completed
    const last30Activities = await prisma.activity.findMany({
      where: {
        userId,
        action: 'task_completed',
        createdAt: { gte: daysAgo(60) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const completionDays = new Set();
    last30Activities.forEach((a) => {
      completionDays.add(dateKey(new Date(a.createdAt)));
    });

    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = daysAgo(i);
      if (completionDays.has(dateKey(d))) {
        streak++;
      } else if (i > 0) {
        break; // streak broken
      }
      // skip today if no completions yet (don't break streak)
    }

    // Weekly target (configurable, default 10)
    const weeklyTarget = 10;

    res.json({
      completedThisWeek,
      weeklyTarget,
      completedThisMonth,
      avgPerDay,
      streak,
    });
  } catch (error) { next(error); }
});

module.exports = router;
