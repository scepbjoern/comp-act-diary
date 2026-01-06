/**
 * GET /api/notes/[noteId]/ocr-sources
 * Returns MediaAssets linked to a JournalEntry with role SOURCE (OCR sources).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await context.params
  const prisma = getPrisma()

  // Get current user
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Verify journal entry exists and belongs to user
  const entry = await prisma.journalEntry.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true },
  })

  if (!entry) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
  }

  if (entry.userId !== user.id) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  // Get MediaAttachments with role SOURCE
  const attachments = await prisma.mediaAttachment.findMany({
    where: {
      entityId: noteId,
      role: 'SOURCE',
    },
    include: {
      asset: {
        select: {
          id: true,
          filePath: true,
          mimeType: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const sources = attachments.map((a) => ({
    id: a.asset.id,
    filePath: a.asset.filePath,
    mimeType: a.asset.mimeType,
    createdAt: a.asset.createdAt.toISOString(),
  }))

  return NextResponse.json({ sources })
}
