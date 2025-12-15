import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * User Settings API
 * UserSettings table removed in new schema.
 * Returns default settings until migration is complete.
 */

const DEFAULT_SETTINGS = {
  transcriptionModel: 'openai/whisper-large-v3',
  theme: 'system',
  summaryModel: null,
  summaryPrompt: null,
  autosaveEnabled: true,
  autosaveIntervalSec: 30,
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  // Return default settings (UserSettings table removed in new schema)
  return NextResponse.json({ 
    settings: {
      userId: user.id,
      ...DEFAULT_SETTINGS,
    }
  })
}

export async function PATCH(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  // Accept the patch but return default settings (no persistence yet)
  const body = await req.json().catch(() => ({}))
  
  return NextResponse.json({ 
    ok: true, 
    settings: {
      userId: user.id,
      ...DEFAULT_SETTINGS,
      ...body, // Echo back what was sent
    }
  })
}
