/**
 * GET /api/journal-entry-types
 * Returns all available JournalEntryTypes for the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
        sortOrder: true,
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
