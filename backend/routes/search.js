const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// GET /api/search?q=:query
router.get('/', protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ tasks: [], projects: [], members: [], comments: [] });
    }

    const query = q.trim();

    const [tasks, projects, members, comments] = await Promise.all([
      // Tasks: search title + description
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignees: { select: { id: true, name: true, avatarColor: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Projects: search name + description
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),

      // Members: search name + email
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, role: true, email: true, avatarColor: true },
        take: 3,
      }),

      // Comments: search text
      prisma.comment.findMany({
        where: {
          text: { contains: query, mode: 'insensitive' },
        },
        include: {
          user: { select: { id: true, name: true, avatarColor: true } },
          task: { select: { id: true, title: true, projectId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    res.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectName: t.project?.name || null,
        projectColor: t.project?.color || null,
        projectId: t.projectId,
        assignees: t.assignees,
        dueDate: t.deadline,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        taskCount: p._count.tasks,
      })),
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        email: m.email,
        avatar: m.avatarColor,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.text.length > 100 ? c.text.slice(0, 100) + '...' : c.text,
        taskTitle: c.task?.title || null,
        taskId: c.task?.id || null,
        author: c.user?.name || 'Unknown',
        authorAvatar: c.user?.avatarColor || '#6366f1',
        createdAt: c.createdAt,
      })),
    });
  } catch (error) { next(error); }
});

module.exports = router;
