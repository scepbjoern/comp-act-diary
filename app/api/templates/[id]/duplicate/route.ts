/**
 * app/api/templates/[id]/duplicate/route.ts
 * API route for duplicating a template including AI config.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { User } from '@prisma/client'
import { prisma } from '@/lib/core/prisma'
import { duplicateTemplate } from '@/lib/services/journal'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('userId')?.value

  let user: User | null = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null

  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }

  return user?.id || null
}

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/templates/[id]/duplicate
 * Duplicates a template including all fields and AI config.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await context.params

    const duplicated = await duplicateTemplate(id, userId)

    return NextResponse.json({ template: duplicated }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating template:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Fehler beim Duplizieren des Templates' }, { status: 500 })
  }
}
