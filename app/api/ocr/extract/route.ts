/**
 * POST /api/ocr/extract
 * Extracts text from uploaded images or PDFs using Mistral OCR.
 * Saves files as MediaAssets and returns extracted text.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrisma } from '@/lib/prisma'
import {
  extractTextFromPDF,
  extractTextFromImage,
  isSupportedOcrType,
  getExtensionFromMimeType,
  isPdfType,
  isImageType,
  OCR_CONFIG,
  type OcrResult,
  type OcrPage,
  type OcrUsageInfo,
} from '@/lib/ocr'
import { validateOcrFile } from '@/lib/validators/ocr'

/**
 * Parse page range string (1-based) to array of 0-based page indices
 * Supports formats: "1-3", "1,3,5", "1-3,5,7-9"
 */
function parsePageRange(rangeStr: string): number[] {
  const pages: number[] = []
  const parts = rangeStr.split(',').map(p => p.trim())
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10))
      if (!isNaN(start) && !isNaN(end)) {
        // Convert 1-based to 0-based
        for (let i = start - 1; i <= end - 1; i++) {
          if (i >= 0) pages.push(i)
        }
      }
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num) && num > 0) {
        // Convert 1-based to 0-based
        pages.push(num - 1)
      }
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(pages)].sort((a, b) => a - b)
}

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
    let options: { includeImages?: boolean; tableFormat?: 'markdown' | 'html' | null } = {}
    if (optionsStr) {
      try {
        const parsed = JSON.parse(optionsStr)
        // Map frontend options to API options
        options = {
          includeImages: parsed.includeImages ?? false,
          // Frontend sends includeTableFormat (boolean), API expects tableFormat ('markdown' | null)
          tableFormat: parsed.includeTableFormat ? 'markdown' : null,
        }
        console.log('[OCR] Options:', options)
      } catch {
        console.warn('[OCR] Invalid options JSON, using defaults')
      }
    }

    // Get page ranges for PDFs (optional JSON string)
    const pageRangesStr = formData.get('pageRanges') as string | null
    let pageRanges: Record<number, string> = {}
    if (pageRangesStr) {
      try {
        pageRanges = JSON.parse(pageRangesStr)
        console.log('[OCR] Page ranges:', pageRanges)
      } catch {
        console.warn('[OCR] Invalid pageRanges JSON, ignoring')
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
    const mediaAssetIds: string[] = []
    const ocrResults: OcrResult[] = []
    const now = new Date()
    const { folderPath, relativePath } = getOcrFolder(now)

    // Create directory if needed
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
    }

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex]
      
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

      // Run OCR extraction for this file
      console.log(`[OCR] Processing file ${fileIndex + 1}/${files.length}: ${file.name}`)
      
      try {
        let result: OcrResult
        
        if (isPdfType(file.type)) {
          // Get page range for this file if specified
          const pageRangeStr = pageRanges[fileIndex]
          const pages = pageRangeStr ? parsePageRange(pageRangeStr) : undefined
          
          result = await extractTextFromPDF(buffer, {
            ...options,
            pages,
          })
        } else if (isImageType(file.type)) {
          result = await extractTextFromImage(buffer, file.type, options)
        } else {
          throw new Error(`Unsupported file type: ${file.type}`)
        }
        
        ocrResults.push(result)
      } catch (error) {
        console.error(`[OCR] Error processing ${file.name}:`, error)
        // Continue with other files, but mark this one as failed
        await prisma.mediaAsset.update({
          where: { id: mediaAsset.id },
          data: { ocrStatus: 'FAILED' },
        })
      }
    }

    if (ocrResults.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien konnten verarbeitet werden' },
        { status: 500 }
      )
    }

    // Save extracted images as files and replace base64 with URLs
    const savedImageUrls: Map<string, string> = new Map()
    if (options.includeImages) {
      for (const result of ocrResults) {
        for (const page of result.pages) {
          if (page.images) {
            for (const img of page.images) {
              if (img.base64) {
                try {
                  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
                  let base64Data = img.base64
                  if (base64Data.includes(',')) {
                    base64Data = base64Data.split(',')[1]
                  }
                  
                  // Determine extension from image id
                  const ext = img.id.split('.').pop()?.toLowerCase() || 'jpg'
                  
                  // Generate folder structure like uploads/images/
                  const year = now.getFullYear()
                  const decade = `${Math.floor(year / 10) * 10}s`
                  const month = String(now.getMonth() + 1).padStart(2, '0')
                  const day = String(now.getDate()).padStart(2, '0')
                  const hours = String(now.getHours()).padStart(2, '0')
                  const minutes = String(now.getMinutes()).padStart(2, '0')
                  
                  const imageDir = join(process.cwd(), 'uploads', 'images', decade, String(year), month, day)
                  if (!existsSync(imageDir)) {
                    await mkdir(imageDir, { recursive: true })
                  }
                  
                  const filename = `${year}-${month}-${day}_${hours}-${minutes}_ocr_${uuidv4()}.${ext}`
                  const filepath = join(imageDir, filename)
                  
                  // Decode base64 and save
                  const imageBuffer = Buffer.from(base64Data, 'base64')
                  console.log(`[OCR] Image ${img.id}: ${base64Data.length} base64 chars -> ${imageBuffer.length} bytes`)
                  await writeFile(filepath, imageBuffer)
                  
                  const imageUrl = `/uploads/images/${decade}/${year}/${month}/${day}/${filename}`
                  savedImageUrls.set(img.id, imageUrl)
                  console.log(`[OCR] Saved image ${img.id} -> ${imageUrl}`)
                } catch (imgError) {
                  console.error(`[OCR] Failed to save image ${img.id}:`, imgError)
                }
              }
            }
          }
        }
      }
    }

    // Combine results and replace base64 images with URLs
    const allPages: OcrPage[] = []
    let pageOffset = 0
    for (const result of ocrResults) {
      for (const page of result.pages) {
        let pageMarkdown = page.markdown
        
        // Replace base64 data URLs with saved image URLs
        for (const [imgId, imgUrl] of savedImageUrls.entries()) {
          // Replace data URL format
          const dataUrlPattern = new RegExp(`!\\[${imgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(data:[^)]+\\)`, 'g')
          pageMarkdown = pageMarkdown.replace(dataUrlPattern, `![${imgId}](${imgUrl})`)
        }
        
        allPages.push({ ...page, markdown: pageMarkdown, index: pageOffset + page.index })
      }
      pageOffset += result.pages.length
    }

    let combinedText = ocrResults
      .map((r, i) => files.length > 1 ? `<!-- Dokument: ${files[i].name} -->\n${r.text}` : r.text)
      .join('\n\n===\n\n')
    
    // Also replace in combined text
    for (const [imgId, imgUrl] of savedImageUrls.entries()) {
      const dataUrlPattern = new RegExp(`!\\[${imgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(data:[^)]+\\)`, 'g')
      combinedText = combinedText.replace(dataUrlPattern, `![${imgId}](${imgUrl})`)
    }

    const totalUsage: OcrUsageInfo = {
      pagesProcessed: ocrResults.reduce((sum, r) => sum + r.usageInfo.pagesProcessed, 0),
      tokensUsed: ocrResults.reduce((sum, r) => sum + r.usageInfo.tokensUsed, 0),
    }

    const ocrResult: OcrResult = {
      text: combinedText,
      pages: allPages,
      usageInfo: totalUsage,
    }

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
