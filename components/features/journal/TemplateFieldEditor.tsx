/**
 * components/features/journal/TemplateFieldEditor.tsx
 * Editor component for a single template field in the TemplateEditor.
 * Supports field type, label, icon, instruction, and required flag.
 */

'use client'

import { useCallback } from 'react'
import { IconGripVertical, IconTrash } from '@tabler/icons-react'
import { EmojiPickerButton } from './EmojiPickerButton'
import { TemplateField, TEMPLATE_FIELD_TYPES } from '@/types/journal'

interface TemplateFieldEditorProps {
  /** Field data */
  field: TemplateField
  /** Field index for display */
  index: number
  /** Callback when field changes */
  onChange: (field: TemplateField) => void
  /** Callback when field should be deleted */
  onDelete: () => void
  /** Whether the field can be deleted */
  canDelete?: boolean
  /** Whether editing is disabled */
  disabled?: boolean
  /** Drag handle props (from dnd-kit or similar) */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

/** Labels for field types in German */
const FIELD_TYPE_LABELS: Record<string, string> = {
  textarea: 'Textbereich',
  text: 'Einzeilig',
  number: 'Zahl',
  date: 'Datum',
  time: 'Uhrzeit',
}

/**
 * Editor for a single field in a template.
 * Provides inputs for type, label, icon (emoji), instruction, and required flag.
 */
export function TemplateFieldEditor({
  field,
  index,
  onChange,
  onDelete,
  canDelete = true,
  disabled = false,
  dragHandleProps,
}: TemplateFieldEditorProps) {
  // Handle individual field property changes
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...field, type: e.target.value as TemplateField['type'] })
    },
    [field, onChange]
  )

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...field, label: e.target.value || undefined })
    },
    [field, onChange]
  )

  const handleIconChange = useCallback(
    (emoji: string) => {
      onChange({ ...field, icon: emoji || undefined })
    },
    [field, onChange]
  )

  const handleInstructionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...field, instruction: e.target.value || undefined })
    },
    [field, onChange]
  )

  const handleRequiredChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...field, required: e.target.checked })
    },
    [field, onChange]
  )

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      {/* Header with drag handle, title, and delete button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab text-base-content/40 hover:text-base-content/60"
            aria-label="Feld verschieben"
          >
            <IconGripVertical className="h-5 w-5" />
          </div>

          {/* Field Title */}
          <span className="font-medium">Feld {index + 1}</span>
          {field.label && (
            <span className="text-sm text-base-content/60">– {field.label}</span>
          )}
        </div>

        {/* Delete Button */}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="btn btn-ghost btn-sm text-error hover:bg-error/10"
            aria-label="Feld löschen"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Field Configuration Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Field Type */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Typ</span>
          </label>
          <select
            value={field.type}
            onChange={handleTypeChange}
            disabled={disabled}
            className="select select-bordered select-sm w-full"
          >
            {TEMPLATE_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Label</span>
          </label>
          <input
            type="text"
            value={field.label || ''}
            onChange={handleLabelChange}
            disabled={disabled}
            placeholder="z.B. Was hat sich verändert?"
            className="input input-bordered input-sm w-full"
          />
        </div>

        {/* Icon (Emoji) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Icon</span>
          </label>
          <EmojiPickerButton
            value={field.icon}
            onChange={handleIconChange}
            placeholder="Icon wählen"
          />
        </div>

        {/* Required Toggle - plain HTML checkbox */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={handleRequiredChange}
              disabled={disabled}
              className="h-4 w-4 rounded border-base-300 accent-primary"
            />
            <span className="label-text">Pflichtfeld</span>
          </label>
        </div>
      </div>

      {/* Instruction (full width) */}
      <div className="form-control mt-4">
        <label className="label">
          <span className="label-text">Instruktion / Hilfetext</span>
        </label>
        <textarea
          value={field.instruction || ''}
          onChange={handleInstructionChange}
          disabled={disabled}
          placeholder="Optionaler Hilfetext für den Benutzer..."
          className="textarea textarea-bordered textarea-sm w-full"
          rows={2}
        />
      </div>
    </div>
  )
}

export default TemplateFieldEditor
