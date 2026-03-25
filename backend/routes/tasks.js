const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createTaskSchema, updateTaskSchema, reorderTaskSchema, addCommentSchema } = require('../validators/task.validator');
const { createNotification, createNotifications, notifyProjectMembers } = require('../helpers/notifications');

// Helper to emit socket events
const emit = (req, event, room, data) => {
  const io = req.app.get('io');
  if (io) io.to(room).emit(event, data);
};

const taskInclude = {
  assignees: { select: { id: true, name: true, role: true, avatarColor: true } },
  createdBy: { select: { id: true, name: true, role: true, avatarColor: true } },
  project: { select: { id: true, name: true, color: true } },
  subtasks: true,
  _count: { select: { comments: true } },
};

// GET /api/tasks
// Supports: ?project=, ?status=, ?priority=, ?assignee=, ?search=, ?label=, ?dueBefore=, ?projectIds=, ?assigneeIds=, ?priorities=
router.get('/', protect, async (req, res, next) => {
  try {
    const { project, status, priority, assignee, search, label, dueBefore, projectIds, assigneeIds, priorities } = req.query;
    const where = {};

    // Single project or multi-project filter
    if (project) where.projectId = project;
    if (projectIds) {
      const ids = projectIds.split(',').filter(Boolean);
      if (ids.length) where.projectId = { in: ids };
    }

    if (status) where.status = status;

    // Single priority or multi-priority filter
    if (priority) where.priority = priority;
    if (priorities) {
      const pList = priorities.split(',').filter(Boolean);
      if (pList.length) where.priority = { in: pList };
    }

    // Single assignee or multi-assignee filter
    if (assignee) where.assignees = { some: { id: assignee } };
    if (assigneeIds) {
      const aIds = assigneeIds.split(',').filter(Boolean);
      if (aIds.length) where.assignees = { some: { id: { in: aIds } } };
    }

    // Label filter (tasks containing this label)
    if (label) where.labels = { has: label };

    // Due before date
    if (dueBefore) {
      where.deadline = { lte: new Date(dueBefore), not: null };
    }

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

    // Attach commentCount from _count
    const result = tasks.map((t) => ({
      ...t,
      commentCount: t._count?.comments || 0,
      _count: undefined,
    }));

    res.json(result);
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
    res.json({ ...task, commentCount: task._count?.comments || 0, _count: undefined });
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

    // Notify each assignee individually (exclude creator)
    if (assigneeIds.length > 0) {
      const notifs = assigneeIds
        .filter((id) => id !== req.user.id)
        .map((id) => ({
          userId: id,
          type: 'task_assigned',
          message: `${req.user.name} assigned you to "${task.title}"`,
          relatedId: task.id,
          relatedType: 'task',
        }));
      if (notifs.length) await createNotifications(notifs);
    }

    emit(req, 'task:created', `project:${task.projectId}`, task);
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

    // Log status change + notify
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

      // Notify task creator when completed by someone else
      if (data.status === 'done' && existing.createdById !== req.user.id) {
        await createNotification({
          userId: existing.createdById,
          type: 'task_moved',
          message: `${req.user.name} completed "${task.title}"`,
          relatedId: task.id,
          relatedType: 'task',
        });
      }

      // Notify assignees about status change (exclude the mover)
      const assigneeNotifs = task.assignees
        .filter((a) => a.id !== req.user.id)
        .map((a) => ({
          userId: a.id,
          type: 'task_moved',
          message: `${req.user.name} moved "${task.title}" to ${data.status}`,
          relatedId: task.id,
          relatedType: 'task',
        }));
      if (assigneeNotifs.length) await createNotifications(assigneeNotifs);
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

    emit(req, 'task:updated', `project:${task.projectId}`, task);
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

    if (oldStatus !== newStatus) {
      emit(req, 'task:moved', `project:${updated.projectId}`, { taskId: updated.id, from: oldStatus, to: newStatus, task: updated });
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

    emit(req, 'task:deleted', `project:${task.projectId}`, { taskId: task.id, projectId: task.projectId });
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

// DELETE /api/tasks/:id/subtasks/:subtaskId
router.delete('/:id/subtasks/:subtaskId', protect, async (req, res, next) => {
  try {
    const subtask = await prisma.subtask.findFirst({
      where: { id: req.params.subtaskId, taskId: req.params.id },
    });
    if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

    await prisma.subtask.delete({ where: { id: subtask.id } });

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    res.json({ ...task, commentCount: task._count?.comments || 0, _count: undefined });
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

    // Notify assignees + creator about new comment (exclude commenter)
    const taskFull = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { assignees: { select: { id: true } } },
    });
    const recipientIds = new Set();
    if (taskFull) {
      taskFull.assignees.forEach((a) => recipientIds.add(a.id));
      recipientIds.add(taskFull.createdById);
      recipientIds.delete(req.user.id);
    }
    if (recipientIds.size > 0) {
      const commentNotifs = [...recipientIds].map((uid) => ({
        userId: uid,
        type: 'comment_added',
        message: `${req.user.name} commented on "${task.title}"`,
        relatedId: task.id,
        relatedType: 'task',
      }));
      await createNotifications(commentNotifs);
    }

    // Emit socket events for comment + notifications
    if (taskFull) {
      emit(req, 'comment:added', `project:${taskFull.projectId}`, { taskId: task.id, comment });
      [...recipientIds].forEach((uid) => {
        emit(req, 'notification:new', `user:${uid}`, { type: 'comment_added', message: `${req.user.name} commented on "${task.title}"`, relatedId: task.id });
      });
    }

    res.status(201).json(comment);
  } catch (error) { next(error); }
});

module.exports = router;
