/**
 * Calendar Service
 * Handles calendar event synchronization from Tasker webhook.
 * Includes: upsert via ExternalSync, delete stale events, TimeBox management, pattern matching.
 */

import { getPrisma } from '@/lib/core/prisma'
import { TaskerCalendarEvent, CalendarSyncResult } from '@/lib/validators/calendar'
import { convertAndTruncate } from '@/lib/utils/htmlToMarkdown'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TIMEZONE = 'Europe/Zurich'
const MAX_DESCRIPTION_LENGTH = 5000

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

/**
 * Synchronize calendar events from Tasker payload.
 * Creates/updates events, manages ExternalSync for deduplication, and deletes stale events.
 */
export async function syncCalendarEvents(
  events: TaskerCalendarEvent[],
  userId: string,
  providerId: string
): Promise<CalendarSyncResult> {
  const syncStartTime = new Date()
  const result: CalendarSyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    syncedAt: syncStartTime,
  }

  const prisma = getPrisma()

  // Process each event
  for (const event of events) {
    try {
      const { isNew } = await upsertCalendarEvent(event, userId, providerId)
      if (isNew) {
        result.created++
      } else {
        result.updated++
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      result.errors.push(`Event "${event.title}" (${event.eventId}): ${errorMsg}`)
    }
  }

  // Delete stale events (those not in current sync batch)
  try {
    result.deleted = await deleteStaleEvents(userId, providerId, events, syncStartTime)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    result.errors.push(`Löschvorgang fehlgeschlagen: ${errorMsg}`)
  }

  // Update provider lastSyncAt
  await prisma.syncProvider.update({
    where: { id: providerId },
    data: { lastSyncAt: syncStartTime },
  })

  return result
}

// =============================================================================
// UPSERT EVENT
// =============================================================================

/**
 * Create or update a calendar event via ExternalSync pattern.
 */
export async function upsertCalendarEvent(
  event: TaskerCalendarEvent,
  userId: string,
  providerId: string
): Promise<{ event: { id: string }; isNew: boolean }> {
  const prisma = getPrisma()

  // Fix all-day event dates (UTC → local)
  const { start, end } = fixAllDayEventDate(event)

  // Convert HTML description to Markdown
  const description = event.description 
    ? convertAndTruncate(event.description, MAX_DESCRIPTION_LENGTH)
    : null

  // Get or create TimeBox for the event day
  const timeBox = await getOrCreateTimeBox(userId, start)

  // Match location pattern
  const locationId = event.location 
    ? await matchPattern(userId, 'CALENDAR_LOCATION', event.location)
    : null

  // Check if ExternalSync exists for this event
  const existingSync = await prisma.externalSync.findUnique({
    where: {
      providerId_externalId: {
        providerId,
        externalId: event.eventId,
      },
    },
    include: {
      calendarEvents: true,
    },
  })

  if (existingSync && existingSync.calendarEvents.length > 0) {
    // Update existing event
    const calendarEvent = existingSync.calendarEvents[0]
    
    await prisma.calendarEvent.update({
      where: { id: calendarEvent.id },
      data: {
        title: event.title,
        description,
        startedAt: start,
        endedAt: end,
        isAllDay: event.allDay,
        location: event.location || null,
        sourceCalendar: event.sourceCalendar || null,
        timezone: event.timezone || DEFAULT_TIMEZONE,
        locationId,
        timeBoxId: timeBox.id,
      },
    })

    // Update ExternalSync lastSyncedAt
    await prisma.externalSync.update({
      where: { id: existingSync.id },
      data: { lastSyncedAt: new Date() },
    })

    return { event: { id: calendarEvent.id }, isNew: false }
  } else {
    // Create new Entity for the calendar event
    const entity = await prisma.entity.create({
      data: {
        userId,
        type: 'CALENDAR_EVENT',
      },
    })

    // Create new CalendarEvent
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        id: entity.id, // Use same ID as Entity
        userId,
        title: event.title,
        description,
        startedAt: start,
        endedAt: end,
        isAllDay: event.allDay,
        location: event.location || null,
        sourceCalendar: event.sourceCalendar || null,
        timezone: event.timezone || DEFAULT_TIMEZONE,
        locationId,
        timeBoxId: timeBox.id,
      },
    })

    // Create ExternalSync for deduplication
    if (existingSync) {
      // Link to existing ExternalSync
      await prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: { externalSyncId: existingSync.id },
      })
      await prisma.externalSync.update({
        where: { id: existingSync.id },
        data: { lastSyncedAt: new Date() },
      })
    } else {
      // Create new ExternalSync
      const externalSync = await prisma.externalSync.create({
        data: {
          providerId,
          entityId: entity.id,
          userId,
          externalId: event.eventId,
          lastSyncedAt: new Date(),
        },
      })

      await prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: { externalSyncId: externalSync.id },
      })
    }

    return { event: { id: calendarEvent.id }, isNew: true }
  }
}

