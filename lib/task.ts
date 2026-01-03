import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { TaskCreate, TaskUpdate, TaskFilter } from '@/lib/validators/task'

// =============================================================================
// TASK SERVICE
// =============================================================================

export type TaskWithContact = Prisma.TaskGetPayload<{
  include: { contact: true }
}>

/**
 * Get all tasks for a user with filtering and pagination
 */
export async function getTasks(
  userId: string,
  filter: TaskFilter = {} as TaskFilter
): Promise<{ tasks: TaskWithContact[]; total: number }> {
  const {
    status,
    contactId,
    dueBefore,
    dueAfter,
    includeOverdue = false,
    sortBy = 'dueDate',
    sortOrder = 'asc',
    limit = 50,
    offset = 0,
  } = filter

  const where: Prisma.TaskWhereInput = { userId }

  if (status) {
    where.status = status
  }

  if (contactId) {
    where.contactId = contactId
  }

  if (dueBefore || dueAfter) {
    where.dueDate = {}
    if (dueBefore) where.dueDate.lte = dueBefore
    if (dueAfter) where.dueDate.gte = dueAfter
  }

  if (includeOverdue && !status) {
    where.OR = [
      { status: 'PENDING' },
      {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    ]
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { contact: true },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.task.count({ where }),
  ])

  return { tasks, total }
}

/**
 * Get a single task by ID
 */
export async function getTask(
  userId: string,
  taskId: string
): Promise<TaskWithContact | null> {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { contact: true },
  })
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  data: TaskCreate
): Promise<TaskWithContact> {
  return prisma.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      contactId: data.contactId,
      entityId: data.entityId,
      status: 'PENDING',
    },
    include: { contact: true },
  })
}

/**
 * Update a task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  data: TaskUpdate
): Promise<TaskWithContact> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Aufgabe nicht gefunden')
  }

  // Set completedAt when status changes to COMPLETED
  let completedAt = task.completedAt
  if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
    completedAt = new Date()
  } else if (data.status && data.status !== 'COMPLETED') {
    completedAt = null
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contactId !== undefined && { contactId: data.contactId }),
      ...(data.entityId !== undefined && { entityId: data.entityId }),
      completedAt,
    },
    include: { contact: true },
  })
}

/**
 * Delete a task
 */
export async function deleteTask(
  userId: string,
  taskId: string
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Aufgabe nicht gefunden')
  }

  await prisma.task.delete({
    where: { id: taskId },
  })
}

/**
 * Complete a task
 */
export async function completeTask(
  userId: string,
  taskId: string
): Promise<TaskWithContact> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Aufgabe nicht gefunden')
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: { contact: true },
  })
}

/**
 * Cancel a task
 */
export async function cancelTask(
  userId: string,
  taskId: string
): Promise<TaskWithContact> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Aufgabe nicht gefunden')
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'CANCELLED',
    },
    include: { contact: true },
  })
}

/**
 * Reopen a task (set back to pending)
 */
export async function reopenTask(
  userId: string,
  taskId: string
): Promise<TaskWithContact> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Aufgabe nicht gefunden')
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'PENDING',
      completedAt: null,
    },
    include: { contact: true },
  })
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  userId: string
): Promise<TaskWithContact[]> {
  return prisma.task.findMany({
    where: {
      userId,
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    include: { contact: true },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Get tasks due today
 */
export async function getTasksDueToday(
  userId: string
): Promise<TaskWithContact[]> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  return prisma.task.findMany({
    where: {
      userId,
      status: 'PENDING',
      dueDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    include: { contact: true },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Get upcoming tasks (next 7 days)
 */
export async function getUpcomingTasks(
  userId: string,
  days = 7
): Promise<TaskWithContact[]> {
  const today = new Date()
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

  return prisma.task.findMany({
    where: {
      userId,
      status: 'PENDING',
      dueDate: {
        gte: today,
        lte: futureDate,
      },
    },
    include: { contact: true },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Get task statistics
 */
export async function getTaskStats(userId: string): Promise<{
  pending: number
  completed: number
  overdue: number
  dueToday: number
}> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const [pending, completed, overdue, dueToday] = await Promise.all([
    prisma.task.count({ where: { userId, status: 'PENDING' } }),
    prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.task.count({
      where: {
        userId,
        status: 'PENDING',
        dueDate: { lt: today },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'PENDING',
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
    }),
  ])

  return { pending, completed, overdue, dueToday }
}

/**
 * Get tasks for a contact
 */
export async function getTasksForContact(
  userId: string,
  contactId: string
): Promise<TaskWithContact[]> {
  return prisma.task.findMany({
    where: { userId, contactId },
    include: { contact: true },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}
