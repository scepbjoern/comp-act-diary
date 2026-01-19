/**
 * POST /api/llm-models/sync
 * Synchronizes default LLM models from config/default-llm-models.json to user's database.
 * Adds missing models without duplicating existing ones or deleting user-added models.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DefaultModel {
  id: string
  name: string
  provider: 'openai' | 'togetherai'
  inputCost?: string
  outputCost?: string
  url?: string
  best_for?: string
  supportsReasoningEffort?: boolean
  defaultReasoningEffort?: string
}

interface DefaultModelsConfig {
  models: DefaultModel[]
}

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

function loadDefaultModels(): DefaultModel[] {
  try {
    const configPath = join(process.cwd(), 'config', 'default-llm-models.json')
    const content = readFileSync(configPath, 'utf-8')
    const config: DefaultModelsConfig = JSON.parse(content)
    return config.models || []
  } catch (error) {
    console.error('Error loading default LLM models:', error)
    return []
  }
}

/**
 * POST - Sync default models to user's database
 * Only adds models that don't already exist (by modelId)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const defaultModels = loadDefaultModels()
    if (defaultModels.length === 0) {
      return NextResponse.json(
        { error: 'No default models found in configuration' },
        { status: 404 }
      )
    }

    const prisma = getPrisma()

    // Get existing model IDs for this user
    const existingModels = await prisma.llmModel.findMany({
      where: { userId },
      select: { modelId: true },
    })
    const existingModelIds = new Set(existingModels.map((m: { modelId: string }) => m.modelId))

    // Filter out models that already exist
    const modelsToAdd = defaultModels.filter(
      (m: DefaultModel) => !existingModelIds.has(m.id)
    )

    if (modelsToAdd.length === 0) {
      return NextResponse.json({
        message: 'All default models already exist',
        added: 0,
        skipped: defaultModels.length,
      })
    }

    // Get the highest sortOrder for this user
    const maxSortOrder = await prisma.llmModel.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    })
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1

    // Add missing models
    const createdModels = await prisma.llmModel.createMany({
      data: modelsToAdd.map((m, index) => ({
        userId,
        modelId: m.id,
        name: m.name,
        provider: m.provider,
        inputCost: m.inputCost,
        outputCost: m.outputCost,
        url: m.url,
        bestFor: m.best_for,
        supportsReasoningEffort: m.supportsReasoningEffort ?? false,
        defaultReasoningEffort: m.defaultReasoningEffort,
        sortOrder: nextSortOrder + index,
      })),
    })

    return NextResponse.json({
      message: 'Models synchronized successfully',
      added: createdModels.count,
      skipped: defaultModels.length - modelsToAdd.length,
    })
  } catch (error) {
    console.error('Error syncing LLM models:', error)
    return NextResponse.json(
      { error: 'Failed to sync LLM models' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get default models from config file (for preview)
 */
export async function GET() {
  try {
    const defaultModels = loadDefaultModels()
    return NextResponse.json({ models: defaultModels })
  } catch (error) {
    console.error('Error loading default models:', error)
    return NextResponse.json(
      { error: 'Failed to load default models' },
      { status: 500 }
    )
  }
}
