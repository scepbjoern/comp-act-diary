/**
 * GET/POST /api/llm-models
 * Manages user-specific LLM model configurations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateModelSchema = z.object({
  modelId: z.string().min(1),
  name: z.string().min(1),
  provider: z.enum(['openai', 'togetherai']),
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

/**
 * GET - Retrieve all LLM models for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    const models = await prisma.llmModel.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Error fetching LLM models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LLM models' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new LLM model for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CreateModelSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    
    // Check if model already exists for this user
    const existing = await prisma.llmModel.findUnique({
      where: {
        userId_modelId: {
          userId,
          modelId: parsed.data.modelId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Model already exists', modelId: parsed.data.modelId },
        { status: 409 }
      )
    }

    const model = await prisma.llmModel.create({
      data: {
        userId,
        modelId: parsed.data.modelId,
        name: parsed.data.name,
        provider: parsed.data.provider,
        inputCost: parsed.data.inputCost,
        outputCost: parsed.data.outputCost,
        url: parsed.data.url,
        bestFor: parsed.data.bestFor,
        supportsReasoningEffort: parsed.data.supportsReasoningEffort ?? false,
        defaultReasoningEffort: parsed.data.defaultReasoningEffort,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    })

    return NextResponse.json({ model }, { status: 201 })
  } catch (error) {
    console.error('Error creating LLM model:', error)
    return NextResponse.json(
      { error: 'Failed to create LLM model' },
      { status: 500 }
    )
  }
}
