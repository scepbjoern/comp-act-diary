/**
 * app/api/journal-entries/[id]/route.ts
 * API for single journal entry: GET, PATCH, DELETE.
 * Replaces legacy /api/journal/[id] and /api/notes/[id] endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPrisma } from '@/lib/core/prisma'
import { createJournalService } from '@/lib/services/journal/journalService'
import { updateEntryParamsSchema } from '@/lib/services/journal/types'
import { logger } from '@/lib/core/logger'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

// =============================================================================
// AUTH HELPER
// =============================================================================

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

// =============================================================================
// ROUTE PARAMS TYPE
// =============================================================================

type RouteParams = { params: Promise<{ id: string }> }

// =============================================================================
// GET /api/journal-entries/[id]
// =============================================================================

/**
 * Gets a single journal entry by ID with all relations.
 * Supports cross-user access via sharing grants.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()

    // First check if user owns the entry
    const entry = await prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // If not owner, check access grants
    if (entry.userId !== userId) {
      const accessService = getJournalEntryAccessService()
      const canRead = await accessService.canRead(id, userId)
      if (!canRead) {
        return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
      }
    }

    // Load full entry (use owner's userId for media loading)
    const service = createJournalService(prisma)
    const fullEntry = await service.getEntry(id, entry.userId)

    return NextResponse.json({ entry: fullEntry })
  } catch (error) {
    logger.error({ error }, 'Error getting journal entry')
    return NextResponse.json({ error: 'Fehler beim Laden des Eintrags' }, { status: 500 })
  }
}

// =============================================================================
// PATCH /api/journal-entries/[id]
// =============================================================================

/**
 * Updates a journal entry.
 * Requires owner or editor access.
 * 
 * Request body:
 * - title: Optional - New title
 * - content: Optional - New content
 * - fieldValues: Optional - Template field values (merged into content)
 * - occurredAt: Optional - New occurred timestamp
 * - capturedAt: Optional - New captured timestamp
 * - isSensitive: Optional - Sensitivity flag
 * - locationId: Optional - Location reference
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()

    // Check entry exists and get owner
    const existing = await prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // Check edit permission
    if (existing.userId !== userId) {
      const accessService = getJournalEntryAccessService()
      const canEdit = await accessService.canEdit(id, userId)
      if (!canEdit) {
        return NextResponse.json({ error: 'Keine Bearbeitungsberechtigung' }, { status: 403 })
      }
    }

    const body = await request.json()
    
    // Validate request body
    const paramsResult = updateEntryParamsSchema.safeParse(body)
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }

    // Update entry via service (use owner's userId)
    const service = createJournalService(prisma)
    const updatedEntry = await service.updateEntry(id, existing.userId, paramsResult.data)

    return NextResponse.json({ entry: updatedEntry })
  } catch (error) {
    logger.error({ error }, 'Error updating journal entry')
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Eintrags' }, { status: 500 })
  }
}

// =============================================================================
// DELETE /api/journal-entries/[id]
// =============================================================================

/**
 * Soft-deletes a journal entry.
 * Requires owner or editor access.
 * 
 * Query params:
 * - hard: If "true", performs hard delete (irreversible)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const prisma = getPrisma()

    // Check entry exists and get owner
    const existing = await prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // Check delete permission
    if (existing.userId !== userId) {
      const accessService = getJournalEntryAccessService()
      const canDelete = await accessService.canDelete(id, userId)
      if (!canDelete) {
        return NextResponse.json({ error: 'Keine Löschberechtigung' }, { status: 403 })
      }
    }

    // Delete entry via service
    const service = createJournalService(prisma)
    
    if (hardDelete) {
      await service.hardDeleteEntry(id, existing.userId)
    } else {
      await service.deleteEntry(id, existing.userId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting journal entry')
    return NextResponse.json({ error: 'Fehler beim Löschen des Eintrags' }, { status: 500 })
  }
}
