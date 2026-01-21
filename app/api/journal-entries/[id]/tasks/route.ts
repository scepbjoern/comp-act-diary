/**
 * API Route: /api/journal-entries/[id]/tasks
 * Handles task operations for a specific journal entry.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTasksForJournalEntry, createTask } from '@/lib/services/taskService'
import { TaskCreateSchema } from '@/lib/validators/task'
import { prisma } from '@/lib/core/prisma'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/journal-entries/[id]/tasks
 * Returns all tasks for a specific journal entry
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: journalEntryId } = await params

    // Verify the journal entry exists and belongs to user
    const entry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, userId, deletedAt: null },
      select: { id: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    const tasks = await getTasksForJournalEntry(userId, journalEntryId)

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks for journal entry:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Aufgaben' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/journal-entries/[id]/tasks
 * Creates a new task linked to a specific journal entry
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: journalEntryId } = await params

    // Verify the journal entry exists and belongs to user
    const entry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, userId, deletedAt: null },
      select: { id: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    
    // Merge journalEntryId into the request body
    const result = TaskCreateSchema.safeParse({
      ...body,
      journalEntryId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const task = await createTask(userId, result.data)

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task for journal entry:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Aufgabe' },
      { status: 500 }
    )
  }
}
