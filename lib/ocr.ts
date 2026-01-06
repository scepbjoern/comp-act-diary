/**
 * OCR Service - Mistral OCR API Integration
 * Extracts text from images and PDFs using Mistral's OCR model.
 */

import { Mistral } from '@mistralai/mistralai'

// OCR model to use
export const OCR_MODEL = 'mistral-ocr-latest'

// Supported MIME types for OCR
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const SUPPORTED_PDF_TYPE = 'application/pdf'

export const SUPPORTED_OCR_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  SUPPORTED_PDF_TYPE,
] as const

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]
export type SupportedOcrType = (typeof SUPPORTED_OCR_TYPES)[number]

// Configuration
export const OCR_CONFIG = {
  maxFileSizeMB: 50,
  maxFiles: 20,
} as const

// Interfaces
export interface OcrOptions {
  /** Include extracted images in response */
  includeImages?: boolean
  /** Table format: 'markdown', 'html', or null */
  tableFormat?: 'markdown' | 'html' | null
}

export interface OcrPage {
  /** Page index (0-based) */
  index: number
  /** Extracted markdown content */
  markdown: string
  /** Extracted images (if includeImages=true) */
  images?: OcrImage[]
  /** Extracted tables */
  tables?: string[]
}

export interface OcrImage {
  /** Image ID */
  id: string
  /** Base64 encoded image data */
  base64?: string
}

export interface OcrUsageInfo {
  /** Number of pages processed */
  pagesProcessed: number
  /** Total tokens used */
  tokensUsed: number
}

export interface OcrResult {
  /** Combined markdown text from all pages */
  text: string
  /** Individual page results */
  pages: OcrPage[]
  /** Usage information */
  usageInfo: OcrUsageInfo
}

export interface OcrFileInput {
  /** File buffer */
  buffer: Buffer
  /** MIME type */
  mimeType: string
  /** Original filename */
  filename: string
}

/**
 * Check if a MIME type is supported for OCR
 */
export function isSupportedOcrType(mimeType: string): mimeType is SupportedOcrType {
  return SUPPORTED_OCR_TYPES.includes(mimeType as SupportedOcrType)
}

/**
 * Check if a MIME type is an image type
 */
export function isImageType(mimeType: string): mimeType is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
}

/**
 * Check if a MIME type is PDF
 */
export function isPdfType(mimeType: string): boolean {
  return mimeType === SUPPORTED_PDF_TYPE
}

/**
 * Get Mistral client instance
 */
function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY environment variable')
  }
  return new Mistral({ apiKey })
}

/**
 * Convert buffer to base64 data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

/**
 * Extract text from an image using Mistral OCR
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  console.log(`[OCR] Extracting text from image (${mimeType}, ${imageBuffer.length} bytes)`)

  if (!isImageType(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`)
  }

  const client = getMistralClient()
  const dataUrl = bufferToDataUrl(imageBuffer, mimeType)

  try {
    const response = await client.ocr.process({
      model: OCR_MODEL,
      document: {
        type: 'image_url',
        imageUrl: dataUrl,
      },
      includeImageBase64: options.includeImages ?? false,
    })

    console.log(`[OCR] Image processed successfully`)

    // Extract pages from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: OcrPage[] = (response.pages || []).map((page: any, index: number) => ({
      index,
      markdown: page.markdown || '',
      images: options.includeImages ? extractImages(page) : undefined,
      tables: extractTables(page),
    }))

    // Combine all page markdown
    const text = pages.map((p) => p.markdown).join('\n\n')

    return {
      text,
      pages,
      usageInfo: {
        pagesProcessed: pages.length || 1,
        tokensUsed: response.usageInfo?.pagesProcessed || 0,
      },
    }
  } catch (error) {
    console.error('[OCR] Image extraction failed:', error)
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract text from a PDF using Mistral OCR
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options: OcrOptions = {}
): Promise<OcrResult> {
  console.log(`[OCR] Extracting text from PDF (${pdfBuffer.length} bytes)`)

  const client = getMistralClient()
  const dataUrl = bufferToDataUrl(pdfBuffer, SUPPORTED_PDF_TYPE)

  try {
    // Build request options
    const requestOptions: Parameters<typeof client.ocr.process>[0] = {
      model: OCR_MODEL,
      document: {
        type: 'document_url',
        documentUrl: dataUrl,
      },
      includeImageBase64: options.includeImages ?? false,
    }

    // Add table format if specified
    if (options.tableFormat) {
      requestOptions.tableFormat = options.tableFormat
    }

    const response = await client.ocr.process(requestOptions)

    console.log(`[OCR] PDF processed successfully, ${response.pages?.length || 0} pages`)

    // Extract pages from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: OcrPage[] = (response.pages || []).map((page: any, index: number) => ({
      index,
      markdown: page.markdown || '',
      images: options.includeImages ? extractImages(page) : undefined,
      tables: extractTables(page),
    }))

    // Combine all page markdown with page separators
    const text = pages
      .map((p, i) => {
        if (pages.length > 1) {
          return `<!-- Seite ${i + 1} -->\n${p.markdown}`
        }
        return p.markdown
      })
      .join('\n\n---\n\n')

    return {
      text,
      pages,
      usageInfo: {
        pagesProcessed: pages.length,
        tokensUsed: response.usageInfo?.pagesProcessed || 0,
      },
    }
  } catch (error) {
    console.error('[OCR] PDF extraction failed:', error)
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract text from multiple files
 * Results are combined with document separators
 */
