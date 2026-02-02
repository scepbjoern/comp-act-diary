/**
 * components/features/journal/TemplateEditor.tsx
 * Complete UI for template creation and editing.
 * Includes name, description, type assignment, field list, and AI configuration.
 */

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconPlus, IconCopy, IconTrash, IconAlertTriangle, IconGripVertical } from '@tabler/icons-react'
import { TemplateFieldEditor } from './TemplateFieldEditor'
import { TemplateAIConfigEditor } from './TemplateAIConfigEditor'
import { TemplateField, TemplateAIConfig } from '@/types/journal'
import { v4 as uuidv4 } from 'uuid'

// Type for journal entry types
interface JournalEntryTypeOption {
  id: string
  code: string
  name: string
  icon: string | null
}

interface TemplateEditorProps {
  /** Template ID (undefined for new template) */
  templateId?: string
  /** Initial template name */
  initialName?: string
  /** Initial template description */
  initialDescription?: string
  /** Initial fields */
  initialFields?: TemplateField[]
  /** Initial AI config */
  initialAIConfig?: TemplateAIConfig
  /** Initial type ID */
  initialTypeId?: string
  /** Whether this is a system template (read-only) */
  isSystemTemplate?: boolean
  /** Number of entries using this template */
  entryCount?: number
  /** Available entry types */
  types: JournalEntryTypeOption[]
  /** Callback when save is clicked */
  onSave: (data: {
    name: string
    description: string | null
    fields: TemplateField[] | null
    aiConfig: TemplateAIConfig | null
    typeId: string | null
  }) => void
  /** Callback when duplicate is clicked */
  onDuplicate?: () => void
  /** Callback when delete is clicked */
  onDelete?: () => void
  /** Callback when cancel is clicked */
  onCancel: () => void
  /** Whether save is in progress */
  isSaving?: boolean
}

/**
 * Complete template editor with all configuration options.
 */
