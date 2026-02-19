const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/stats
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getStats = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const taskFilter = {};
    if (projectId) taskFilter.project = projectId;

    // Basic counts
    const totalTasks = await Task.countDocuments(taskFilter);
    const completedTasks = await Task.countDocuments({ ...taskFilter, status: 'done' });
    const inProgressTasks = await Task.countDocuments({ ...taskFilter, status: 'in_progress' });
    const todoTasks = await Task.countDocuments({ ...taskFilter, status: 'todo' });
    const reviewTasks = await Task.countDocuments({ ...taskFilter, status: 'review' });

    // Overdue tasks (deadline passed, not done)
    const overdueTasks = await Task.countDocuments({
      ...taskFilter,
      status: { $ne: 'done' },
      deadline: { $lt: new Date(), $ne: null }
    });

    // Tasks by priority
    const byPriority = await Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Tasks by status
    const byStatus = await Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Tasks by member (assignee)
    const byMember = await Task.aggregate([
      { $match: { ...taskFilter, assignee: { $ne: null } } },
      { $group: { _id: '$assignee', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, total: 1, completed: 1, name: '$user.name', avatarColor: '$user.avatarColor', role: '$user.role' } },
      { $sort: { total: -1 } }
    ]);

    // Project counts
    const activeProjects = await Project.countDocuments({ status: 'active' });
    const totalMembers = await User.countDocuments({ isActive: true });

    // Recent activity
    const recentActivity = await Activity.find()
      .populate('user', 'name role avatarColor')
      .sort('-createdAt')
      .limit(10);

    // Tasks completed this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const completedThisWeek = await Task.countDocuments({
      ...taskFilter,
      status: 'done',
      updatedAt: { $gte: weekStart }
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        reviewTasks,
        overdueTasks,
        completedThisWeek,
        activeProjects,
        totalMembers,
        byPriority: byPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byMember,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};