export async function extractTextFromFiles(
  files: OcrFileInput[],
  options: OcrOptions = {}
): Promise<OcrResult> {
  console.log(`[OCR] Processing ${files.length} files`)

  if (files.length === 0) {
    throw new Error('No files provided')
  }

  if (files.length > OCR_CONFIG.maxFiles) {
    throw new Error(`Too many files. Maximum is ${OCR_CONFIG.maxFiles}`)
  }

  const results: OcrResult[] = []
  const errors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`[OCR] Processing file ${i + 1}/${files.length}: ${file.filename}`)

    try {
      let result: OcrResult

      if (isPdfType(file.mimeType)) {
        result = await extractTextFromPDF(file.buffer, options)
      } else if (isImageType(file.mimeType)) {
        result = await extractTextFromImage(file.buffer, file.mimeType, options)
      } else {
        throw new Error(`Unsupported file type: ${file.mimeType}`)
      }

      results.push(result)
    } catch (error) {
      const errorMsg = `Error processing ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`[OCR] ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  if (results.length === 0) {
    throw new Error(`All files failed to process. Errors: ${errors.join('; ')}`)
  }

  // Combine results
  const allPages: OcrPage[] = []
  let pageOffset = 0

  for (const result of results) {
    for (const page of result.pages) {
      allPages.push({
        ...page,
        index: pageOffset + page.index,
      })
    }
    pageOffset += result.pages.length
  }

  // Combine text with document separators
  const combinedText = results
    .map((r, i) => {
      if (files.length > 1) {
        return `<!-- Dokument: ${files[i].filename} -->\n${r.text}`
      }
      return r.text
    })
    .join('\n\n===\n\n')

  // Sum up usage info
  const totalUsage: OcrUsageInfo = {
    pagesProcessed: results.reduce((sum, r) => sum + r.usageInfo.pagesProcessed, 0),
    tokensUsed: results.reduce((sum, r) => sum + r.usageInfo.tokensUsed, 0),
  }

  console.log(
    `[OCR] Completed: ${results.length}/${files.length} files, ${totalUsage.pagesProcessed} pages`
  )

  return {
    text: combinedText,
    pages: allPages,
    usageInfo: totalUsage,
  }
}

/**
 * Extract images from OCR page response
 */
function extractImages(page: { images?: Array<{ id?: string; imageBase64?: string }> }): OcrImage[] {
  if (!page.images) return []

  return page.images.map((img, i) => ({
    id: img.id || `image-${i}`,
    base64: img.imageBase64,
  }))
}

/**
 * Extract tables from OCR page response
 */
function extractTables(page: { tables?: Array<{ tableMarkdown?: string }> }): string[] {
  if (!page.tables) return []

  return page.tables
    .map((t) => t.tableMarkdown)
    .filter((t): t is string => typeof t === 'string')
}

/**
 * Validate file size
 */
export function validateFileSize(sizeBytes: number): boolean {
  const maxBytes = OCR_CONFIG.maxFileSizeMB * 1024 * 1024
  return sizeBytes <= maxBytes
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  }
  return mimeToExt[mimeType] || 'bin'
}
