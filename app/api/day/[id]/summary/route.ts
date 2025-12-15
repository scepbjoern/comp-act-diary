import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { makeAIRequest } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Summary generation API - Extensible architecture
 * 
 * Data sources can be extended by modifying:
 * - gatherSummaryContext() - Add new data collection
 * - buildContextText() - Format new data types
 * - sources array - Track source identifiers
 */

const DEFAULT_SUMMARY_MODEL = 'openai/gpt-oss-120b'

interface SummaryContext {
  diaryNotes: Array<{
    id: string
    title?: string | null
    text: string
    occurredAt?: string
  }>
  // Future: Add more data sources here
  // meals?: Array<{...}>
  // habits?: Array<{...}>
  // symptoms?: Array<{...}>
}

async function gatherSummaryContext(dayId: string): Promise<SummaryContext> {
  const prisma = getPrisma()
  
  const day = await prisma.dayEntry.findUnique({
    where: { id: dayId },
    include: { timeBox: true }
  })
  
  if (!day) throw new Error('Day not found')
  if (!day.timeBoxId) throw new Error('Day has no TimeBox')
  
  // Load JournalEntries for this TimeBox with type 'diary'
  const diaryType = await prisma.journalEntryType.findFirst({
    where: { code: 'diary', userId: null }
  })
  
  const entries = diaryType ? await prisma.journalEntry.findMany({
    where: { 
      timeBoxId: day.timeBoxId, 
      typeId: diaryType.id,
      deletedAt: null 
    },
    orderBy: { createdAt: 'asc' }
  }) : []
  
  return {
    diaryNotes: entries.map(e => ({
      id: e.id,
      title: e.title,
      text: e.content || '',
      occurredAt: e.createdAt?.toISOString()
    }))
  }
}

function buildContextText(context: SummaryContext): string {
  let text = ''
  
  if (context.diaryNotes.length > 0) {
    text += '# Tagebucheinträge\n\n'
    context.diaryNotes.forEach(note => {
      const timeStr = note.occurredAt ? new Date(note.occurredAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''
      text += `## ${timeStr}${note.title ? ` - ${note.title}` : ''}\n\n`
      text += `${note.text}\n\n`
    })
  }
  
  // Future: Add more sections
  // if (context.meals) { ... }
  // if (context.habits) { ... }
  
  return text.trim()
}

function buildSourceIdentifiers(context: SummaryContext): string[] {
  const sources: string[] = []
  
  context.diaryNotes.forEach(note => {
    sources.push(`diary:${note.id}`)
  })
  
  // Future: Add more source types
  // context.meals?.forEach(meal => sources.push(`meal:${meal.id}`))
  
  return sources
}

/**
 * POST /api/day/[id]/summary
 * Generate or regenerate summary for a day
 * 
 * Query params:
 * - force=true: Regenerate even if summary exists
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dayId } = await params
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === 'true'
    
    const prisma = getPrisma()
    
    // Get user settings
    const day = await prisma.dayEntry.findUnique({
      where: { id: dayId },
      include: { user: true }
    })
    
    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }
    
    // Check if summary exists and force is not set (aiSummary is now on DayEntry)
    if (day.aiSummary && !force) {
      return NextResponse.json({
        summary: {
          content: day.aiSummary,
          model: 'unknown',
          generatedAt: day.updatedAt.toISOString(),
          sources: []
        }
      })
    }
    
    // Gather context
    const context = await gatherSummaryContext(dayId)
    
    // Check if there's content to summarize
    if (context.diaryNotes.length === 0) {
      return NextResponse.json({ 
        error: 'No content to summarize',
        message: 'Keine Tagebucheinträge vorhanden' 
      }, { status: 400 })
    }
    
    // Build prompt (settings not available in new schema, use defaults)
    const summaryPrompt = 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"'
    const summaryModel = DEFAULT_SUMMARY_MODEL
    
    console.log('Summary model being used:', summaryModel)
    const contextText = buildContextText(context)
    
    const messages = [
      {
        role: 'system' as const,
        content: summaryPrompt
      },
      {
        role: 'user' as const,
        content: contextText
      }
    ]
    
    // Generate summary via AI
    const response = await makeAIRequest({
      model: summaryModel,
      messages
    })
    
    const summaryContent = response.choices?.[0]?.message?.content || ''
    
    if (!summaryContent) {
      return NextResponse.json({ error: 'Empty summary generated' }, { status: 500 })
    }
    
    // Save summary to DayEntry.aiSummary
    const sources = buildSourceIdentifiers(context)
    
    await prisma.dayEntry.update({
      where: { id: dayId },
      data: { aiSummary: summaryContent }
    })
    
    return NextResponse.json({
      summary: {
        content: summaryContent,
        model: summaryModel,
        generatedAt: new Date().toISOString(),
        sources
      }
    })
  } catch (err) {
    console.error('POST /api/day/[id]/summary failed', err)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/day/[id]/summary
 * Retrieve existing summary for a day
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dayId } = await params
    const prisma = getPrisma()
    
    const day = await prisma.dayEntry.findUnique({
      where: { id: dayId }
    })
    
    if (!day?.aiSummary) {
      return NextResponse.json({ 
        summary: null,
        message: 'No summary generated yet'
      })
    }
    
    return NextResponse.json({
      summary: {
        content: day.aiSummary,
        model: 'unknown',
        generatedAt: day.updatedAt.toISOString(),
        sources: []
      }
    })
  } catch (err) {
    console.error('GET /api/day/[id]/summary failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * DELETE /api/day/[id]/summary
 * Delete summary for a day
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dayId } = await params
    const prisma = getPrisma()
    
    await prisma.dayEntry.update({
      where: { id: dayId },
      data: { aiSummary: null }
    })
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/day/[id]/summary failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
