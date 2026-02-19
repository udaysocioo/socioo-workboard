require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const seedData = async () => {
  try {
    console.log('🌱 Connecting to database...');

    // Clear existing data
    await prisma.activity.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.subtask.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('🧹 Cleared existing data...');

    // Hash shared password
    const hashedPassword = await bcrypt.hash('socioo@123', 10);

    // Create real team members
    const usersData = [
      // Admins
      { name: 'Shreyas',          email: 'shreyas@socioo.in',                role: 'Admin',                                  isAdmin: true,  avatarColor: '#8b5cf6' },
      { name: 'Likhith',          email: 'likhith@socioo.in',                role: 'Admin',                                  isAdmin: true,  avatarColor: '#6366f1' },
      { name: 'Gayatri',          email: 'gayatri@socioo.in',                role: 'Admin',                                  isAdmin: true,  avatarColor: '#ec4899' },
      { name: 'Abdul',            email: 'abdul@socioo.in',                  role: 'Admin',                                  isAdmin: true,  avatarColor: '#ef4444' },
      { name: 'Shyam Prakash',    email: 'shyam@socioo.in',                  role: 'Admin',                                  isAdmin: true,  avatarColor: '#3b82f6' },
      { name: 'Uday Kolan',       email: 'uday@socioo.in',                   role: 'Admin',                                  isAdmin: true,  avatarColor: '#14b8a6' },
      
      // Employees
      { name: 'Yashwanth',        email: 'yashwanth@socioo.in',              role: 'Employee',                               isAdmin: false, avatarColor: '#6366f1' },
      { name: 'Radhesh',          email: 'radhesh@socioo.in',                role: 'Employee',                               isAdmin: false, avatarColor: '#8b5cf6' },
      { name: 'Dinesh',           email: 'dinesh@socioo.in',                 role: 'Employee',                               isAdmin: false, avatarColor: '#22c55e' },
      { name: 'Toshith',          email: 'toshith@socioo.in',                role: 'Employee',                               isAdmin: false, avatarColor: '#22c55e' },
      { name: 'Anuhya',           email: 'anuhya@socioo.in',                 role: 'Employee',                               isAdmin: false, avatarColor: '#06b6d4' },
      { name: 'Suvidya',          email: 'suvidya@socioo.in',                role: 'Employee',                               isAdmin: false, avatarColor: '#f97316' },
      { name: 'Malaika',          email: 'malaika@socioo.in',                role: 'Employee',                               isAdmin: false, avatarColor: '#ec4899' },
      { name: 'Baladitya',        email: 'baladitya@socioo.in',              role: 'Employee',                               isAdmin: false, avatarColor: '#eab308' },
      { name: 'Vineet',           email: 'vineet.socioo@gmail.com',          role: 'Employee',                               isAdmin: false, avatarColor: '#f97316' },
    ];

    // Create users sequentially to ensure IDs are available
    const users = [];
    for (const u of usersData) {
      const user = await prisma.user.create({
        data: { ...u, password: hashedPassword }
      });
      users.push(user);
    }

    console.log(`👤 Created ${users.length} team members`);

    // Map users by name for easy reference
    const byName = {};
    users.forEach((u) => { byName[u.name] = u; });

    // Create projects
    const projectsData = [
      {
        name: 'Socioo Platform',
        description: 'Main socioo.in platform development and marketing',
        color: '#6366f1',
        members: { connect: [byName['Likhith'].id, byName['Shreyas'].id, byName['Shyam Prakash'].id, byName['Abdul'].id, byName['Uday Kolan'].id].map(id => ({ id })) },
        createdBy: { connect: { id: byName['Likhith'].id } }
      },
      {
        name: 'CRM & Sales',
        description: 'Customer relationship management and sales pipeline',
        color: '#22c55e',
        members: { connect: [byName['Vineet'].id, byName['Toshith'].id, byName['Malaika'].id, byName['Baladitya'].id].map(id => ({ id })) },
        createdBy: { connect: { id: byName['Shreyas'].id } }
      },
      {
        name: 'Marketing & Outreach',
        description: 'Social media, outreach campaigns, and market research',
        color: '#f97316',
        members: { connect: [byName['Anuhya'].id, byName['Radhesh'].id, byName['Suvidya'].id].map(id => ({ id })) },
        createdBy: { connect: { id: byName['Gayatri'].id } }
      },
      {
        name: 'Content & Production',
        description: 'Video production, cinematography, and content creation',
        color: '#ec4899',
        members: { connect: [byName['Abdul'].id, byName['Yashwanth'].id, byName['Dinesh'].id].map(id => ({ id })) },
        createdBy: { connect: { id: byName['Abdul'].id } }
      }
    ];

    const projects = [];
    for (const p of projectsData) {
      const project = await prisma.project.create({ data: p });
      projects.push(project);
    }

    console.log(`🚀 Created ${projects.length} projects`);

    const [socioo, crm, marketing, production] = projects;

    // Create tasks
    const tasksData = [
      // Socioo Platform
      {
        title: 'Platform architecture review',
        description: 'Review and plan the next phase of socioo.in platform architecture',
        projectId: socioo.id, status: 'in_progress', priority: 'critical',
        assigneeId: byName['Shyam Prakash'].id, labels: ['tech', 'planning'],
        deadline: new Date('2026-02-28'), order: 0, createdById: byName['Likhith'].id,
        subtasks: { create: [
          { title: 'Audit current backend', completed: true },
          { title: 'Plan microservices migration', completed: false },
          { title: 'Document API contracts', completed: false }
        ]}
      },
      {
        title: 'Data analytics dashboard',
        description: 'Build internal analytics dashboard for business metrics',
        projectId: socioo.id, status: 'in_progress', priority: 'high',
        assigneeId: byName['Uday Kolan'].id, labels: ['data', 'dashboard'],
        deadline: new Date('2026-03-10'), order: 1, createdById: byName['Shreyas'].id
      },
      {
        title: 'Deploy production infrastructure',
        description: 'Set up production servers, CI/CD pipeline, and monitoring',
        projectId: socioo.id, status: 'todo', priority: 'high',
        assigneeId: byName['Shyam Prakash'].id, labels: ['devops', 'infra'],
        deadline: new Date('2026-03-15'), order: 2, createdById: byName['Likhith'].id
      },

      // CRM & Sales
      {
        title: 'Set up CRM pipeline',
        description: 'Configure lead tracking, follow-up automation, and deal stages',
        projectId: crm.id, status: 'in_progress', priority: 'high',
        assigneeId: byName['Vineet'].id, labels: ['crm', 'setup'],
        deadline: new Date('2026-02-25'), order: 0, createdById: byName['Shreyas'].id
      },
      {
        title: 'Customer support workflow',
        description: 'Create support ticket system and escalation process',
        projectId: crm.id, status: 'todo', priority: 'medium',
        assigneeId: byName['Toshith'].id, labels: ['support', 'process'],
        deadline: new Date('2026-03-01'), order: 1, createdById: byName['Vineet'].id
      },
      {
        title: 'Business development outreach',
        description: 'Identify and reach out to potential B2B clients',
        projectId: crm.id, status: 'in_progress', priority: 'high',
        assigneeId: byName['Malaika'].id, labels: ['sales', 'outreach'],
        deadline: new Date('2026-02-28'), order: 2, createdById: byName['Shreyas'].id
      },
      {
        title: 'Sales operations training',
        description: 'Onboard and train on sales tools and processes',
        projectId: crm.id, status: 'todo', priority: 'medium',
        assigneeId: byName['Baladitya'].id, labels: ['training', 'onboarding'],
        deadline: new Date('2026-03-05'), order: 3, createdById: byName['Vineet'].id
      },

      // Marketing & Outreach
      {
        title: 'Social media content calendar',
        description: 'Plan and schedule posts for Instagram, LinkedIn, and Twitter',
        projectId: marketing.id, status: 'in_progress', priority: 'high',
        assigneeId: byName['Anuhya'].id, labels: ['social-media', 'content'],
        deadline: new Date('2026-02-20'), order: 0, createdById: byName['Gayatri'].id
      },
      {
        title: 'Market research report',
        description: 'Competitive analysis and market sizing for Q1 2026',
        projectId: marketing.id, status: 'review', priority: 'medium',
        assigneeId: byName['Radhesh'].id, labels: ['research', 'analysis'],
        deadline: new Date('2026-02-22'), order: 1, createdById: byName['Gayatri'].id
      },
      {
        title: 'Email outreach campaign',
        description: 'Design and launch email campaign targeting SMBs',
        projectId: marketing.id, status: 'todo', priority: 'medium',
        assigneeId: byName['Suvidya'].id, labels: ['email', 'outreach'],
        deadline: new Date('2026-03-01'), order: 2, createdById: byName['Anuhya'].id
      },

      // Content & Production
      {
        title: 'Product demo video',
        description: 'Shoot and edit a 2-minute product demo video for socioo.in',
        projectId: production.id, status: 'in_progress', priority: 'high',
        assigneeId: byName['Dinesh'].id, labels: ['video', 'production'],
        deadline: new Date('2026-02-25'), order: 0, createdById: byName['Abdul'].id,
        subtasks: { create: [
          { title: 'Script writing', completed: true },
          { title: 'Shoot footage', completed: false },
          { title: 'Edit and post-production', completed: false }
        ]}
      },
      {
        title: 'Brand assets update',
        description: 'Update logos, banners, and social media templates for 2026',
        projectId: production.id, status: 'todo', priority: 'medium',
        assigneeId: byName['Yashwanth'].id, labels: ['design', 'branding'],
        deadline: new Date('2026-03-01'), order: 1, createdById: byName['Abdul'].id
      },
    ];

    const tasks = [];
    for (const t of tasksData) {
      const task = await prisma.task.create({ data: t });
      tasks.push(task);
    }

    console.log(`📋 Created ${tasks.length} tasks`);

    // Create activity log
    const activitiesData = [
      { userId: byName['Likhith'].id, action: 'project_created', targetType: 'project', targetId: socioo.id, details: 'Created project "Socioo Platform"' },
      { userId: byName['Shreyas'].id, action: 'project_created', targetType: 'project', targetId: crm.id, details: 'Created project "CRM & Sales"' },
      { userId: byName['Gayatri'].id, action: 'project_created', targetType: 'project', targetId: marketing.id, details: 'Created project "Marketing & Outreach"' },
      { userId: byName['Abdul'].id, action: 'project_created', targetType: 'project', targetId: production.id, details: 'Created project "Content & Production"' },
      { userId: byName['Shyam Prakash'].id, action: 'task_moved', targetType: 'task', targetId: tasks[0].id, details: 'Started "Platform architecture review"' },
      { userId: byName['Uday Kolan'].id, action: 'task_moved', targetType: 'task', targetId: tasks[1].id, details: 'Started "Data analytics dashboard"' },
      { userId: byName['Vineet'].id, action: 'task_moved', targetType: 'task', targetId: tasks[3].id, details: 'Started "Set up CRM pipeline"' },
      { userId: byName['Anuhya'].id, action: 'task_moved', targetType: 'task', targetId: tasks[7].id, details: 'Started "Social media content calendar"' },
      { userId: byName['Dinesh'].id, action: 'task_moved', targetType: 'task', targetId: tasks[10].id, details: 'Started "Product demo video"' },
    ];

    for (const act of activitiesData) {
      await prisma.activity.create({ data: act });
    }

    console.log(`📜 Created ${activitiesData.length} activity entries`);

    console.log('\n✅ Seed completed successfully!');
    console.log('  ──────────────────────────────');
    console.log(`  Admin PIN: ${process.env.ADMIN_PIN || '1234'}`);
    console.log(`  Team Members: ${users.length}`);
    console.log(`  Admins: ${users.filter(u => u.isAdmin).map(u => u.name).join(', ')}`);
    console.log(`  Projects: ${projects.length}`);
    console.log(`  Tasks: ${tasks.length}`);
    console.log(`  All passwords: socioo@123`);
    console.log('  ──────────────────────────────\n');

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedData();
