import { describe, it, expect } from 'vitest'
import {
  ContactCreateSchema,
  ContactUpdateSchema,
  ContactFilterSchema,
  PersonRelationCreateSchema,
  InteractionCreateSchema,
  SocialUrlSchema,
} from '@/lib/validators/contact'

describe('ContactCreateSchema', () => {
  it('should validate a minimal contact', () => {
    const result = ContactCreateSchema.safeParse({
      name: 'Max Mustermann',
    })
    expect(result.success).toBe(true)
  })

  it('should validate a full contact', () => {
    const result = ContactCreateSchema.safeParse({
      name: 'Max Mustermann',
      givenName: 'Max',
      familyName: 'Mustermann',
      nickname: 'Maxi',
      emailPrivate: 'max@example.com',
      emailWork: 'max.mustermann@company.com',
      phonePrivate: '+41 79 123 45 67',
      phoneWork: '+41 44 123 45 67',
      addressHome: 'Bahnhofstrasse 1, 8001 Zürich',
      addressWork: 'Paradeplatz 2, 8001 Zürich',
      company: 'ACME AG',
      jobTitle: 'Software Engineer',
      notes: 'Wichtiger Kontakt',
      birthday: new Date('1990-01-15'),
      isFavorite: true,
      websiteUrl: 'https://example.com',
      socialUrls: [
        { type: 'linkedin', url: 'https://linkedin.com/in/maxmustermann' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const result = ContactCreateSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid email', () => {
    const result = ContactCreateSchema.safeParse({
      name: 'Max',
      emailPrivate: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('should allow empty string for optional email', () => {
    const result = ContactCreateSchema.safeParse({
      name: 'Max',
      emailPrivate: '',
    })
    expect(result.success).toBe(true)
  })

  it('should reject name that is too long', () => {
    const result = ContactCreateSchema.safeParse({
      name: 'x'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

describe('ContactUpdateSchema', () => {
  it('should allow partial updates', () => {
    const result = ContactUpdateSchema.safeParse({
      givenName: 'Updated Name',
    })
    expect(result.success).toBe(true)
  })

  it('should allow archiving', () => {
    const result = ContactUpdateSchema.safeParse({
      isArchived: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('ContactFilterSchema', () => {
  it('should apply defaults', () => {
    const result = ContactFilterSchema.parse({})
    expect(result.sortBy).toBe('givenName')
    expect(result.sortOrder).toBe('asc')
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('should accept valid filters', () => {
    const result = ContactFilterSchema.safeParse({
      search: 'max',
      isFavorite: true,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 25,
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid sortBy', () => {
    const result = ContactFilterSchema.safeParse({
      sortBy: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('PersonRelationCreateSchema', () => {
  it('should validate a valid relation', () => {
    const result = PersonRelationCreateSchema.safeParse({
      personAId: '123e4567-e89b-12d3-a456-426614174000',
      personBId: '123e4567-e89b-12d3-a456-426614174001',
      relationType: 'Freund',
    })
    expect(result.success).toBe(true)
  })

  it('should reject same person for both sides', () => {
    const result = PersonRelationCreateSchema.safeParse({
      personAId: '123e4567-e89b-12d3-a456-426614174000',
      personBId: '123e4567-e89b-12d3-a456-426614174000',
      relationType: 'Freund',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUIDs', () => {
    const result = PersonRelationCreateSchema.safeParse({
      personAId: 'not-a-uuid',
      personBId: '123e4567-e89b-12d3-a456-426614174001',
      relationType: 'Freund',
    })
    expect(result.success).toBe(false)
  })
})

describe('InteractionCreateSchema', () => {
  it('should validate a valid interaction', () => {
    const result = InteractionCreateSchema.safeParse({
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      kind: 'MEETING',
      notes: 'Kaffee getrunken',
    })
    expect(result.success).toBe(true)
  })

  it('should apply defaults', () => {
    const result = InteractionCreateSchema.parse({
      contactId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.kind).toBe('GENERAL')
    expect(result.occurredAt).toBeInstanceOf(Date)
  })

  it('should reject invalid kind', () => {
    const result = InteractionCreateSchema.safeParse({
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      kind: 'INVALID_KIND',
    })
    expect(result.success).toBe(false)
  })
})

describe('SocialUrlSchema', () => {
  it('should validate a valid social URL', () => {
    const result = SocialUrlSchema.safeParse({
      type: 'linkedin',
      url: 'https://linkedin.com/in/user',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid URL', () => {
    const result = SocialUrlSchema.safeParse({
      type: 'linkedin',
      url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty type', () => {
    const result = SocialUrlSchema.safeParse({
      type: '',
      url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })
})
