import { NextRequest, NextResponse } from 'next/server'
import { getContacts, createContact, getContactStats, searchContacts } from '@/lib/prm'
import { ContactCreateSchema, ContactFilterSchema } from '@/lib/validators/contact'
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
    
    // Check if this is a search request
    const searchQuery = searchParams.get('q')
    if (searchQuery) {
      const contacts = await searchContacts(userId, searchQuery, 10)
      return NextResponse.json({ contacts })
    }

    // Check if this is a stats request
    if (searchParams.get('stats') === 'true') {
      const stats = await getContactStats(userId)
      return NextResponse.json({ stats })
    }

    // Parse filter parameters
    const filterResult = ContactFilterSchema.safeParse({
      search: searchParams.get('search') || undefined,
      isFavorite: searchParams.get('isFavorite') === 'true' ? true : searchParams.get('isFavorite') === 'false' ? false : undefined,
      isArchived: searchParams.get('isArchived') === 'true',
      hasGoogleSync: searchParams.get('hasGoogleSync') === 'true' ? true : searchParams.get('hasGoogleSync') === 'false' ? false : undefined,
      groupId: searchParams.get('groupId') || undefined,
      sortBy: searchParams.get('sortBy') || 'givenName',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    })

    if (!filterResult.success) {
      return NextResponse.json({ error: 'Ungültige Filter-Parameter', details: filterResult.error.flatten() }, { status: 400 })
    }

    const { contacts, total } = await getContacts(userId, filterResult.data)
    
    return NextResponse.json({
      contacts,
      total,
      limit: filterResult.data.limit,
      offset: filterResult.data.offset,
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kontakte' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const result = ContactCreateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    const contact = await createContact(userId, result.data)
    
    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kontakts' }, { status: 500 })
  }
}
