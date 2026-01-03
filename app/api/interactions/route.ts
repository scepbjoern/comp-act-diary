import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD format

    if (!date) {
      return NextResponse.json({ error: 'Datum erforderlich' }, { status: 400 })
    }

    // Parse date and get start/end of day
    const startOfDay = new Date(`${date}T00:00:00.000Z`)
    const endOfDay = new Date(`${date}T23:59:59.999Z`)

    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
    })

    return NextResponse.json({ interactions })
  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Interaktionen' }, { status: 500 })
  }
}
