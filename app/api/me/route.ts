import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { FALLBACK_MODEL_ID } from '@/lib/llmModels'

const DEFAULT_SUMMARY_MODEL = FALLBACK_MODEL_ID
const DEFAULT_SUMMARY_PROMPT = 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const userSettings = user.settings as Record<string, any> || {}

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profileImageUrl: null,
      settings: {
        theme: userSettings.theme || 'dark',
        timeFormat24h: userSettings.timeFormat24h ?? true,
        weekStart: userSettings.weekStart || 'mon',
        autosaveEnabled: userSettings.autosaveEnabled ?? true,
        autosaveIntervalSec: userSettings.autosaveIntervalSec ?? 5,
        summaryModel: userSettings.summaryModel || DEFAULT_SUMMARY_MODEL,
        summaryPrompt: userSettings.summaryPrompt || DEFAULT_SUMMARY_PROMPT,
        customModels: userSettings.customModels || [],
        journalAISettings: userSettings.journalAISettings || {},
        transcriptionPrompt: userSettings.transcriptionPrompt || '',
        transcriptionGlossary: userSettings.transcriptionGlossary || [],
        transcriptionModelLanguages: userSettings.transcriptionModelLanguages || {},
        // Passcode settings
        passcodeEnabled: userSettings.passcodeEnabled ?? false,
        passcodeHash: userSettings.passcodeHash || null,
        passcodeLength: userSettings.passcodeLength ?? 4,
        passcodeTimeoutMinutes: userSettings.passcodeTimeoutMinutes ?? 5,
      },
    },
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const updates: { username?: string; displayName?: string | null } = {}
    if (typeof body.username === 'string' && body.username.trim() && body.username !== user.username) {
      updates.username = body.username.trim()
    }
    if (body.displayName !== undefined) {
      const dn = typeof body.displayName === 'string' ? body.displayName.trim() : null
      updates.displayName = dn && dn.length > 0 ? dn : null
    }

    const currentSettings = (user.settings as Record<string, any> || {})
    const settingsPatch: Record<string, any> = { ...currentSettings }
    
    if (body.settings && typeof body.settings === 'object') {
      if (body.settings.theme && (body.settings.theme === 'dark' || body.settings.theme === 'bright')) {
        settingsPatch.theme = body.settings.theme
      }
      if (typeof body.settings.autosaveEnabled === 'boolean') {
        settingsPatch.autosaveEnabled = body.settings.autosaveEnabled
      }
      if (body.settings.autosaveIntervalSec !== undefined) {
        const n = Number(body.settings.autosaveIntervalSec)
        if (Number.isFinite(n) && n >= 1 && n <= 3600) settingsPatch.autosaveIntervalSec = Math.floor(n)
      }
      if (typeof body.settings.summaryModel === 'string' && body.settings.summaryModel.trim().length > 0) {
        settingsPatch.summaryModel = body.settings.summaryModel.trim()
      }
      if (typeof body.settings.summaryPrompt === 'string') {
        const prompt = body.settings.summaryPrompt.trim()
        settingsPatch.summaryPrompt = prompt.length > 0 ? prompt : DEFAULT_SUMMARY_PROMPT
      }
      if (Array.isArray(body.settings.customModels)) {
        settingsPatch.customModels = body.settings.customModels
      }
      if (body.settings.journalAISettings && typeof body.settings.journalAISettings === 'object') {
        settingsPatch.journalAISettings = body.settings.journalAISettings
      }
      if (typeof body.settings.transcriptionPrompt === 'string') {
        settingsPatch.transcriptionPrompt = body.settings.transcriptionPrompt.trim()
      }
      if (Array.isArray(body.settings.transcriptionGlossary)) {
        settingsPatch.transcriptionGlossary = body.settings.transcriptionGlossary.filter(
          (item: unknown) => typeof item === 'string' && item.trim().length > 0
        ).map((item: string) => item.trim())
      }
      if (body.settings.transcriptionModelLanguages && typeof body.settings.transcriptionModelLanguages === 'object') {
        settingsPatch.transcriptionModelLanguages = body.settings.transcriptionModelLanguages
      }
      // Image generation settings
      if (body.settings.imageGenerationSettings && typeof body.settings.imageGenerationSettings === 'object') {
        settingsPatch.imageGenerationSettings = body.settings.imageGenerationSettings
      }
      // Passcode settings
      if (typeof body.settings.passcodeEnabled === 'boolean') {
        settingsPatch.passcodeEnabled = body.settings.passcodeEnabled
      }
      if (body.settings.passcodeHash !== undefined) {
        // Allow null to clear the passcode
        settingsPatch.passcodeHash = typeof body.settings.passcodeHash === 'string' ? body.settings.passcodeHash : null
      }
      if (typeof body.settings.passcodeLength === 'number') {
        const len = Math.floor(body.settings.passcodeLength)
        if (len >= 2 && len <= 6) {
          settingsPatch.passcodeLength = len
        }
      }
      if (typeof body.settings.passcodeTimeoutMinutes === 'number') {
        const timeout = Math.floor(body.settings.passcodeTimeoutMinutes)
        if (timeout >= 1 && timeout <= 60) {
          settingsPatch.passcodeTimeoutMinutes = timeout
        }
      }
    }

    let updatedUser = user
    try {
      updatedUser = await prisma.user.update({ 
        where: { id: user.id }, 
        data: {
          ...updates,
          settings: settingsPatch
        } 
      })
    } catch (err: any) {
      // Prisma unique constraint error
      if (err?.code === 'P2002') {
        return NextResponse.json({ error: 'Username bereits vergeben' }, { status: 409 })
      }
      throw err
    }

    const updatedSettings = updatedUser.settings as Record<string, any> || {}

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        profileImageUrl: null,
        settings: {
          theme: updatedSettings.theme || 'dark',
          timeFormat24h: updatedSettings.timeFormat24h ?? true,
          weekStart: updatedSettings.weekStart || 'mon',
          autosaveEnabled: updatedSettings.autosaveEnabled ?? true,
          autosaveIntervalSec: updatedSettings.autosaveIntervalSec ?? 5,
          summaryModel: updatedSettings.summaryModel || DEFAULT_SUMMARY_MODEL,
          summaryPrompt: updatedSettings.summaryPrompt || DEFAULT_SUMMARY_PROMPT,
          customModels: updatedSettings.customModels || [],
          journalAISettings: updatedSettings.journalAISettings || {},
          transcriptionPrompt: updatedSettings.transcriptionPrompt || '',
          transcriptionGlossary: updatedSettings.transcriptionGlossary || [],
          transcriptionModelLanguages: updatedSettings.transcriptionModelLanguages || {},
        },
      },
    })
  } catch (err) {
    console.error('PATCH /api/me failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
