/**
 * API Route: /api/journal-ai/extract-tasks
 * Extracts tasks from journal entry content using AI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { extractTasksFromContent } from '@/lib/services/taskAIService'
import { createTasksFromSuggestions, type TaskSuggestion } from '@/lib/services/taskService'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

// Request body schema for extraction
const ExtractTasksRequestSchema = z.object({
  journalEntryId: z.string().uuid(),
  content: z.string().optional(), // If not provided, uses entry content
  modelId: z.string().optional(),
})

// Request body schema for saving suggestions
const SaveTasksRequestSchema = z.object({
  journalEntryId: z.string().uuid(),
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    taskType: z.enum([
      'IMMEDIATE', 'REFLECTION', 'PLANNED_INTERACTION',
      'FOLLOW_UP', 'RESEARCH', 'HABIT_RELATED', 'GENERAL'
    ]),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    suggestedDueDate: z.string().nullable().optional(),
    relatedContactName: z.string().nullable().optional(),
    confidence: z.number(),
    contactId: z.string().uuid().optional(), // User-selected contact
  })),
})

/**
 * POST /api/journal-ai/extract-tasks
 * Extracts tasks from journal entry content
 * 
 * Query param: action=extract (default) or action=save
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'extract'

    const body = await request.json()

    if (action === 'save') {
      // Save selected suggestions as tasks
      const result = SaveTasksRequestSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Ungültige Daten', details: result.error.flatten() },
          { status: 400 }
        )
      }

      const { journalEntryId, suggestions } = result.data

      // Verify the journal entry exists and belongs to user
      const entry = await prisma.journalEntry.findFirst({
        where: { id: journalEntryId, userId, deletedAt: null },
        select: { id: true },
      })

      if (!entry) {
        return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
      }

      // Build contact ID map from suggestions that have contactId set
      const contactIdMap = new Map<string, string>()
      for (const suggestion of suggestions) {
        if (suggestion.relatedContactName && suggestion.contactId) {
          contactIdMap.set(suggestion.relatedContactName, suggestion.contactId)
        }
      }

      // Convert to TaskSuggestion format
      const taskSuggestions: TaskSuggestion[] = suggestions.map(s => ({
        title: s.title,
        description: s.description,
        taskType: s.taskType,
        priority: s.priority,
        suggestedDueDate: s.suggestedDueDate ? new Date(s.suggestedDueDate) : null,
        relatedContactName: s.relatedContactName,
        confidence: s.confidence,
      }))

      const tasks = await createTasksFromSuggestions(
        userId,
        journalEntryId,
        taskSuggestions,
        contactIdMap
      )

      return NextResponse.json({ tasks, count: tasks.length }, { status: 201 })
    }

    // Default: Extract tasks
    const result = ExtractTasksRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { journalEntryId, modelId } = result.data
    let { content } = result.data

    // Verify the journal entry exists and belongs to user
    const entry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, userId, deletedAt: null },
      select: { id: true, content: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // Use entry content if not provided
    if (!content) {
      content = entry.content
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Nicht genug Inhalt für Task-Extraktion' },
        { status: 400 }
      )
    }

    // Extract tasks using AI
    const extractionResult = await extractTasksFromContent(content, modelId, userId)

    return NextResponse.json({
      suggestions: extractionResult.suggestions,
      tokensUsed: extractionResult.tokensUsed,
      modelUsed: extractionResult.modelUsed,
    })
  } catch (error) {
    console.error('Error extracting tasks:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Task-Extraktion' },
      { status: 500 }
    )
  }
}
