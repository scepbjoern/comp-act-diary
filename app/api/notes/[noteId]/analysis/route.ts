/**
 * CRUD operations for the analysis field of a journal entry.
 * GET - Load analysis
 * PUT - Update analysis
 * DELETE - Remove analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  if (cookieUserId) {
    const user = await prisma.user.findUnique({ where: { id: cookieUserId } })
    if (user) return user
  }
  return await prisma.user.findUnique({ where: { username: 'demo' } })
}

/**
 * GET /api/notes/[noteId]/analysis
 * Load the analysis for a journal entry
 */
export async function GET(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true, analysis: true, contentUpdatedAt: true }
  })
  
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Access check: owner or shared user can read
  const access = await accessService.checkAccess(noteId, user.id)
  if (!access.canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ 
    noteId: entry.id,
    analysis: entry.analysis,
    contentUpdatedAt: entry.contentUpdatedAt,
  })
}

/**
 * PUT /api/notes/[noteId]/analysis
 * Update the analysis
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()
  const body = await req.json().catch(() => ({} as Record<string, unknown>))

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true }
  })
  
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Access check: owner or editor can update
  const access = await accessService.checkAccess(noteId, user.id)
  if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const analysis = typeof body.analysis === 'string' ? body.analysis : null

  await prisma.journalEntry.update({
    where: { id: noteId },
    data: { analysis }
  })

  return NextResponse.json({ 
    ok: true,
    noteId,
    analysis 
  })
}

/**
 * DELETE /api/notes/[noteId]/analysis
 * Remove the analysis
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true }
  })
  
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Access check: owner or editor can delete analysis
  const access = await accessService.checkAccess(noteId, user.id)
  if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.journalEntry.update({
    where: { id: noteId },
    data: { analysis: null }
  })

  return NextResponse.json({ 
    ok: true,
    noteId,
    analysis: null 
  })
}
