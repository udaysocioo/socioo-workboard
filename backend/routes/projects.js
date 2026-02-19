const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const memberSelect = { id: true, name: true, role: true, avatarColor: true };

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

    const result = projects.map((p) => ({
      ...p,
      taskCount: p._count.tasks,
      _count: undefined,
    }));

    res.json(result);
  } catch (error) { next(error); }
});

// GET /api/projects/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: memberSelect },
        createdBy: { select: memberSelect },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ ...project, taskCount: project._count.tasks, _count: undefined });
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

    res.status(201).json({ ...project, taskCount: project._count.tasks, _count: undefined });
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

    res.json({ ...project, taskCount: project._count.tasks, _count: undefined });
  } catch (error) { next(error); }
});

// DELETE /api/projects/:id
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await prisma.project.delete({ where: { id: req.params.id } }); // cascade deletes tasks
    res.json({ message: 'Project and its tasks deleted successfully' });
  } catch (error) { next(error); }
});

module.exports = router;
