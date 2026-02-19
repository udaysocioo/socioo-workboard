const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// GET /api/activities
router.get('/', protect, async (req, res, next) => {
  try {
    const { limit = '50', page = '1', targetType } = req.query;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const where = {};
    if (targetType) where.targetType = targetType;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true, avatarColor: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
