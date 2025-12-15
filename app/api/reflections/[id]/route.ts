import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reflections [id] API - Now uses JournalEntry
 */

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const entry = await prisma.journalEntry.findUnique({ where: { id } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({} as any))
    
    // Build content from reflection fields
    const parts: string[] = []
    if (body?.changed) parts.push(`**Was hat sich verändert?**\n${body.changed}`)
    if (body?.gratitude) parts.push(`**Wofür bin ich dankbar?**\n${body.gratitude}`)
    if (body?.vows) parts.push(`**Meine Vorsätze**\n${body.vows}`)
    if (body?.remarks) parts.push(`**Bemerkungen**\n${body.remarks}`)
    const content = parts.length > 0 ? parts.join('\n\n') : undefined

    const data: { content?: string } = {}
    if (content) data.content = content

    if (Object.keys(data).length > 0) {
      await prisma.journalEntry.update({ where: { id }, data })
    }
    
    return NextResponse.json({ ok: true, reflection: { id } })
  } catch (err) {
    console.error('PATCH /api/reflections/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const entry = await prisma.journalEntry.findUnique({ where: { id } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete
    await prisma.journalEntry.update({ where: { id }, data: { deletedAt: new Date() } })
    
    return NextResponse.json({ ok: true, deleted: id })
  } catch (err) {
    console.error('DELETE /api/reflections/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
