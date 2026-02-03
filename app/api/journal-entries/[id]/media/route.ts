/**
 * app/api/journal-entries/[id]/media/route.ts
 * API for managing media attachments on journal entries.
 * POST: Add media attachment
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

type RouteParams = { params: Promise<{ id: string }> }

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const addMediaSchema = z.object({
  assetId: z.string().uuid(),
  role: z.enum(['ATTACHMENT', 'SOURCE', 'GALLERY']),
  transcript: z.string().nullable().optional(),
  transcriptModel: z.string().nullable().optional(),
})

// =============================================================================
// POST /api/journal-entries/[id]/media
// =============================================================================

/**
 * Adds a media attachment to a journal entry.
 * 
 * Request body:
 * - assetId: Required - MediaAsset ID to attach
 * - role: Required - Attachment role (ATTACHMENT, SOURCE, GALLERY)
 * - transcript: Optional - Transcript text (for audio)
 * - transcriptModel: Optional - Model used for transcription
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: entryId } = await params
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
    const paramsResult = addMediaSchema.safeParse(body)
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }

    const { assetId, role, transcript, transcriptModel } = paramsResult.data

    // Verify asset exists and belongs to user
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: assetId, userId },
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset nicht gefunden' }, { status: 404 })
    }

    // Add media attachment via service
    const service = createJournalService(prisma)
    await service.addMediaAttachment({
      entryId,
      userId,
      assetId,
      role,
      transcript,
      transcriptModel,
    })

    // Return updated entry
    const updatedEntry = await service.getEntry(entryId, userId)

    return NextResponse.json({ entry: updatedEntry }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Error adding media attachment')
    return NextResponse.json({ error: 'Fehler beim Hinzufügen des Mediums' }, { status: 500 })
  }
}
