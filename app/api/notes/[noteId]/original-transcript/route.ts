import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/notes/[noteId]/original-transcript
 * Lazy load the original transcript for a journal entry
 */
export async function GET(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true, originalTranscript: true }
  })
  
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ 
    noteId: entry.id,
    originalTranscript: entry.originalTranscript 
  })
}

/**
 * PUT /api/notes/[noteId]/original-transcript
 * Update the original transcript (for manual corrections before LLM improvement)
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({} as Record<string, unknown>))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true }
  })
  
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const originalTranscript = typeof body.originalTranscript === 'string' 
    ? body.originalTranscript 
    : null

  await prisma.journalEntry.update({
    where: { id: noteId },
    data: { originalTranscript }
  })

  return NextResponse.json({ 
    ok: true,
    noteId,
    originalTranscript 
  })
}
