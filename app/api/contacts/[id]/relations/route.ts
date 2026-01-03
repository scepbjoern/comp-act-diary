import { NextRequest, NextResponse } from 'next/server'
import { createRelation, deleteRelation } from '@/lib/prm'
import { PersonRelationCreateSchema } from '@/lib/validators/contact'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: personAId } = await params
    const body = await request.json()
    
    const result = PersonRelationCreateSchema.safeParse({ ...body, personAId })

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    await createRelation(userId, personAId, result.data.personBId, result.data.relationType)
    
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating relation:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Fehler beim Erstellen der Beziehung' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const relationId = searchParams.get('relationId')

    if (!relationId) {
      return NextResponse.json({ error: 'Beziehungs-ID erforderlich' }, { status: 400 })
    }

    await deleteRelation(userId, relationId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting relation:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Beziehung' }, { status: 500 })
  }
}
