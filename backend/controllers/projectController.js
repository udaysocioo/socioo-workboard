const { z } = require('zod');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

// Zod Schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  members: z.array(z.string()).optional()
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['active', 'archived', 'completed']).optional()
});

/**
 * Get all projects
 * @route GET /api/projects
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getProjects = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .populate('members', 'name role avatarColor')
      .populate('createdBy', 'name role avatarColor')
      .populate('taskCount')
      .sort('-createdAt');

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single project
 * @route GET /api/projects/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members', 'name role avatarColor')
      .populate('createdBy', 'name role avatarColor')
      .populate('taskCount');

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      error.code = 'PROJECT_NOT_FOUND';
      throw error;
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * Create project
 * @route POST /api/projects
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.createProject = async (req, res, next) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);

    const project = await Project.create({
      ...validatedData,
      members: validatedData.members || [],
      createdBy: req.user._id
    });

    await project.populate('members', 'name role avatarColor');
    await project.populate('createdBy', 'name role avatarColor');

    // Non-blocking activity log
    try {
      await Activity.create({
        user: req.user._id,
        action: 'project_created',
        targetType: 'project',
        targetId: project._id,
        details: `Created project "${project.name}"`
      });
    } catch (activityError) {
      console.error('Failed to create activity log for project creation:', activityError);
      // Continue execution, do not fail the request
    }

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('Project creation failed:', error);
    next(error);
  }
};

/**
 * Update project
 * @route PUT /api/projects/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateProject = async (req, res, next) => {
  try {
    const validatedData = updateProjectSchema.parse(req.body);
    const project = await Project.findById(req.params.id);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      error.code = 'PROJECT_NOT_FOUND';
      throw error;
    }

    Object.assign(project, validatedData);

    await project.save();
    await project.populate('members', 'name role avatarColor');
    await project.populate('createdBy', 'name role avatarColor');

    const status = validatedData.status || project.status;
    const action = status === 'archived' ? 'project_archived' : 'project_updated';
    
    // Only log if something meaningful changed (simplified check)
    if (Object.keys(validatedData).length > 0) {
      try {
        await Activity.create({
          user: req.user._id,
          action,
          targetType: 'project',
          targetId: project._id,
          details: `${status === 'archived' ? 'Archived' : 'Updated'} project "${project.name}"`
        });
      } catch (activityError) {
        console.error('Failed to create activity log for project update:', activityError);
      }
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Project update failed:', error);
    next(error);
  }
};

/**
 * Delete project
 * @route DELETE /api/projects/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      error.code = 'PROJECT_NOT_FOUND';
      throw error;
    }

    // Delete all tasks in this project
    await Task.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(project._id);

    res.json({ success: true, message: 'Project and its tasks deleted successfully' });
  } catch (error) {
    next(error);
  }
};
