/**
 * Single MatchPattern API Route
 * PUT and DELETE endpoints for individual patterns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { 
  updateMatchPatternSchema, 
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
// GET - Get single pattern
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const pattern = await prisma.matchPattern.findFirst({
      where: { id, userId: user.id },
    })

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ pattern })

  } catch (error) {
    console.error('Error fetching match pattern:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Patterns' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT - Update pattern
// =============================================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Verify pattern exists and belongs to user
    const existing = await prisma.matchPattern.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pattern nicht gefunden' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const validationResult = updateMatchPatternSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Validate regex pattern if provided
    if (data.pattern) {
      const regexError = validateRegexPattern(data.pattern)
      if (regexError) {
        return NextResponse.json(
          { error: regexError },
          { status: 400 }
        )
      }
    }

    const pattern = await prisma.matchPattern.update({
      where: { id },
      data: {
        ...(data.pattern !== undefined && { pattern: data.pattern }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return NextResponse.json({ pattern })

  } catch (error) {
    console.error('Error updating match pattern:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Patterns' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete pattern
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Verify pattern exists and belongs to user
    const existing = await prisma.matchPattern.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pattern nicht gefunden' },
        { status: 404 }
      )
    }

    await prisma.matchPattern.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting match pattern:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Patterns' },
      { status: 500 }
    )
  }
}
