/**
 * app/journal/[id]/page.tsx
 * Detail view for a single journal entry with editing capabilities.
 * Uses the unified JournalService via /api/journal-entries.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { IconArrowLeft, IconEdit, IconTrash, IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react'
import { Toasts, useToasts } from '@/components/ui/Toast'
import { TemplateField } from '@/types/journal'
import { parseContentToFields, buildContentFromFields, extractFieldValues } from '@/lib/services/journal/contentService'
import type { EntryWithRelations } from '@/lib/services/journal/types'

export default function JournalEntryPage() {
  const params = useParams()
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const entryId = params.id as string

  const [entry, setEntry] = useState<EntryWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Editing state
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Fetch entry data via unified API
  const fetchEntry = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/journal-entries/${entryId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Eintrag nicht gefunden')
        } else if (response.status === 403) {
          setError('Kein Zugriff auf diesen Eintrag')
        } else {
          setError('Fehler beim Laden des Eintrags')
        }
        return
      }
      const data = await response.json()
      setEntry(data.entry)
      setEditTitle(data.entry.title || '')
      setEditContent(data.entry.content || '')

      // Parse content to field values if template exists
      if (data.entry.template?.fields) {
        const parsed = parseContentToFields(data.entry.content, data.entry.template.fields as TemplateField[])
        setFieldValues(extractFieldValues(parsed.fields))
      }
    } catch (err) {
      console.error('Error fetching entry:', err)
      setError('Fehler beim Laden des Eintrags')
    } finally {
      setIsLoading(false)
    }
  }, [entryId])

  useEffect(() => {
    void fetchEntry()
  }, [fetchEntry])

  // Handle field value changes
  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  // Save changes
  const handleSave = async () => {
    if (!entry) return

    setIsSaving(true)
    try {
      // Build content from fields if template exists
      let content = editContent
      const fields = entry.template?.fields as TemplateField[] | undefined
      if (fields && fields.length > 0) {
        content = buildContentFromFields(fields, fieldValues)
      }

      const response = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle || null,
          content,
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern')
      }

      const data = await response.json()
      setEntry(data.entry)
      setIsEditing(false)
      push('Eintrag gespeichert', 'success')
    } catch (err) {
      console.error('Error saving entry:', err)
      push('Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete entry
  const handleDelete = async () => {
    if (!confirm('Eintrag wirklich löschen?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen')
      }

      push('Eintrag gelöscht', 'success')
      router.push('/journal')
    } catch (err) {
      console.error('Error deleting entry:', err)
      push('Fehler beim Löschen', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel editing
  const handleCancel = () => {
    if (entry) {
      setEditTitle(entry.title || '')
      setEditContent(entry.content || '')
      if (entry.template?.fields) {
        const parsed = parseContentToFields(entry.content, entry.template.fields as TemplateField[])
        setFieldValues(extractFieldValues(parsed.fields))
      }
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Link href="/journal" className="btn btn-ghost btn-sm gap-2">
          <IconArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="alert alert-error">
          <span>{error || 'Eintrag nicht gefunden'}</span>
        </div>
      </div>
    )
  }

  // Use occurredAt for date display (timeBox is not included in EntryWithRelations)
  const formattedDate = entry.occurredAt
    ? format(new Date(entry.occurredAt), 'EEEE, d. MMMM yyyy', { locale: de })
    : format(new Date(entry.createdAt), 'EEEE, d. MMMM yyyy', { locale: de })

  // Parse template fields from JSON
  const templateFields = entry.template?.fields as TemplateField[] | undefined

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Toasts toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/journal" className="btn btn-ghost btn-sm gap-2">
          <IconArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="btn btn-ghost btn-sm" disabled={isSaving}>
                Abbrechen
              </button>
              <button onClick={handleSave} className="btn btn-primary btn-sm gap-2" disabled={isSaving}>
                {isSaving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <IconDeviceFloppy className="h-4 w-4" />
                )}
                Speichern
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm gap-2">
                <IconEdit className="h-4 w-4" />
                Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-ghost btn-sm text-error"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <IconTrash className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Entry Card */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {/* Type & Date */}
          <div className="flex items-center gap-3">
            {entry.type && (
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1 text-sm bg-base-200"
              >
                {entry.type.icon && <TablerIcon name={entry.type.icon} size={16} />}
                <span>{entry.type.name}</span>
              </div>
            )}
            <span className="text-sm text-base-content/60">{formattedDate}</span>
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Titel (optional)"
              className="input input-bordered w-full text-xl font-semibold"
            />
          ) : (
            entry.title && <h1 className="text-xl font-semibold">{entry.title}</h1>
          )}

          {/* Template Info */}
          {entry.template && (
            <div className="text-sm text-base-content/60">
              Template: {entry.template.name}
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            templateFields && templateFields.length > 0 ? (
              // Template-based editing
              <div className="space-y-4">
                {[...templateFields]
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id} className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">
                          {field.icon && <span className="mr-2">{field.icon}</span>}
                          {field.label || field.type}
                          {field.required && <span className="text-error ml-1">*</span>}
                        </span>
                      </label>
                      {field.instruction && (
                        <p className="mb-2 text-sm text-base-content/60">{field.instruction}</p>
                      )}
                      {field.type === 'textarea' ? (
                        <textarea
                          value={fieldValues[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="textarea textarea-bordered min-h-32 w-full"
                          placeholder={field.instruction || ''}
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
                          value={fieldValues[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="input input-bordered w-full"
                          placeholder={field.instruction || ''}
                        />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              // Plain text editing
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="textarea textarea-bordered min-h-64 w-full"
                placeholder="Inhalt..."
              />
            )
          ) : (
            // View mode - render markdown-like content
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {entry.content}
            </div>
          )}

          {/* Location */}
          {entry.location && (
            <div className="flex items-center gap-2 pt-4 text-sm text-base-content/60">
              <TablerIcon name="map_pin" size={16} />
              <span>{entry.location.name}</span>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-base-200 pt-4 text-xs text-base-content/50">
            <div>Erstellt: {format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
            {entry.updatedAt !== entry.createdAt && (
              <div>Bearbeitet: {format(new Date(entry.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
