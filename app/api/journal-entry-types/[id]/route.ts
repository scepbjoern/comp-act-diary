/**
 * API routes for single JournalEntryType operations.
 * PATCH: Updates a user type
 * DELETE: Deletes a user type (if no entries use it)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validation schema for updating a type
const updateTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional().nullable(),
  bgColorClass: z.string().max(100).optional().nullable(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  if (cookieUserId) {
    const user = await prisma.user.findUnique({ where: { id: cookieUserId } })
    if (user) return user.id
  }
  const demoUser = await prisma.user.findUnique({ where: { username: 'demo' } })
  return demoUser?.id || null
}

/**
 * PATCH /api/journal-entry-types/[id]
 * Updates a user-defined JournalEntryType.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const result = updateTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()

    // Check if type exists
    const existing = await prisma.journalEntryType.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Typ nicht gefunden' }, { status: 404 })
    }

    // System types (userId = null) cannot be edited
    if (existing.userId === null) {
      return NextResponse.json(
        { error: 'System-Typen können nicht bearbeitet werden' },
        { status: 403 }
      )
    }

    // Only owner can edit
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { name, icon, bgColorClass } = result.data

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (icon !== undefined) updateData.icon = icon
    if (bgColorClass !== undefined) updateData.bgColorClass = bgColorClass

    const type = await prisma.journalEntryType.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        icon: true,
        bgColorClass: true,
        sortOrder: true,
        userId: true,
      },
    })

    return NextResponse.json({ type })
  } catch (error) {
    console.error('PATCH /api/journal-entry-types/[id] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/journal-entry-types/[id]
 * Deletes a user-defined JournalEntryType if no entries use it.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await context.params
    const prisma = getPrisma()

    // Check if type exists
    const existing = await prisma.journalEntryType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journalEntries: true,
            templates: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Typ nicht gefunden' }, { status: 404 })
    }

    // System types (userId = null) cannot be deleted
    if (existing.userId === null) {
      return NextResponse.json(
        { error: 'System-Typen können nicht gelöscht werden' },
        { status: 403 }
      )
    }

    // Only owner can delete
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check if type is in use
    if (existing._count.journalEntries > 0) {
      return NextResponse.json(
        { error: `Typ wird von ${existing._count.journalEntries} Einträgen verwendet und kann nicht gelöscht werden` },
        { status: 409 }
      )
    }

    if (existing._count.templates > 0) {
      return NextResponse.json(
        { error: `Typ wird von ${existing._count.templates} Templates verwendet und kann nicht gelöscht werden` },
        { status: 409 }
      )
    }

    await prisma.journalEntryType.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/journal-entry-types/[id] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
