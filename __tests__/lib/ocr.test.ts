/**
 * Unit tests for OCR Service
 * Uses mocks to avoid real Mistral API calls
 */

import { describe, it, expect, vi } from 'vitest'
import {
  isSupportedOcrType,
  isImageType,
  isPdfType,
  validateFileSize,
  getExtensionFromMimeType,
  OCR_CONFIG,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_PDF_TYPE,
} from '@/lib/media/ocr'

// Mock the Mistral SDK
vi.mock('@mistralai/mistralai', () => ({
  Mistral: vi.fn().mockImplementation(() => ({
    ocr: {
      process: vi.fn().mockResolvedValue({
        pages: [
          {
            index: 0,
            markdown: '# Test Document\n\nThis is test content.',
            images: [],
            tables: [],
          },
        ],
        usageInfo: {
          pagesProcessed: 1,
        },
      }),
    },
  })),
}))

describe('OCR Service - Type Checks', () => {
  describe('isSupportedOcrType', () => {
    it('should return true for supported image types', () => {
      expect(isSupportedOcrType('image/jpeg')).toBe(true)
      expect(isSupportedOcrType('image/png')).toBe(true)
      expect(isSupportedOcrType('image/webp')).toBe(true)
      expect(isSupportedOcrType('image/gif')).toBe(true)
    })

    it('should return true for PDF', () => {
      expect(isSupportedOcrType('application/pdf')).toBe(true)
    })

    it('should return false for unsupported types', () => {
      expect(isSupportedOcrType('text/plain')).toBe(false)
      expect(isSupportedOcrType('application/json')).toBe(false)
      expect(isSupportedOcrType('video/mp4')).toBe(false)
      expect(isSupportedOcrType('audio/mpeg')).toBe(false)
    })
  })

  describe('isImageType', () => {
    it('should return true for image types', () => {
      SUPPORTED_IMAGE_TYPES.forEach((type: string) => {
        expect(isImageType(type)).toBe(true)
      })
    })

    it('should return false for non-image types', () => {
      expect(isImageType('application/pdf')).toBe(false)
      expect(isImageType('text/plain')).toBe(false)
    })
  })

  describe('isPdfType', () => {
    it('should return true for PDF', () => {
      expect(isPdfType('application/pdf')).toBe(true)
    })

    it('should return false for non-PDF types', () => {
      expect(isPdfType('image/jpeg')).toBe(false)
      expect(isPdfType('text/plain')).toBe(false)
    })
  })
})

describe('OCR Service - File Validation', () => {
  describe('validateFileSize', () => {
    it('should return true for files under the limit', () => {
      expect(validateFileSize(1024)).toBe(true) // 1KB
      expect(validateFileSize(1024 * 1024)).toBe(true) // 1MB
      expect(validateFileSize(OCR_CONFIG.maxFileSizeMB * 1024 * 1024)).toBe(true) // Exactly at limit
    })

    it('should return false for files over the limit', () => {
      expect(validateFileSize(OCR_CONFIG.maxFileSizeMB * 1024 * 1024 + 1)).toBe(false)
      expect(validateFileSize(100 * 1024 * 1024)).toBe(false) // 100MB
    })
  })

  describe('getExtensionFromMimeType', () => {
    it('should return correct extension for known types', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg')
      expect(getExtensionFromMimeType('image/png')).toBe('png')
      expect(getExtensionFromMimeType('image/webp')).toBe('webp')
      expect(getExtensionFromMimeType('image/gif')).toBe('gif')
      expect(getExtensionFromMimeType('application/pdf')).toBe('pdf')
    })

    it('should return "bin" for unknown types', () => {
      expect(getExtensionFromMimeType('application/unknown')).toBe('bin')
      expect(getExtensionFromMimeType('video/mp4')).toBe('bin')
    })
  })
})

describe('OCR Service - Configuration', () => {
  it('should have correct configuration values', () => {
    expect(OCR_CONFIG.maxFileSizeMB).toBe(50)
    expect(OCR_CONFIG.maxFiles).toBe(20)
  })
})

// Note: Tests for extractTextFromImage, extractTextFromPDF, extractTextFromFiles
// would require more complex mocking of the Mistral SDK and environment variables.
// These are integration tests that should be run with actual API credentials
// in a test environment.

describe('OCR Service - Constants', () => {
  it('should export supported types', () => {
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg')
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/png')
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/webp')
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/gif')
    expect(SUPPORTED_PDF_TYPE).toBe('application/pdf')
  })
})
