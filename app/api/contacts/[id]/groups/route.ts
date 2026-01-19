import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: contactId } = await params

    const prisma = getPrisma()
    
    // Get all taggings for this contact with their taxonomies
    const taggings = await prisma.tagging.findMany({
      where: {
        userId,
        entityId: contactId,
      },
      include: {
        taxonomy: true,
      },
    })

    // Filter to CONTACT_GROUP taxonomies
    const groups = taggings
      .filter(t => (t.taxonomy.kind as string) === 'CONTACT_GROUP')
      .map(t => ({
        id: t.taxonomy.id,
        name: t.taxonomy.shortName,
        slug: t.taxonomy.slug,
        taggingId: t.id,
      }))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error fetching contact groups:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Gruppen' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: contactId } = await params
    const body = await _request.json()
    const { groupId } = body

    if (!groupId) {
      return NextResponse.json({ error: 'groupId erforderlich' }, { status: 400 })
    }

    const prisma = getPrisma()
    
    // Ensure Entity exists
    let entity = await prisma.entity.findUnique({ where: { id: contactId } })
    if (!entity) {
      entity = await prisma.entity.create({
        data: {
          id: contactId,
          userId,
          type: 'CONTACT',
        },
      })
    }

    // Check if tagging already exists
    const existing = await prisma.tagging.findFirst({
      where: { userId, taxonomyId: groupId, entityId: contactId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Kontakt ist bereits in dieser Gruppe' }, { status: 400 })
    }

    // Create tagging
    const tagging = await prisma.tagging.create({
      data: {
        userId,
        taxonomyId: groupId,
        entityId: contactId,
      },
      include: {
        taxonomy: true,
      },
    })

    return NextResponse.json({
      group: {
        id: tagging.taxonomy.id,
        name: tagging.taxonomy.shortName,
        slug: tagging.taxonomy.slug,
        taggingId: tagging.id,
      },
    })
  } catch (error) {
    console.error('Error adding contact to group:', error)
    return NextResponse.json({ error: 'Fehler beim Hinzufügen zur Gruppe' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    
    const { searchParams } = new URL(request.url)
    const taggingId = searchParams.get('taggingId')

    if (!taggingId) {
      return NextResponse.json({ error: 'taggingId erforderlich' }, { status: 400 })
    }

    await prisma.tagging.delete({
      where: { id: taggingId, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing contact from group:', error)
    return NextResponse.json({ error: 'Fehler beim Entfernen aus der Gruppe' }, { status: 500 })
  }
}
