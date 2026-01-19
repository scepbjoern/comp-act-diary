import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    
    // Get all CONTACT_GROUP taxonomies for the user
    const groups = await prisma.taxonomy.findMany({
      where: {
        userId,
        kind: 'CONTACT_GROUP',
        isArchived: false,
      },
      select: {
        id: true,
        shortName: true,
        longName: true,
        slug: true,
        icon: true,
        _count: {
          select: {
            taggings: true,
          },
        },
      },
      orderBy: { shortName: 'asc' },
    })

    return NextResponse.json({
      groups: groups.map(g => ({
        id: g.id,
        name: g.longName || g.shortName,
        slug: g.slug,
        icon: g.icon,
        contactCount: g._count.taggings,
      })),
    })
  } catch (error) {
    console.error('Error fetching contact groups:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kontaktgruppen' }, { status: 500 })
  }
}
