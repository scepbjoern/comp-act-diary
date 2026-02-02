/**
 * components/features/journal/DynamicJournalForm.tsx
 * Generic form component that renders fields dynamically based on template definition.
 * Supports type/template selection, field rendering, and content aggregation.
 */

'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { IconUpload, IconPhoto, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'
import { FieldRenderer } from './FieldRenderer'
import { MicrophoneButton } from '@/components/features/transcription/MicrophoneButton'
import { TemplateField, TemplateAIConfig } from '@/types/journal'
import {
  buildContentFromFields,
  parseContentToFields,
  extractFieldValues,
} from '@/lib/services/journal/contentService'

// Types for journal entry types and templates
interface JournalEntryTypeOption {
  id: string
  code: string
  name: string
  icon: string | null
}

interface JournalTemplateOption {
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
  /** Initial type ID (for edit mode) */
  initialTypeId?: string
  /** Initial template ID (for edit mode) */
  initialTemplateId?: string
  /** Initial content (for edit mode) */
  initialContent?: string
  /** Callback when form is submitted */
  onSubmit: (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
  }) => void
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
}

/**
 * Dynamic form that renders fields based on selected template.
 * Handles type selection, template selection, field rendering, and content building.
 */
export function DynamicJournalForm({
  types,
  templates,
  initialTypeId,
  initialTemplateId,
  initialContent = '',
  onSubmit,
  isSubmitting = false,
  onAudioUpload,
  onImageUpload,
  showMediaButtons = true,
  className = '',
}: DynamicJournalFormProps) {
  // State for selections
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialTypeId || types[0]?.id || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplateId || null
  )

  // Field values state
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Warning for template mismatch
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null)

  // Fallback content for mismatch mode
  const [fallbackContent, setFallbackContent] = useState<string>('')

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
    if (!selectedTemplate) {
      // No template - use plain content
      setFieldValues({ content: initialContent })
      setMismatchWarning(null)
      setFallbackContent('')
      return
    }

    if (!selectedTemplate.fields || selectedTemplate.fields.length === 0) {
      // Template without fields - use plain content
      setFieldValues({ content: initialContent })
      setMismatchWarning(null)
      setFallbackContent('')
      return
    }

    if (initialContent) {
      // Try to parse initial content into fields
      const parseResult = parseContentToFields(initialContent, selectedTemplate.fields)

      if (parseResult.matched) {
        setFieldValues(extractFieldValues(parseResult.fields))
        setMismatchWarning(null)
        setFallbackContent('')
      } else {
        // Mismatch - show warning and both views
        setFieldValues(extractFieldValues(parseResult.fields))
        setMismatchWarning(parseResult.warning || 'Felder passen nicht zum Template')
        setFallbackContent(initialContent)
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
  }, [selectedTemplate, initialContent])

  // Auto-select first template when type changes
  useEffect(() => {
    if (filteredTemplates.length > 0 && !initialTemplateId) {
      // Find default template for type or first available
      const defaultTemplate = filteredTemplates[0]
      setSelectedTemplateId(defaultTemplate?.id || null)
    }
  }, [selectedTypeId, filteredTemplates, initialTemplateId])

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

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      // Build content from field values
      let content: string
      if (selectedTemplate?.fields && selectedTemplate.fields.length > 0) {
        content = buildContentFromFields(selectedTemplate.fields, fieldValues)
      } else {
        content = fieldValues.content || ''
      }

      onSubmit({
        typeId: selectedTypeId,
        templateId: selectedTemplateId,
        content,
        fieldValues,
      })
    },
    [selectedTypeId, selectedTemplateId, selectedTemplate, fieldValues, onSubmit]
  )

  // State for media uploads
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Handle audio file selection - transcribe and append to content
  const handleAudioFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input so same file can be selected again
      if (audioInputRef.current) audioInputRef.current.value = ''

      // If external handler provided, use it
      if (onAudioUpload) {
        onAudioUpload(file)
        return
      }

      // Otherwise, transcribe internally
      setIsTranscribing(true)
      setTranscribeError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Transkription fehlgeschlagen')
        }

        const data = await response.json()
        const transcript = data.text

        if (transcript) {
          // If template has multiple textarea fields, try to segment the transcript
          const textareaFields = fields.filter((f) => f.type === 'textarea')
          
          if (textareaFields.length > 1 && selectedTemplateId) {
            // Try AI segmentation for multi-field templates
            try {
              const segmentResponse = await fetch('/api/journal-ai/segment-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transcript,
                  templateId: selectedTemplateId,
                }),
              })

              if (segmentResponse.ok) {
                const segmentData = await segmentResponse.json()
                if (segmentData.segments) {
                  // Apply segmented content to fields
                  setFieldValues((prev) => {
                    const newValues = { ...prev }
                    for (const [fieldId, content] of Object.entries(segmentData.segments)) {
                      if (content && typeof content === 'string') {
                        newValues[fieldId] = prev[fieldId]
                          ? `${prev[fieldId]}\n\n${content}`
                          : content
                      }
                    }
                    return newValues
                  })
                  return // Successfully segmented
                }
              }
            } catch {
              // Segmentation failed, fall back to single field
              console.warn('Audio segmentation failed, using first field')
            }
          }

          // Fallback: append to first textarea field or content
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
        }
      } catch (err) {
        console.error('Transcription failed:', err)
        setTranscribeError(err instanceof Error ? err.message : 'Transkription fehlgeschlagen')
      } finally {
        setIsTranscribing(false)
      }
    },
    [onAudioUpload, fields, selectedTemplateId]
  )

  // Handle image file selection
  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input so same file can be selected again
      if (imageInputRef.current) imageInputRef.current.value = ''

      // If external handler provided, use it
      if (onImageUpload) {
        onImageUpload(file)
        return
      }

      // For now, show alert that image upload requires saving the entry first
      alert('Bilder k\u00f6nnen nach dem Speichern des Eintrags hinzugef\u00fcgt werden.')
    },
    [onImageUpload]
  )

  // Track which field is being recorded
  const [recordingFieldId, setRecordingFieldId] = useState<string | null>(null)
  const [improvingFieldId, setImprovingFieldId] = useState<string | null>(null)

  // Handle microphone transcription for a field
  const handleMicrophoneResult = useCallback(
    (fieldId: string, transcript: string) => {
      setFieldValues((prev) => ({
        ...prev,
        [fieldId]: prev[fieldId] ? `${prev[fieldId]}\n\n${transcript}` : transcript,
      }))
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

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            <div key={field.id} className="relative">
              <FieldRenderer
                field={field}
                value={fieldValues[field.id] || ''}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={isSubmitting}
                showMicrophone={field.type === 'textarea'}
                onMicrophoneClick={() => setRecordingFieldId(field.id)}
                showImprove={field.type === 'textarea'}
                onImproveClick={() => handleImproveText(field.id)}
                isImproving={improvingFieldId === field.id}
              />
              {/* Recording Modal for this field */}
              {recordingFieldId === field.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="card bg-base-100 p-6 shadow-xl">
                    <h3 className="mb-4 text-lg font-medium">Spracheingabe</h3>
                    <MicrophoneButton
                      onAudioData={(result) => handleMicrophoneResult(field.id, result.text)}
                      className="mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setRecordingFieldId(null)}
                      className="btn btn-ghost btn-sm mt-4"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // No template or no fields - show plain textarea
        <div className="form-control">
          <textarea
            value={fieldValues.content || ''}
            onChange={(e) => handleFieldChange('content', e.target.value)}
            disabled={isSubmitting}
            className="textarea textarea-bordered min-h-48 w-full resize-y"
            placeholder="Schreibe hier..."
          />
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

      {/* Media Upload Buttons */}
      {showMediaButtons && (
        <div className="space-y-2 border-t border-base-300 pt-4">
          <div className="flex flex-wrap gap-2">
            {/* Audio Upload */}
            <label className={`btn btn-ghost btn-sm gap-2 cursor-pointer ${isTranscribing ? 'btn-disabled' : ''}`}>
              {isTranscribing ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconUpload className="h-4 w-4" />
              )}
              <span>{isTranscribing ? 'Transkribiere...' : 'Audio hochladen'}</span>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
                disabled={isSubmitting || isTranscribing}
              />
            </label>

            {/* Image Upload */}
            <label className="btn btn-ghost btn-sm gap-2 cursor-pointer">
              <IconPhoto className="h-4 w-4" />
              <span>Bild hinzufügen</span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          </div>

          {/* Transcription Error */}
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

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Speichern...
            </>
          ) : (
            'Speichern'
          )}
        </button>
      </div>
    </form>
  )
}

export default DynamicJournalForm
