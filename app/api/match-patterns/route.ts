/**
 * MatchPattern API Route
 * CRUD operations for match patterns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { 
  createMatchPatternSchema, 
  validateRegexPattern 
} from '@/lib/validators/matchPattern'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// GET - List all match patterns
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sourceType = searchParams.get('sourceType')
    const targetType = searchParams.get('targetType')
    const isActive = searchParams.get('isActive')

    const patterns = await prisma.matchPattern.findMany({
      where: {
        userId: user.id,
        ...(sourceType && { sourceType: sourceType as 'CALENDAR_LOCATION' | 'JOURNAL_CONTENT' | 'IMPORT_TAG' }),
        ...(targetType && { targetType: targetType as 'LOCATION' | 'CONTACT' | 'TAG' }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      orderBy: [
        { sourceType: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ patterns })

  } catch (error) {
    console.error('Error fetching match patterns:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Patterns' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new match pattern
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await req.json()
    const validationResult = createMatchPatternSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Validate regex pattern
    const regexError = validateRegexPattern(data.pattern)
    if (regexError) {
      return NextResponse.json(
        { error: regexError },
        { status: 400 }
      )
    }

    // Verify target exists (for LOCATION target type)
    if (data.targetType === 'LOCATION') {
      const location = await prisma.location.findFirst({
        where: { id: data.targetId, userId: user.id },
      })
      if (!location) {
        return NextResponse.json(
          { error: 'Ziel-Location nicht gefunden' },
          { status: 400 }
        )
      }
    }

    const pattern = await prisma.matchPattern.create({
      data: {
        userId: user.id,
        sourceType: data.sourceType,
        targetType: data.targetType,
        targetId: data.targetId,
        pattern: data.pattern,
        description: data.description,
        priority: data.priority,
        isActive: data.isActive,
      },
    })

    return NextResponse.json({ pattern }, { status: 201 })

  } catch (error) {
    console.error('Error creating match pattern:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Patterns' },
      { status: 500 }
    )
  }
}
