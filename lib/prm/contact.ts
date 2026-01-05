import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { ContactCreate, ContactUpdate, ContactFilter } from '@/lib/validators/contact'

// =============================================================================
// CONTACT SERVICE
// =============================================================================

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function ensureUniqueSlug(userId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const existing = await prisma.contact.findFirst({
      where: {
        userId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    
    if (!existing) return slug
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

export type ContactWithRelations = Prisma.ContactGetPayload<{
  include: {
    relationsAsA: { include: { personB: true } }
    relationsAsB: { include: { personA: true } }
    interactions: true
    tasks: true
    location: true
  }
}>

/**
 * Get all contacts for a user with filtering and pagination
 */
export async function getContacts(
  userId: string,
  filter: Partial<ContactFilter & { summary?: boolean }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ contacts: any[]; total: number }> {
  const {
    search,
    isFavorite,
    isArchived = false,
    hasGoogleSync,
    groupId,
    sortBy = 'givenName',
    sortOrder = 'asc',
    limit = 50,
    offset = 0,
    summary = false,
  } = filter

  // Base where clause
  const where: Prisma.ContactWhereInput = {
    userId,
    isArchived,
  }

  if (isFavorite !== undefined) {
    where.isFavorite = isFavorite
  }

  if (hasGoogleSync !== undefined) {
    where.googleResourceName = hasGoogleSync ? { not: null } : null
  }

  // Filter by contact group (taxonomy)
  if (groupId) {
    const taggings = await prisma.tagging.findMany({
      where: { userId, taxonomyId: groupId },
      select: { entityId: true },
    })
    const contactIds = taggings.map(t => t.entityId)
    where.id = { in: contactIds }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { givenName: { contains: search, mode: 'insensitive' } },
      { familyName: { contains: search, mode: 'insensitive' } },
      { nickname: { contains: search, mode: 'insensitive' } },
      { emailPrivate: { contains: search, mode: 'insensitive' } },
      { emailWork: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Sort logic with tie-breaker for deterministic pagination
  const orderBy: Prisma.ContactOrderByWithRelationInput[] = []
  if (sortBy === 'lastInteraction') {
    orderBy.push({ updatedAt: sortOrder as Prisma.SortOrder })
  } else {
    const sortObj: Record<string, Prisma.SortOrder> = {}
    sortObj[sortBy] = sortOrder as Prisma.SortOrder
    orderBy.push(sortObj as Prisma.ContactOrderByWithRelationInput)
  }
  orderBy.push({ id: 'asc' }) 

  // Selective inclusion based on summary mode
  const includeSummary = {
    location: true,
  } as const

  const includeFull = {
    relationsAsA: { include: { personB: true } },
    relationsAsB: { include: { personA: true } },
    interactions: { orderBy: { occurredAt: 'desc' }, take: 5 },
    tasks: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' } },
    location: true,
  } as const

  const include = summary ? includeSummary : includeFull

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      include: include as any, // Cast necessary due to conditional inclusion
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.contact.count({ where }),
  ])

  return { contacts, total }
}

/**
 * Get a single contact by ID or slug
 */
export async function getContact(
  userId: string,
  idOrSlug: string
): Promise<ContactWithRelations | null> {
  return prisma.contact.findFirst({
    where: {
      userId,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      relationsAsA: { include: { personB: true } },
      relationsAsB: { include: { personA: true } },
      interactions: { orderBy: { occurredAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      location: true,
    },
  })
}

/**
 * Create a new contact
 */
export async function createContact(
  userId: string,
  data: ContactCreate
): Promise<ContactWithRelations> {
  const slug = await ensureUniqueSlug(userId, toSlug(data.name))

  return prisma.contact.create({
    data: {
      userId,
      slug,
      name: data.name,
      givenName: data.givenName,
      familyName: data.familyName,
      nickname: data.nickname,
      emailPrivate: data.emailPrivate || null,
      emailWork: data.emailWork || null,
      phonePrivate: data.phonePrivate,
      phoneWork: data.phoneWork,
      addressHome: data.addressHome,
      addressWork: data.addressWork,
      company: data.company,
      jobTitle: data.jobTitle,
      notes: data.notes,
      birthday: data.birthday,
      firstMetAt: data.firstMetAt,
      relationshipLevel: data.relationshipLevel,
      isFavorite: data.isFavorite ?? false,
      websiteUrl: data.websiteUrl || null,
      socialUrls: data.socialUrls as Prisma.InputJsonValue,
      locationId: data.locationId,
      namesToDetectAsMention: data.namesToDetectAsMention || [],
    },
    include: {
      relationsAsA: { include: { personB: true } },
      relationsAsB: { include: { personA: true } },
      interactions: { orderBy: { occurredAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      location: true,
    },
  })
}

/**
 * Update a contact
 */
export async function updateContact(
  userId: string,
  contactId: string,
  data: ContactUpdate
): Promise<ContactWithRelations> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact) {
    throw new Error('Kontakt nicht gefunden')
  }

  // Update slug if name changed
  let slug = contact.slug
  if (data.name && data.name !== contact.name) {
    slug = await ensureUniqueSlug(userId, toSlug(data.name), contactId)
  }

  return prisma.contact.update({
    where: { id: contactId },
    data: {
      slug,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.givenName !== undefined && { givenName: data.givenName }),
      ...(data.familyName !== undefined && { familyName: data.familyName }),
      ...(data.nickname !== undefined && { nickname: data.nickname }),
      ...(data.emailPrivate !== undefined && { emailPrivate: data.emailPrivate || null }),
      ...(data.emailWork !== undefined && { emailWork: data.emailWork || null }),
      ...(data.phonePrivate !== undefined && { phonePrivate: data.phonePrivate }),
      ...(data.phoneWork !== undefined && { phoneWork: data.phoneWork }),
      ...(data.addressHome !== undefined && { addressHome: data.addressHome }),
      ...(data.addressWork !== undefined && { addressWork: data.addressWork }),
      ...(data.company !== undefined && { company: data.company }),
      ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.birthday !== undefined && { birthday: data.birthday }),
      ...(data.firstMetAt !== undefined && { firstMetAt: data.firstMetAt }),
      ...(data.relationshipLevel !== undefined && { relationshipLevel: data.relationshipLevel }),
      ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
      ...(data.socialUrls !== undefined && { socialUrls: data.socialUrls as Prisma.InputJsonValue }),
      ...(data.locationId !== undefined && { locationId: data.locationId }),
      ...(data.namesToDetectAsMention !== undefined && { namesToDetectAsMention: data.namesToDetectAsMention || [] }),
    },
    include: {
      relationsAsA: { include: { personB: true } },
      relationsAsB: { include: { personA: true } },
      interactions: { orderBy: { occurredAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      location: true,
    },
  })
}

/**
 * Delete a contact (or archive it)
 */
export async function deleteContact(
  userId: string,
  contactId: string,
  permanent = false
): Promise<void> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact) {
    throw new Error('Kontakt nicht gefunden')
  }

  if (permanent) {
    await prisma.contact.delete({
      where: { id: contactId },
    })
  } else {
    await prisma.contact.update({
      where: { id: contactId },
      data: { isArchived: true },
    })
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  userId: string,
  contactId: string
): Promise<boolean> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact) {
    throw new Error('Kontakt nicht gefunden')
  }

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: { isFavorite: !contact.isFavorite },
  })

  return updated.isFavorite
}

/**
 * Search contacts by name (for autocomplete)
 */
export async function searchContacts(
  userId: string,
  query: string,
  limit = 10
): Promise<Array<{ id: string; name: string; slug: string }>> {
  if (!query || query.length < 2) return []

  return prisma.contact.findMany({
    where: {
      userId,
      isArchived: false,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { givenName: { contains: query, mode: 'insensitive' } },
        { familyName: { contains: query, mode: 'insensitive' } },
        { nickname: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
}

/**
 * Get contacts with upcoming birthdays
 */
export async function getUpcomingBirthdays(
  userId: string,
  daysAhead = 30
): Promise<Array<{ id: string; name: string; slug: string; birthday: Date }>> {
  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      isArchived: false,
      birthday: { not: null },
    },
    select: { id: true, name: true, slug: true, birthday: true },
  })

  const today = new Date()
  const upcoming = contacts
    .filter((c): c is typeof c & { birthday: Date } => c.birthday !== null)
    .filter(c => {
      const bday = new Date(c.birthday)
      bday.setFullYear(today.getFullYear())
      if (bday < today) bday.setFullYear(today.getFullYear() + 1)
      const daysUntil = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil <= daysAhead
    })
    .sort((a, b) => {
      const aDay = new Date(a.birthday)
      const bDay = new Date(b.birthday)
      aDay.setFullYear(today.getFullYear())
      bDay.setFullYear(today.getFullYear())
      return aDay.getTime() - bDay.getTime()
    })

  return upcoming
}

/**
 * Get journal entries that mention a contact
 */
export async function getJournalMentions(
  userId: string,
  contactId: string,
  limit = 20
): Promise<Array<{
  id: string
  title: string | null
  content: string
  occurredAt: Date
  journalEntryId: string | null
}>> {
  const interactions = await prisma.interaction.findMany({
    where: {
      userId,
      contactId,
      kind: 'MENTION',
      journalEntryId: { not: null },
    },
    include: {
      journalEntry: {
        select: { id: true, title: true, content: true },
      },
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })

  return interactions.map(i => ({
    id: i.id,
    title: i.journalEntry?.title || null,
    content: i.journalEntry?.content || i.notes || '',
    occurredAt: i.occurredAt,
    journalEntryId: i.journalEntryId,
  }))
}

/**
 * Create a person relation
 */
export async function createRelation(
  userId: string,
  personAId: string,
  personBId: string,
  relationType: string
): Promise<void> {
  // Check both contacts exist and belong to user
  const [personA, personB] = await Promise.all([
    prisma.contact.findFirst({ where: { id: personAId, userId } }),
    prisma.contact.findFirst({ where: { id: personBId, userId } }),
  ])

  if (!personA || !personB) {
    throw new Error('Einer oder beide Kontakte wurden nicht gefunden')
  }

  await prisma.personRelation.create({
    data: {
      userId,
      personAId,
      personBId,
      relationType,
    },
  })
}

/**
 * Delete a person relation
 */
export async function deleteRelation(
  userId: string,
  relationId: string
): Promise<void> {
  const relation = await prisma.personRelation.findFirst({
    where: { id: relationId, userId },
  })

  if (!relation) {
    throw new Error('Beziehung nicht gefunden')
  }

  await prisma.personRelation.delete({
    where: { id: relationId },
  })
}

/**
 * Create an interaction
 */
export async function createInteraction(
  userId: string,
  contactId: string,
  kind: string,
  notes?: string,
  occurredAt?: Date,
  journalEntryId?: string,
  timeBoxId?: string
): Promise<void> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact) {
    throw new Error('Kontakt nicht gefunden')
  }

  await prisma.interaction.create({
    data: {
      userId,
      contactId,
      kind: kind as 'GENERAL' | 'CALL' | 'VIDEO' | 'MEETING' | 'MESSAGE' | 'EMAIL' | 'LETTER' | 'SOCIAL' | 'MENTION',
      notes,
      occurredAt: occurredAt || new Date(),
      journalEntryId,
      timeBoxId,
    },
  })
}

/**
 * Get interactions for a contact
 */
export async function getInteractions(
  userId: string,
  contactId: string,
  limit = 50
): Promise<Array<{
  id: string
  kind: string
  notes: string | null
  occurredAt: Date
  journalEntryId: string | null
}>> {
  return prisma.interaction.findMany({
    where: { userId, contactId },
    select: {
      id: true,
      kind: true,
      notes: true,
      occurredAt: true,
      journalEntryId: true,
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
}

/**
 * Delete an interaction
 */
export async function deleteInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  const interaction = await prisma.interaction.findFirst({
    where: { id: interactionId, userId },
  })

  if (!interaction) {
    throw new Error('Interaktion nicht gefunden')
  }

  await prisma.interaction.delete({
    where: { id: interactionId },
  })
}

/**
 * Get contact statistics
 */
export async function getContactStats(userId: string): Promise<{
  total: number
  favorites: number
  archived: number
  withGoogle: number
  upcomingBirthdays: number
}> {
  const [total, favorites, archived, withGoogle] = await Promise.all([
    prisma.contact.count({ where: { userId, isArchived: false } }),
    prisma.contact.count({ where: { userId, isFavorite: true, isArchived: false } }),
    prisma.contact.count({ where: { userId, isArchived: true } }),
    prisma.contact.count({ where: { userId, googleResourceName: { not: null }, isArchived: false } }),
  ])

  const birthdays = await getUpcomingBirthdays(userId, 30)

  return {
    total,
    favorites,
    archived,
    withGoogle,
    upcomingBirthdays: birthdays.length,
  }
}
