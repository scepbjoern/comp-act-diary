import { NextRequest, NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask, completeTask, cancelTask, reopenTask } from '@/lib/services/taskService'
import { TaskUpdateSchema } from '@/lib/validators/task'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const task = await getTask(userId, id)

    if (!task) {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Aufgabe' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = TaskUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    const task = await updateTask(userId, id, result.data)
    
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof Error && error.message === 'Aufgabe nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Aufgabe' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    await deleteTask(userId, id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    if (error instanceof Error && error.message === 'Aufgabe nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Löschen der Aufgabe' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    let task

    // Handle action-based updates (complete/cancel/reopen)
    if (body.action) {
      switch (body.action) {
        case 'complete':
          task = await completeTask(userId, id)
          break
        case 'cancel':
          task = await cancelTask(userId, id)
          break
        case 'reopen':
          task = await reopenTask(userId, id)
          break
        default:
          return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
      }
    } else {
      // Handle direct field updates (isFavorite, dueDate, etc.)
      const updateData: Record<string, unknown> = {}
      
      if (typeof body.isFavorite === 'boolean') {
        updateData.isFavorite = body.isFavorite
      }
      if (body.dueDate !== undefined) {
        updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
      }
      if (body.title !== undefined) {
        updateData.title = body.title
      }
      if (body.description !== undefined) {
        updateData.description = body.description
      }
      if (body.priority !== undefined) {
        updateData.priority = body.priority
      }
      if (body.taskType !== undefined) {
        updateData.taskType = body.taskType
      }
      if (body.contactId !== undefined) {
        updateData.contactId = body.contactId || null
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Keine gültigen Felder zum Aktualisieren' }, { status: 400 })
      }

      task = await updateTask(userId, id, updateData)
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error patching task:', error)
    if (error instanceof Error && error.message === 'Aufgabe nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Aufgabe' }, { status: 500 })
  }
}
