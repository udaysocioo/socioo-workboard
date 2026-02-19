const { z } = require('zod');

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional().default(''),
  color: z.string().optional().default('#6366f1'),
  members: z.array(z.string()).optional().default([]),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
  members: z.array(z.string()).optional(),
});

module.exports = { createProjectSchema, updateProjectSchema };
