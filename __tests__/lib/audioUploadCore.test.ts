/**
 * __tests__/lib/audioUploadCore.test.ts
 * Unit tests for audio upload core utilities (pure functions).
 */

import { describe, it, expect } from 'vitest'
import {
  validateAudioFile,
  formatElapsedTime,
  extensionFromMime,
  estimateStage,
  STAGE_MESSAGES,
} from '@/lib/audio/audioUploadCore'

// Helper to create a mock File
function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

// =============================================================================
// validateAudioFile
// =============================================================================

describe('validateAudioFile', () => {
  it('should accept a valid .mp3 file', () => {
    const file = createMockFile('recording.mp3', 1024 * 1024, 'audio/mpeg')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should accept a valid .m4a file', () => {
    const file = createMockFile('voice.m4a', 1024 * 1024, 'audio/mp4')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should accept audio/x-m4a MIME type', () => {
    const file = createMockFile('voice.m4a', 1024 * 1024, 'audio/x-m4a')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should accept audio/mp3 MIME type', () => {
    const file = createMockFile('voice.mp3', 1024 * 1024, 'audio/mp3')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should accept .mp3 by extension even with unknown MIME type', () => {
    const file = createMockFile('recording.mp3', 1024 * 1024, 'application/octet-stream')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should accept .m4a by extension even with unknown MIME type', () => {
    const file = createMockFile('recording.m4a', 1024 * 1024, 'application/octet-stream')
    expect(validateAudioFile(file)).toBeNull()
  })

  it('should reject .wav files', () => {
    const file = createMockFile('recording.wav', 1024 * 1024, 'audio/wav')
    expect(validateAudioFile(file)).toBe('Bitte nur .mp3 oder .m4a Dateien hochladen')
  })

  it('should reject .ogg files', () => {
    const file = createMockFile('recording.ogg', 1024 * 1024, 'audio/ogg')
    expect(validateAudioFile(file)).toBe('Bitte nur .mp3 oder .m4a Dateien hochladen')
  })

  it('should reject non-audio files', () => {
    const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf')
    expect(validateAudioFile(file)).toBe('Bitte nur .mp3 oder .m4a Dateien hochladen')
  })

  it('should reject files exceeding max size', () => {
    // 51 MB exceeds the default 50 MB limit
    const file = createMockFile('big.mp3', 51 * 1024 * 1024, 'audio/mpeg')
    const result = validateAudioFile(file)
    expect(result).toContain('Datei zu gross')
    expect(result).toContain('50')
  })

  it('should accept files at exactly max size', () => {
    const file = createMockFile('exact.mp3', 50 * 1024 * 1024, 'audio/mpeg')
    expect(validateAudioFile(file)).toBeNull()
  })
})

// =============================================================================
// formatElapsedTime
// =============================================================================

describe('formatElapsedTime', () => {
  it('should format seconds-only', () => {
    expect(formatElapsedTime(0)).toBe('0s')
    expect(formatElapsedTime(5)).toBe('5s')
    expect(formatElapsedTime(59)).toBe('59s')
  })

  it('should format minutes and seconds', () => {
    expect(formatElapsedTime(60)).toBe('1m 0s')
    expect(formatElapsedTime(90)).toBe('1m 30s')
    expect(formatElapsedTime(125)).toBe('2m 5s')
  })

  it('should format large values', () => {
    expect(formatElapsedTime(3600)).toBe('60m 0s')
  })
})

// =============================================================================
// extensionFromMime
// =============================================================================

describe('extensionFromMime', () => {
  it('should return ogg for ogg types', () => {
    expect(extensionFromMime('audio/ogg')).toBe('ogg')
    expect(extensionFromMime('audio/ogg; codecs=opus')).toBe('ogg')
  })

  it('should return mp4 for mp4 types', () => {
    expect(extensionFromMime('audio/mp4')).toBe('mp4')
    expect(extensionFromMime('audio/x-m4a')).toBe('webm') // Does not contain 'mp4'
  })

  it('should return mp3 for mpeg types', () => {
    expect(extensionFromMime('audio/mpeg')).toBe('mp3')
  })

  it('should default to webm', () => {
    expect(extensionFromMime('audio/webm')).toBe('webm')
    expect(extensionFromMime('audio/wav')).toBe('webm')
    expect(extensionFromMime('')).toBe('webm')
  })
})

// =============================================================================
// estimateStage
// =============================================================================

describe('estimateStage', () => {
  it('should return uploading at the start', () => {
    expect(estimateStage(0, 5)).toBe('uploading')
    expect(estimateStage(1, 5)).toBe('uploading')
  })

  it('should return analyzing after upload phase', () => {
    // For 5MB: uploadTime = max(3, 5*2) = 10s, analysisTime = 5s
    expect(estimateStage(10, 5)).toBe('analyzing')
    expect(estimateStage(14, 5)).toBe('analyzing')
  })

  it('should return transcribing after analysis phase', () => {
    // For 5MB: uploadTime=10s, analysisTime=5s → transcribing at 15s+
    expect(estimateStage(15, 5)).toBe('transcribing')
    expect(estimateStage(120, 5)).toBe('transcribing')
  })

  it('should use minimum upload time for small files', () => {
    // For 0.5MB: uploadTime = max(3, 0.5*2) = 3s
    expect(estimateStage(2, 0.5)).toBe('uploading')
    expect(estimateStage(3, 0.5)).toBe('analyzing')
    expect(estimateStage(8, 0.5)).toBe('transcribing')
  })
})

// =============================================================================
// STAGE_MESSAGES
// =============================================================================

describe('STAGE_MESSAGES', () => {
  it('should have all expected stages', () => {
    expect(STAGE_MESSAGES).toHaveProperty('idle')
    expect(STAGE_MESSAGES).toHaveProperty('uploading')
    expect(STAGE_MESSAGES).toHaveProperty('analyzing')
    expect(STAGE_MESSAGES).toHaveProperty('transcribing')
    expect(STAGE_MESSAGES).toHaveProperty('complete')
  })

  it('should have non-empty messages for active stages', () => {
    expect(STAGE_MESSAGES.uploading).toBeTruthy()
    expect(STAGE_MESSAGES.analyzing).toBeTruthy()
    expect(STAGE_MESSAGES.transcribing).toBeTruthy()
    expect(STAGE_MESSAGES.complete).toBeTruthy()
  })

  it('should have empty idle message', () => {
    expect(STAGE_MESSAGES.idle).toBe('')
  })
})
