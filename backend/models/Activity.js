const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'task_created', 'task_updated', 'task_deleted', 'task_moved',
      'task_assigned', 'task_completed',
      'project_created', 'project_updated', 'project_archived',
      'comment_added',
      'user_added', 'user_updated',
      'subtask_completed', 'attachment_added'
    ]
  },
  targetType: {
    type: String,
    enum: ['task', 'project', 'user', 'comment'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

activitySchema.index({ createdAt: -1 });
activitySchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Activity', activitySchema);
