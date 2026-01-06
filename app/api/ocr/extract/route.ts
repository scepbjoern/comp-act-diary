/**
 * POST /api/ocr/extract
 * Extracts text from uploaded images or PDFs using Mistral OCR.
 * Saves files as MediaAssets and returns extracted text.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrisma } from '@/lib/prisma'
import {
  extractTextFromFiles,
  isSupportedOcrType,
  getExtensionFromMimeType,
  OCR_CONFIG,
  type OcrFileInput,
} from '@/lib/ocr'
import { validateOcrFile, OcrExtractOptionsSchema } from '@/lib/validators/ocr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// Helper to create folder structure: uploads/ocr/{decade}/{year}/{month}/{day}/
function getOcrFolder(date: Date): { folderPath: string; relativePath: string } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const decade = `${Math.floor(year / 10) * 10}s`

  const uploadsDir = getUploadsDir()
  const relativePath = path.join('ocr', decade, String(year), month, day)
  const folderPath = path.join(uploadsDir, relativePath)

  return { folderPath, relativePath }
}

// Helper to generate filename
function generateOcrFilename(date: Date, extension: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const guid = uuidv4()

  return `${year}-${month}-${day}_${hours}-${minutes}_${guid}.${extension}`
}

export async function POST(req: NextRequest) {
  console.log('=== OCR EXTRACT DEBUG START ===')

  try {
    const prisma = getPrisma()

    // Get current user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: 'demo' } })
    }
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Parse form data
    const formData = await req.formData()

    // Get options (optional JSON string)
    const optionsStr = formData.get('options') as string | null
    let options = {}
    if (optionsStr) {
      try {
        const parsed = JSON.parse(optionsStr)
        options = OcrExtractOptionsSchema.parse(parsed)
      } catch {
        console.warn('[OCR] Invalid options JSON, using defaults')
      }
    }

    // Collect all files from form data
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key === 'file' || key.startsWith('file')) {
        if (value instanceof File) {
          files.push(value)
        }
      }
    }

    console.log(`[OCR] Received ${files.length} files`)

    if (files.length === 0) {
      return NextResponse.json({ error: 'Keine Dateien hochgeladen' }, { status: 400 })
    }

    if (files.length > OCR_CONFIG.maxFiles) {
      return NextResponse.json(
        { error: `Zu viele Dateien (${files.length}). Maximum: ${OCR_CONFIG.maxFiles}` },
        { status: 400 }
      )
    }

    // Validate and prepare files
    const ocrInputs: OcrFileInput[] = []
    const mediaAssetIds: string[] = []
    const now = new Date()
    const { folderPath, relativePath } = getOcrFolder(now)

    // Create directory if needed
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
    }

    for (const file of files) {
      // Validate file
      const validation = validateOcrFile({ size: file.size, type: file.type })
      if (!validation.valid) {
        return NextResponse.json(
          { error: `${file.name}: ${validation.error}` },
          { status: 400 }
        )
      }

      if (!isSupportedOcrType(file.type)) {
        return NextResponse.json(
          { error: `Dateityp nicht unterstützt: ${file.type}` },
          { status: 400 }
        )
      }

      // Read file buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate filename and save file
      const extension = getExtensionFromMimeType(file.type)
      const filename = generateOcrFilename(now, extension)
      const fullPath = path.join(folderPath, filename)
      const relativeFilePath = path.join(relativePath, filename).replace(/\\/g, '/')

      await writeFile(fullPath, buffer)
      console.log(`[OCR] Saved file: ${relativeFilePath}`)

      // Create MediaAsset record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          userId: user.id,
          filePath: relativeFilePath,
          mimeType: file.type,
          ocrStatus: 'PROCESSING',
        },
      })

      mediaAssetIds.push(mediaAsset.id)

      ocrInputs.push({
        buffer,
        mimeType: file.type,
        filename: file.name,
      })
    }

    // Run OCR extraction
    console.log(`[OCR] Starting OCR extraction for ${ocrInputs.length} files`)
    const ocrResult = await extractTextFromFiles(ocrInputs, options)

    // Update MediaAssets with OCR status
    for (const assetId of mediaAssetIds) {
      await prisma.mediaAsset.update({
        where: { id: assetId },
        data: {
          ocrStatus: 'COMPLETED',
          ocrProcessedAt: new Date(),
        },
      })
    }

    console.log('=== OCR EXTRACT DEBUG END SUCCESS ===')

    return NextResponse.json({
      text: ocrResult.text,
      pages: ocrResult.pages,
      mediaAssetIds,
      usageInfo: ocrResult.usageInfo,
    })
  } catch (error) {
    console.error('=== OCR EXTRACT DEBUG END ERROR ===')
    console.error('[OCR] Extraction failed:', error)

    return NextResponse.json(
      {
        error: 'OCR-Extraktion fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
