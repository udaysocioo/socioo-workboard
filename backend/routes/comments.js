const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

// DELETE /api/comments/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Comment deleted' });
  } catch (error) { next(error); }
});

module.exports = router;
