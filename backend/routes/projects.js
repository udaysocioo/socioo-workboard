const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const memberSelect = { id: true, name: true, role: true, avatarColor: true };

// ── helper: enrich project with aggregate stats ───────────────
async function enrichProject(project) {
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    select: { status: true, deadline: true },
  });
  const now = new Date();
  const taskCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < now).length;
  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const deadlines = tasks
    .filter((t) => t.deadline && t.status !== 'done')
    .map((t) => new Date(t.deadline))
    .sort((a, b) => a - b);
  const nearestDeadline = deadlines[0] || null;

  return {
    ...project,
    taskCount: project._count?.tasks ?? taskCount,
    completedCount,
    memberCount: project.members?.length || 0,
    overdueCount,
    progressPercent,
    nearestDeadline,
    _count: undefined,
  };
}

// GET /api/projects
router.get('/', protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: { select: memberSelect },
        createdBy: { select: memberSelect },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(projects.map(enrichProject));
    res.json(result);
  } catch (error) { next(error); }
});

// GET /api/projects/:id — full detail
router.get('/:id', protect, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: memberSelect },
        createdBy: { select: memberSelect },
        _count: { select: { tasks: true } },
        milestones: { orderBy: { targetDate: 'asc' } },
        tasks: {
          include: {
            assignees: { select: { id: true, name: true, avatarColor: true } },
            subtasks: true,
            _count: { select: { comments: true } },
          },
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const enriched = await enrichProject(project);
    // Group tasks by status
    const tasksByStatus = {
      todo: project.tasks.filter((t) => t.status === 'todo'),
      in_progress: project.tasks.filter((t) => t.status === 'in_progress'),
      review: project.tasks.filter((t) => t.status === 'review'),
      done: project.tasks.filter((t) => t.status === 'done'),
    };

    res.json({
      ...enriched,
      tasks: project.tasks.map((t) => ({ ...t, commentCount: t._count?.comments || 0, _count: undefined })),
      tasksByStatus,
    });
  } catch (error) { next(error); }
});

// POST /api/projects
router.post('/', protect, adminOnly, validate(createProjectSchema), async (req, res, next) => {
  try {
    const { name, description, color, members } = req.validated;

    const project = await prisma.project.create({
      data: {
        name, description, color,
        createdById: req.user.id,
        members: members.length ? { connect: members.map((id) => ({ id })) } : undefined,
      },
      include: {
        members: { select: memberSelect },
        createdBy: { select: memberSelect },
        _count: { select: { tasks: true } },
      },
    });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'project_created',
        targetType: 'project', targetId: project.id,
        details: `Created project "${project.name}"`,
      },
    });

    const enriched = await enrichProject(project);
    res.status(201).json(enriched);
  } catch (error) { next(error); }
});

// PUT /api/projects/:id
router.put('/:id', protect, adminOnly, validate(updateProjectSchema), async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const { name, description, color, status, members } = req.validated;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (color !== undefined) data.color = color;
    if (status !== undefined) data.status = status;
    if (members !== undefined) data.members = { set: members.map((id) => ({ id })) };

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        members: { select: memberSelect },
        createdBy: { select: memberSelect },
        _count: { select: { tasks: true } },
      },
    });

    const action = status === 'archived' ? 'project_archived' : 'project_updated';
    await prisma.activity.create({
      data: {
        userId: req.user.id, action,
        targetType: 'project', targetId: project.id,
        details: `${status === 'archived' ? 'Archived' : 'Updated'} project "${project.name}"`,
      },
    });

    const enriched = await enrichProject(project);
    res.json(enriched);
  } catch (error) { next(error); }
});

// DELETE /api/projects/:id
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project and its tasks deleted successfully' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════════

// GET /api/projects/:id/milestones
router.get('/:id/milestones', protect, async (req, res, next) => {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.id },
      orderBy: { targetDate: 'asc' },
    });
    res.json(milestones);
  } catch (error) { next(error); }
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', protect, async (req, res, next) => {
  try {
    const { title, targetDate, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const milestone = await prisma.milestone.create({
      data: {
        title: title.trim(),
        description: description || '',
        targetDate: targetDate ? new Date(targetDate) : null,
        projectId: req.params.id,
      },
    });
    res.status(201).json(milestone);
  } catch (error) { next(error); }
});

// PATCH /api/projects/:id/milestones/:milestoneId
router.patch('/:id/milestones/:milestoneId', protect, async (req, res, next) => {
  try {
    const milestone = await prisma.milestone.findFirst({
      where: { id: req.params.milestoneId, projectId: req.params.id },
    });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    const updated = await prisma.milestone.update({
      where: { id: req.params.milestoneId },
      data: { completed: !milestone.completed },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/projects/:id/milestones/:milestoneId
router.delete('/:id/milestones/:milestoneId', protect, async (req, res, next) => {
  try {
    await prisma.milestone.delete({ where: { id: req.params.milestoneId } });
    res.json({ message: 'Milestone deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════
// MEMBER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// POST /api/projects/:id/members — add member
router.post('/:id/members', protect, adminOnly, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { members: { connect: { id: userId } } },
      include: { members: { select: memberSelect } },
    });
    res.json(project);
  } catch (error) { next(error); }
});

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', protect, adminOnly, async (req, res, next) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { members: { disconnect: { id: req.params.userId } } },
      include: { members: { select: memberSelect } },
    });
    res.json(project);
  } catch (error) { next(error); }
});

module.exports = router;
