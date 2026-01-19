/**
 * API routes for ChatMethod CRUD
 * GET /api/coach/methods - List all chat methods for the current user
 * POST /api/coach/methods - Create a new chat method
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { listChatMethods, createChatMethod } from '@/lib/core/chatMethod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const methods = await listChatMethods(user.id)
  return NextResponse.json({ methods })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { name, systemPrompt } = body

  if (!name || !systemPrompt) {
    return NextResponse.json({ error: 'Name and systemPrompt are required' }, { status: 400 })
  }

  const method = await createChatMethod(user.id, name, systemPrompt)
  return NextResponse.json({ method })
}
