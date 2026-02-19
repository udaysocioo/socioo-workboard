const { z } = require('zod');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

// Zod Schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  project: z.string().min(1, 'Project ID is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
  deadline: z.string().nullable().optional(), // Accepts ISO string or null
  subtasks: z.array(
    z.object({
      title: z.string().min(1, 'Subtask title is required'),
      completed: z.boolean().optional()
    })
  ).optional()
});

/**
 * Get tasks (with filters)
 * @route GET /api/tasks
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { project, status, priority, assignee, search } = req.query;
    const filter = {};

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name role avatarColor')
      .populate('createdBy', 'name role avatarColor')
      .populate('project', 'name color')
      .sort({ status: 1, order: 1, createdAt: -1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single task
 * @route GET /api/tasks/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name role avatarColor')
      .populate('createdBy', 'name role avatarColor')
      .populate('project', 'name color');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * Create task
 * @route POST /api/tasks
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.createTask = async (req, res, next) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

    // Get the max order for the 'todo' column in this project
    const maxOrderTask = await Task.findOne({ project: validatedData.project, status: 'todo' })
      .sort('-order')
      .select('order');
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await Task.create({
      ...validatedData,
      subtasks: validatedData.subtasks || [],
      order,
      createdBy: req.user._id
    });

    await task.populate('assignee', 'name role avatarColor');
    await task.populate('createdBy', 'name role avatarColor');
    await task.populate('project', 'name color');

    await Activity.create({
      user: req.user._id,
      action: 'task_created',
      targetType: 'task',
      targetId: task._id,
      details: `Created task "${task.title}"`,
      metadata: { projectId: validatedData.project }
    });

    if (validatedData.assignee) {
      await Activity.create({
        user: req.user._id,
        action: 'task_assigned',
        targetType: 'task',
        targetId: task._id,
        details: `Assigned task "${task.title}"`,
        metadata: { assigneeId: validatedData.assignee }
      });
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  order: z.number().optional()
});

const reorderTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  newStatus: z.enum(['todo', 'in_progress', 'review', 'done']),
  newOrder: z.number().min(0),
  projectId: z.string().optional()
});

/**
 * Update task
 * @route PUT /api/tasks/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateTask = async (req, res, next) => {
  try {
    const validatedData = updateTaskSchema.parse(req.body);
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    const oldStatus = task.status;
    const oldAssignee = task.assignee?.toString();

    Object.assign(task, validatedData);

    await task.save();
    await task.populate('assignee', 'name role avatarColor');
    await task.populate('createdBy', 'name role avatarColor');
    await task.populate('project', 'name color');

    // Log status change
    if (validatedData.status && validatedData.status !== oldStatus) {
      const action = validatedData.status === 'done' ? 'task_completed' : 'task_moved';
      await Activity.create({
        user: req.user._id,
        action,
        targetType: 'task',
        targetId: task._id,
        details: `Moved "${task.title}" from ${oldStatus} to ${validatedData.status}`,
        metadata: { from: oldStatus, to: validatedData.status }
      });
    }

    // Log reassignment
    if (validatedData.assignee && validatedData.assignee !== oldAssignee) {
      await Activity.create({
        user: req.user._id,
        action: 'task_assigned',
        targetType: 'task',
        targetId: task._id,
        details: `Reassigned task "${task.title}"`,
        metadata: { assigneeId: validatedData.assignee }
      });
    }

    // Log general update
    if (!validatedData.status && !validatedData.assignee) {
      await Activity.create({
        user: req.user._id,
        action: 'task_updated',
        targetType: 'task',
        targetId: task._id,
        details: `Updated task "${task.title}"`
      });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder tasks (drag-and-drop)
 * @route PUT /api/tasks/reorder
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.reorderTasks = async (req, res, next) => {
  try {
    const { taskId, newStatus, newOrder, projectId } = reorderTaskSchema.parse(req.body);

    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    const oldStatus = task.status;

    // Update orders of other tasks in the destination column
    await Task.updateMany(
      {
        project: projectId || task.project,
        status: newStatus,
        order: { $gte: newOrder },
        _id: { $ne: taskId }
      },
      { $inc: { order: 1 } }
    );

    // If moving between columns, decrement orders in source column
    if (oldStatus !== newStatus) {
      await Task.updateMany(
        {
          project: projectId || task.project,
          status: oldStatus,
          order: { $gt: task.order },
          _id: { $ne: taskId }
        },
        { $inc: { order: -1 } }
      );
    }

    task.status = newStatus;
    task.order = newOrder;
    await task.save();

    await task.populate('assignee', 'name role avatarColor');
    await task.populate('createdBy', 'name role avatarColor');
    await task.populate('project', 'name color');

    if (oldStatus !== newStatus) {
      const action = newStatus === 'done' ? 'task_completed' : 'task_moved';
      await Activity.create({
        user: req.user._id,
        action,
        targetType: 'task',
        targetId: task._id,
        details: `Moved "${task.title}" from ${oldStatus} to ${newStatus}`,
        metadata: { from: oldStatus, to: newStatus }
      });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete task
 * @route DELETE /api/tasks/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    const taskTitle = task.title;
    await Task.findByIdAndDelete(req.params.id);

    await Activity.create({
      user: req.user._id,
      action: 'task_deleted',
      targetType: 'task',
      targetId: req.params.id,
      details: `Deleted task "${taskTitle}"`
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Add attachment to task
 * @route POST /api/tasks/:id/attachments
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.addAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    if (!req.file) {
      const error = new Error('No file uploaded');
      error.statusCode = 400;
      error.code = 'NO_FILE_UPLOADED';
      throw error;
    }

    task.attachments.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size
    });

    await task.save();

    await Activity.create({
      user: req.user._id,
      action: 'attachment_added',
      targetType: 'task',
      targetId: task._id,
      details: `Added attachment "${req.file.originalname}" to "${task.title}"`
    });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle subtask completion
 * @route PUT /api/tasks/:id/subtasks/:subtaskId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.toggleSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      const error = new Error('Subtask not found');
      error.statusCode = 404;
      error.code = 'SUBTASK_NOT_FOUND';
      throw error;
    }

    subtask.completed = !subtask.completed;
    await task.save();

    if (subtask.completed) {
      await Activity.create({
        user: req.user._id,
        action: 'subtask_completed',
        targetType: 'task',
        targetId: task._id,
        details: `Completed subtask "${subtask.title}" in "${task.title}"`
      });
    }

    await task.populate('assignee', 'name role avatarColor');
    await task.populate('createdBy', 'name role avatarColor');
    await task.populate('project', 'name color');

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};
