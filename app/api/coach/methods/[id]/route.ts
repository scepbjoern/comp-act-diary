/**
 * API routes for individual ChatMethod operations
 * PATCH /api/coach/methods/[id] - Update a chat method
 * DELETE /api/coach/methods/[id] - Delete a chat method
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { updateChatMethod, deleteChatMethod, getChatMethod } from '@/lib/chatMethod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const existing = await getChatMethod(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { name, systemPrompt } = body

  if (!name || !systemPrompt) {
    return NextResponse.json({ error: 'Name and systemPrompt are required' }, { status: 400 })
  }

  const method = await updateChatMethod(id, user.id, name, systemPrompt)
  return NextResponse.json({ method })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const existing = await getChatMethod(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteChatMethod(id, user.id)
  return NextResponse.json({ ok: true })
}
