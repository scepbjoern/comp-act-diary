/**
 * app/api/journal/route.ts
 * API routes for journal entries (GET list, POST create).
 * Replaces /api/reflections with unified journal entry management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/core/prisma'
import { createJournalEntrySchema, TemplateField } from '@/types/journal'
import { buildContentFromFields } from '@/lib/services/journal/contentService'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

/**
 * GET /api/journal
 * Returns journal entries with filtering and cursor-based pagination.
 * Query params:
 * - typeCode: Filter by entry type code
 * - dateFrom: Start date (ISO string)
 * - dateTo: End date (ISO string)
 * - search: Full-text search in content
 * - cursor: Cursor for pagination (entry ID)
 * - limit: Number of entries per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('typeCode')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build where clause
    const whereClause: Record<string, unknown> = {
      userId,
      deletedAt: null,
    }

    // Filter by type code
    if (typeCode) {
      const type = await prisma.journalEntryType.findFirst({
        where: {
          code: typeCode,
          OR: [{ userId }, { userId: null }],
        },
      })
      if (type) {
        whereClause.typeId = type.id
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.occurredAt = {}
      if (dateFrom) {
        (whereClause.occurredAt as Record<string, Date>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (whereClause.occurredAt as Record<string, Date>).lte = new Date(dateTo)
      }
    }

    // Full-text search
    if (search) {
      whereClause.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build query options
    const queryOptions: {
      where: typeof whereClause
      include: Record<string, unknown>
      orderBy: { occurredAt: 'desc' } | { createdAt: 'desc' }
      take: number
      skip?: number
      cursor?: { id: string }
    } = {
      where: whereClause,
      include: {
        type: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
            bgColorClass: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            fields: true,
            aiConfig: true,
          },
        },
        timeBox: {
          select: {
            id: true,
            localDate: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there are more
    }

    // Cursor-based pagination
    if (cursor) {
      queryOptions.cursor = { id: cursor }
      queryOptions.skip = 1 // Skip the cursor item
    }

    const entries = await prisma.journalEntry.findMany(queryOptions)

    // Determine if there are more entries
    const hasMore = entries.length > limit
    const items = hasMore ? entries.slice(0, limit) : entries
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      entries: items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Einträge' }, { status: 500 })
  }
}

/**
 * POST /api/journal
 * Creates a new journal entry with optional template.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createJournalEntrySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const {
      typeId,
      templateId,
      timeBoxId,
      locationId,
      title,
      content,
      fieldValues,
      occurredAt,
      capturedAt,
      isSensitive,
      audioFileIds,
      audioTranscripts,
    } = result.data

    // Validate typeId
    const type = await prisma.journalEntryType.findFirst({
      where: {
        id: typeId,
        OR: [{ userId }, { userId: null }],
      },
    })

    if (!type) {
      return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
    }

    // Validate templateId if provided
    let template = null
    if (templateId) {
      template = await prisma.journalTemplate.findFirst({
        where: {
          id: templateId,
          OR: [{ userId }, { userId: null }],
        },
      })

      if (!template) {
        return NextResponse.json({ error: 'Ungültiges Template' }, { status: 400 })
      }
    }

    // Build content from field values if template has fields
    let finalContent = content
    if (template?.fields && fieldValues) {
      const fields = template.fields as unknown as TemplateField[]
      finalContent = buildContentFromFields(fields, fieldValues)
    }

    // Create entry
    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        typeId,
        templateId: templateId || null,
        timeBoxId,
        locationId: locationId || null,
        title: title || null,
        content: finalContent,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        isSensitive: isSensitive || false,
      },
      include: {
        type: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
            bgColorClass: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            fields: true,
          },
        },
      },
    })

    // Create Entity registry entry (required for polymorphic relations like MediaAttachment)
    await prisma.entity.create({
      data: {
        id: entry.id,
        userId,
        type: 'JOURNAL_ENTRY',
      },
    })

    // Create MediaAttachments for audio files if provided
    console.warn('[journal/route] audioFileIds:', audioFileIds)
    console.warn('[journal/route] audioTranscripts:', audioTranscripts)
    
    if (audioFileIds && audioFileIds.length > 0) {
      console.warn('[journal/route] Creating MediaAttachments for', audioFileIds.length, 'audio files')
      
      // Entity registry entry was created above
      for (let i = 0; i < audioFileIds.length; i++) {
        const assetId = audioFileIds[i]
        const transcript = audioTranscripts?.[assetId] || null

        // Verify asset exists and belongs to user
        const asset = await prisma.mediaAsset.findFirst({
          where: { id: assetId, userId },
        })
        
        console.warn('[journal/route] Asset', assetId, 'found:', Boolean(asset))

        if (asset) {
          try {
            const attachment = await prisma.mediaAttachment.create({
              data: {
                assetId,
                entityId: entry.id,
                userId,
                role: 'ATTACHMENT',
                timeBoxId,
                displayOrder: i,
                transcript,
                transcriptModel: transcript ? 'gpt-4o-transcribe' : null,
              },
            })
            console.warn('[journal/route] Created MediaAttachment:', attachment.id)
          } catch (attachmentError) {
            console.error('[journal/route] Failed to create MediaAttachment:', attachmentError)
          }
        }
      }
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Eintrags' }, { status: 500 })
  }
}
