/**
 * API routes for ImprovementPrompt CRUD
 * GET /api/improvement-prompts - List all improvement prompts for the current user
 * POST /api/improvement-prompts - Create a new improvement prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { listImprovementPrompts, createImprovementPrompt, initializeDefaultPrompts } from '@/lib/improvementPrompt'

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

  // Initialize default prompts if user has none
  await initializeDefaultPrompts(user.id)

  const prompts = await listImprovementPrompts(user.id)
  return NextResponse.json({ prompts })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { name, prompt } = body

  if (!name || !prompt) {
    return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 })
  }

  const improvementPrompt = await createImprovementPrompt(user.id, name, prompt)
  return NextResponse.json({ prompt: improvementPrompt })
}
