/**
 * POST /api/admin/seed
 * 
 * Generates test data for development and testing purposes.
 * Supports both predefined data sets and AI-generated data.
 * 
 * Requires authentication and explicit confirmation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { generateTestData, TestDataCategory, GenerationMode, AI_PROMPTS } from '@/lib/services/testDataService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Gets the current user ID from cookies or falls back to demo user.
 */
async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  if (cookieUserId) {
    const user = await prisma.user.findUnique({ where: { id: cookieUserId } })
    if (user) return user.id
  }
  const demoUser = await prisma.user.findUnique({ where: { username: 'demo' } })
  return demoUser?.id || null
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      category = 'all', 
      mode = 'predefined', 
      count = 5, 
      customPrompt,
      confirmed = false 
    } = body as {
      category?: TestDataCategory
      mode?: GenerationMode
      count?: number
      customPrompt?: string
      confirmed?: boolean
    }

    // Require explicit confirmation
    if (!confirmed) {
      return NextResponse.json({ 
        error: 'Bestätigung erforderlich',
        message: 'Bitte bestätige mit confirmed: true, dass du Testdaten generieren möchtest.',
        warning: 'Dies fügt Demo-Daten zu deiner Datenbank hinzu!'
      }, { status: 400 })
    }

    // Validate category
    const validCategories: TestDataCategory[] = ['contacts', 'tasks', 'journal_entries', 'habits', 'locations', 'measurements', 'all']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Ungültige Kategorie',
        validCategories 
      }, { status: 400 })
    }

    // Validate mode
    if (mode !== 'predefined' && mode !== 'ai') {
      return NextResponse.json({ 
        error: 'Ungültiger Modus',
        validModes: ['predefined', 'ai']
      }, { status: 400 })
    }

    // AI mode doesn't support 'all'
    if (mode === 'ai' && category === 'all') {
      return NextResponse.json({ 
        error: 'KI-Modus unterstützt keine "all"-Kategorie',
        message: 'Bitte wähle eine spezifische Kategorie für die KI-Generierung.'
      }, { status: 400 })
    }

    // Generate test data for the currently authenticated user
    const results = await generateTestData({
      category,
      mode,
      count,
      customPrompt,
      userId,
    })

    // Aggregate results
    const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
    const hasErrors = results.some(r => !r.success)

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Einige Kategorien hatten Fehler'
        : `${totalCreated} Testdaten-Einträge erstellt`,
      totalCreated,
      results,
    })
  } catch (error) {
    console.error('Seed API error:', error)
    return NextResponse.json({ 
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/seed
 * 
 * Returns available categories, modes, and default AI prompts.
 */
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  return NextResponse.json({
    categories: [
      { value: 'all', label: 'Alle Kategorien', description: 'Generiert Testdaten für alle Kategorien' },
      { value: 'contacts', label: 'Kontakte', description: '6 Schweizer Beispiel-Kontakte' },
      { value: 'tasks', label: 'Aufgaben', description: '11 verschiedene Aufgaben-Typen' },
      { value: 'journal_entries', label: 'Tagebucheinträge', description: '10 Tagesnotizen' },
      { value: 'habits', label: 'Gewohnheiten', description: '12 Gesundheits-Gewohnheiten' },
      { value: 'locations', label: 'Orte', description: '8 Zürcher Orte' },
      { value: 'measurements', label: 'Messwerte', description: '7 Tage Symptom-Messwerte' },
    ],
    modes: [
      { value: 'predefined', label: 'Vordefiniert', description: 'Fixe Testdaten aus der Vorlage' },
      { value: 'ai', label: 'KI-generiert', description: 'Flexible Testdaten per KI erzeugen' },
    ],
    aiPrompts: AI_PROMPTS,
  })
}
