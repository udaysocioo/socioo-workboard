const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @desc    General file upload endpoint
// @route   POST /api/upload
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', code: 'NO_FILE', status: 400 });
  }

  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size
  });
});

module.exports = router;
