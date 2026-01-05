import { z } from 'zod'

// =============================================================================
// CONTACT VALIDATORS
// =============================================================================

// Social URL Schema
export const SocialUrlSchema = z.object({
  type: z.string().min(1, 'Typ ist erforderlich'),
  url: z.string().url('Ungültige URL'),
})

export type SocialUrl = z.infer<typeof SocialUrlSchema>

// Contact Create Schema
export const ContactCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200, 'Name darf maximal 200 Zeichen haben'),
  givenName: z.string().max(100, 'Vorname darf maximal 100 Zeichen haben').optional().nullable(),
  familyName: z.string().max(100, 'Nachname darf maximal 100 Zeichen haben').optional().nullable(),
  nickname: z.string().max(100, 'Spitzname darf maximal 100 Zeichen haben').optional().nullable(),
  emailPrivate: z.string().email('Ungültige E-Mail-Adresse').optional().nullable().or(z.literal('')),
  emailWork: z.string().email('Ungültige geschäftliche E-Mail-Adresse').optional().nullable().or(z.literal('')),
  phonePrivate: z.string().max(50, 'Telefonnummer darf maximal 50 Zeichen haben').optional().nullable(),
  phoneWork: z.string().max(50, 'Geschäftliche Telefonnummer darf maximal 50 Zeichen haben').optional().nullable(),
  addressHome: z.string().max(500, 'Adresse darf maximal 500 Zeichen haben').optional().nullable(),
  addressWork: z.string().max(500, 'Geschäftsadresse darf maximal 500 Zeichen haben').optional().nullable(),
  company: z.string().max(200, 'Firmenname darf maximal 200 Zeichen haben').optional().nullable(),
  jobTitle: z.string().max(200, 'Jobtitel darf maximal 200 Zeichen haben').optional().nullable(),
  notes: z.string().max(10000, 'Notizen dürfen maximal 10000 Zeichen haben').optional().nullable(),
  birthday: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional().nullable()
  ),
  firstMetAt: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional().nullable()
  ),
  relationshipLevel: z.number().int().min(1).max(5).optional().nullable(),
  isFavorite: z.boolean().optional(),
  websiteUrl: z.string().url('Ungültige Website-URL').optional().nullable().or(z.literal('')),
  socialUrls: z.array(SocialUrlSchema).optional().nullable(),
  locationId: z.string().uuid('Ungültige Orts-ID').optional().nullable(),
  namesToDetectAsMention: z.array(z.string().min(1)).optional().nullable(),
})

export type ContactCreate = z.infer<typeof ContactCreateSchema>

// Contact Update Schema (all fields optional except id)
export const ContactUpdateSchema = ContactCreateSchema.partial().extend({
  isArchived: z.boolean().optional(),
})

export type ContactUpdate = z.infer<typeof ContactUpdateSchema>

// Contact Search/Filter Schema
export const ContactFilterSchema = z.object({
  search: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  hasGoogleSync: z.boolean().optional(),
  groupId: z.string().uuid().optional(),
  sortBy: z.enum(['givenName', 'familyName', 'createdAt', 'updatedAt', 'lastInteraction']).default('givenName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(2000).default(50),
  offset: z.number().int().min(0).default(0),
})

export type ContactFilter = z.infer<typeof ContactFilterSchema>

// =============================================================================
// PERSON RELATION VALIDATORS
// =============================================================================

export const RelationTypeEnum = z.enum([
  'Partner',
  'Ehepartner',
  'Freund',
  'Freundin',
  'Bekannter',
  'Bekannte',
  'Kollege',
  'Kollegin',
  'Chef',
  'Chefin',
  'Mitarbeiter',
  'Mitarbeiterin',
  'Vater',
  'Mutter',
  'Sohn',
  'Tochter',
  'Bruder',
  'Schwester',
  'Grossvater',
  'Grossmutter',
  'Onkel',
  'Tante',
  'Cousin',
  'Cousine',
  'Neffe',
  'Nichte',
  'Schwager',
  'Schwägerin',
  'Schwiegervater',
  'Schwiegermutter',
  'Nachbar',
  'Nachbarin',
  'Arzt',
  'Ärztin',
  'Therapeut',
  'Therapeutin',
  'Lehrer',
  'Lehrerin',
  'Mentor',
  'Mentorin',
  'Sonstiges',
])

export const PersonRelationCreateSchema = z.object({
  personAId: z.string().uuid('Ungültige Person-A-ID'),
  personBId: z.string().uuid('Ungültige Person-B-ID'),
  relationType: z.string().min(1, 'Beziehungstyp ist erforderlich').max(100, 'Beziehungstyp darf maximal 100 Zeichen haben'),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
}).refine((data) => data.personAId !== data.personBId, {
  message: 'Person A und Person B dürfen nicht identisch sein',
  path: ['personBId'],
})

export type PersonRelationCreate = z.infer<typeof PersonRelationCreateSchema>

export const PersonRelationUpdateSchema = z.object({
  relationType: z.string().min(1).max(100).optional(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
})

export type PersonRelationUpdate = z.infer<typeof PersonRelationUpdateSchema>

// =============================================================================
// INTERACTION VALIDATORS
// =============================================================================

export const InteractionKindEnum = z.enum([
  'GENERAL',
  'CALL',
  'VIDEO',
  'MEETING',
  'MESSAGE',
  'EMAIL',
  'LETTER',
  'SOCIAL',
  'MENTION',
])

export const InteractionCreateSchema = z.object({
  contactId: z.string().uuid('Ungültige Kontakt-ID'),
  kind: InteractionKindEnum.default('GENERAL'),
  notes: z.string().max(10000, 'Notizen dürfen maximal 10000 Zeichen haben').optional().nullable(),
  occurredAt: z.coerce.date().default(() => new Date()),
  timeBoxId: z.string().uuid('Ungültige TimeBox-ID').optional().nullable(),
  journalEntryId: z.string().uuid('Ungültige Journal-Eintrag-ID').optional().nullable(),
})

export type InteractionCreate = z.infer<typeof InteractionCreateSchema>

export const InteractionUpdateSchema = z.object({
  kind: InteractionKindEnum.optional(),
  notes: z.string().max(10000).optional().nullable(),
  occurredAt: z.coerce.date().optional(),
})

export type InteractionUpdate = z.infer<typeof InteractionUpdateSchema>

export const InteractionFilterSchema = z.object({
  contactId: z.string().uuid().optional(),
  kind: InteractionKindEnum.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export type InteractionFilter = z.infer<typeof InteractionFilterSchema>
