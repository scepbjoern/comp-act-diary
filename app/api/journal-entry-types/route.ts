/**
 * API routes for JournalEntryTypes CRUD operations.
 * GET: Returns all types (system + user)
 * POST: Creates a new user type
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validation schema for creating a new type
const createTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().nullable(),
  bgColorClass: z.string().max(100).optional().nullable(),
})

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
 * GET /api/journal-entry-types
 * Returns all available JournalEntryTypes for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const prisma = getPrisma()

    // Get system-defined types (userId = null) and user-specific types
    const types = await prisma.journalEntryType.findMany({
      where: {
        OR: [
          { userId: null },
          { userId },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        icon: true,
        bgColorClass: true,
        defaultTemplateId: true,
        sortOrder: true,
        userId: true,
        defaultTemplate: { select: { id: true, name: true } },
        _count: {
          select: {
            journalEntries: true,
            templates: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ types })
  } catch (error) {
    console.error('GET /api/journal-entry-types failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/journal-entry-types
 * Creates a new user-defined JournalEntryType.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const result = createTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { code, name, icon, bgColorClass } = result.data
    const prisma = getPrisma()

    // Check for duplicate code
    const existing = await prisma.journalEntryType.findFirst({
      where: {
        code,
        OR: [{ userId: null }, { userId }],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ein Typ mit diesem Code existiert bereits' },
        { status: 409 }
      )
    }

    // Get max sortOrder for user types
    const maxOrder = await prisma.journalEntryType.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    })

    const type = await prisma.journalEntryType.create({
      data: {
        code,
        name,
        icon: icon || null,
        bgColorClass: bgColorClass || null,
        userId,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
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

    return NextResponse.json({ type }, { status: 201 })
  } catch (error) {
    console.error('POST /api/journal-entry-types failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
