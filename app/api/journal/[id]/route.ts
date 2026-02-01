/**
 * app/api/journal/[id]/route.ts
 * API routes for single journal entry operations (GET, PATCH, DELETE).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/core/prisma'
import { updateJournalEntrySchema, TemplateField } from '@/types/journal'
import { buildContentFromFields } from '@/lib/services/journal/contentService'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/journal/[id]
 * Returns a single journal entry by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Own entry
          { accessGrants: { some: { userId } } }, // Shared with user
        ],
        deletedAt: null,
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
            aiConfig: true,
          },
        },
        timeBox: {
          select: {
            id: true,
            localDate: true,
            kind: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Eintrags' }, { status: 500 })
  }
}

/**
 * PATCH /api/journal/[id]
 * Updates a journal entry.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Validate input
    const result = updateJournalEntrySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Check if entry exists and user has permission
    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Own entry
          { accessGrants: { some: { userId, role: 'EDITOR' } } }, // Editor access
        ],
        deletedAt: null,
      },
      include: {
        template: {
          select: {
            fields: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      )
    }

    const { title, content, fieldValues, aiSummary, analysis, occurredAt, isSensitive } =
      result.data

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Handle content update
    if (content !== undefined) {
      updateData.content = content
      updateData.contentUpdatedAt = new Date()
    } else if (fieldValues && existing.template?.fields) {
      // Build content from field values
      const fields = existing.template.fields as unknown as TemplateField[]
      updateData.content = buildContentFromFields(fields, fieldValues)
      updateData.contentUpdatedAt = new Date()
    }

    if (title !== undefined) updateData.title = title
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary
    if (analysis !== undefined) updateData.analysis = analysis
    if (occurredAt !== undefined) {
      updateData.occurredAt = occurredAt ? new Date(occurredAt) : null
    }
    if (isSensitive !== undefined) updateData.isSensitive = isSensitive

    // Update entry
    const entry = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Eintrags' }, { status: 500 })
  }
}

/**
 * DELETE /api/journal/[id]
 * Soft-deletes a journal entry.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params

    // Check if entry exists and user has permission
    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Own entry
          { accessGrants: { some: { userId, role: 'EDITOR' } } }, // Editor access
        ],
        deletedAt: null,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Eintrags' }, { status: 500 })
  }
}
