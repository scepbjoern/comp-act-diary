'use client'

/**
 * components/features/journal/UnifiedEntryForm.tsx
 * Unified form component for creating and editing journal entries.
 * Supports templates and basic text input.
 * Media components (audio, OCR) can be added via composition.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconSend, IconX, IconSparkles, IconLoader2 } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import type { EntryWithRelations } from '@/lib/services/journal/types'
import type { TemplateField } from '@/types/journal'
import clsx from 'clsx'

// Dynamic import for RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/features/editor/RichTextEditor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-32 bg-muted animate-pulse rounded" /> }
)

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedEntryFormProps {
  /** TimeBox ID for new entries (day view) */
  timeBoxId?: string
  /** Date string for display (YYYY-MM-DD) */
  date?: string
  /** Entry type ID */
  typeId: string
  /** Template ID (optional) */
  templateId?: string | null
  /** Template fields for structured input */
  templateFields?: TemplateField[]
  /** Existing entry for editing (null for create mode) */
  entry?: EntryWithRelations | null
  /** Callback when form is submitted */
  onSubmit: (data: FormData) => Promise<void>
  /** Callback when form is cancelled */
  onCancel?: () => void
  /** Callback to run AI pipeline after save */
  onRunPipeline?: () => Promise<void>
  /** Is the form currently saving */
  isSaving?: boolean
  /** Show compact layout */
  compact?: boolean
  /** Placeholder text for content */
  placeholder?: string
  /** Auto-focus on mount */
  autoFocus?: boolean
}