export function TemplateEditor({
  templateId,
  initialName = '',
  initialDescription = '',
  initialFields = [],
  initialAIConfig = {},
  initialTypeId,
  isSystemTemplate = false,
  entryCount = 0,
  types,
  onSave,
  onDuplicate,
  onDelete,
  onCancel,
  isSaving = false,
}: TemplateEditorProps) {
  // Form state
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [fields, setFields] = useState<TemplateField[]>(initialFields)
  const [aiConfig, setAIConfig] = useState<TemplateAIConfig>(initialAIConfig)
  const [typeId, setTypeId] = useState<string | null>(initialTypeId || null)

  // Validation errors
  const [errors, setErrors] = useState<{ name?: string }>({})

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Drag & Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Check if template has multiple fields (for segmentation config)
  const hasMultipleFields = useMemo(() => fields.length > 1, [fields])

  // Handle field changes
  const handleFieldChange = useCallback((index: number, updatedField: TemplateField) => {
    setFields((prev) => {
      const newFields = [...prev]
      newFields[index] = updatedField
      return newFields
    })
  }, [])

  // Handle field deletion
  const handleFieldDelete = useCallback((index: number) => {
    setFields((prev) => {
      const newFields = prev.filter((_, i) => i !== index)
      // Update order values
      return newFields.map((f, i) => ({ ...f, order: i }))
    })
  }, [])

  // Add new field
  const handleAddField = useCallback(() => {
    const newField: TemplateField = {
      id: uuidv4(),
      label: '',
      type: 'textarea',
      order: fields.length,
      required: false,
    }
    setFields((prev) => [...prev, newField])
  }, [fields.length])

  // Drag & Drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setFields((prev) => {
        const newFields = [...prev]
        const [draggedField] = newFields.splice(draggedIndex, 1)
        newFields.splice(dragOverIndex, 0, draggedField)
        // Update order values
        return newFields.map((f, i) => ({ ...f, order: i }))
      })
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  // Handle save
  const handleSave = useCallback(() => {
    // Validate
    const newErrors: { name?: string } = {}
    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      fields: fields.length > 0 ? fields : null,
      aiConfig: Object.keys(aiConfig).length > 0 ? aiConfig : null,
      typeId,
    })
  }, [name, description, fields, aiConfig, typeId, onSave])

  // Handle delete with confirmation
  const handleDeleteClick = useCallback(() => {
    if (entryCount > 0) {
      setShowDeleteConfirm(true)
    } else {
      onDelete?.()
    }
  }, [entryCount, onDelete])

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false)
    onDelete?.()
  }, [onDelete])

  // For system templates, only AI config is editable
  const isFieldsDisabled = isSaving || isSystemTemplate
  const isAIConfigDisabled = isSaving

  // Load available LLM models
  const [availableModels, setAvailableModels] = useState<{ value: string; label: string }[]>([])
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/llm-models')
        if (res.ok) {
          const data = await res.json()
          const models = (data.models || []).map((m: { modelId: string; name: string }) => ({
            value: m.modelId,
            label: m.name,
          }))
          setAvailableModels(models)
        }
      } catch {
        // Use fallback models
      }
    }
    void fetchModels()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {templateId ? 'Template bearbeiten' : 'Neues Template'}
          {isSystemTemplate && (
            <span className="ml-2 badge badge-info badge-sm">System</span>
          )}
        </h2>

        {/* Action Buttons */}
        {templateId && (
          <div className="flex gap-2">
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                disabled={isSaving}
                className="btn btn-ghost btn-sm gap-1"
              >
                <IconCopy className="h-4 w-4" />
                Duplizieren
              </button>
            )}
            {onDelete && !isSystemTemplate && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSaving}
                className="btn btn-ghost btn-sm gap-1 text-error hover:bg-error/10"
              >
                <IconTrash className="h-4 w-4" />
                Löschen
              </button>
            )}
          </div>
        )}
      </div>

      {/* System Template Warning */}
      {isSystemTemplate && (
        <div className="alert alert-info">
          <IconAlertTriangle className="h-5 w-5" />
          <span>
            System-Templates: Felder sind schreibgeschützt, aber die AI-Konfiguration kann angepasst werden.
            Du kannst das Template duplizieren, um eine vollständig bearbeitbare Version zu erstellen.
          </span>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isFieldsDisabled}
            className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
            placeholder="z.B. Wochenreflexion"
          />
          {errors.name && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.name}</span>
            </label>
          )}
        </div>

        {/* Type */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Für Typ</span>
          </label>
          <select
            value={typeId || ''}
            onChange={(e) => setTypeId(e.target.value || null)}
            disabled={isFieldsDisabled}
            className="select select-bordered w-full"
          >
            <option value="">Alle Typen</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon && `${type.icon} `}
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Beschreibung</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isFieldsDisabled}
          className="textarea textarea-bordered w-full"
          rows={2}
          placeholder="Optionale Beschreibung des Templates..."
        />
      </div>

      {/* Fields Section */}
      <div className="space-y-4">
        <h3 className="font-medium">Felder</h3>

        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 p-6 text-center">
            <p className="text-base-content/60">
              Keine Felder definiert. Ein Template ohne Felder zeigt nur ein freies Textfeld.
            </p>
            <button
              type="button"
              onClick={handleAddField}
              disabled={isFieldsDisabled}
              className="btn btn-primary btn-sm mt-3"
            >
              <IconPlus className="h-4 w-4" />
              Erstes Feld hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                draggable={!isFieldsDisabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={`relative transition-all duration-150 ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index ? 'translate-y-2 border-t-2 border-primary' : ''
                }`}
              >
                {/* Drag Handle */}
                {!isFieldsDisabled && (
                  <div
                    className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab text-base-content/40 hover:text-base-content/70 active:cursor-grabbing"
                    title="Ziehen zum Verschieben"
                  >
                    <IconGripVertical className="h-5 w-5" />
                  </div>
                )}
                <TemplateFieldEditor
                  field={field}
                  index={index}
                  onChange={(updatedField) => handleFieldChange(index, updatedField)}
                  onDelete={() => handleFieldDelete(index)}
                  canDelete={!isSystemTemplate}
                  disabled={isFieldsDisabled}
                />
              </div>
            ))}

            {/* Add field button below the field list */}
            <button
              type="button"
              onClick={handleAddField}
              disabled={isFieldsDisabled}
              className="btn btn-ghost btn-sm gap-1 w-full border-dashed border border-base-300"
            >
              <IconPlus className="h-4 w-4" />
              Feld hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* AI Configuration */}
      <div className="divider" />
      <TemplateAIConfigEditor
        config={aiConfig}
        onChange={setAIConfig}
        hasMultipleFields={hasMultipleFields}
        disabled={isAIConfigDisabled}
        availableModels={availableModels}
      />

      {/* Warning for existing entries */}
      {templateId && entryCount > 0 && !isSystemTemplate && (
        <div className="alert alert-warning">
          <IconAlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Änderungen können bestehende Einträge beeinflussen</p>
            <p className="text-sm">
              Dieses Template wird von {entryCount} Eintrag/Einträgen verwendet.
              Geänderte Felder werden bei bestehenden Einträgen möglicherweise nicht korrekt zugeordnet.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn btn-ghost"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Speichern...
            </>
          ) : isSystemTemplate ? (
            'AI-Konfiguration speichern'
          ) : (
            'Speichern'
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Template löschen?</h3>
            <p className="py-4">
              Dieses Template wird von <strong>{entryCount}</strong> Eintrag/Einträgen verwendet.
              Beim Löschen wird die Template-Referenz aus diesen Einträgen entfernt.
              Der Inhalt der Einträge bleibt erhalten.
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn btn-error"
              >
                Trotzdem löschen
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowDeleteConfirm(false)}
          />
        </div>
      )}
    </div>
  )
}

export default TemplateEditor
