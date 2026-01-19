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
  /** Specific pages to process (0-based indices or ranges like [0, 2, 5] or [0, 1, 2]) */
  pages?: number[]
}

export interface OcrTable {
  /** Table ID (e.g., tbl-0.md) */
  id: string
  /** Table content in markdown format */
  content: string
}

export interface OcrPage {
  /** Page index (0-based) */
  index: number
  /** Extracted markdown content */
  markdown: string
  /** Extracted images (if includeImages=true) */
  images?: OcrImage[]
  /** Extracted tables */
  tables?: OcrTable[]
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
  console.warn(`[OCR] Extracting text from image (${mimeType}, ${imageBuffer.length} bytes)`)

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

    console.warn(`[OCR] Image processed successfully`)

    // Extract pages from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: OcrPage[] = (response.pages || []).map((page: any, index: number) => {
      const images = extractImages(page)
      const tables = extractTables(page)
      const rawMarkdown = page.markdown || ''
      
      // Post-process markdown to handle images and tables
      const processedMarkdown = postProcessMarkdown(rawMarkdown, images, tables, options)
      
      return {
        index,
        markdown: processedMarkdown,
        images: options.includeImages ? images : undefined,
        tables,
      }
    })

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
  console.warn(`[OCR] Extracting text from PDF (${pdfBuffer.length} bytes)`)
  if (options.pages) {
    console.warn(`[OCR] Page selection: ${options.pages.join(', ')}`)
  }

  const client = getMistralClient()
  const dataUrl = bufferToDataUrl(pdfBuffer, SUPPORTED_PDF_TYPE)

  try {
    // Build request options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestOptions: any = {
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

    // Add page selection if specified
    if (options.pages && options.pages.length > 0) {
      requestOptions.pages = options.pages
    }

    const response = await client.ocr.process(requestOptions)

    console.warn(`[OCR] PDF processed successfully, ${response.pages?.length || 0} pages`)

    // Extract pages from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: OcrPage[] = (response.pages || []).map((page: any, index: number) => {
      console.warn(`[OCR PDF] Page ${index} raw markdown (first 500 chars):`, (page.markdown || '').substring(0, 500))
      console.warn(`[OCR PDF] Page ${index} has ${page.images?.length || 0} images, ${page.tables?.length || 0} tables`)
      const images = extractImages(page)
      const tables = extractTables(page)
      const rawMarkdown = page.markdown || ''
      
      // Post-process markdown to handle images and tables
      const processedMarkdown = postProcessMarkdown(rawMarkdown, images, tables, options)
      
      return {
        index,
        markdown: processedMarkdown,
        images: options.includeImages ? images : undefined,
        tables,
      }
    })

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
  console.warn(`[OCR] Processing ${files.length} files`)

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
    console.warn(`[OCR] Processing file ${i + 1}/${files.length}: ${file.filename}`)

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

  console.warn(
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
 * Mistral API returns tables with 'id' and 'content' (not 'tableMarkdown')
 */
function extractTables(page: { tables?: Array<{ id?: string; content?: string; tableMarkdown?: string }> }): { id: string; content: string }[] {
  console.warn(`[OCR extractTables] Raw tables array:`, JSON.stringify(page.tables, null, 2))
  if (!page.tables) return []

  const tables = page.tables
    .filter((t) => t.content || t.tableMarkdown)
    .map((t, i) => ({
      id: t.id || `tbl-${i}.md`,
      content: t.content || t.tableMarkdown || '',
    }))
  console.warn(`[OCR extractTables] Extracted ${tables.length} tables`)
  return tables
}

/**
 * Post-process OCR markdown to handle images and tables correctly
 * @param markdown - Raw markdown from OCR
 * @param images - Extracted images with base64 data
 * @param tables - Extracted tables with id and content
 * @param options - OCR options
 */
function postProcessMarkdown(
  markdown: string,
  images: OcrImage[],
  tables: OcrTable[],
  options: OcrOptions
): string {
  console.warn(`[OCR postProcess] Input: ${markdown.length} chars, ${images.length} images, ${tables.length} tables`)
  console.warn(`[OCR postProcess] Options: includeImages=${options.includeImages}, tableFormat=${options.tableFormat}`)
  
  let result = markdown

  // Handle images
  if (options.includeImages && images.length > 0) {
    // Replace image references with base64 data URLs
    for (const img of images) {
      const imgRef = new RegExp(`!\\[${escapeRegex(img.id)}\\]\\(${escapeRegex(img.id)}\\)`, 'g')
      if (img.base64) {
        // Determine mime type from extension
        const ext = img.id.split('.').pop()?.toLowerCase() || 'jpeg'
        const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
        result = result.replace(imgRef, `![${img.id}](data:${mimeType};base64,${img.base64})`)
      } else {
        // No base64 data, remove the reference
        result = result.replace(imgRef, '')
      }
    }
  } else {
    // Remove all image references (img-X.jpeg pattern)
    const imgPattern = /!\[img-\d+\.\w+\]\(img-\d+\.\w+\)/g
    const imgMatches = result.match(imgPattern)
    console.warn(`[OCR postProcess] Removing ${imgMatches?.length || 0} image refs (includeImages=${options.includeImages})`)
    result = result.replace(imgPattern, '')
  }

  // Handle tables
  console.warn(`[OCR postProcess] Tables in markdown: ${(result.match(/\[tbl-\d+\.md\]/g) || []).length} refs`)
  if (options.tableFormat === 'markdown' && tables.length > 0) {
    // Replace table links with actual table markdown content
    console.warn(`[OCR postProcess] Replacing table links with markdown tables`)
    for (const table of tables) {
      // Match the table link by its ID (e.g., [tbl-0.md](tbl-0.md))
      const tblRef = new RegExp(`\\[${escapeRegex(table.id)}\\]\\(${escapeRegex(table.id)}\\)`, 'g')
      console.warn(`[OCR postProcess] Table ${table.id}: ${table.content.substring(0, 100)}...`)
      result = result.replace(tblRef, `\n\n${table.content}\n\n`)
    }
  } else if (!options.tableFormat) {
    // Remove table links and convert any inline tables to plain text
    console.warn(`[OCR postProcess] Removing table links and converting tables to plain text`)
    result = result.replace(/\[tbl-\d+\.md\]\(tbl-\d+\.md\)/g, '')
    // Convert markdown tables to plain text (extract cell contents)
    result = convertMarkdownTablesToPlainText(result)
  }

  // Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return result
}

/**
 * Convert markdown tables to plain text
 */
function convertMarkdownTablesToPlainText(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let inTable = false
  const tableRows: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check if line is a table row (starts and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      // Skip separator rows (contain only |, -, :, spaces)
      if (/^[|\-:\s]+$/.test(trimmed)) {
        continue
      }
      // Extract cell contents
      const cells = trimmed
        .slice(1, -1) // Remove leading and trailing |
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0)
      tableRows.push(cells.join(' '))
    } else {
      // End of table or not a table row
      if (inTable && tableRows.length > 0) {
        // Add collected table rows as plain text
        result.push(tableRows.join('\n'))
        tableRows.length = 0
      }
      inTable = false
      result.push(line)
    }
  }

  // Handle remaining table rows at end of content
  if (tableRows.length > 0) {
    result.push(tableRows.join('\n'))
  }

  return result.join('\n')
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
