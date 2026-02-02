/**
 * app/api/journal-ai/segment-audio/route.ts
 * API route for AI-based audio transcript segmentation.
 * Splits transcripts into template fields using explicit markers or AI inference.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/core/prisma'
import { segmentAudioSchema, TemplateField, TemplateAIConfig } from '@/types/journal'
import {
  segmentTranscriptByFields,
  getSegmentationOptions,
  templateNeedsSegmentation,
} from '@/lib/services/journal/segmenterService'

// Get userId from cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

/**
 * POST /api/journal-ai/segment-audio
 * Segments a transcript by template fields.
 *
 * Request body:
 * - transcript: The audio transcript to segment
 * - templateId: ID of the template to use for segmentation
 * - options: Optional model/prompt overrides
 *
 * Returns:
 * - segments: Record<fieldId, segmentedContent>
 * - warning: Optional warning message
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const result = segmentAudioSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { transcript, templateId, options } = result.data

    // Fetch template
    const template = await prisma.journalTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ userId }, { userId: null }],
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 })
    }

    const fields = template.fields as TemplateField[] | null
    const aiConfig = template.aiConfig as TemplateAIConfig | null

    // Check if template needs segmentation
    if (!templateNeedsSegmentation(fields)) {
      // Single field or no fields - return transcript as-is
      const fieldId = fields?.[0]?.id || 'content'
      return NextResponse.json({
        segments: { [fieldId]: transcript },
        warning: null,
      })
    }

    // Get segmentation options from template AI config or request options
    const segmentationOptions = {
      ...getSegmentationOptions(aiConfig),
      ...options,
      userId, // Required for LLM call
    }

    // Perform segmentation
    const segmentationResult = await segmentTranscriptByFields(
      transcript,
      fields!,
      segmentationOptions
    )

    return NextResponse.json(segmentationResult)
  } catch (error) {
    console.error('Error segmenting transcript:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Segmentierung' },
      { status: 500 }
    )
  }
}
