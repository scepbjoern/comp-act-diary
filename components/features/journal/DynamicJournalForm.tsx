/**
 * components/features/journal/DynamicJournalForm.tsx
 * Generic form component that renders fields dynamically based on template definition.
 * Supports type/template selection, field rendering, content aggregation,
 * inline edit mode, OCR upload, photo upload, and camera capture.
 */

'use client'

import { useState, useCallback, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { IconAlertTriangle, IconLoader2, IconSparkles, IconX, IconDeviceFloppy } from '@tabler/icons-react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { FieldRenderer } from './FieldRenderer'
import { RichTextEditor } from '@/components/features/editor/RichTextEditor'
import { MicrophoneButton } from '@/components/features/transcription/MicrophoneButton'
import AudioUploadButton from '@/components/features/media/AudioUploadButton'
import OCRUploadButton from '@/components/features/ocr/OCRUploadButton'
import { CameraPicker } from '@/components/features/media/CameraPicker'
import { TemplateField, TemplateAIConfig } from '@/types/journal'
import type { EntryWithRelations } from '@/lib/services/journal/types'
import type { AudioUploadResult } from '@/lib/audio/audioUploadCore'
import {
  buildContentFromFields,
  parseContentToFields,
  extractFieldValues,
} from '@/lib/services/journal/contentService'

// Types for journal entry types and templates
export interface JournalEntryTypeOption {
  id: string
  code: string
  name: string
  icon: string | null
  defaultTemplateId?: string | null
}

export interface JournalTemplateOption {
  id: string
  name: string
  fields: TemplateField[] | null
  aiConfig: TemplateAIConfig | null
  typeId: string | null
}

interface DynamicJournalFormProps {
  /** Available entry types */
  types: JournalEntryTypeOption[]
  /** Available templates */
  templates: JournalTemplateOption[]
  /** Initial type ID */
  initialTypeId?: string
  /** Initial template ID */
  initialTemplateId?: string
  /** Initial content */
  initialContent?: string
  /** Existing entry for edit mode (prefills all fields, locks type/template) */
  existingEntry?: EntryWithRelations
  /** Entry ID for media uploads to existing entries */
  existingEntryId?: string
  /** Callback when form is submitted */
  onSubmit: (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    occurredAt?: string
    capturedAt?: string | null
    audioFileIds?: string[]
    audioTranscripts?: Record<string, string>
    ocrAssetIds?: string[]
    photoAssetIds?: string[]
  }) => void
  /** Callback to cancel edit mode */
  onCancel?: () => void
  /** Callback to save and then run AI pipeline (W3/W5) */
  onSaveAndRunPipeline?: (data: Parameters<DynamicJournalFormProps['onSubmit']>[0]) => void
  /** Whether form is submitting */
  isSubmitting?: boolean
  /** Callback for audio upload */
  onAudioUpload?: (file: File) => void
  /** Callback for image upload */
  onImageUpload?: (file: File) => void
  /** Show audio/image upload buttons */
  showMediaButtons?: boolean
  /** Additional CSS classes */
  className?: string
  /** Date for new entries (ISO format YYYY-MM-DD) - enables audio persistence */
  date?: string
}

/** Handle exposed to parent via ref for external content manipulation */
export interface DynamicJournalFormHandle {
  appendToContent: (text: string) => void
}

/**
 * Dynamic form that renders fields based on selected template.
 * Handles type selection, template selection, field rendering, and content building.
 * Supports both create and edit mode via existingEntry prop.
 */
