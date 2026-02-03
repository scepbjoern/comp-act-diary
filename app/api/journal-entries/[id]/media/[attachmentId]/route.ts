/**
 * app/api/journal-entries/[id]/media/[attachmentId]/route.ts
 * API for managing individual media attachments.
 * PATCH: Update transcript
 * DELETE: Remove attachment
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPrisma } from '@/lib/core/prisma'
import { createJournalService } from '@/lib/services/journal/journalService'
import { logger } from '@/lib/core/logger'
import { z } from 'zod'

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

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> }

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateMediaSchema = z.object({
  transcript: z.string().optional(),
  transcriptModel: z.string().optional(),
})

// =============================================================================
// PATCH /api/journal-entries/[id]/media/[attachmentId]
// =============================================================================

/**
 * Updates a media attachment (transcript, model).
 * 
 * Request body:
 * - transcript: Optional - New transcript text
 * - transcriptModel: Optional - Model used for transcription
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: entryId, attachmentId } = await params
    const prisma = getPrisma()

    // Check entry exists and belongs to user
    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId, deletedAt: null },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate request body
    const paramsResult = updateMediaSchema.safeParse(body)
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }

    // Update attachment via service
    const service = createJournalService(prisma)
    await service.updateMediaAttachment(attachmentId, userId, paramsResult.data)

    // Return updated entry
    const updatedEntry = await service.getEntry(entryId, userId)

    return NextResponse.json({ entry: updatedEntry })
  } catch (error) {
    logger.error({ error }, 'Error updating media attachment')
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Attachment nicht gefunden' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Mediums' }, { status: 500 })
  }
}

// =============================================================================
// DELETE /api/journal-entries/[id]/media/[attachmentId]
// =============================================================================

/**
 * Removes a media attachment from a journal entry.
 * Note: This only removes the attachment, not the underlying MediaAsset.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: entryId, attachmentId } = await params
    const prisma = getPrisma()

    // Check entry exists and belongs to user
    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId, deletedAt: null },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // Remove attachment via service
    const service = createJournalService(prisma)
    await service.removeMediaAttachment(attachmentId, userId)

    // Return updated entry
    const updatedEntry = await service.getEntry(entryId, userId)

    return NextResponse.json({ entry: updatedEntry })
  } catch (error) {
    logger.error({ error }, 'Error deleting media attachment')
    return NextResponse.json({ error: 'Fehler beim Löschen des Mediums' }, { status: 500 })
  }
}
