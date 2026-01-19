/**
 * API Route: /api/generated-images/[id]
 * GET: Get single image details
 * DELETE: Delete image and associated MediaAsset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getImageGenerationService } from '@/lib/services/imageGenerationService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
 * GET /api/generated-images/[id]
 * Returns a single generated image with details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prisma = getPrisma()
    const service = getImageGenerationService(prisma)

    const image = await service.getImageById(id)

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    return NextResponse.json({ image })
  } catch (error) {
    console.error('GET /api/generated-images/[id] failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/generated-images/[id]
 * Deletes a generated image and its associated MediaAsset
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()

    // Verify image exists and belongs to user
    const image = await prisma.generatedImage.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (image.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = getImageGenerationService(prisma)
    const deleted = await service.deleteImage(id)

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/generated-images/[id] failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
