require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
const Activity = require('./models/Activity');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Activity.deleteMany({});

    console.log('Cleared existing data...');

    // Hash shared password
    const hashedPassword = await bcrypt.hash('socioo@123', 10);

    // Create real team members
    const usersData = [
      { name: 'Likith',           email: 'likithmullapudi970@gmail.com',     role: 'Founder',                                isAdmin: true,  avatarColor: '#6366f1' },
      { name: 'Shreyas',          email: 'shreyas@socioo.in',                role: 'Co-Founder',                             isAdmin: true,  avatarColor: '#8b5cf6' },
      { name: 'Gayatri',          email: 'gayatri@socioo.in',                role: 'Co-Founder',                             isAdmin: true,  avatarColor: '#ec4899' },
      { name: 'Abdul',            email: 'abdul@socioo.in',                  role: 'Production',                             isAdmin: true,  avatarColor: '#ef4444' },
      { name: 'Shyam',            email: 'shyamprakash@socioo.in',           role: 'Tech Lead',                              isAdmin: true,  avatarColor: '#3b82f6' },
      { name: 'Uday Shashidhar',  email: 'uday.socioo@gmail.com',            role: 'Data Analyst',                           isAdmin: true,  avatarColor: '#14b8a6' },
      { name: 'Vineet',           email: 'vineet.socioo@gmail.com',           role: 'CRM',                                    isAdmin: false, avatarColor: '#f97316' },
      { name: 'Toshith',          email: 'toshith.socioo@gmail.com',          role: 'CRM and Support Executive',              isAdmin: false, avatarColor: '#22c55e' },
      { name: 'Malaika',          email: 'malaika.socioo@gmail.com',          role: 'Business Development Executive',         isAdmin: false, avatarColor: '#ec4899' },
      { name: 'Bala Aditya',      email: 'balaadithya.socioo@gmail.com',     role: 'Sales and Operations Intern',            isAdmin: false, avatarColor: '#eab308' },
      { name: 'Anuhya',           email: 'anuhyachalasani.socioo@gmail.com', role: 'Social Media and Outreach Marketing',    isAdmin: false, avatarColor: '#06b6d4' },
      { name: 'Radhesh',          email: 'radhesh.socioo@gmail.com',          role: 'Market Research Executive',              isAdmin: false, avatarColor: '#8b5cf6' },
      { name: 'Suvidya',          email: 'suvidya.socioo@gmail.com',          role: 'Outreach Marketing',                     isAdmin: false, avatarColor: '#f97316' },
      { name: 'Yashwanth',        email: 'yashwanth.socioo@gmail.com',        role: 'Production Team',                        isAdmin: false, avatarColor: '#6366f1' },
      { name: 'Dinesh',           email: 'dinesh.socioo@gmail.com',            role: 'Cinematographer',                        isAdmin: false, avatarColor: '#22c55e' },
    ];

    // Insert users with pre-hashed password (bypassing pre-save hook)
    const users = await User.insertMany(
      usersData.map((u) => ({ ...u, password: hashedPassword }))
    );

    console.log(`Created ${users.length} team members`);

    // Map users by name for easy reference
    const byName = {};
    users.forEach((u) => { byName[u.name] = u; });

    // Create projects
    const projects = await Project.insertMany([
      {
        name: 'Socioo Platform',
        description: 'Main socioo.in platform development and marketing',
        color: '#6366f1',
        members: [byName['Likith']._id, byName['Shreyas']._id, byName['Shyam']._id, byName['Abdul']._id, byName['Uday Shashidhar']._id],
        createdBy: byName['Likith']._id
      },
      {
        name: 'CRM & Sales',
        description: 'Customer relationship management and sales pipeline',
        color: '#22c55e',
        members: [byName['Vineet']._id, byName['Toshith']._id, byName['Malaika']._id, byName['Bala Aditya']._id],
        createdBy: byName['Shreyas']._id
      },
      {
        name: 'Marketing & Outreach',
        description: 'Social media, outreach campaigns, and market research',
        color: '#f97316',
        members: [byName['Anuhya']._id, byName['Radhesh']._id, byName['Suvidya']._id],
        createdBy: byName['Gayatri']._id
      },
      {
        name: 'Content & Production',
        description: 'Video production, cinematography, and content creation',
        color: '#ec4899',
        members: [byName['Abdul']._id, byName['Yashwanth']._id, byName['Dinesh']._id],
        createdBy: byName['Abdul']._id
      }
    ]);

    console.log(`Created ${projects.length} projects`);

    const [socioo, crm, marketing, production] = projects;

    // Create tasks
    const tasks = await Task.insertMany([
      // Socioo Platform
      {
        title: 'Platform architecture review',
        description: 'Review and plan the next phase of socioo.in platform architecture',
        project: socioo._id, status: 'in_progress', priority: 'critical',
        assignee: byName['Shyam']._id, labels: ['tech', 'planning'],
        deadline: new Date('2026-02-28'), order: 0, createdBy: byName['Likith']._id,
        subtasks: [
          { title: 'Audit current backend', completed: true },
          { title: 'Plan microservices migration', completed: false },
          { title: 'Document API contracts', completed: false }
        ]
      },
      {
        title: 'Data analytics dashboard',
        description: 'Build internal analytics dashboard for business metrics',
        project: socioo._id, status: 'in_progress', priority: 'high',
        assignee: byName['Uday Shashidhar']._id, labels: ['data', 'dashboard'],
        deadline: new Date('2026-03-10'), order: 1, createdBy: byName['Shreyas']._id
      },
      {
        title: 'Deploy production infrastructure',
        description: 'Set up production servers, CI/CD pipeline, and monitoring',
        project: socioo._id, status: 'todo', priority: 'high',
        assignee: byName['Shyam']._id, labels: ['devops', 'infra'],
        deadline: new Date('2026-03-15'), order: 2, createdBy: byName['Likith']._id
      },

      // CRM & Sales
      {
        title: 'Set up CRM pipeline',
        description: 'Configure lead tracking, follow-up automation, and deal stages',
        project: crm._id, status: 'in_progress', priority: 'high',
        assignee: byName['Vineet']._id, labels: ['crm', 'setup'],
        deadline: new Date('2026-02-25'), order: 0, createdBy: byName['Shreyas']._id
      },
      {
        title: 'Customer support workflow',
        description: 'Create support ticket system and escalation process',
        project: crm._id, status: 'todo', priority: 'medium',
        assignee: byName['Toshith']._id, labels: ['support', 'process'],
        deadline: new Date('2026-03-01'), order: 1, createdBy: byName['Vineet']._id
      },
      {
        title: 'Business development outreach',
        description: 'Identify and reach out to potential B2B clients',
        project: crm._id, status: 'in_progress', priority: 'high',
        assignee: byName['Malaika']._id, labels: ['sales', 'outreach'],
        deadline: new Date('2026-02-28'), order: 2, createdBy: byName['Shreyas']._id
      },
      {
        title: 'Sales operations training',
        description: 'Onboard and train on sales tools and processes',
        project: crm._id, status: 'todo', priority: 'medium',
        assignee: byName['Bala Aditya']._id, labels: ['training', 'onboarding'],
        deadline: new Date('2026-03-05'), order: 3, createdBy: byName['Vineet']._id
      },

      // Marketing & Outreach
      {
        title: 'Social media content calendar',
        description: 'Plan and schedule posts for Instagram, LinkedIn, and Twitter',
        project: marketing._id, status: 'in_progress', priority: 'high',
        assignee: byName['Anuhya']._id, labels: ['social-media', 'content'],
        deadline: new Date('2026-02-20'), order: 0, createdBy: byName['Gayatri']._id
      },
      {
        title: 'Market research report',
        description: 'Competitive analysis and market sizing for Q1 2026',
        project: marketing._id, status: 'review', priority: 'medium',
        assignee: byName['Radhesh']._id, labels: ['research', 'analysis'],
        deadline: new Date('2026-02-22'), order: 1, createdBy: byName['Gayatri']._id
      },
      {
        title: 'Email outreach campaign',
        description: 'Design and launch email campaign targeting SMBs',
        project: marketing._id, status: 'todo', priority: 'medium',
        assignee: byName['Suvidya']._id, labels: ['email', 'outreach'],
        deadline: new Date('2026-03-01'), order: 2, createdBy: byName['Anuhya']._id
      },

      // Content & Production
      {
        title: 'Product demo video',
        description: 'Shoot and edit a 2-minute product demo video for socioo.in',
        project: production._id, status: 'in_progress', priority: 'high',
        assignee: byName['Dinesh']._id, labels: ['video', 'production'],
        deadline: new Date('2026-02-25'), order: 0, createdBy: byName['Abdul']._id,
        subtasks: [
          { title: 'Script writing', completed: true },
          { title: 'Shoot footage', completed: false },
          { title: 'Edit and post-production', completed: false }
        ]
      },
      {
        title: 'Brand assets update',
        description: 'Update logos, banners, and social media templates for 2026',
        project: production._id, status: 'todo', priority: 'medium',
        assignee: byName['Yashwanth']._id, labels: ['design', 'branding'],
        deadline: new Date('2026-03-01'), order: 1, createdBy: byName['Abdul']._id
      },
    ]);

    console.log(`Created ${tasks.length} tasks`);

    // Create activity log
    const activities = await Activity.insertMany([
      { user: byName['Likith']._id, action: 'project_created', targetType: 'project', targetId: socioo._id, details: 'Created project "Socioo Platform"' },
      { user: byName['Shreyas']._id, action: 'project_created', targetType: 'project', targetId: crm._id, details: 'Created project "CRM & Sales"' },
      { user: byName['Gayatri']._id, action: 'project_created', targetType: 'project', targetId: marketing._id, details: 'Created project "Marketing & Outreach"' },
      { user: byName['Abdul']._id, action: 'project_created', targetType: 'project', targetId: production._id, details: 'Created project "Content & Production"' },
      { user: byName['Shyam']._id, action: 'task_moved', targetType: 'task', targetId: tasks[0]._id, details: 'Started "Platform architecture review"' },
      { user: byName['Uday Shashidhar']._id, action: 'task_moved', targetType: 'task', targetId: tasks[1]._id, details: 'Started "Data analytics dashboard"' },
      { user: byName['Vineet']._id, action: 'task_moved', targetType: 'task', targetId: tasks[3]._id, details: 'Started "Set up CRM pipeline"' },
      { user: byName['Anuhya']._id, action: 'task_moved', targetType: 'task', targetId: tasks[7]._id, details: 'Started "Social media content calendar"' },
      { user: byName['Dinesh']._id, action: 'task_moved', targetType: 'task', targetId: tasks[10]._id, details: 'Started "Product demo video"' },
    ]);

    console.log(`Created ${activities.length} activity entries`);

    console.log('\n  Seed completed successfully!');
    console.log('  ──────────────────────────────');
    console.log(`  Admin PIN: ${process.env.ADMIN_PIN}`);
    console.log(`  Team Members: ${users.length}`);
    console.log(`  Admins: ${users.filter(u => u.isAdmin).map(u => u.name).join(', ')}`);
    console.log(`  Projects: ${projects.length}`);
    console.log(`  Tasks: ${tasks.length}`);
    console.log(`  All passwords: socioo@123`);
    console.log('  ──────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
