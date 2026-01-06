/**
 * Zod validation schemas for OCR API requests
 */

import { z } from 'zod'

/**
 * Options for OCR extraction
 */
export const OcrOptionsSchema = z.object({
  /** Include extracted images in response */
  includeImages: z.boolean().optional().default(false),
  /** Table format: 'markdown', 'html', or null */
  tableFormat: z.enum(['markdown', 'html']).nullable().optional(),
})

export type OcrOptionsInput = z.input<typeof OcrOptionsSchema>
export type OcrOptions = z.output<typeof OcrOptionsSchema>

/**
 * Request schema for POST /api/ocr/extract
 * Note: Files are handled via FormData, this validates the options JSON
 */
export const OcrExtractOptionsSchema = OcrOptionsSchema

/**
 * Request schema for POST /api/ocr/process-entry
 */
export const OcrProcessEntryRequestSchema = z.object({
  /** Extracted OCR text to save */
  text: z.string().min(1, 'Text darf nicht leer sein'),
  /** MediaAsset IDs to link as sources */
  mediaAssetIds: z.array(z.string().uuid()).min(1, 'Mindestens eine Quelldatei erforderlich'),
  /** Date of the journal entry (YYYY-MM-DD) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  /** Time of the journal entry (HH:MM), optional */
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Zeit muss im Format HH:MM sein').optional(),
  /** Journal entry type code */
  typeCode: z.string().default('daily_note'),
  /** Run AI pipeline after creating entry */
  runPipeline: z.boolean().default(false),
  /** Pipeline steps to run */
  pipelineSteps: z.array(z.enum(['content', 'analysis', 'summary'])).optional(),
})

export type OcrProcessEntryRequest = z.infer<typeof OcrProcessEntryRequestSchema>

/**
 * Validate file type for OCR
 */
export const ALLOWED_OCR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

export function isAllowedOcrMimeType(mimeType: string): boolean {
  return ALLOWED_OCR_MIME_TYPES.includes(mimeType as (typeof ALLOWED_OCR_MIME_TYPES)[number])
}

/**
 * File validation constants
 */
export const OCR_FILE_LIMITS = {
  maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
  maxFileSizeMB: 50,
  maxFiles: 20,
} as const

/**
 * Validate a file for OCR processing
 */
export function validateOcrFile(file: { size: number; type: string }): {
  valid: boolean
  error?: string
} {
  if (!isAllowedOcrMimeType(file.type)) {
    return {
      valid: false,
      error: `Dateityp nicht unterstützt: ${file.type}. Erlaubt: JPG, PNG, WEBP, GIF, PDF`,
    }
  }

  if (file.size > OCR_FILE_LIMITS.maxFileSizeBytes) {
    return {
      valid: false,
      error: `Datei zu gross (${Math.round(file.size / 1024 / 1024)}MB). Maximum: ${OCR_FILE_LIMITS.maxFileSizeMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files for OCR processing
 */
export function validateOcrFiles(files: Array<{ size: number; type: string; name: string }>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (files.length === 0) {
    return { valid: false, errors: ['Keine Dateien ausgewählt'] }
  }

  if (files.length > OCR_FILE_LIMITS.maxFiles) {
    return {
      valid: false,
      errors: [`Zu viele Dateien (${files.length}). Maximum: ${OCR_FILE_LIMITS.maxFiles}`],
    }
  }

  for (const file of files) {
    const result = validateOcrFile(file)
    if (!result.valid && result.error) {
      errors.push(`${file.name}: ${result.error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
