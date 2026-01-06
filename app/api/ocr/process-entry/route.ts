/**
 * POST /api/ocr/process-entry
 * Creates a JournalEntry from OCR-extracted text and links MediaAssets.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { OcrProcessEntryRequestSchema } from '@/lib/validators/ocr'
import { getJournalAIService } from '@/lib/services/journalAIService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('=== OCR PROCESS-ENTRY DEBUG START ===')

  try {
    const prisma = getPrisma()

    // Get current user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: 'demo' } })
    }
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json().catch(() => ({}))
    const parsed = OcrProcessEntryRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { text, mediaAssetIds, date, time, typeCode, runPipeline, pipelineSteps } = parsed.data

    // Verify MediaAssets exist and belong to user
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: mediaAssetIds },
        userId: user.id,
      },
    })

    if (mediaAssets.length !== mediaAssetIds.length) {
      return NextResponse.json(
        { error: 'Eine oder mehrere Quelldateien nicht gefunden' },
        { status: 404 }
      )
    }

    // Get or create TimeBox for the date
    const [year, month, day] = date.split('-').map(Number)
    const localDate = date
    const startAt = new Date(year, month - 1, day, 0, 0, 0)
    const endAt = new Date(year, month - 1, day, 23, 59, 59, 999)

    let timeBox = await prisma.timeBox.findFirst({
      where: {
        userId: user.id,
        kind: 'DAY',
        localDate,
      },
    })

    if (!timeBox) {
      timeBox = await prisma.timeBox.create({
        data: {
          userId: user.id,
          kind: 'DAY',
          localDate,
          startAt,
          endAt,
          timezone: 'Europe/Zurich',
        },
      })
      console.log(`[OCR] Created TimeBox for ${localDate}`)
    }

    // Get JournalEntryType
    let entryType = await prisma.journalEntryType.findFirst({
      where: {
        OR: [
          { code: typeCode, userId: user.id },
          { code: typeCode, userId: null },
        ],
      },
    })

    if (!entryType) {
      // Fallback to daily_note
      entryType = await prisma.journalEntryType.findFirst({
        where: {
          OR: [
            { code: 'daily_note', userId: user.id },
            { code: 'daily_note', userId: null },
          ],
        },
      })
    }

    if (!entryType) {
      return NextResponse.json(
        { error: 'Journal-Eintragstyp nicht gefunden' },
        { status: 404 }
      )
    }

    // Create Entity for polymorphism
    const entity = await prisma.entity.create({
      data: {
        userId: user.id,
        type: 'JOURNAL_ENTRY',
      },
    })

    // Create JournalEntry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        id: entity.id,
        userId: user.id,
        typeId: entryType.id,
        timeBoxId: timeBox.id,
        content: text,
        originalTranscript: text,
      },
    })

    console.log(`[OCR] Created JournalEntry: ${journalEntry.id}`)

    // Create MediaAttachments to link sources
    for (const assetId of mediaAssetIds) {
      await prisma.mediaAttachment.create({
        data: {
          assetId,
          entityId: entity.id,
          userId: user.id,
          role: 'SOURCE',
        },
      })
    }

    console.log(`[OCR] Linked ${mediaAssetIds.length} MediaAssets as sources`)

    // Optionally run AI pipeline
    let pipelineResult = null
    if (runPipeline && pipelineSteps && pipelineSteps.length > 0) {
      console.log(`[OCR] Running AI pipeline: ${pipelineSteps.join(', ')}`)
      try {
        const aiService = getJournalAIService(prisma)
        pipelineResult = await aiService.runPipeline({
          journalEntryId: journalEntry.id,
          userId: user.id,
          steps: pipelineSteps,
        })
        console.log(`[OCR] AI pipeline completed`)
      } catch (pipelineError) {
        console.error('[OCR] AI pipeline failed:', pipelineError)
        // Don't fail the whole request if pipeline fails
        pipelineResult = {
          error: pipelineError instanceof Error ? pipelineError.message : 'Pipeline fehlgeschlagen',
        }
      }
    }

    // Reload entry to get updated content
    const updatedEntry = await prisma.journalEntry.findUnique({
      where: { id: journalEntry.id },
      select: {
        id: true,
        content: true,
        originalTranscript: true,
        aiSummary: true,
        analysis: true,
      },
    })

    console.log('=== OCR PROCESS-ENTRY DEBUG END SUCCESS ===')

    return NextResponse.json({
      journalEntryId: journalEntry.id,
      content: updatedEntry?.content || text,
      originalTranscript: updatedEntry?.originalTranscript,
      aiSummary: updatedEntry?.aiSummary,
      analysis: updatedEntry?.analysis,
      pipelineResult,
    })
  } catch (error) {
    console.error('=== OCR PROCESS-ENTRY DEBUG END ERROR ===')
    console.error('[OCR] Process entry failed:', error)

    return NextResponse.json(
      {
        error: 'Eintrag konnte nicht erstellt werden',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
