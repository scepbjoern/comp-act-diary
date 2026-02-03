/**
 * app/api/journal-entries/route.ts
 * Unified API for journal entries: GET (list) and POST (create).
 * Replaces legacy /api/journal and /api/day/[id]/notes endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPrisma } from '@/lib/core/prisma'
import { createJournalService } from '@/lib/services/journal/journalService'
import { createEntryParamsSchema, listEntriesParamsSchema } from '@/lib/services/journal/types'
import { logger } from '@/lib/core/logger'

// =============================================================================
// AUTH HELPER
// =============================================================================

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

// =============================================================================
// GET /api/journal-entries
// =============================================================================

/**
 * Lists journal entries with optional filtering and pagination.
 * 
 * Query params:
 * - timeBoxId: Filter by TimeBox (for day view)
 * - typeId: Filter by entry type
 * - templateId: Filter by template
 * - limit: Number of entries (default 50, max 100)
 * - offset: Pagination offset (default 0)
 * - lean: If "true", returns minimal data without media (for list views)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query params
    const paramsResult = listEntriesParamsSchema.safeParse({
      timeBoxId: searchParams.get('timeBoxId') || undefined,
      typeId: searchParams.get('typeId') || undefined,
      templateId: searchParams.get('templateId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      lean: searchParams.get('lean') === 'true',
    })

    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Parameter', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    const service = createJournalService(prisma)

    const result = await service.listEntries({
      userId,
      ...paramsResult.data,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Error listing journal entries')
    return NextResponse.json({ error: 'Fehler beim Laden der Einträge' }, { status: 500 })
  }
}

// =============================================================================
// POST /api/journal-entries
// =============================================================================

/**
 * Creates a new journal entry.
 * 
 * Request body:
 * - typeId: Required - Entry type ID
 * - content: Required - Entry content (text/markdown)
 * - timeBoxId: Optional - TimeBox ID (if not provided, resolved from occurredAt)
 * - templateId: Optional - Template ID
 * - locationId: Optional - Location ID
 * - title: Optional - Entry title
 * - fieldValues: Optional - Template field values (will be merged into content)
 * - occurredAt: Optional - When the entry occurred (default: now)
 * - capturedAt: Optional - When the content was captured (default: now)
 * - timezoneOffset: Optional - Client timezone offset in minutes
 * - isSensitive: Optional - Mark as sensitive
 * - audioFileIds: Optional - Array of audio asset IDs
 * - audioTranscripts: Optional - Array of {assetId, transcript, transcriptModel}
 * - ocrAssetIds: Optional - Array of OCR source asset IDs
 * - photoAssetIds: Optional - Array of photo asset IDs
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const paramsResult = createEntryParamsSchema.safeParse(body)
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    
    // Validate typeId exists and is accessible
    const type = await prisma.journalEntryType.findFirst({
      where: {
        id: paramsResult.data.typeId,
        OR: [{ userId }, { userId: null }],
      },
    })

    if (!type) {
      return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
    }

    // Validate templateId if provided
    if (paramsResult.data.templateId) {
      const template = await prisma.journalTemplate.findFirst({
        where: {
          id: paramsResult.data.templateId,
          OR: [{ userId }, { userId: null }],
        },
      })

      if (!template) {
        return NextResponse.json({ error: 'Ungültiges Template' }, { status: 400 })
      }
    }

    // Create entry via service
    const service = createJournalService(prisma)
    const entry = await service.createEntry({
      userId,
      ...paramsResult.data,
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Error creating journal entry')
    return NextResponse.json({ error: 'Fehler beim Erstellen des Eintrags' }, { status: 500 })
  }
}
