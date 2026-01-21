/**
 * Regex Helper API Route
 * Uses LLM to generate regex patterns from example strings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// POST - Generate regex from examples
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await req.json()
    const { examples } = body

    if (!examples || typeof examples !== 'string' || !examples.trim()) {
      return NextResponse.json(
        { error: 'Beispiele sind erforderlich' },
        { status: 400 }
      )
    }

    // Get model from environment variable
    const model = process.env.TOGETHERAI_LLM_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free'
    const apiKey = process.env.TOGETHER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Together.ai API-Key nicht konfiguriert' },
        { status: 500 }
      )
    }

    // Prepare examples as list
    const exampleList = examples.split('\n').filter((e: string) => e.trim()).map((e: string) => e.trim())

    if (exampleList.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens ein Beispiel erforderlich' },
        { status: 400 }
      )
    }

    // System prompt for regex generation
    const systemPrompt = `Du bist ein Experte für reguläre Ausdrücke (Regex). 
Deine Aufgabe ist es, aus gegebenen Beispielstrings ein passendes Regex-Pattern zu erstellen.

Regeln:
- Das Pattern muss alle gegebenen Beispiele matchen
- Nutze case-insensitive matching (der Regex wird mit 'i' Flag verwendet)
- Halte das Pattern so einfach wie möglich, aber präzise genug
- Verwende \\s für Whitespace, \\d für Ziffern
- Nutze Zeichenklassen [A-Z], Quantifier +, *, ?, {n,m}
- Gib NUR das Regex-Pattern zurück, ohne Erklärung, ohne Anführungszeichen, ohne Slashes`

    const userPrompt = `Erstelle ein Regex-Pattern, das folgende Strings matcht:

${exampleList.map((e: string) => `- "${e}"`).join('\n')}

Antworte NUR mit dem Regex-Pattern, nichts anderes.`

    // Call Together.ai API
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.error('Together.ai API error:', await response.text())
      return NextResponse.json(
        { error: 'LLM-Anfrage fehlgeschlagen' },
        { status: 500 }
      )
    }

    const data = await response.json()
    let pattern = data.choices?.[0]?.message?.content?.trim() || ''

    // Clean up the pattern (remove quotes, slashes if present)
    pattern = pattern
      .replace(/^["'`\/]+/, '')
      .replace(/["'`\/]+$/, '')
      .replace(/^\//, '')
      .replace(/\/[gimsuy]*$/, '')
      .trim()

    // Validate the regex
    try {
      new RegExp(pattern)
    } catch {
      return NextResponse.json(
        { error: 'Generiertes Pattern ist ungültig', pattern },
        { status: 422 }
      )
    }

    // Verify it matches all examples
    const regex = new RegExp(pattern, 'i')
    const allMatch = exampleList.every((e: string) => regex.test(e))

    return NextResponse.json({
      pattern,
      allMatch,
      testedExamples: exampleList.length,
    })

  } catch (error) {
    console.error('Error generating regex:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Pattern-Generierung' },
      { status: 500 }
    )
  }
}