// =============================================================================
// DELETE STALE EVENTS
// =============================================================================

/**
 * Delete events that were not in the current sync batch (Hard-Delete).
 * Only deletes events from the same provider.
 */
export async function deleteStaleEvents(
  userId: string,
  providerId: string,
  currentEvents: TaskerCalendarEvent[],
  syncStartTime: Date
): Promise<number> {
  const prisma = getPrisma()

  // Get all current event IDs from this sync
  const currentEventIds = new Set(currentEvents.map(e => e.eventId))

  // Find ExternalSyncs for this provider that weren't updated in this sync
  const staleExternalSyncs = await prisma.externalSync.findMany({
    where: {
      providerId,
      userId,
      lastSyncedAt: {
        lt: syncStartTime,
      },
    },
    include: {
      calendarEvents: true,
    },
  })

  // Filter to only those not in current batch
  const toDelete = staleExternalSyncs.filter(
    sync => !currentEventIds.has(sync.externalId)
  )

  let deletedCount = 0

  for (const sync of toDelete) {
    // Delete calendar events
    for (const calendarEvent of sync.calendarEvents) {
      await prisma.calendarEvent.delete({
        where: { id: calendarEvent.id },
      })
      
      // Delete entity
      await prisma.entity.delete({
        where: { id: calendarEvent.id },
      }).catch(() => {
        // Entity might not exist or already deleted
      })
      
      deletedCount++
    }

    // Delete ExternalSync
    await prisma.externalSync.delete({
      where: { id: sync.id },
    })
  }

  return deletedCount
}

// =============================================================================
// TIMEBOX MANAGEMENT
// =============================================================================

/**
 * Get or create a TimeBox for the given date (kind=DAY).
 */
export async function getOrCreateTimeBox(
  userId: string,
  date: Date
): Promise<{ id: string }> {
  const prisma = getPrisma()
  
  // Convert to local date string (YYYY-MM-DD)
  const localDate = format(date, 'yyyy-MM-dd')
  
  // Check if TimeBox exists
  const existing = await prisma.timeBox.findUnique({
    where: {
      userId_kind_localDate: {
        userId,
        kind: 'DAY',
        localDate,
      },
    },
    select: { id: true },
  })

  if (existing) {
    return existing
  }

  // Create new TimeBox
  const startAt = startOfDay(date)
  const endAt = endOfDay(date)

  const timeBox = await prisma.timeBox.create({
    data: {
      userId,
      kind: 'DAY',
      startAt,
      endAt,
      localDate,
      timezone: DEFAULT_TIMEZONE,
    },
    select: { id: true },
  })

  return timeBox
}

// =============================================================================
// DATE HANDLING
// =============================================================================

/**
 * Fix all-day event dates.
 * All-day events from Android calendars often have UTC dates that need local correction.
 */
export function fixAllDayEventDate(
  event: TaskerCalendarEvent
): { start: Date; end: Date | null } {
  const timezone = event.timezone || DEFAULT_TIMEZONE
  
  let start = parseISO(event.start)
  let end = event.end ? parseISO(event.end) : null

  if (event.allDay) {
    // For all-day events, ensure we use local date (not UTC shifted)
    // Convert to local timezone to get correct date
    start = toZonedTime(start, timezone)
    if (end) {
      end = toZonedTime(end, timezone)
    }
  }

  return { start, end }
}

