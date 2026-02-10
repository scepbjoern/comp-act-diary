/**
 * components/features/journal/FieldRenderer.tsx
 * Renders a single template field with appropriate input type.
 * Supports: textarea, text, number, date, time
 */

'use client'

import { useId, useCallback } from 'react'
import { IconMicrophone, IconSparkles } from '@tabler/icons-react'
import { RichTextEditor } from '@/components/features/editor/RichTextEditor'
import { TemplateField } from '@/types/journal'

interface FieldRendererProps {
  /** Field definition from template */
  field: TemplateField
  /** Current field value */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Whether the field is disabled */
  disabled?: boolean
  /** Show microphone button for audio recording */
  showMicrophone?: boolean
  /** Callback when microphone is clicked */
  onMicrophoneClick?: () => void
  /** Show improve button for AI text improvement */
  showImprove?: boolean
  /** Callback when improve is clicked */
  onImproveClick?: () => void
  /** Whether improve action is loading */
  isImproving?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a form field based on the template field definition.
 * Displays label with icon, instruction text, and appropriate input element.
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
  showMicrophone = false,
  onMicrophoneClick,
  showImprove = false,
  onImproveClick,
  isImproving = false,
  className = '',
}: FieldRendererProps) {
  const inputId = useId()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  // Render input based on field type
  const renderInput = () => {
    const baseInputClass = 'input input-bordered w-full'
    const _baseTextareaClass = 'textarea textarea-bordered w-full min-h-32 resize-y'

    switch (field.type) {
      case 'textarea':
        return (
          <RichTextEditor
            markdown={value}
            onChange={onChange}
            placeholder={field.label ? undefined : 'Schreibe hier...'}
            readOnly={disabled}
          />
        )

      case 'text':
        return (
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClass}
            aria-describedby={field.instruction ? `${inputId}-instruction` : undefined}
          />
        )

      case 'number':
        return (
          <input
            id={inputId}
            type="number"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClass}
            aria-describedby={field.instruction ? `${inputId}-instruction` : undefined}
          />
        )

      case 'date':
        return (
          <input
            id={inputId}
            type="date"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClass}
            aria-describedby={field.instruction ? `${inputId}-instruction` : undefined}
          />
        )

      case 'time':
        return (
          <input
            id={inputId}
            type="time"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClass}
            aria-describedby={field.instruction ? `${inputId}-instruction` : undefined}
          />
        )

      default:
        return (
          <RichTextEditor
            markdown={value}
            onChange={onChange}
            readOnly={disabled}
          />
        )
    }
  }

  // For minimal template (no label), render just the input
  if (!field.label) {
    return (
      <div className={`form-control ${className}`}>
        {renderInput()}
        {/* Action buttons for minimal template */}
        {(showMicrophone || showImprove) && (
          <div className="mt-2 flex gap-2">
            {showMicrophone && (
              <button
                type="button"
                onClick={onMicrophoneClick}
                disabled={disabled}
                className="btn btn-ghost btn-sm gap-1"
                aria-label="Audio aufnehmen"
              >
                <IconMicrophone className="h-4 w-4" />
              </button>
            )}
            {showImprove && (
              <button
                type="button"
                onClick={onImproveClick}
                disabled={disabled || isImproving}
                className="btn btn-ghost btn-sm gap-1"
                aria-label="Text verbessern"
              >
                {isImproving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <IconSparkles className="h-4 w-4" />
                )}
                <span className="text-xs">Verbessern</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`form-control ${className}`}>
      {/* Header with label and action buttons */}
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={inputId} className="label cursor-pointer py-0">
          <span className="label-text flex items-center gap-2 text-base font-medium">
            {field.icon && <span className="text-lg">{field.icon}</span>}
            {field.label}
            {field.required && <span className="text-error">*</span>}
          </span>
        </label>

        {/* Action buttons */}
        <div className="flex gap-1">
          {showMicrophone && (
            <button
              type="button"
              onClick={onMicrophoneClick}
              disabled={disabled}
              className="btn btn-ghost btn-xs"
              aria-label="Audio aufnehmen"
            >
              <IconMicrophone className="h-4 w-4" />
            </button>
          )}
          {showImprove && (
            <button
              type="button"
              onClick={onImproveClick}
              disabled={disabled || isImproving}
              className="btn btn-ghost btn-xs gap-1"
              aria-label="Text verbessern"
            >
              {isImproving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <IconSparkles className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Instruction text (expanded by default, small and muted) */}
      {field.instruction && (
        <p
          id={`${inputId}-instruction`}
          className="mb-2 text-sm text-base-content/60"
        >
          {field.instruction}
        </p>
      )}

      {/* Input element */}
      {renderInput()}
    </div>
  )
}

export default FieldRenderer
