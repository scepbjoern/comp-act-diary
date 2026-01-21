/**
 * Calendar Sync Validators
 * Zod schemas for Tasker calendar webhook payload validation.
 */

import { z } from 'zod'

// =============================================================================
// TASKER CALENDAR EVENT SCHEMA
// =============================================================================

/**
 * Schema for a single calendar event from Tasker.
 * Matches the format sent by AutoCalendar plugin with enrichment via JavaScriptlet.
 */
export const taskerCalendarEventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  start: z.string(), // ISO 8601 DateTime (e.g., "2026-01-20T08:00:00+01:00")
  end: z.string(),   // ISO 8601 DateTime
  allDay: z.boolean(),
  location: z.string().optional().default(''),
  description: z.string().optional().default(''),
  visible: z.boolean().optional().default(true),
  eventId: z.string().min(1, 'Event-ID ist erforderlich'),
  timezone: z.string().optional().default('Europe/Zurich'),
  sourceCalendar: z.string().optional().default('Unknown'),
})

/**
 * Schema for the full Tasker payload (array of events).
 */
export const taskerCalendarPayloadSchema = z.array(taskerCalendarEventSchema)

/**
 * Type for a single Tasker calendar event.
 */
export type TaskerCalendarEvent = z.infer<typeof taskerCalendarEventSchema>

/**
 * Type for the full Tasker payload.
 */
export type TaskerCalendarPayload = z.infer<typeof taskerCalendarPayloadSchema>

// =============================================================================
// CALENDAR EVENT QUERY SCHEMA
// =============================================================================

/**
 * Schema for querying calendar events by date.
 */
export const calendarEventsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Startdatum muss im Format YYYY-MM-DD sein').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enddatum muss im Format YYYY-MM-DD sein').optional(),
}).refine(
  (data) => data.date || (data.startDate && data.endDate),
  { message: 'Entweder date oder startDate+endDate ist erforderlich' }
)

export type CalendarEventsQuery = z.infer<typeof calendarEventsQuerySchema>

// =============================================================================
// SYNC RESULT TYPE
// =============================================================================

/**
 * Result of a calendar sync operation.
 */
export interface CalendarSyncResult {
  created: number
  updated: number
  deleted: number
  errors: string[]
  syncedAt: Date
}
