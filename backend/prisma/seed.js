const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (order matters for FK constraints)
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data...');

  const hashedPassword = await bcrypt.hash('socioo@123', 10);

  // Create team members
  const usersData = [
    { name: 'Likith',          email: 'likithmullapudi970@gmail.com',     role: 'Founder',                             isAdmin: true,  avatarColor: '#6366f1' },
    { name: 'Shreyas',         email: 'shreyas@socioo.in',                role: 'Co-Founder',                          isAdmin: true,  avatarColor: '#8b5cf6' },
    { name: 'Gayatri',         email: 'gayatri@socioo.in',                role: 'Co-Founder',                          isAdmin: true,  avatarColor: '#ec4899' },
    { name: 'Abdul',           email: 'abdul@socioo.in',                  role: 'Production',                          isAdmin: true,  avatarColor: '#ef4444' },
    { name: 'Shyam',           email: 'shyamprakash@socioo.in',           role: 'Tech Lead',                           isAdmin: true,  avatarColor: '#3b82f6' },
    { name: 'Uday Shashidhar', email: 'uday.socioo@gmail.com',            role: 'Data Analyst',                        isAdmin: true,  avatarColor: '#14b8a6' },
    { name: 'Vineet',          email: 'vineet.socioo@gmail.com',           role: 'CRM',                                 isAdmin: false, avatarColor: '#f97316' },
    { name: 'Toshith',         email: 'toshith.socioo@gmail.com',          role: 'CRM and Support Executive',           isAdmin: false, avatarColor: '#22c55e' },
    { name: 'Malaika',         email: 'malaika.socioo@gmail.com',          role: 'Business Development Executive',      isAdmin: false, avatarColor: '#ec4899' },
    { name: 'Bala Aditya',     email: 'balaadithya.socioo@gmail.com',     role: 'Sales and Operations Intern',         isAdmin: false, avatarColor: '#eab308' },
    { name: 'Anuhya',          email: 'anuhyachalasani.socioo@gmail.com', role: 'Social Media and Outreach Marketing', isAdmin: false, avatarColor: '#06b6d4' },
    { name: 'Radhesh',         email: 'radhesh.socioo@gmail.com',          role: 'Market Research Executive',           isAdmin: false, avatarColor: '#8b5cf6' },
    { name: 'Suvidya',         email: 'suvidya.socioo@gmail.com',          role: 'Outreach Marketing',                  isAdmin: false, avatarColor: '#f97316' },
    { name: 'Yashwanth',       email: 'yashwanth.socioo@gmail.com',        role: 'Production Team',                     isAdmin: false, avatarColor: '#6366f1' },
    { name: 'Dinesh',          email: 'dinesh.socioo@gmail.com',            role: 'Cinematographer',                     isAdmin: false, avatarColor: '#22c55e' },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: { ...u, password: hashedPassword },
    });
    users.push(user);
  }
  console.log(`Created ${users.length} team members`);

  const byName = {};
  users.forEach((u) => { byName[u.name] = u; });

  // Create projects
  const socioo = await prisma.project.create({
    data: {
      name: 'Socioo Platform',
      description: 'Main socioo.in platform development and marketing',
      color: '#6366f1',
      createdById: byName['Likith'].id,
      members: { connect: [{ id: byName['Likith'].id }, { id: byName['Shreyas'].id }, { id: byName['Shyam'].id }, { id: byName['Abdul'].id }, { id: byName['Uday Shashidhar'].id }] },
    },
  });

  const crm = await prisma.project.create({
    data: {
      name: 'CRM & Sales',
      description: 'Customer relationship management and sales pipeline',
      color: '#22c55e',
      createdById: byName['Shreyas'].id,
      members: { connect: [{ id: byName['Vineet'].id }, { id: byName['Toshith'].id }, { id: byName['Malaika'].id }, { id: byName['Bala Aditya'].id }] },
    },
  });

  const marketing = await prisma.project.create({
    data: {
      name: 'Marketing & Outreach',
      description: 'Social media, outreach campaigns, and market research',
      color: '#f97316',
      createdById: byName['Gayatri'].id,
      members: { connect: [{ id: byName['Anuhya'].id }, { id: byName['Radhesh'].id }, { id: byName['Suvidya'].id }] },
    },
  });

  const production = await prisma.project.create({
    data: {
      name: 'Content & Production',
      description: 'Video production, cinematography, and content creation',
      color: '#ec4899',
      createdById: byName['Abdul'].id,
      members: { connect: [{ id: byName['Abdul'].id }, { id: byName['Yashwanth'].id }, { id: byName['Dinesh'].id }] },
    },
  });

  console.log('Created 4 projects');

  // Create tasks with subtasks
  const tasksData = [
    // Socioo Platform
    {
      title: 'Platform architecture review',
      description: 'Review and plan the next phase of socioo.in platform architecture',
      projectId: socioo.id, status: 'in_progress', priority: 'critical',
      assigneeId: byName['Shyam'].id, labels: ['tech', 'planning'],
      deadline: new Date('2026-02-28'), order: 0, createdById: byName['Likith'].id,
      subtasks: { create: [
        { title: 'Audit current backend', completed: true },
        { title: 'Plan microservices migration', completed: false },
        { title: 'Document API contracts', completed: false },
      ] },
    },
    {
      title: 'Data analytics dashboard',
      description: 'Build internal analytics dashboard for business metrics',
      projectId: socioo.id, status: 'in_progress', priority: 'high',
      assigneeId: byName['Uday Shashidhar'].id, labels: ['data', 'dashboard'],
      deadline: new Date('2026-03-10'), order: 1, createdById: byName['Shreyas'].id,
    },
    {
      title: 'Deploy production infrastructure',
      description: 'Set up production servers, CI/CD pipeline, and monitoring',
      projectId: socioo.id, status: 'todo', priority: 'high',
      assigneeId: byName['Shyam'].id, labels: ['devops', 'infra'],
      deadline: new Date('2026-03-15'), order: 2, createdById: byName['Likith'].id,
    },
    // CRM & Sales
    {
      title: 'Set up CRM pipeline',
      description: 'Configure lead tracking, follow-up automation, and deal stages',
      projectId: crm.id, status: 'in_progress', priority: 'high',
      assigneeId: byName['Vineet'].id, labels: ['crm', 'setup'],
      deadline: new Date('2026-02-25'), order: 0, createdById: byName['Shreyas'].id,
    },
    {
      title: 'Customer support workflow',
      description: 'Create support ticket system and escalation process',
      projectId: crm.id, status: 'todo', priority: 'medium',
      assigneeId: byName['Toshith'].id, labels: ['support', 'process'],
      deadline: new Date('2026-03-01'), order: 1, createdById: byName['Vineet'].id,
    },
    {
      title: 'Business development outreach',
      description: 'Identify and reach out to potential B2B clients',
      projectId: crm.id, status: 'in_progress', priority: 'high',
      assigneeId: byName['Malaika'].id, labels: ['sales', 'outreach'],
      deadline: new Date('2026-02-28'), order: 2, createdById: byName['Shreyas'].id,
    },
    {
      title: 'Sales operations training',
      description: 'Onboard and train on sales tools and processes',
      projectId: crm.id, status: 'todo', priority: 'medium',
      assigneeId: byName['Bala Aditya'].id, labels: ['training', 'onboarding'],
      deadline: new Date('2026-03-05'), order: 3, createdById: byName['Vineet'].id,
    },
    // Marketing & Outreach
    {
      title: 'Social media content calendar',
      description: 'Plan and schedule posts for Instagram, LinkedIn, and Twitter',
      projectId: marketing.id, status: 'in_progress', priority: 'high',
      assigneeId: byName['Anuhya'].id, labels: ['social-media', 'content'],
      deadline: new Date('2026-02-20'), order: 0, createdById: byName['Gayatri'].id,
    },
    {
      title: 'Market research report',
      description: 'Competitive analysis and market sizing for Q1 2026',
      projectId: marketing.id, status: 'review', priority: 'medium',
      assigneeId: byName['Radhesh'].id, labels: ['research', 'analysis'],
      deadline: new Date('2026-02-22'), order: 1, createdById: byName['Gayatri'].id,
    },
    {
      title: 'Email outreach campaign',
      description: 'Design and launch email campaign targeting SMBs',
      projectId: marketing.id, status: 'todo', priority: 'medium',
      assigneeId: byName['Suvidya'].id, labels: ['email', 'outreach'],
      deadline: new Date('2026-03-01'), order: 2, createdById: byName['Anuhya'].id,
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
        { title: 'Edit and post-production', completed: false },
      ] },
    },
    {
      title: 'Brand assets update',
      description: 'Update logos, banners, and social media templates for 2026',
      projectId: production.id, status: 'todo', priority: 'medium',
      assigneeId: byName['Yashwanth'].id, labels: ['design', 'branding'],
      deadline: new Date('2026-03-01'), order: 1, createdById: byName['Abdul'].id,
    },
  ];

  const tasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({ data: t });
    tasks.push(task);
  }
  console.log(`Created ${tasks.length} tasks`);

  // Create activity log
  await prisma.activity.createMany({
    data: [
      { userId: byName['Likith'].id, action: 'project_created', targetType: 'project', targetId: socioo.id, details: 'Created project "Socioo Platform"' },
      { userId: byName['Shreyas'].id, action: 'project_created', targetType: 'project', targetId: crm.id, details: 'Created project "CRM & Sales"' },
      { userId: byName['Gayatri'].id, action: 'project_created', targetType: 'project', targetId: marketing.id, details: 'Created project "Marketing & Outreach"' },
      { userId: byName['Abdul'].id, action: 'project_created', targetType: 'project', targetId: production.id, details: 'Created project "Content & Production"' },
      { userId: byName['Shyam'].id, action: 'task_moved', targetType: 'task', targetId: tasks[0].id, details: 'Started "Platform architecture review"' },
      { userId: byName['Uday Shashidhar'].id, action: 'task_moved', targetType: 'task', targetId: tasks[1].id, details: 'Started "Data analytics dashboard"' },
      { userId: byName['Vineet'].id, action: 'task_moved', targetType: 'task', targetId: tasks[3].id, details: 'Started "Set up CRM pipeline"' },
      { userId: byName['Anuhya'].id, action: 'task_moved', targetType: 'task', targetId: tasks[7].id, details: 'Started "Social media content calendar"' },
      { userId: byName['Dinesh'].id, action: 'task_moved', targetType: 'task', targetId: tasks[10].id, details: 'Started "Product demo video"' },
    ],
  });

  console.log('Created 9 activity entries');

  console.log('\n  Seed completed successfully!');
  console.log('  ──────────────────────────────');
  console.log(`  Admin PIN: ${process.env.ADMIN_PIN || '1234'}`);
  console.log(`  Team Members: ${users.length}`);
  console.log(`  Admins: ${users.filter(u => u.isAdmin).map(u => u.name).join(', ')}`);
  console.log(`  Projects: 4`);
  console.log(`  Tasks: ${tasks.length}`);
  console.log(`  All passwords: socioo@123`);
  console.log('  ──────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
