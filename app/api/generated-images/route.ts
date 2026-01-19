/**
 * API Route: /api/generated-images
 * GET: List images for an entity
 * POST: Generate new image for an entity
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPrisma } from '@/lib/core/prisma'
import { getImageGenerationService } from '@/lib/services/imageGenerationService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GenerateRequestSchema = z.object({
  entityId: z.string().uuid(),
  summaryText: z.string().min(1),
  customPrompt: z.string().optional(),
})

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

/**
 * GET /api/generated-images?entityId=xxx
 * Returns all generated images for an entity
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get('entityId')

    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId query parameter required' },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    const service = getImageGenerationService(prisma)

    const images = await service.getImagesForEntity(entityId)

    return NextResponse.json({ images })
  } catch (error) {
    console.error('GET /api/generated-images failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/generated-images
 * Generates a new image for an entity
 */
export async function POST(req: NextRequest) {
  try {
    // DEBUG: Log incoming request details
    console.warn('=== POST /api/generated-images DEBUG ===')
    console.warn('Request headers:', Object.fromEntries(req.headers.entries()))
    console.warn('Request URL:', req.url)
    console.warn('Request method:', req.method)
    
    const userId = await getCurrentUserId(req)
    console.warn('Current userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch((e) => {
      console.error('Failed to parse JSON body:', e)
      return {}
    })
    
    console.warn('Request body:', body)
    console.warn('Body type:', typeof body)
    console.warn('Has entityId:', 'entityId' in body)
    console.warn('Has summaryText:', 'summaryText' in body)
    
    const parsed = GenerateRequestSchema.safeParse(body)
    console.warn('Zod parse success:', parsed.success)
    
    if (!parsed.success) {
      const errors = parsed.error.flatten()
      const errorMessages = [
        ...errors.formErrors,
        ...Object.entries(errors.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`)
      ].join('; ')
      console.error('Validation errors:', errors)
      console.error('Error messages:', errorMessages)
      return NextResponse.json(
        { error: 'Invalid request', details: errorMessages || 'Validation failed' },
        { status: 400 }
      )
    }

    const { entityId, summaryText, customPrompt } = parsed.data
    
    const prisma = getPrisma()

    // Verify entity exists and belongs to user
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    })

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found. Run backfill script if needed.' },
        { status: 404 }
      )
    }

    if (entity.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user settings and generate image
    const service = getImageGenerationService(prisma)
    const userSettings = await service.getUserSettings(userId)

    const result = await service.generateImage({
      entityId,
      userId,
      summaryText,
      settings: userSettings,
      customPrompt,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Image generation failed', details: result.error },
        { status: 500 }
      )
    }

    // Fetch the created image with asset data
    const image = await service.getImageById(result.generatedImageId!)

    return NextResponse.json({ image })
  } catch (error) {
    console.error('POST /api/generated-images failed:', error)
    return NextResponse.json(
      { error: 'Image generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
