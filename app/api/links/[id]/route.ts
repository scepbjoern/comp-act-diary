import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Links [id] API - Now uses Bookmark model
 */

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const bookmark = await prisma.bookmark.findUnique({ where: { id } })
    if (!bookmark) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (bookmark.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.bookmark.delete({ where: { id } })
    return NextResponse.json({ ok: true, deleted: id })
  } catch (err) {
    console.error('DELETE /api/links/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
