import { db } from "@/server/db"
import type { NotificationType } from "@prisma/client"

export async function createNotification(data: {
  recipientId: string
  type: NotificationType
  title: string
  body: string
  entityType?: string
  entityId?: string
}) {
  return db.notification.create({ data })
}

export async function findNotificationsByUser(
  userId: string,
  opts?: { limit?: number; offset?: number }
) {
  const limit = opts?.limit ?? 20
  const offset = opts?.offset ?? 0

  return db.notification.findMany({
    where: { recipientId: userId },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: limit,
    skip: offset,
  })
}

export async function countUnreadNotifications(userId: string) {
  return db.notification.count({
    where: { recipientId: userId, readAt: null },
  })
}

export async function markNotificationRead(id: string) {
  await db.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function getEmailPreference(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const pref = await db.userNotificationPreference.findUnique({
    where: { userId_notificationType: { userId, notificationType: type } },
  })
  return pref?.emailEnabled ?? true
}
