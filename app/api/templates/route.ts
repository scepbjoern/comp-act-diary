/**
 * app/api/templates/route.ts
 * API routes for journal template management (GET list, POST create).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/core/prisma'
import { createTemplateSchema } from '@/types/journal'
import { TaxonomyOrigin } from '@prisma/client'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

/**
 * GET /api/templates
 * Returns all templates available to the user (own + system templates).
 * Optional query params: typeId (filter by type)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get('typeId')

    // Build where clause
    const whereClause = {
      OR: [{ userId }, { userId: null }], // User templates + system templates
      ...(typeId ? { typeId } : {}),
    }

    const templates = await prisma.journalTemplate.findMany({
      where: whereClause,
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
      orderBy: [{ origin: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Templates' }, { status: 500 })
  }
}

/**
 * POST /api/templates
 * Creates a new template for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createTemplateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, fields, aiConfig, typeId } = result.data

    // Check if template name already exists for this user
    const existing = await prisma.journalTemplate.findFirst({
      where: {
        userId,
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ein Template mit diesem Namen existiert bereits' },
        { status: 409 }
      )
    }

    // Validate typeId if provided
    if (typeId) {
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

    // Create template
    const template = await prisma.journalTemplate.create({
      data: {
        userId,
        name,
        description: description || null,
        fields: fields ?? undefined,
        aiConfig: aiConfig ?? undefined,
        typeId: typeId || null,
        origin: TaxonomyOrigin.USER,
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
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Templates' }, { status: 500 })
  }
}
