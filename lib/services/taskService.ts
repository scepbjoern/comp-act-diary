/**
 * Task Service
 * Handles CRUD operations and business logic for tasks.
 * Extended to support journal entry association, priorities, types, and AI-generated tasks.
 */

import { prisma } from '@/lib/core/prisma'
import { Prisma } from '@prisma/client'
import type { TaskCreate, TaskUpdate, TaskFilter, TaskType, TaskPriority, TaskSource } from '@/lib/validators/task'

// =============================================================================
// TYPES
// =============================================================================

export type TaskWithContact = Prisma.TaskGetPayload<{
  include: { contact: true }
}>

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    contact: true
    journalEntry: {
      select: {
        id: true
        title: true
        occurredAt: true
        capturedAt: true
        createdAt: true
        timeBox: { select: { localDate: true } }
      }
    }
  }
}>

/** Task suggestion from AI extraction */
export interface TaskSuggestion {
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  suggestedDueDate?: Date | null
  relatedContactName?: string | null
  confidence: number
}

// Default include for full task relations
const taskInclude = {
  contact: true,
  journalEntry: {
    select: {
      id: true,
      title: true,
      occurredAt: true,
      capturedAt: true,
      createdAt: true,
      timeBox: { select: { localDate: true } },
    },
  },
} as const

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all tasks for a user with filtering and pagination
 */
export async function getTasks(
  userId: string,
  filter: TaskFilter = {} as TaskFilter
): Promise<{ tasks: TaskWithRelations[]; total: number }> {
  const {
    status,
    contactId,
    journalEntryId,
    taskType,
    priority,
    source,
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

  if (journalEntryId) {
    where.journalEntryId = journalEntryId
  }

  if (taskType) {
    where.taskType = taskType
  }

  if (priority) {
    where.priority = priority
  }

  if (source) {
    where.source = source
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

  // Handle priority sorting specially (HIGH > MEDIUM > LOW)
  let orderBy: Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[]
  if (sortBy === 'priority') {
    // Priority is already stored as enum in correct order in DB
    orderBy = { priority: sortOrder }
  } else {
    orderBy = { [sortBy]: sortOrder }
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
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
): Promise<TaskWithRelations | null> {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: taskInclude,
  })
}

/**
 * Get all tasks for a specific journal entry
 */
export async function getTasksForJournalEntry(
  userId: string,
  journalEntryId: string
): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    where: { userId, journalEntryId },
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  })
}

/**
 * Get count of open tasks (PENDING) for navigation badge
 */
export async function getOpenTaskCount(userId: string): Promise<number> {
  return prisma.task.count({
    where: { userId, status: 'PENDING' },
  })
}

// =============================================================================
// MUTATION FUNCTIONS
// =============================================================================

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  data: TaskCreate
): Promise<TaskWithRelations> {
  return prisma.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      contactId: data.contactId,
      entityId: data.entityId,
      journalEntryId: data.journalEntryId,
      taskType: data.taskType ?? 'GENERAL',
      priority: data.priority ?? 'MEDIUM',
      source: data.source ?? 'MANUAL',
      aiConfidence: data.aiConfidence,
      status: 'PENDING',
    },
    include: taskInclude,
  })
}

/**
 * Create multiple tasks from AI suggestions
 */
export async function createTasksFromSuggestions(
  userId: string,
  journalEntryId: string,
  suggestions: TaskSuggestion[],
  contactIdMap?: Map<string, string> // Map contact name to contactId
): Promise<TaskWithRelations[]> {
  const tasks = await prisma.$transaction(
    suggestions.map((suggestion) =>
      prisma.task.create({
        data: {
          userId,
          journalEntryId,
          title: suggestion.title,
          description: suggestion.description,
          dueDate: suggestion.suggestedDueDate,
          taskType: suggestion.taskType,
          priority: suggestion.priority,
          source: 'AI' as TaskSource,
          aiConfidence: suggestion.confidence,
          contactId: suggestion.relatedContactName
            ? contactIdMap?.get(suggestion.relatedContactName)
            : undefined,
          status: 'PENDING',
        },
        include: taskInclude,
      })
    )
  )

  return tasks
}

/**
 * Update a task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  data: TaskUpdate
): Promise<TaskWithRelations> {
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
      ...(data.journalEntryId !== undefined && { journalEntryId: data.journalEntryId }),
      ...(data.taskType !== undefined && { taskType: data.taskType }),
      ...(data.priority !== undefined && { priority: data.priority }),
      completedAt,
    },
    include: taskInclude,
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
): Promise<TaskWithRelations> {
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
    include: taskInclude,
  })
}

/**
 * Cancel a task
 */
export async function cancelTask(
  userId: string,
  taskId: string
): Promise<TaskWithRelations> {
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
    include: taskInclude,
  })
}

/**
 * Reopen a task (set back to pending)
 */
export async function reopenTask(
  userId: string,
  taskId: string
): Promise<TaskWithRelations> {
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
    include: taskInclude,
  })
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  userId: string
): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    where: {
      userId,
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Get tasks due today
 */
export async function getTasksDueToday(
  userId: string
): Promise<TaskWithRelations[]> {
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
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Get upcoming tasks (next 7 days)
 */
export async function getUpcomingTasks(
  userId: string,
  days = 7
): Promise<TaskWithRelations[]> {
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
    include: taskInclude,
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
): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    where: { userId, contactId },
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}
