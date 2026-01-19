import { prisma } from '@/lib/core/prisma'
import { Prisma, NotificationType } from '@prisma/client'
import type { NotificationCreate, NotificationFilter } from '@/lib/validators/task'

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

export type NotificationData = Prisma.NotificationGetPayload<object>

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  filter: NotificationFilter = {} as NotificationFilter
): Promise<{ notifications: NotificationData[]; total: number; unreadCount: number }> {
  const {
    type,
    isRead,
    includeArchived = false,
    limit = 50,
    offset = 0,
  } = filter

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(includeArchived ? {} : { archivedAt: null }),
  }

  if (type) {
    where.type = type as NotificationType
  }

  if (isRead !== undefined) {
    where.isRead = isRead
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, isRead: false, archivedAt: null },
    }),
  ])

  return { notifications, total, unreadCount }
}

/**
 * Get a single notification
 */
export async function getNotification(
  userId: string,
  notificationId: string
): Promise<NotificationData | null> {
  return prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  data: NotificationCreate
): Promise<NotificationData> {
  return prisma.notification.create({
    data: {
      userId,
      type: data.type as NotificationType,
      title: data.title,
      message: data.message,
      data: data.data as Prisma.InputJsonValue,
    },
  })
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<NotificationData> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notification) {
    throw new Error('Benachrichtigung nicht gefunden')
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false, archivedAt: null },
    data: { isRead: true },
  })

  return result.count
}

/**
 * Archive a notification
 */
export async function archiveNotification(
  userId: string,
  notificationId: string
): Promise<NotificationData> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notification) {
    throw new Error('Benachrichtigung nicht gefunden')
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { archivedAt: new Date(), isRead: true },
  })
}

/**
 * Archive all notifications
 */
export async function archiveAllNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, archivedAt: null },
    data: { archivedAt: new Date(), isRead: true },
  })

  return result.count
}

/**
 * Delete a notification permanently
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notification) {
    throw new Error('Benachrichtigung nicht gefunden')
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  })
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false, archivedAt: null },
  })
}

/**
 * Create sync conflict notification
 */
export async function createSyncConflictNotification(
  userId: string,
  contactName: string,
  field: string
): Promise<NotificationData> {
  return createNotification(userId, {
    type: 'SYNC_CONFLICT',
    title: `Sync-Konflikt: ${contactName}`,
    message: `Das Feld "${field}" wurde sowohl lokal als auch in Google geändert. Die lokale Änderung wurde übernommen.`,
    data: { contactName, field },
  })
}

/**
 * Create sync error notification
 */
export async function createSyncErrorNotification(
  userId: string,
  error: string
): Promise<NotificationData> {
  return createNotification(userId, {
    type: 'SYNC_ERROR',
    title: 'Synchronisationsfehler',
    message: `Bei der Synchronisation mit Google Contacts ist ein Fehler aufgetreten: ${error}`,
    data: { error },
  })
}

/**
 * Create birthday reminder notification
 */
export async function createBirthdayReminder(
  userId: string,
  contactId: string,
  contactName: string,
  birthday: Date
): Promise<NotificationData> {
  const today = new Date()
  const bday = new Date(birthday)
  bday.setFullYear(today.getFullYear())
  
  const daysUntil = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  let message: string
  if (daysUntil === 0) {
    message = `${contactName} hat heute Geburtstag!`
  } else if (daysUntil === 1) {
    message = `${contactName} hat morgen Geburtstag!`
  } else {
    message = `${contactName} hat in ${daysUntil} Tagen Geburtstag.`
  }

  return createNotification(userId, {
    type: 'BIRTHDAY_REMINDER',
    title: `Geburtstag: ${contactName}`,
    message,
    data: { contactId, contactName, birthday: birthday.toISOString(), daysUntil },
  })
}

/**
 * Create contact match required notification
 */
export async function createContactMatchNotification(
  userId: string,
  googleContactName: string,
  possibleMatches: Array<{ id: string; name: string }>
): Promise<NotificationData> {
  return createNotification(userId, {
    type: 'CONTACT_MATCH_REQUIRED',
    title: `Manuelle Zuordnung erforderlich`,
    message: `Der Google-Kontakt "${googleContactName}" konnte nicht automatisch zugeordnet werden. Bitte wähle den passenden lokalen Kontakt aus.`,
    data: { googleContactName, possibleMatches },
  })
}

/**
 * Delete old archived notifications (cleanup)
 */
export async function cleanupOldNotifications(
  userId: string,
  daysOld = 30
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      archivedAt: { lt: cutoffDate },
    },
  })

  return result.count
}
