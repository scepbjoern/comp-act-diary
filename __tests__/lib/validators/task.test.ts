import { describe, it, expect } from 'vitest'
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskFilterSchema,
  NotificationCreateSchema,
} from '@/lib/validators/task'

describe('TaskCreateSchema', () => {
  it('should validate a minimal task', () => {
    const result = TaskCreateSchema.safeParse({
      title: 'Call Max',
    })
    expect(result.success).toBe(true)
  })

  it('should validate a full task', () => {
    const result = TaskCreateSchema.safeParse({
      title: 'Call Max',
      description: 'Discuss project timeline',
      dueDate: new Date('2025-01-15'),
      contactId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty title', () => {
    const result = TaskCreateSchema.safeParse({
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject title that is too long', () => {
    const result = TaskCreateSchema.safeParse({
      title: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('should allow optional fields to be null', () => {
    const result = TaskCreateSchema.safeParse({
      title: 'Test Task',
      description: null,
      dueDate: null,
      contactId: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('TaskUpdateSchema', () => {
  it('should allow partial updates', () => {
    const result = TaskUpdateSchema.safeParse({
      title: 'Updated Title',
    })
    expect(result.success).toBe(true)
  })

  it('should allow status update', () => {
    const result = TaskUpdateSchema.safeParse({
      status: 'COMPLETED',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid status', () => {
    const result = TaskUpdateSchema.safeParse({
      status: 'INVALID',
    })
    expect(result.success).toBe(false)
  })
})

describe('TaskFilterSchema', () => {
  it('should apply defaults', () => {
    const result = TaskFilterSchema.parse({})
    expect(result.sortBy).toBe('dueDate')
    expect(result.sortOrder).toBe('asc')
    expect(result.limit).toBe(50)
  })

  it('should accept valid filters', () => {
    const result = TaskFilterSchema.safeParse({
      status: 'PENDING',
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      dueBefore: new Date(),
    })
    expect(result.success).toBe(true)
  })
})

describe('NotificationCreateSchema', () => {
  it('should validate a valid notification', () => {
    const result = NotificationCreateSchema.safeParse({
      type: 'GENERAL',
      title: 'Test Notification',
      message: 'This is a test',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid type', () => {
    const result = NotificationCreateSchema.safeParse({
      type: 'INVALID_TYPE',
      title: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty title', () => {
    const result = NotificationCreateSchema.safeParse({
      type: 'GENERAL',
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('should allow all notification types', () => {
    const types = ['GENERAL', 'BIRTHDAY_REMINDER', 'SYNC_CONFLICT', 'SYNC_ERROR', 'CONTACT_MATCH_REQUIRED']
    
    types.forEach(type => {
      const result = NotificationCreateSchema.safeParse({
        type,
        title: 'Test',
      })
      expect(result.success).toBe(true)
    })
  })
})
