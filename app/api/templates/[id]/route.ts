/**
 * app/api/templates/[id]/route.ts
 * API routes for single template operations (GET, PATCH, DELETE).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/core/prisma'
import { updateTemplateSchema } from '@/types/journal'
import { TaxonomyOrigin } from '@prisma/client'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]
 * Returns a single template by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params

    const template = await prisma.journalTemplate.findFirst({
      where: {
        id,
        OR: [{ userId }, { userId: null }], // Own or system template
      },
      include: {
        type: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
          },
        },
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Templates' }, { status: 500 })
  }
}

/**
 * PATCH /api/templates/[id]
 * Updates a template. Only own templates can be updated (not system templates).
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
    const result = updateTemplateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Check if template exists and belongs to user
    const existing = await prisma.journalTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }

    const { name, description, fields, aiConfig, typeId } = result.data

    // System templates: only aiConfig can be edited
    const isSystemTemplate = existing.origin === TaxonomyOrigin.SYSTEM || existing.userId === null
    if (isSystemTemplate) {
      // Check if trying to change anything other than aiConfig
      if (name !== undefined || description !== undefined || fields !== undefined || typeId !== undefined) {
        return NextResponse.json(
          { error: 'Bei System-Templates kann nur die AI-Konfiguration bearbeitet werden' },
          { status: 403 }
        )
      }
      // aiConfig update is allowed for system templates - continue
    } else {
      // User templates: only owner can edit
      if (existing.userId !== userId) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
      }
    }

    // Check for name collision if name is being changed
    if (name && name !== existing.name) {
      const nameExists = await prisma.journalTemplate.findFirst({
        where: {
          userId,
          name,
          id: { not: id },
        },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'Ein Template mit diesem Namen existiert bereits' },
          { status: 409 }
        )
      }
    }

    // Validate typeId if provided
    if (typeId !== undefined && typeId !== null) {
      const type = await prisma.journalEntryType.findFirst({
        where: {
          id: typeId,
          OR: [{ userId }, { userId: null }],
        },
      })

      if (!type) {
        return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
      }
    }

    // Build update data (only include defined fields)
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (fields !== undefined) updateData.fields = fields
    if (aiConfig !== undefined) updateData.aiConfig = aiConfig
    if (typeId !== undefined) updateData.typeId = typeId

    // Update template
    const template = await prisma.journalTemplate.update({
      where: { id },
      data: updateData,
      include: {
        type: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
          },
        },
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Templates' }, { status: 500 })
  }
}

/**
 * DELETE /api/templates/[id]
 * Deletes a template. Only own templates can be deleted.
 * Returns warning if template has associated entries.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Check if template exists and belongs to user
    const existing = await prisma.journalTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }

    // System templates cannot be deleted
    if (existing.origin === TaxonomyOrigin.SYSTEM || existing.userId === null) {
      return NextResponse.json(
        { error: 'System-Templates können nicht gelöscht werden' },
        { status: 403 }
      )
    }

    // Only owner can delete
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check if template has entries
    const entryCount = existing._count.journalEntries
    if (entryCount > 0 && !force) {
      return NextResponse.json(
        {
          error: 'Template hat verknüpfte Einträge',
          warning: true,
          entryCount,
          message: `Dieses Template wird von ${entryCount} Eintrag/Einträgen verwendet. Beim Löschen wird die Template-Referenz entfernt.`,
        },
        { status: 409 }
      )
    }

    // Delete template (entries will have templateId set to null due to relation)
    await prisma.journalTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, deletedEntryRefs: entryCount })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Templates' }, { status: 500 })
  }
}
