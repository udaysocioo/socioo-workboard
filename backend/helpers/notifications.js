const prisma = require('../config/database');

async function createNotification({ userId, type, message, relatedId, relatedType }) {
  return prisma.notification.create({
    data: { userId, type, message, relatedId, relatedType },
  });
}

async function createNotifications(notifications) {
  if (!notifications.length) return;
  return prisma.notification.createMany({ data: notifications });
}

async function notifyProjectMembers({ projectId, excludeUserId, type, message, relatedId, relatedType }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { id: true } } },
  });
  if (!project) return;

  const notifications = project.members
    .filter((m) => m.id !== excludeUserId)
    .map((m) => ({ userId: m.id, type, message, relatedId, relatedType }));

  return createNotifications(notifications);
}

module.exports = { createNotification, createNotifications, notifyProjectMembers };
