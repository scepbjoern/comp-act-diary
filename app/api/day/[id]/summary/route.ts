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
    include: {
      notesList: {
        where: { type: 'DIARY' },
        orderBy: { occurredAt: 'asc' }
      }
    }
  })
  
  if (!day) throw new Error('Day not found')
  
  return {
    diaryNotes: day.notesList.map(n => ({
      id: n.id,
      title: n.title,
      text: n.text || '',
      occurredAt: n.occurredAt?.toISOString()
    }))
    // Future: Add more data sources
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
      include: { 
        user: { 
          include: { 
            settings: true 
          } 
        },
        summary: true
      }
    })
    
    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }
    
    // Check if summary exists and force is not set
    if (day.summary && !force) {
      return NextResponse.json({
        summary: {
          content: day.summary.content,
          model: day.summary.model,
          generatedAt: day.summary.generatedAt.toISOString(),
          sources: day.summary.sources
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
    
    // Build prompt
    const summaryPrompt = day.user.settings?.summaryPrompt || 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"'
    const summaryModel = day.user.settings?.summaryModel || 'gpt-oss-120b'
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
    
    // Save or update summary
    const sources = buildSourceIdentifiers(context)
    
    const summary = await prisma.daySummary.upsert({
      where: { dayEntryId: dayId },
      create: {
        dayEntryId: dayId,
        content: summaryContent,
        model: summaryModel,
        prompt: summaryPrompt,
        sources
      },
      update: {
        content: summaryContent,
        model: summaryModel,
        prompt: summaryPrompt,
        sources,
        generatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      summary: {
        content: summary.content,
        model: summary.model,
        generatedAt: summary.generatedAt.toISOString(),
        sources: summary.sources
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
    
    const summary = await prisma.daySummary.findUnique({
      where: { dayEntryId: dayId }
    })
    
    if (!summary) {
      return NextResponse.json({ 
        summary: null,
        message: 'No summary generated yet'
      })
    }
    
    return NextResponse.json({
      summary: {
        content: summary.content,
        model: summary.model,
        generatedAt: summary.generatedAt.toISOString(),
        sources: summary.sources
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
    
    await prisma.daySummary.deleteMany({
      where: { dayEntryId: dayId }
    })
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/day/[id]/summary failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
