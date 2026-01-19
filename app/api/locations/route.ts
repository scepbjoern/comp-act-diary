/**
 * Locations API
 * GET: List all locations for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const poiType = searchParams.get('poiType') || ''
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'

    const locations = await prisma.location.findMany({
      where: {
        userId: user.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(poiType && { poiType: poiType as never }),
        ...(favoritesOnly && { isFavorite: true }),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { visits: true },
        },
      },
    })

    return NextResponse.json({
      locations,
      total: locations.length,
    })
  } catch (error) {
    console.error('Failed to fetch locations:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
