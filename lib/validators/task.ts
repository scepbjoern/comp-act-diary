import { z } from 'zod'

// =============================================================================
// TASK VALIDATORS
// =============================================================================

export const TaskStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED'])
export const TaskTypeEnum = z.enum([
  'IMMEDIATE',
  'REFLECTION',
  'PLANNED_INTERACTION',
  'FOLLOW_UP',
  'RESEARCH',
  'HABIT_RELATED',
  'GENERAL',
])
export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH'])
export const TaskSourceEnum = z.enum(['MANUAL', 'AI'])

export type TaskStatus = z.infer<typeof TaskStatusEnum>
export type TaskType = z.infer<typeof TaskTypeEnum>
export type TaskPriority = z.infer<typeof TaskPriorityEnum>
export type TaskSource = z.infer<typeof TaskSourceEnum>

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500, 'Titel darf maximal 500 Zeichen haben'),
  description: z.string().max(5000, 'Beschreibung darf maximal 5000 Zeichen haben').optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  contactId: z.string().uuid('Ungültige Kontakt-ID').optional().nullable(),
  entityId: z.string().uuid('Ungültige Entity-ID').optional().nullable(),
  journalEntryId: z.string().uuid('Ungültige JournalEntry-ID').optional().nullable(),
  taskType: TaskTypeEnum.default('GENERAL'),
  priority: TaskPriorityEnum.default('MEDIUM'),
  source: TaskSourceEnum.default('MANUAL'),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
})

export type TaskCreate = z.infer<typeof TaskCreateSchema>

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  status: TaskStatusEnum.optional(),
  contactId: z.string().uuid().optional().nullable(),
  entityId: z.string().uuid().optional().nullable(),
  journalEntryId: z.string().uuid().optional().nullable(),
  taskType: TaskTypeEnum.optional(),
  priority: TaskPriorityEnum.optional(),
})

export type TaskUpdate = z.infer<typeof TaskUpdateSchema>

export const TaskFilterSchema = z.object({
  status: TaskStatusEnum.optional(),
  contactId: z.string().uuid().optional(),
  journalEntryId: z.string().uuid().optional(),
  taskType: TaskTypeEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  source: TaskSourceEnum.optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  includeOverdue: z.boolean().default(false),
  sortBy: z.enum(['dueDate', 'createdAt', 'title', 'priority']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export type TaskFilter = z.infer<typeof TaskFilterSchema>

// =============================================================================
// NOTIFICATION VALIDATORS
// =============================================================================

export const NotificationTypeEnum = z.enum([
  'GENERAL',
  'BIRTHDAY_REMINDER',
  'SYNC_CONFLICT',
  'SYNC_ERROR',
  'CONTACT_MATCH_REQUIRED',
  'TASK_DUE',
])

export const NotificationCreateSchema = z.object({
  type: NotificationTypeEnum.default('GENERAL'),
  title: z.string().min(1, 'Titel ist erforderlich').max(500, 'Titel darf maximal 500 Zeichen haben'),
  message: z.string().max(5000, 'Nachricht darf maximal 5000 Zeichen haben').optional().nullable(),
  data: z.record(z.unknown()).optional().nullable(),
})

export type NotificationCreate = z.infer<typeof NotificationCreateSchema>

export const NotificationFilterSchema = z.object({
  type: NotificationTypeEnum.optional(),
  isRead: z.boolean().optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export type NotificationFilter = z.infer<typeof NotificationFilterSchema>
