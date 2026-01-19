import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask, getTaskStats } from '@/lib/legacy/task'
import { TaskCreateSchema, TaskFilterSchema } from '@/lib/validators/task'
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

    // Check if this is a stats request
    if (searchParams.get('stats') === 'true') {
      const stats = await getTaskStats(userId)
      return NextResponse.json({ stats })
    }

    // Parse filter parameters
    const filterResult = TaskFilterSchema.safeParse({
      status: searchParams.get('status') || undefined,
      contactId: searchParams.get('contactId') || undefined,
      dueBefore: searchParams.get('dueBefore') ? new Date(searchParams.get('dueBefore')!) : undefined,
      dueAfter: searchParams.get('dueAfter') ? new Date(searchParams.get('dueAfter')!) : undefined,
      includeOverdue: searchParams.get('includeOverdue') === 'true',
      sortBy: searchParams.get('sortBy') || 'dueDate',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    })

    if (!filterResult.success) {
      return NextResponse.json({ error: 'Ungültige Filter-Parameter', details: filterResult.error.flatten() }, { status: 400 })
    }

    const { tasks, total } = await getTasks(userId, filterResult.data)
    
    return NextResponse.json({
      tasks,
      total,
      limit: filterResult.data.limit,
      offset: filterResult.data.offset,
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Aufgaben' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const result = TaskCreateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    const task = await createTask(userId, result.data)
    
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Aufgabe' }, { status: 500 })
  }
}
