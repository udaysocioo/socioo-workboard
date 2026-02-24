const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createTaskSchema, updateTaskSchema, reorderTaskSchema, addCommentSchema } = require('../validators/task.validator');
const { notifyProjectMembers } = require('../helpers/notifications');

const taskInclude = {
  assignees: { select: { id: true, name: true, role: true, avatarColor: true } },
  createdBy: { select: { id: true, name: true, role: true, avatarColor: true } },
  project: { select: { id: true, name: true, color: true } },
  subtasks: true,
};

// GET /api/tasks
router.get('/', protect, async (req, res, next) => {
  try {
    const { project, status, priority, assignee, search } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignee) where.assignees = { some: { id: assignee } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(tasks);
  } catch (error) { next(error); }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) { next(error); }
});

// POST /api/tasks
router.post('/', protect, validate(createTaskSchema), async (req, res, next) => {
  try {
    const { title, description, projectId, priority, assigneeIds, labels, deadline, subtasks } = req.validated;

    // Get max order in the todo column for this project
    const maxOrderTask = await prisma.task.findFirst({
      where: { projectId, status: 'todo' },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title, description, projectId, priority, labels,
        deadline: deadline ? new Date(deadline) : null,
        assignees: assigneeIds.length ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
        order,
        createdById: req.user.id,
        subtasks: subtasks.length ? { create: subtasks } : undefined,
      },
      include: taskInclude,
    });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'task_created',
        targetType: 'task', targetId: task.id,
        details: `Created task "${task.title}"`,
        metadata: { projectId },
      },
    });

    if (assigneeIds.length > 0) {
      await notifyProjectMembers({
        projectId, excludeUserId: req.user.id,
        type: 'task_assigned', message: `New task "${task.title}" assigned`,
        relatedId: task.id, relatedType: 'task',
      });
    }

    res.status(201).json(task);
  } catch (error) { next(error); }
});

// PUT /api/tasks/:id
router.put('/:id', protect, validate(updateTaskSchema), async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignees: { select: { id: true } } },
    });
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    const oldStatus = existing.status;
    const data = { ...req.validated };

    if (data.deadline !== undefined) {
      data.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    // Handle assignees update: replace all with new set
    if (data.assigneeIds !== undefined) {
      data.assignees = { set: data.assigneeIds.map(id => ({ id })) };
      delete data.assigneeIds;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: taskInclude,
    });

    // Log status change
    if (data.status && data.status !== oldStatus) {
      const action = data.status === 'done' ? 'task_completed' : 'task_moved';
      await prisma.activity.create({
        data: {
          userId: req.user.id, action,
          targetType: 'task', targetId: task.id,
          details: `Moved "${task.title}" from ${oldStatus} to ${data.status}`,
          metadata: { from: oldStatus, to: data.status },
        },
      });
    }

    // Log reassignment
    const oldIds = existing.assignees.map(a => a.id).sort().join(',');
    const newIds = task.assignees.map(a => a.id).sort().join(',');
    if (oldIds !== newIds) {
      await prisma.activity.create({
        data: {
          userId: req.user.id, action: 'task_assigned',
          targetType: 'task', targetId: task.id,
          details: `Updated assignees for "${task.title}"`,
          metadata: { assigneeIds: task.assignees.map(a => a.id) },
        },
      });
    }

    // Log general update
    if (!data.status && oldIds === newIds) {
      await prisma.activity.create({
        data: {
          userId: req.user.id, action: 'task_updated',
          targetType: 'task', targetId: task.id,
          details: `Updated task "${task.title}"`,
        },
      });
    }

    res.json(task);
  } catch (error) { next(error); }
});

// PUT /api/tasks/reorder
router.put('/reorder', protect, validate(reorderTaskSchema), async (req, res, next) => {
  try {
    const { taskId, newStatus, newOrder, projectId } = req.validated;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldStatus = task.status;
    const pid = projectId || task.projectId;

    // Increment orders of tasks at or after newOrder in destination column
    await prisma.task.updateMany({
      where: { projectId: pid, status: newStatus, order: { gte: newOrder }, id: { not: taskId } },
      data: { order: { increment: 1 } },
    });

    // If moving between columns, decrement orders in source column
    if (oldStatus !== newStatus) {
      await prisma.task.updateMany({
        where: { projectId: pid, status: oldStatus, order: { gt: task.order }, id: { not: taskId } },
        data: { order: { decrement: 1 } },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus, order: newOrder },
      include: taskInclude,
    });

    if (oldStatus !== newStatus) {
      const action = newStatus === 'done' ? 'task_completed' : 'task_moved';
      await prisma.activity.create({
        data: {
          userId: req.user.id, action,
          targetType: 'task', targetId: task.id,
          details: `Moved "${task.title}" from ${oldStatus} to ${newStatus}`,
          metadata: { from: oldStatus, to: newStatus },
        },
      });
    }

    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await prisma.task.delete({ where: { id: req.params.id } });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'task_deleted',
        targetType: 'task', targetId: req.params.id,
        details: `Deleted task "${task.title}"`,
      },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) { next(error); }
});

// POST /api/tasks/:id/subtasks — add subtask
router.post('/:id/subtasks', protect, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Subtask title is required' });

    await prisma.subtask.create({
      data: { title: title.trim(), taskId: req.params.id },
    });

    const updated = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    res.status(201).json(updated);
  } catch (error) { next(error); }
});

// PUT /api/tasks/:id/subtasks/:subtaskId — toggle subtask
router.put('/:id/subtasks/:subtaskId', protect, async (req, res, next) => {
  try {
    const subtask = await prisma.subtask.findFirst({
      where: { id: req.params.subtaskId, taskId: req.params.id },
    });
    if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

    await prisma.subtask.update({
      where: { id: subtask.id },
      data: { completed: !subtask.completed },
    });

    if (!subtask.completed) {
      const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true } });
      await prisma.activity.create({
        data: {
          userId: req.user.id, action: 'subtask_completed',
          targetType: 'task', targetId: req.params.id,
          details: `Completed subtask "${subtask.title}" in "${task.title}"`,
        },
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    res.json(task);
  } catch (error) { next(error); }
});

// POST /api/tasks/:id/attachments
router.post('/:id/attachments', protect, upload.single('file'), async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const attachments = Array.isArray(task.attachments) ? task.attachments : [];
    attachments.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { attachments },
      include: taskInclude,
    });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'attachment_added',
        targetType: 'task', targetId: task.id,
        details: `Added attachment "${req.file.originalname}" to "${task.title}"`,
      },
    });

    res.json(updated);
  } catch (error) { next(error); }
});

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', protect, async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.taskId },
      include: { user: { select: { id: true, name: true, role: true, avatarColor: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (error) { next(error); }
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', protect, validate(addCommentSchema), async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const comment = await prisma.comment.create({
      data: { text: req.validated.text, taskId: req.params.taskId, userId: req.user.id },
      include: { user: { select: { id: true, name: true, role: true, avatarColor: true } } },
    });

    await prisma.activity.create({
      data: {
        userId: req.user.id, action: 'comment_added',
        targetType: 'comment', targetId: comment.id,
        details: `Commented on "${task.title}"`,
        metadata: { taskId: task.id },
      },
    });

    res.status(201).json(comment);
  } catch (error) { next(error); }
});

module.exports = router;
