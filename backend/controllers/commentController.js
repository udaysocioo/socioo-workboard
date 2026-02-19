const { z } = require('zod');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

// Zod Schema
const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required')
});

/**
 * Get comments for a task
 * @route GET /api/tasks/:taskId/comments
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'name role avatarColor')
      .sort('-createdAt');

    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    next(error);
  }
};

/**
 * Add comment to a task
 * @route POST /api/tasks/:taskId/comments
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.addComment = async (req, res, next) => {
  try {
    const { text } = addCommentSchema.parse(req.body);

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      throw error;
    }

    const comment = await Comment.create({
      task: req.params.taskId,
      user: req.user._id,
      text
    });

    await comment.populate('user', 'name role avatarColor');

    await Activity.create({
      user: req.user._id,
      action: 'comment_added',
      targetType: 'comment',
      targetId: comment._id,
      details: `Commented on "${task.title}"`,
      metadata: { taskId: task._id }
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete comment
 * @route DELETE /api/comments/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      error.code = 'COMMENT_NOT_FOUND';
      throw error;
    }

    // Only the comment author or admin can delete
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && !req.user.isAdmin) {
      const error = new Error('Not authorized to delete this comment');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};
