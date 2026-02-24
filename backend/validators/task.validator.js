const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  projectId: z.string().min(1, 'Project is required'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'),
  assigneeIds: z.array(z.string()).optional().default([]),
  labels: z.array(z.string()).optional().default([]),
  deadline: z.string().datetime().nullable().optional().default(null),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    completed: z.boolean().optional().default(false),
  })).optional().default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigneeIds: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  deadline: z.string().datetime().nullable().optional(),
  order: z.number().int().optional(),
});

const reorderTaskSchema = z.object({
  taskId: z.string().min(1),
  newStatus: z.enum(['todo', 'in_progress', 'review', 'done']),
  newOrder: z.number().int().min(0),
  projectId: z.string().optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(1000),
});

const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Subtask title is required'),
});

module.exports = { createTaskSchema, updateTaskSchema, reorderTaskSchema, addCommentSchema, createSubtaskSchema };
