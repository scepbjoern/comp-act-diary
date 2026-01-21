/**
 * Tasker Calendar Webhook API Route
 * Receives calendar events from Tasker via HTTP POST.
 * Authentication via WebhookToken with providerType=TASKER_CALENDAR.
 */

import { NextRequest, NextResponse } from 'next/server'
import { taskerCalendarPayloadSchema } from '@/lib/validators/calendar'
import { validateWebhookToken } from '@/lib/services/webhookTokenService'
import { 
  syncCalendarEvents, 
  getOrCreateCalendarSyncProvider 
} from '@/lib/services/calendarService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication (WebhookToken with TASKER_CALENDAR provider)
    const authHeader = request.headers.get('Authorization')
    const userId = await validateWebhookToken(authHeader, 'TASKER_CALENDAR')

    if (!userId) {
      console.warn('Calendar webhook: Invalid or missing token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Ungültiges JSON' },
        { status: 400 }
      )
    }

    // 3. Validate Tasker payload (array of events)
    const validationResult = taskerCalendarPayloadSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.warn('Calendar webhook: Invalid payload', validationResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Ungültige Payload-Struktur', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const events = validationResult.data

    // 4. Get or create SyncProvider for TASKER_CALENDAR
    const provider = await getOrCreateCalendarSyncProvider(userId)

    // 5. Sync events
    const result = await syncCalendarEvents(events, userId, provider.id)

    // 6. Return sync statistics
    return NextResponse.json({
      success: true,
      stats: {
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        total: events.length,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      syncedAt: result.syncedAt.toISOString(),
    })

  } catch (error) {
    console.error('Calendar webhook error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// =============================================================================
// OPTIONS HANDLER (CORS)
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}