export const DynamicJournalForm = forwardRef<DynamicJournalFormHandle, DynamicJournalFormProps>(function DynamicJournalForm({
  types,
  templates,
  initialTypeId,
  initialTemplateId,
  initialContent = '',
  existingEntry,
  existingEntryId,
  onSubmit,
  onCancel,
  onSaveAndRunPipeline,
  isSubmitting = false,
  onAudioUpload: _onAudioUpload,
  onImageUpload,
  showMediaButtons = true,
  className = '',
  date,
}: DynamicJournalFormProps, ref) {
  // Derive edit mode from existingEntry
  const isEditMode = Boolean(existingEntry)
  const effectiveEntryId = existingEntryId || existingEntry?.id

  // Derive initial values from existingEntry when in edit mode
  const effectiveInitialContent = existingEntry?.content || initialContent
  // Default to 'diary' (Allgemein) type for new entries
  const defaultType = types.find((t) => t.code === 'diary') || types[0]
  const defaultTypeId = initialTypeId || defaultType?.id || ''
  const effectiveInitialTypeId = existingEntry?.type?.id || defaultTypeId
  // Use type's defaultTemplateId, then fall back to first template of the type
  const typeDefaultTemplateId = defaultType?.defaultTemplateId
  const defaultTemplateId = initialTemplateId
    || typeDefaultTemplateId
    || templates.find((t) => t.typeId === defaultTypeId)?.id
    || null
  const effectiveInitialTemplateId = existingEntry?.template?.id || defaultTemplateId

  // State for selections
  const [selectedTypeId, setSelectedTypeId] = useState<string>(effectiveInitialTypeId)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    effectiveInitialTemplateId
  )

  // Title and sensitivity state
  const [title, setTitle] = useState<string>(existingEntry?.title || '')
  const [isSensitive, setIsSensitive] = useState<boolean>(existingEntry?.isSensitive || false)

  // W2: Timestamp state – datetime-local format (YYYY-MM-DDTHH:MM)
  const [occurredAt, setOccurredAt] = useState<string>(() => {
    const src = existingEntry?.occurredAt ? new Date(existingEntry.occurredAt) : (isEditMode ? null : new Date())
    if (!src) return ''
    return `${src.getFullYear()}-${String(src.getMonth()+1).padStart(2,'0')}-${String(src.getDate()).padStart(2,'0')}T${String(src.getHours()).padStart(2,'0')}:${String(src.getMinutes()).padStart(2,'0')}`
  })
  const [capturedAt, setCapturedAt] = useState<string>(() => {
    const src = existingEntry?.capturedAt ? new Date(existingEntry.capturedAt) : (isEditMode ? null : new Date())
    if (!src) return ''
    return `${src.getFullYear()}-${String(src.getMonth()+1).padStart(2,'0')}-${String(src.getDate()).padStart(2,'0')}T${String(src.getHours()).padStart(2,'0')}:${String(src.getMinutes()).padStart(2,'0')}`
  })

  // W4: keepAudio per field (key = field ID or 'content')
  const [keepAudioMap, setKeepAudioMap] = useState<Record<string, boolean>>({})
  const getKeepAudio = (fieldId: string) => keepAudioMap[fieldId] ?? true
  const toggleKeepAudio = (fieldId: string) =>
    setKeepAudioMap((prev) => ({ ...prev, [fieldId]: !(prev[fieldId] ?? true) }))

  // Field values state
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Warning for template mismatch
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null)

  // Fallback content for mismatch mode
  const [fallbackContent, setFallbackContent] = useState<string>('')

  // OCR and photo asset IDs collected during form interaction
  const [ocrAssetIds, setOcrAssetIds] = useState<string[]>([])
  const [photoAssets, setPhotoAssets] = useState<Array<{ assetId: string; url: string }>>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Progress states
  const [isSegmenting, setIsSegmenting] = useState(false)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)

  // Get templates for selected type
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => t.typeId === selectedTypeId || t.typeId === null)
  }, [templates, selectedTypeId])

  // Get selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null
    return templates.find((t) => t.id === selectedTemplateId) || null
  }, [templates, selectedTemplateId])

  // Get fields from selected template
  const fields = useMemo(() => {
    if (!selectedTemplate?.fields) return []
    return [...selectedTemplate.fields].sort((a, b) => a.order - b.order)
  }, [selectedTemplate])

  // Initialize field values when template changes or initial content is provided
  useEffect(() => {
    const content = effectiveInitialContent

    if (!selectedTemplate) {
      // No template - use plain content
      setFieldValues({ content })
      setMismatchWarning(null)
      setFallbackContent('')
      return
    }

    if (!selectedTemplate.fields || selectedTemplate.fields.length === 0) {
      // Template without fields - use plain content
      setFieldValues({ content })
      setMismatchWarning(null)
      setFallbackContent('')
      return
    }

    if (content) {
      // Try to parse initial content into fields
      const parseResult = parseContentToFields(content, selectedTemplate.fields)

      if (parseResult.matched) {
        setFieldValues(extractFieldValues(parseResult.fields))
        setMismatchWarning(null)
        setFallbackContent('')
      } else {
        // Mismatch - show warning and both views
        setFieldValues(extractFieldValues(parseResult.fields))
        setMismatchWarning(parseResult.warning || 'Felder passen nicht zum Template')
        setFallbackContent(content)
      }
    } else {
      // New entry - initialize empty fields
      const emptyValues: Record<string, string> = {}
      for (const field of selectedTemplate.fields) {
        emptyValues[field.id] = ''
      }
      setFieldValues(emptyValues)
      setMismatchWarning(null)
      setFallbackContent('')
    }
  }, [selectedTemplate, effectiveInitialContent])

  // Auto-select first template when type changes (only in create mode)
  useEffect(() => {
    if (!isEditMode && filteredTemplates.length > 0 && !effectiveInitialTemplateId) {
      const defaultTemplate = filteredTemplates[0]
      setSelectedTemplateId(defaultTemplate?.id || null)
    }
  }, [selectedTypeId, filteredTemplates, effectiveInitialTemplateId, isEditMode])

  // Handle field value change
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  // Handle type change
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTypeId = e.target.value
      setSelectedTypeId(newTypeId)

      // Reset template selection
      const newTemplates = templates.filter((t) => t.typeId === newTypeId || t.typeId === null)
      setSelectedTemplateId(newTemplates[0]?.id || null)
    },
    [templates]
  )

  // Handle template change
  const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplateId = e.target.value || null
    setSelectedTemplateId(newTemplateId)
  }, [])

  // Track audio files for new entries (will be attached on save)
  const [audioFileIds, setAudioFileIds] = useState<string[]>([])
  const [audioTranscripts, setAudioTranscripts] = useState<Record<string, string>>({})

  // Build submit data (shared by save and save+pipeline)
  const buildSubmitData = useCallback(() => {
    let content: string
    if (selectedTemplate?.fields && selectedTemplate.fields.length > 0) {
      content = buildContentFromFields(selectedTemplate.fields, fieldValues)
    } else {
      content = fieldValues.content || ''
    }

    return {
      typeId: selectedTypeId,
      templateId: selectedTemplateId,
      content,
      fieldValues,
      title: title || undefined,
      isSensitive,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      capturedAt: capturedAt ? new Date(capturedAt).toISOString() : undefined,
      audioFileIds: audioFileIds.length > 0 ? audioFileIds : undefined,
      audioTranscripts: Object.keys(audioTranscripts).length > 0 ? audioTranscripts : undefined,
      ocrAssetIds: ocrAssetIds.length > 0 ? ocrAssetIds : undefined,
      photoAssetIds: photoAssets.length > 0 ? photoAssets.map((p) => p.assetId) : undefined,
    }
  }, [selectedTypeId, selectedTemplateId, selectedTemplate, fieldValues, audioFileIds, audioTranscripts, title, isSensitive, ocrAssetIds, photoAssets, occurredAt, capturedAt])

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(buildSubmitData())
    },
    [onSubmit, buildSubmitData]
  )

  // W3/W5: Handle save + AI pipeline
  const handleSaveAndRunPipeline = useCallback(() => {
    onSaveAndRunPipeline?.(buildSubmitData())
  }, [onSaveAndRunPipeline, buildSubmitData])

  // State for media uploads
  const [transcribeError, setTranscribeError] = useState<string | null>(null)

  // Helper: append text to the first available textarea field or content
  const appendTranscriptToField = useCallback(
    (transcript: string) => {
      if (fields.length > 0) {
        const textareaField = fields.find((f) => f.type === 'textarea')
        if (textareaField) {
          setFieldValues((prev) => ({
            ...prev,
            [textareaField.id]: prev[textareaField.id]
              ? `${prev[textareaField.id]}\n\n${transcript}`
              : transcript,
          }))
        }
      } else {
        setFieldValues((prev) => ({
          ...prev,
          content: prev.content ? `${prev.content}\n\n${transcript}` : transcript,
        }))
      }
    },
    [fields]
  )

  // Handle AudioUploadButton result (file upload with segmentation support)
  const handleAudioUploadResult = useCallback(
    async (result: AudioUploadResult) => {
      const transcript = result.text
      if (!transcript) return

      // Track audio file ID
      if (result.audioFileId) {
        setAudioFileIds((prev) => [...prev, result.audioFileId!])
        setAudioTranscripts((prev) => ({ ...prev, [result.audioFileId!]: transcript }))
      }

      // Always set transcript immediately so content is never empty
      appendTranscriptToField(transcript)

      // If template has multiple textarea fields, refine via AI segmentation
      const textareaFields = fields.filter((f) => f.type === 'textarea')

      if (textareaFields.length > 1 && selectedTemplateId) {
        setIsSegmenting(true)
        try {
          const segmentResponse = await fetch('/api/journal-ai/segment-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, templateId: selectedTemplateId }),
          })

          if (segmentResponse.ok) {
            const segmentData = await segmentResponse.json()
            if (segmentData.segments) {
              // Replace the fallback with properly segmented content
              setFieldValues((prev) => {
                const newValues = { ...prev }
                for (const [fieldId, content] of Object.entries(segmentData.segments)) {
                  if (content && typeof content === 'string') {
                    newValues[fieldId] = content
                  }
                }
                return newValues
              })
            }
          }
        } catch {
          console.warn('Audio segmentation failed, keeping fallback')
        } finally {
          setIsSegmenting(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, selectedTemplateId, appendTranscriptToField]
  )

  // Handle OCR completion
  const handleOcrComplete = useCallback(
    (result: { text: string; mediaAssetIds: string[] }) => {
      // Track OCR asset IDs
      if (result.mediaAssetIds.length > 0) {
        setOcrAssetIds((prev) => [...prev, ...result.mediaAssetIds])
      }

      // Insert OCR text into content
      if (result.text) {
        appendTranscriptToField(result.text)
      }
    },
    [appendTranscriptToField]
  )

  // Handle photo upload (file or camera capture)
  const handlePhotoFiles = useCallback(
    async (files: File[]) => {
      if (onImageUpload && files[0]) {
        onImageUpload(files[0])
        return
      }

      setPhotoUploading(true)
      try {
        for (const file of files) {
          // Upload image – also creates a MediaAsset and returns assetId
          const fd = new FormData()
          fd.append('file', file)
          const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: fd })
          if (!uploadRes.ok) throw new Error('Bild-Upload fehlgeschlagen')
          const uploadData = await uploadRes.json()

          const assetId = uploadData.assetId as string | null
          if (!assetId) {
            console.warn('Upload succeeded but no MediaAsset created')
            continue
          }

          const uploadUrl = uploadData.url as string

          if (effectiveEntryId) {
            // For existing entries: create MediaAttachment linking asset to entry
            const assetRes = await fetch(`/api/journal-entries/${effectiveEntryId}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assetId,
                role: 'GALLERY',
              }),
            })
            if (!assetRes.ok) {
              console.warn('Could not attach photo to entry')
            }
          } else {
            // For new entries: collect asset IDs for later attachment on save
            setPhotoAssets((prev) => [...prev, { assetId, url: uploadUrl }])
          }

          // Always show preview thumbnail (both new and edit mode)
          if (effectiveEntryId) {
            setPhotoAssets((prev) => [...prev, { assetId, url: uploadUrl }])
          }
        }
      } catch (err) {
        console.error('Photo upload error:', err)
        setTranscribeError(err instanceof Error ? err.message : 'Foto-Upload fehlgeschlagen')
      } finally {
        setPhotoUploading(false)
      }
    },
    [onImageUpload, effectiveEntryId]
  )

  // Handle photo file input change
  const handlePhotoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      if (photoInputRef.current) photoInputRef.current.value = ''
      void handlePhotoFiles(files)
    },
    [handlePhotoFiles]
  )

  // Track which field is being recorded
  const [recordingFieldId, setRecordingFieldId] = useState<string | null>(null)
  const [improvingFieldId, setImprovingFieldId] = useState<string | null>(null)

  // Handle microphone transcription for a field
  const handleMicrophoneResult = useCallback(
    (fieldId: string, result: { text: string; audioFileId?: string | null }) => {
      const { text: transcript, audioFileId } = result

      // Update field value with transcript
      setFieldValues((prev) => ({
        ...prev,
        [fieldId]: prev[fieldId] ? `${prev[fieldId]}\n\n${transcript}` : transcript,
      }))

      // Track audio file ID for later attachment
      if (audioFileId) {
        setAudioFileIds((prev) => [...prev, audioFileId])
        setAudioTranscripts((prev) => ({ ...prev, [audioFileId]: transcript }))
      }

      setRecordingFieldId(null)
    },
    []
  )

  // Handle AI text improvement for a field
  const handleImproveText = useCallback(
    async (fieldId: string) => {
      const currentValue = fieldValues[fieldId]
      if (!currentValue?.trim()) return

      setImprovingFieldId(fieldId)
      try {
        const response = await fetch('/api/journal-ai/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentValue, typeCode: 'diary' }),
        })
        const data = await response.json()
        if (response.ok && data.content) {
          setFieldValues((prev) => ({ ...prev, [fieldId]: data.content }))
        }
      } catch (err) {
        console.error('Text improvement failed:', err)
      } finally {
        setImprovingFieldId(null)
      }
    },
    [fieldValues]
  )

  // Derive the current time for OCR/Audio date context
  const currentTime = useMemo(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [])

  // Effective date for media components
  const effectiveDate = date || new Date().toISOString().slice(0, 10)

  // Handle title generation via AI
  const handleGenerateTitle = useCallback(async () => {
    // Collect current content from fields
    let content = ''
    if (selectedTemplate?.fields && selectedTemplate.fields.length > 0) {
      content = buildContentFromFields(selectedTemplate.fields, fieldValues)
    } else {
      content = fieldValues.content || ''
    }
    if (!content.trim()) {
      setTranscribeError('Kein Inhalt vorhanden für Titel-Generierung')
      return
    }
    setIsGeneratingTitle(true)
    try {
      const res = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      if (!res.ok) throw new Error('Titel-Generierung fehlgeschlagen')
      const data = await res.json()
      if (data.title) {
        setTitle(data.title)
      }
    } catch (err) {
      console.error('Title generation error:', err)
      setTranscribeError(err instanceof Error ? err.message : 'Titel-Generierung fehlgeschlagen')
    } finally {
      setIsGeneratingTitle(false)
    }
  }, [selectedTemplate, fieldValues])

  // Expose appendToContent to parent via ref (for OCR restore, etc.)
  useImperativeHandle(ref, () => ({
    appendToContent: (text: string) => {
      appendTranscriptToField(text)
    },
  }), [appendTranscriptToField])

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Title Field with AI generate button */}
      <div className="form-control">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optional)"
            disabled={isSubmitting}
            className="input input-bordered w-full"
          />
          <button
            type="button"
            onClick={handleGenerateTitle}
            disabled={isSubmitting || isGeneratingTitle}
            className="btn btn-ghost btn-sm btn-square"
            title="Titel mit KI generieren"
          >
            {isGeneratingTitle ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <IconSparkles className="h-4 w-4 text-violet-500" />
            )}
          </button>
        </div>
      </div>

      {/* Type and Template Selection */}
      <div className="flex flex-wrap gap-4">
        {/* Type Dropdown */}
        <div className="form-control min-w-48 flex-1">
          <label className="label">
            <span className="label-text">Typ</span>
          </label>
          <select
            value={selectedTypeId}
            onChange={handleTypeChange}
            className="select select-bordered w-full"
            disabled={isSubmitting || isEditMode}
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon && `${type.icon} `}
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template Dropdown */}
        <div className="form-control min-w-48 flex-1">
          <label className="label">
            <span className="label-text">Template</span>
          </label>
          <select
            value={selectedTemplateId || ''}
            onChange={handleTemplateChange}
            className="select select-bordered w-full"
            disabled={isSubmitting || isEditMode}
          >
            <option value="">Kein Template</option>
            {filteredTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mismatch Warning */}
      {mismatchWarning && (
        <div className="alert alert-warning">
          <IconAlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Template-Konflikt</p>
            <p className="text-sm">{mismatchWarning}</p>
            <p className="text-sm">
              Bitte ordne den Text manuell den Feldern zu oder bearbeite den Inhalt direkt.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Fields */}
      {fields.length > 0 ? (
        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              <FieldRenderer
                field={field}
                value={fieldValues[field.id] || ''}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={isSubmitting}
              />
              {/* Inline toolbar below each textarea field: mic + audio-upload + keepAudio toggle + improve */}
              {field.type === 'textarea' && (
                <div className="mt-1 flex items-center gap-1">
                  <MicrophoneButton
                    onAudioData={(result) => handleMicrophoneResult(field.id, result)}
                    keepAudio={getKeepAudio(field.id)}
                    date={date}
                    existingEntryId={effectiveEntryId}
                    compact
                  />
                  <AudioUploadButton
                    date={effectiveDate}
                    time={currentTime}
                    keepAudio={getKeepAudio(field.id)}
                    existingEntryId={effectiveEntryId}
                    onResult={(result) => handleMicrophoneResult(field.id, { text: result.text, audioFileId: result.audioFileId })}
                    compact
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeepAudio(field.id)}
                    title={getKeepAudio(field.id) ? 'Audio wird gespeichert' : 'Audio wird nicht gespeichert'}
                    className="p-1.5 rounded hover:bg-base-200"
                  >
                    <TablerIcon name={getKeepAudio(field.id) ? 'database' : 'database-off'} className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImproveText(field.id)}
                    disabled={isSubmitting || improvingFieldId === field.id}
                    className="p-1.5 rounded hover:bg-base-200 text-violet-500 disabled:opacity-50"
                    title="Text verbessern"
                  >
                    {improvingFieldId === field.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <IconSparkles className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // No template or no fields - show RichTextEditor with toolbar below
        <div className="form-control">
          <RichTextEditor
            markdown={fieldValues.content || ''}
            onChange={(md) => handleFieldChange('content', md)}
            placeholder="Schreibe hier..."
            readOnly={isSubmitting}
          />
          {/* Inline toolbar: mic + audio-upload + keepAudio toggle + improve */}
          <div className="mt-1 flex items-center gap-1">
            <MicrophoneButton
              onAudioData={(result) => handleMicrophoneResult('content', result)}
              keepAudio={getKeepAudio('content')}
              date={date}
              existingEntryId={effectiveEntryId}
              compact
            />
            <AudioUploadButton
              date={effectiveDate}
              time={currentTime}
              keepAudio={getKeepAudio('content')}
              existingEntryId={effectiveEntryId}
              onResult={(result) => handleMicrophoneResult('content', { text: result.text, audioFileId: result.audioFileId })}
              compact
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => toggleKeepAudio('content')}
              title={getKeepAudio('content') ? 'Audio wird gespeichert' : 'Audio wird nicht gespeichert'}
              className="p-1.5 rounded hover:bg-base-200"
            >
              <TablerIcon name={getKeepAudio('content') ? 'database' : 'database-off'} className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleImproveText('content')}
              disabled={isSubmitting || improvingFieldId === 'content'}
              className="p-1.5 rounded hover:bg-base-200 text-violet-500 disabled:opacity-50"
              title="Text verbessern"
            >
              {improvingFieldId === 'content' ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <IconSparkles className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Fallback Content Editor (for mismatch mode) */}
      {mismatchWarning && fallbackContent && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Ursprünglicher Inhalt (Markdown)</span>
          </label>
          <textarea
            value={fallbackContent}
            onChange={(e) => setFallbackContent(e.target.value)}
            disabled={isSubmitting}
            className="textarea textarea-bordered min-h-32 w-full resize-y font-mono text-sm"
          />
        </div>
      )}

      {/* W2: Timestamps (like TimestampModal) + Sensitivity */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-4">
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label py-0">
              <span className="label-text text-xs font-medium">Bezugzeit</span>
              <span className="label-text-alt text-xs text-base-content/50">Sortierung</span>
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="input input-bordered input-sm w-full"
              disabled={isSubmitting}
            />
          </div>
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label py-0">
              <span className="label-text text-xs font-medium">Erfassungszeit</span>
              <span className="label-text-alt text-xs text-base-content/50">Erstellung</span>
            </label>
            <input
              type="datetime-local"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
              className="input input-bordered input-sm w-full"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
            className="h-4 w-4 rounded border-base-300"
            disabled={isSubmitting}
          />
          <span className="label-text text-sm">Sensibel</span>
        </label>
      </div>

      {/* Media Upload Buttons (photo, camera, OCR – audio is in the field toolbar) */}
      {showMediaButtons && (
        <div className="space-y-2 border-t border-base-300 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Photo Upload (file) – W8: icon-only */}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              title="Foto hochladen"
              onClick={() => photoInputRef.current?.click()}
              disabled={isSubmitting || photoUploading}
            >
              <TablerIcon name="photo" className="w-5 h-5" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoFileChange}
              className="hidden"
              disabled={isSubmitting || photoUploading}
            />

            {/* Camera Capture – W8: icon-only */}
            <CameraPicker
              label=""
              buttonClassName="btn btn-ghost btn-sm btn-square"
              onCapture={handlePhotoFiles}
              icon={<TablerIcon name="camera" className="w-5 h-5" />}
            />

            {/* OCR Upload */}
            <OCRUploadButton
              onOcrComplete={handleOcrComplete}
              date={effectiveDate}
              time={currentTime}
              compact
              disabled={isSubmitting}
            />

            {/* Photo upload indicator */}
            {photoUploading && (
              <span className="text-sm text-base-content/70 flex items-center gap-1">
                <IconLoader2 className="h-4 w-4 animate-spin" />
                Foto wird hochgeladen...
              </span>
            )}
          </div>

          {/* Photo preview thumbnails (before save) */}
          {photoAssets.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {photoAssets.map((photo) => (
                <div key={photo.assetId} className="relative w-16 h-16 rounded overflow-hidden border border-base-300">
                  <img
                    src={photo.url}
                    alt="Vorschau"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <span className="text-xs text-base-content/50 self-center">
                {photoAssets.length} Foto(s) bereit
              </span>
            </div>
          )}

          {/* Bottom AudioUploadButton for segmentation (only when >1 textarea fields) */}
          {fields.filter((f) => f.type === 'textarea').length > 1 && (
            <div className="flex items-center gap-2 pt-1 border-t border-base-200">
              <AudioUploadButton
                date={effectiveDate}
                time={currentTime}
                keepAudio={getKeepAudio('_segment')}
                existingEntryId={effectiveEntryId}
                onResult={handleAudioUploadResult}
                compact
                disabled={isSubmitting}
                className="text-info"
              />
              <button
                type="button"
                onClick={() => toggleKeepAudio('_segment')}
                title={getKeepAudio('_segment') ? 'Audio wird gespeichert' : 'Audio wird nicht gespeichert'}
                className="p-1.5 rounded hover:bg-base-200"
              >
                <TablerIcon name={getKeepAudio('_segment') ? 'database' : 'database-off'} className="w-4 h-4" />
              </button>
              {isSegmenting ? (
                <span className="text-xs text-warning flex items-center gap-1">
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Segmentierung läuft – bitte noch nicht speichern!
                </span>
              ) : (
                <span className="text-xs text-base-content/50">Segmentierung über alle Felder</span>
              )}
            </div>
          )}

          {/* Error display */}
          {transcribeError && (
            <div className="alert alert-error alert-sm">
              <span className="text-sm">{transcribeError}</span>
              <button
                type="button"
                onClick={() => setTranscribeError(null)}
                className="btn btn-ghost btn-xs"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons – W8: icon-only */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn btn-ghost btn-sm btn-square text-error"
            title="Abbrechen"
          >
            <IconX className="h-5 w-5" />
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isSegmenting}
          className="btn btn-primary btn-sm btn-square"
          title={isSegmenting ? 'Segmentierung läuft...' : (isEditMode ? 'Speichern' : 'Eintrag erstellen')}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <IconDeviceFloppy className="h-5 w-5" />
          )}
        </button>
        {/* W5: Save + AI Pipeline button */}
        {onSaveAndRunPipeline && (
          <button
            type="button"
            onClick={handleSaveAndRunPipeline}
            disabled={isSubmitting}
            className="btn btn-sm text-primary hover:text-primary/80 btn-ghost flex items-center gap-0.5"
            title="Speichern + AI-Pipeline ausführen"
          >
            <IconDeviceFloppy className="h-4 w-4" />
            <IconSparkles className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
})

export default DynamicJournalForm