// =============================================================================
// PATTERN MATCHING
// =============================================================================

/**
 * Match a string against active patterns and return target ID if matched.
 */
export async function matchPattern(
  userId: string,
  sourceType: 'CALENDAR_LOCATION' | 'JOURNAL_CONTENT' | 'IMPORT_TAG',
  inputString: string
): Promise<string | null> {
  const prisma = getPrisma()

  // Get active patterns for this source type, ordered by priority (highest first)
  const patterns = await prisma.matchPattern.findMany({
    where: {
      userId,
      sourceType,
      isActive: true,
    },
    orderBy: { priority: 'desc' },
  })

  // Try each pattern
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.pattern, 'i')
      if (regex.test(inputString)) {
        return pattern.targetId
      }
    } catch {
      // Invalid regex, skip this pattern
      continue
    }
  }

  return null
}

/**
 * Re-match all unmatched calendar events against current patterns.
 */
export async function rematchUnmatchedEvents(
  userId: string
): Promise<{ matched: number; total: number }> {
  const prisma = getPrisma()

  // Get all calendar events without locationId
  const unmatchedEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      locationId: null,
      location: { not: null },
    },
    select: {
      id: true,
      location: true,
    },
  })

  let matchedCount = 0

  for (const event of unmatchedEvents) {
    if (!event.location) continue

    const locationId = await matchPattern(userId, 'CALENDAR_LOCATION', event.location)
    
    if (locationId) {
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { locationId },
      })
      matchedCount++
    }
  }

  return {
    matched: matchedCount,
    total: unmatchedEvents.length,
  }
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get calendar events for a specific day.
 */
export async function getEventsForDay(
  userId: string,
  date: string // YYYY-MM-DD format
): Promise<Array<{
  id: string
  title: string
  description: string | null
  startedAt: Date
  endedAt: Date | null
  isAllDay: boolean
  location: string | null
  sourceCalendar: string | null
  locationId: string | null
  matchedLocation: { id: string; name: string } | null
}>> {
  const prisma = getPrisma()

  const dayStart = startOfDay(parseISO(date))
  const dayEnd = endOfDay(parseISO(date))

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startedAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      matchedLocation: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { isAllDay: 'desc' }, // All-day events first
      { startedAt: 'asc' },
    ],
  })

  return events
}

/**
 * Get calendar events for a date range.
 */
export async function getEventsForRange(
  userId: string,
  startDate: string, // YYYY-MM-DD format
  endDate: string    // YYYY-MM-DD format
): Promise<Array<{
  id: string
  title: string
  description: string | null
  startedAt: Date
  endedAt: Date | null
  isAllDay: boolean
  location: string | null
  sourceCalendar: string | null
  locationId: string | null
  matchedLocation: { id: string; name: string } | null
}>> {
  const prisma = getPrisma()

  const rangeStart = startOfDay(parseISO(startDate))
  const rangeEnd = endOfDay(parseISO(endDate))

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startedAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      matchedLocation: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { startedAt: 'asc' },
      { isAllDay: 'desc' },
    ],
  })

  return events
}

// =============================================================================
// SYNC PROVIDER MANAGEMENT
// =============================================================================

/**
 * Get or create SyncProvider for TASKER_CALENDAR.
 */
export async function getOrCreateCalendarSyncProvider(
  userId: string
): Promise<{ id: string }> {
  const prisma = getPrisma()

  const existing = await prisma.syncProvider.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'TASKER_CALENDAR',
      },
    },
    select: { id: true },
  })

  if (existing) {
    return existing
  }

  const provider = await prisma.syncProvider.create({
    data: {
      userId,
      provider: 'TASKER_CALENDAR',
      isActive: true,
    },
    select: { id: true },
  })

  return provider
}
