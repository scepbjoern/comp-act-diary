/**
 * API routes for individual ImprovementPrompt operations
 * PATCH /api/improvement-prompts/[id] - Update an improvement prompt
 * DELETE /api/improvement-prompts/[id] - Delete an improvement prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { updateImprovementPrompt, deleteImprovementPrompt, getImprovementPrompt } from '@/lib/improvementPrompt'

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

  const existing = await getImprovementPrompt(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { name, prompt } = body

  if (!name || !prompt) {
    return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 })
  }

  const updatedPrompt = await updateImprovementPrompt(id, user.id, name, prompt)
  return NextResponse.json({ prompt: updatedPrompt })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const existing = await getImprovementPrompt(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Allow deleting system prompts as per user request
  // if (existing.isSystem) {
  //   return NextResponse.json({ error: 'System prompts cannot be deleted' }, { status: 403 })
  // }

  await deleteImprovementPrompt(id, user.id)
  return NextResponse.json({ ok: true })
}
