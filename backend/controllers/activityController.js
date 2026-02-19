const Activity = require('../models/Activity');

/**
 * Get activity feed
 * @route GET /api/activities
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getActivities = async (req, res, next) => {
  try {
    const { limit = 50, page = 1, targetType } = req.query;
    const filter = {};

    if (targetType) filter.targetType = targetType;

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const activities = await Activity.find(filter)
      .populate('user', 'name role avatarColor')
      .sort({ createdAt: -1 }) // Explicit object sort is safer
      .skip(skip)
      .limit(limitNum);
    
    // console.log(`Fetched ${activities.length} activities`); // Debug log

    const total = await Activity.countDocuments(filter);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
