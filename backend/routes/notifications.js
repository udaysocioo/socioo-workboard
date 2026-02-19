const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET /api/notifications — get current user's notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) { next(error); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false
    });
    res.json({ success: true, count });
  } catch (error) { next(error); }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    res.json({ success: true, message: 'Marked as read', data: notification });
  } catch (error) { next(error); }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});

module.exports = router;