export interface FormData {
  content: string
  title?: string | null
  fieldValues?: Record<string, string>
  occurredAt?: Date
  capturedAt?: Date
  isSensitive?: boolean
  audioFileIds?: string[]
  audioTranscripts?: Array<{ assetId: string; transcript: string; transcriptModel?: string | null }>
  ocrAssetIds?: string[]
  photoAssetIds?: string[]
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function UnifiedEntryForm({
  timeBoxId,
  date,
  typeId,
  templateId,
  templateFields,
  entry,
  onSubmit,
  onCancel,
  onRunPipeline,
  isSaving = false,
  compact = false,
  placeholder = 'Schreibe etwas...',
  autoFocus = false,
}: UnifiedEntryFormProps) {
  // Form state
  const [content, setContent] = useState(entry?.content || '')
  const [title, setTitle] = useState(entry?.title || '')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    // Parse existing field values from content if template exists
    if (entry?.content && templateFields && templateFields.length > 0) {
      return parseFieldValuesFromContent(entry.content, templateFields)
    }
    return {}
  })
  const [isSensitive, setIsSensitive] = useState(entry?.isSensitive || false)
  
  // Media state
  const [audioFileIds, setAudioFileIds] = useState<string[]>([])
  const [audioTranscripts, setAudioTranscripts] = useState<Map<string, { transcript: string; model: string | null }>>(new Map())
  const [ocrAssetIds, setOcrAssetIds] = useState<string[]>([])
  
  // UI state
  const [editorKey, setEditorKey] = useState(0)
  const [isRunningPipeline, setIsRunningPipeline] = useState(false)

  // Is this edit mode?
  const isEditMode = !!entry

  // Has template with fields?
  const hasTemplateFields = templateFields && templateFields.length > 0

  // Build final content from field values if template exists
  const effectiveContent = useMemo(() => {
    if (hasTemplateFields && Object.keys(fieldValues).length > 0) {
      return buildContentFromFieldValues(templateFields!, fieldValues)
    }
    return content
  }, [hasTemplateFields, templateFields, fieldValues, content])

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setContent(entry.content || '')
      setTitle(entry.title || '')
      setIsSensitive(entry.isSensitive || false)
      if (templateFields) {
        setFieldValues(parseFieldValuesFromContent(entry.content, templateFields))
      }
    }
  }, [entry, templateFields])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (isSaving) return

    const formData: FormData = {
      content: effectiveContent,
      title: title || null,
      fieldValues: hasTemplateFields ? fieldValues : undefined,
      isSensitive,
      audioFileIds: audioFileIds.length > 0 ? audioFileIds : undefined,
      audioTranscripts: audioFileIds.length > 0 
        ? audioFileIds.map((id) => ({
            assetId: id,
            transcript: audioTranscripts.get(id)?.transcript || '',
            transcriptModel: audioTranscripts.get(id)?.model || null,
          }))
        : undefined,
      ocrAssetIds: ocrAssetIds.length > 0 ? ocrAssetIds : undefined,
    }

    await onSubmit(formData)

    // Reset form after successful create (not edit)
    if (!isEditMode) {
      setContent('')
      setTitle('')
      setFieldValues({})
      setAudioFileIds([])
      setAudioTranscripts(new Map())
      setOcrAssetIds([])
      setEditorKey((k) => k + 1)
    }
  }, [
    isSaving,
    effectiveContent,
    title,
    hasTemplateFields,
    fieldValues,
    isSensitive,
    audioFileIds,
    audioTranscripts,
    ocrAssetIds,
    onSubmit,
    isEditMode,
  ])

  const handleRunPipeline = useCallback(async () => {
    if (!onRunPipeline || isRunningPipeline) return
    setIsRunningPipeline(true)
    try {
      await onRunPipeline()
    } finally {
      setIsRunningPipeline(false)
    }
  }, [onRunPipeline, isRunningPipeline])

  const handleAudioFileAdded = useCallback((assetId: string) => {
    setAudioFileIds((prev) => [...prev, assetId])
  }, [])

  const handleAudioTranscript = useCallback((assetId: string, transcript: string, model: string | null) => {
    setAudioTranscripts((prev) => {
      const next = new Map(prev)
      next.set(assetId, { transcript, model })
      return next
    })
    // Append transcript to content
    setContent((prev) => {
      if (prev) return prev + '\n\n' + transcript
      return transcript
    })
  }, [])

  const handleOcrResult = useCallback((assetIds: string[], text: string) => {
    setOcrAssetIds((prev) => [...prev, ...assetIds])
    // Append OCR text to content
    setContent((prev) => {
      if (prev) return prev + '\n\n' + text
      return text
    })
  }, [])

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleClear = useCallback(() => {
    setContent('')
    setTitle('')
    setFieldValues({})
    setAudioFileIds([])
    setAudioTranscripts(new Map())
    setOcrAssetIds([])
    setEditorKey((k) => k + 1)
    onCancel?.()
  }, [onCancel])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const canSubmit = effectiveContent.trim().length > 0 && !isSaving

  return (
    <div className={clsx('space-y-3', compact && 'space-y-2')}>
      {/* Title input (optional, shown in edit mode or non-compact) */}
      {(!compact || isEditMode) && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel (optional)"
          className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}

      {/* Template fields or free-form content */}
      {hasTemplateFields ? (
        <div className="space-y-3">
          {templateFields!.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.label}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.label}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <RichTextEditor
          key={editorKey}
          markdown={content}
          onChange={setContent}
          placeholder={placeholder}
        />
      )}

      {/* Sensitivity toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
            className="rounded"
          />
          Sensibel
        </label>
      </div>

      {/* Audio files indicator */}
      {audioFileIds.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {audioFileIds.length} Audio-Datei(en) angehängt
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              <IconX className="h-4 w-4 inline mr-1" />
              Abbrechen
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRunPipeline && isEditMode && (
            <button
              type="button"
              onClick={handleRunPipeline}
              disabled={isRunningPipeline}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              title="KI-Analyse starten"
            >
              {isRunningPipeline ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconSparkles className="h-4 w-4" />
              )}
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-lg transition-colors',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <IconSend className="h-4 w-4 inline mr-1" />
                {isEditMode ? 'Speichern' : 'Eintrag erstellen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds content string from template field values.
 */
function buildContentFromFieldValues(fields: TemplateField[], values: Record<string, string>): string {
  return fields
    .filter((f) => values[f.id]?.trim())
    .map((f) => `**${f.label}:**\n${values[f.id]}`)
    .join('\n\n')
}

/**
 * Parses field values from content string (reverse of buildContentFromFieldValues).
 */
function parseFieldValuesFromContent(content: string, fields: TemplateField[]): Record<string, string> {
  const values: Record<string, string> = {}
  
  for (const field of fields) {
    const regex = new RegExp(`\\*\\*${escapeRegex(field.label || '')}:\\*\\*\\n([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`, 'i')
    const match = content.match(regex)
    if (match) {
      values[field.id] = match[1].trim()
    }
  }
  
  return values
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
