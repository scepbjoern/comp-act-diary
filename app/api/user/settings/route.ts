import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { SharingDefaultsSchema } from '@/lib/validators/journalEntryAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * User Settings API
 * Settings are stored in User.settings JSON field.
 * Includes sharing defaults for cross-user entry sharing.
 */

const DEFAULT_SETTINGS = {
  transcriptionModel: 'openai/whisper-large-v3',
  theme: 'system',
  summaryModel: null,
  summaryPrompt: null,
  autosaveEnabled: true,
  autosaveIntervalSec: 30,
  sharingDefaults: {
    defaultShareUserId: null,
    defaultShareRole: 'VIEWER',
    autoShareByType: [],
  },
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  // Merge stored settings with defaults
  const storedSettings = (user.settings as Record<string, unknown>) || {}
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    sharingDefaults: {
      ...DEFAULT_SETTINGS.sharingDefaults,
      ...(storedSettings.sharingDefaults as Record<string, unknown> || {}),
    },
  }

  return NextResponse.json({ 
    settings: {
      userId: user.id,
      ...mergedSettings,
    }
  })
}

export async function PATCH(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Validate sharingDefaults if provided
  if (body.sharingDefaults) {
    const validation = SharingDefaultsSchema.safeParse(body.sharingDefaults)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Sharing-Einstellungen', details: validation.error.flatten() },
        { status: 400 }
      )
    }
  }

  // Merge with existing settings and persist to User.settings
  const existingSettings = (user.settings as Record<string, unknown>) || {}
  const newSettings = {
    ...existingSettings,
    ...body,
  }

  // Handle nested sharingDefaults merge
  if (body.sharingDefaults) {
    newSettings.sharingDefaults = {
      ...(existingSettings.sharingDefaults as Record<string, unknown> || {}),
      ...body.sharingDefaults,
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { settings: newSettings },
  })

  // Return merged settings
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...newSettings,
    sharingDefaults: {
      ...DEFAULT_SETTINGS.sharingDefaults,
      ...(newSettings.sharingDefaults as Record<string, unknown> || {}),
    },
  }

  return NextResponse.json({ 
    ok: true, 
    settings: {
      userId: user.id,
      ...mergedSettings,
    }
  })
}
