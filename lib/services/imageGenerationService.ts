/**
 * ImageGenerationService - Service for AI image generation via together.ai
 * Handles image generation, storage, and database persistence.
 */

import { PrismaClient } from '@prisma/client'
import Together from 'together-ai'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

import {
  type ImageGenerationSettings,
  getImageDimensions,
  isValidImageModel,
  DEFAULT_IMAGE_MODEL_ID,
} from '@/lib/imageModels'
import {
  interpolateImagePrompt,
  mergeWithDefaults,
} from '@/lib/defaultImagePrompt'
import { getApiKeyForProvider } from '@/lib/llmModels'

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateImageParams {
  entityId: string
  userId: string
  summaryText: string
  settings?: Partial<ImageGenerationSettings>
  customPrompt?: string
}

export interface GenerateImageResult {
  success: boolean
  generatedImageId?: string
  assetId?: string
  error?: string
}

export interface GeneratedImageData {
  id: string
  entityId: string
  assetId: string
  model: string
  prompt: string
  aspectRatio: string
  steps: number
  displayOrder: number
  createdAt: Date
  asset: {
    id: string
    filePath: string | null
    width: number | null
    height: number | null
    mimeType: string
  }
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class ImageGenerationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Generates an image for an entity based on summary text
   */
  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { entityId, userId, summaryText, settings: userSettings, customPrompt } = params

    try {
      // Merge user settings with defaults
      const settings = mergeWithDefaults(userSettings)

      // Validate model
      if (!isValidImageModel(settings.modelId)) {
        settings.modelId = DEFAULT_IMAGE_MODEL_ID
      }

      // Build the final prompt - use customPrompt if provided, otherwise interpolate template
      const prompt = customPrompt || interpolateImagePrompt(settings.promptTemplate, summaryText)

      // Get dimensions for aspect ratio
      const dimensions = getImageDimensions(settings.aspectRatio)

      // Call together.ai API
      const imageBase64 = await this.callTogetherAI({
        model: settings.modelId,
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: settings.steps,
      })

      // Save image to filesystem
      const { filePath } = await this.saveImageToFile(imageBase64, userId)

      // Create MediaAsset
      const asset = await this.prisma.mediaAsset.create({
        data: {
          userId,
          filePath,
          mimeType: 'image/png',
          width: dimensions.width,
          height: dimensions.height,
        },
      })

      // Get next display order for this entity
      const maxOrder = await this.prisma.generatedImage.aggregate({
        where: { entityId },
        _max: { displayOrder: true },
      })
      const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1

      // Create GeneratedImage
      const generatedImage = await this.prisma.generatedImage.create({
        data: {
          userId,
          entityId,
          assetId: asset.id,
          model: settings.modelId,
          prompt,
          aspectRatio: settings.aspectRatio,
          steps: settings.steps,
          displayOrder,
        },
      })

      return {
        success: true,
        generatedImageId: generatedImage.id,
        assetId: asset.id,
      }
    } catch (error) {
      console.error('[ImageGenerationService] generateImage failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Calls together.ai image generation API
   */
  private async callTogetherAI(params: {
    model: string
    prompt: string
    width: number
    height: number
    steps: number
  }): Promise<string> {
    const apiKey = getApiKeyForProvider('togetherai')
    if (!apiKey) {
      throw new Error('Missing TOGETHERAI_API_KEY environment variable')
    }

    const together = new Together({ apiKey })

    // Build request parameters - some models don't support 'steps'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestParams: any = {
      model: params.model,
      prompt: params.prompt,
      width: params.width,
      height: params.height,
      n: 1,
      response_format: 'base64',
    }

    // Only add steps parameter for models that support it
    if (!params.model.includes('google/flash-image')) {
      requestParams.steps = params.steps
    }

    const response = await together.images.create(requestParams)

    const imageData = response.data?.[0]
    if (!imageData || !('b64_json' in imageData) || !imageData.b64_json) {
      throw new Error('No image data received from together.ai')
    }

    return imageData.b64_json
  }

  /**
   * Saves base64 image to filesystem
   */
  private async saveImageToFile(
    base64Data: string,
    _userId: string
  ): Promise<{ filePath: string; absolutePath: string }> {
    const now = new Date()
    const year = now.getFullYear()
    const decade = `${Math.floor(year / 10) * 10}s`
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    // Use a dedicated folder for AI-generated images
    const relativeDir = join('uploads', 'ai-images', decade, String(year), month, day)
    const absoluteDir = join(process.cwd(), relativeDir)

    // Create directory if it doesn't exist
    await mkdir(absoluteDir, { recursive: true })

    // Generate filename
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const filename = `${year}-${month}-${day}_${hours}-${minutes}_${uuidv4()}.png`

    const absolutePath = join(absoluteDir, filename)
    const filePath = join(relativeDir, filename).replace(/\\/g, '/')

    // Decode and save
    const buffer = Buffer.from(base64Data, 'base64')
    await writeFile(absolutePath, buffer)

    return { filePath, absolutePath }
  }

  /**
   * Gets all generated images for an entity
   */
  async getImagesForEntity(entityId: string): Promise<GeneratedImageData[]> {
    const images = await this.prisma.generatedImage.findMany({
      where: { entityId },
      orderBy: { displayOrder: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            filePath: true,
            width: true,
            height: true,
            mimeType: true,
          },
        },
      },
    })

    return images
  }

  /**
   * Gets a single generated image by ID
   */
  async getImageById(id: string): Promise<GeneratedImageData | null> {
    const image = await this.prisma.generatedImage.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            filePath: true,
            width: true,
            height: true,
            mimeType: true,
          },
        },
      },
    })

    return image
  }

  /**
   * Deletes a generated image and its associated MediaAsset
   */
  async deleteImage(id: string): Promise<boolean> {
    try {
      const image = await this.prisma.generatedImage.findUnique({
        where: { id },
        select: { assetId: true },
      })

      if (!image) {
        return false
      }

      // Delete GeneratedImage first (due to unique constraint on assetId)
      await this.prisma.generatedImage.delete({
        where: { id },
      })

      // Delete MediaAsset (will cascade due to onDelete: Cascade)
      await this.prisma.mediaAsset.delete({
        where: { id: image.assetId },
      })

      return true
    } catch (error) {
      console.error('[ImageGenerationService] deleteImage failed:', error)
      return false
    }
  }

  /**
   * Gets user's image generation settings from User.settings JSON
   */
  async getUserSettings(userId: string): Promise<ImageGenerationSettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    const userSettings = user?.settings as Record<string, unknown> | null
    const imageSettings = userSettings?.['imageGenerationSettings'] as Partial<ImageGenerationSettings> | undefined

    return mergeWithDefaults(imageSettings)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let imageGenerationServiceInstance: ImageGenerationService | null = null

/**
 * Gets the ImageGenerationService singleton instance
 */
export function getImageGenerationService(prisma: PrismaClient): ImageGenerationService {
  if (!imageGenerationServiceInstance) {
    imageGenerationServiceInstance = new ImageGenerationService(prisma)
  }
  return imageGenerationServiceInstance
}
