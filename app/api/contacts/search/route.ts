import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!query || query.length < 2) {
      return NextResponse.json({ contacts: [] })
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        isArchived: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { givenName: { contains: query, mode: 'insensitive' } },
          { familyName: { contains: query, mode: 'insensitive' } },
          { nickname: { contains: query, mode: 'insensitive' } },
          { emailPrivate: { contains: query, mode: 'insensitive' } },
          { emailWork: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        givenName: true,
        familyName: true,
        nickname: true,
        emailPrivate: true,
        company: true,
        isFavorite: true,
      },
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
}
