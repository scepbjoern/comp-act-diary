/**
 * GET/PUT/DELETE /api/llm-models/[id]
 * Manages individual LLM model entries.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UpdateModelSchema = z.object({
  modelId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  provider: z.enum(['openai', 'togetherai']).optional(),
  inputCost: z.string().optional().nullable(),
  outputCost: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  bestFor: z.string().optional().nullable(),
  supportsReasoningEffort: z.boolean().optional(),
  defaultReasoningEffort: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
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

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET - Retrieve a specific LLM model
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    const model = await prisma.llmModel.findFirst({
      where: { id, userId },
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    return NextResponse.json({ model })
  } catch (error) {
    console.error('Error fetching LLM model:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LLM model' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update a specific LLM model
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = UpdateModelSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    
    // Verify ownership
    const existing = await prisma.llmModel.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const model = await prisma.llmModel.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ model })
  } catch (error) {
    console.error('Error updating LLM model:', error)
    return NextResponse.json(
      { error: 'Failed to update LLM model' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a specific LLM model
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    
    // Verify ownership
    const existing = await prisma.llmModel.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    await prisma.llmModel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting LLM model:', error)
    return NextResponse.json(
      { error: 'Failed to delete LLM model' },
      { status: 500 }
    )
  }
}
