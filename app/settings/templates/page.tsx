/**
 * app/settings/templates/page.tsx
 * Template management page - list, create, edit, duplicate, delete templates.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconEdit, IconCopy, IconTemplate, IconHelp } from '@tabler/icons-react'
import { TemplateEditor } from '@/components/features/journal'
import { TemplateField, TemplateAIConfig, JournalTemplateWithType } from '@/types/journal'
import Link from 'next/link'

// Types
interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
}

/**
 * Template management page component.
 */
export default function TemplatesPage() {
  const _router = useRouter()

  // State
  const [templates, setTemplates] = useState<JournalTemplateWithType[]>([])
  const [types, setTypes] = useState<JournalEntryType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editor state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch templates and types
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch templates
      const templatesRes = await fetch('/api/templates')
      if (!templatesRes.ok) throw new Error('Fehler beim Laden der Templates')
      const templatesData = await templatesRes.json()

      // Fetch journal entry types
      const typesRes = await fetch('/api/journal-entry-types')
      if (!typesRes.ok) throw new Error('Fehler beim Laden der Typen')
      const typesData = await typesRes.json()

      setTemplates(templatesData.templates || [])
      setTypes(typesData.types || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Get selected template
  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId)
    : null

  // Handle create new template
  const handleCreate = useCallback(() => {
    setSelectedTemplateId(null)
    setIsCreating(true)
  }, [])

  // Handle edit template
  const handleEdit = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId)
    setIsCreating(false)
  }, [])

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setSelectedTemplateId(null)
    setIsCreating(false)
  }, [])

  // Handle save template
  const handleSave = useCallback(
    async (data: {
      name: string
      description: string | null
      fields: TemplateField[] | null
      aiConfig: TemplateAIConfig | null
      typeId: string | null
    }) => {
      try {
        setIsSaving(true)

        if (isCreating) {
          // Create new template
          const res = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || 'Fehler beim Erstellen')
          }
        } else if (selectedTemplateId) {
          // Update existing template
          const res = await fetch(`/api/templates/${selectedTemplateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || 'Fehler beim Speichern')
          }
        }

        // Refresh data and close editor
        await fetchData()
        handleCancel()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
      } finally {
        setIsSaving(false)
      }
    },
    [isCreating, selectedTemplateId, fetchData, handleCancel]
  )

  // Handle duplicate template (can be called with specific ID or use selectedTemplateId)
  const handleDuplicate = useCallback(async (templateIdToDuplicate?: string) => {
    const targetId = templateIdToDuplicate || selectedTemplateId
    if (!targetId) return

    try {
      setIsSaving(true)

      const res = await fetch(`/api/templates/${targetId}/duplicate`, {
        method: 'POST',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Fehler beim Duplizieren')
      }

      const data = await res.json()

      // Refresh and select the new template
      await fetchData()
      setSelectedTemplateId(data.template.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Duplizieren')
    } finally {
      setIsSaving(false)
    }
  }, [selectedTemplateId, fetchData])

  // Handle delete template
  const handleDelete = useCallback(async () => {
    if (!selectedTemplateId) return

    try {
      setIsSaving(true)

      const res = await fetch(`/api/templates/${selectedTemplateId}?force=true`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Fehler beim Löschen')
      }

      // Refresh and close editor
      await fetchData()
      handleCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setIsSaving(false)
    }
  }, [selectedTemplateId, fetchData, handleCancel])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // Show editor if creating or editing
  if (isCreating || selectedTemplateId) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <TemplateEditor
          templateId={selectedTemplateId || undefined}
          initialName={selectedTemplate?.name || ''}
          initialDescription={selectedTemplate?.description || ''}
          initialFields={(selectedTemplate?.fields as TemplateField[]) || []}
          initialAIConfig={(selectedTemplate?.aiConfig as TemplateAIConfig) || {}}
          initialTypeId={selectedTemplate?.typeId || undefined}
          isSystemTemplate={selectedTemplate?.origin === 'SYSTEM'}
          entryCount={selectedTemplate?._count?.journalEntries || 0}
          types={types}
          onSave={handleSave}
          onDuplicate={selectedTemplateId ? handleDuplicate : undefined}
          onDelete={selectedTemplateId ? handleDelete : undefined}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </div>
    )
  }

  // Template list view
  return (
    <div className="container mx-auto max-w-4xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconTemplate className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Journal-Templates</h1>
            <p className="text-sm text-base-content/60">
              Verwalte Vorlagen für strukturierte Tagebucheinträge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/help/templates" className="btn btn-ghost btn-sm">
            <IconHelp className="h-5 w-5" />
          </Link>
          <button onClick={handleCreate} className="btn btn-primary btn-sm gap-1">
            <IconPlus className="h-4 w-4" />
            Neues Template
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 p-8 text-center">
          <IconTemplate className="mx-auto h-12 w-12 text-base-content/30" />
          <p className="mt-2 text-base-content/60">Noch keine Templates vorhanden</p>
          <button onClick={handleCreate} className="btn btn-primary btn-sm mt-4">
            <IconPlus className="h-4 w-4" />
            Erstes Template erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* System templates */}
          {templates.filter((t) => t.origin === 'SYSTEM').length > 0 && (
            <>
              <h2 className="text-sm font-medium text-base-content/60">System-Templates</h2>
              {templates
                .filter((t) => t.origin === 'SYSTEM')
                .map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template.id)}
                    onDuplicate={() => handleDuplicate(template.id)}
                  />
                ))}
            </>
          )}

          {/* User templates */}
          {templates.filter((t) => t.origin !== 'SYSTEM').length > 0 && (
            <>
              <h2 className="mt-6 text-sm font-medium text-base-content/60">Meine Templates</h2>
              {templates
                .filter((t) => t.origin !== 'SYSTEM')
                .map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template.id)}
                    onDuplicate={() => handleDuplicate(template.id)}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Single template list item component.
 */
function TemplateListItem({
  template,
  onEdit,
  onDuplicate,
}: {
  template: JournalTemplateWithType
  onEdit: () => void
  onDuplicate: () => void
}) {
  const fieldCount = (template.fields as TemplateField[] | null)?.length || 0
  const entryCount = template._count?.journalEntries || 0

  return (
    <div className="flex items-center justify-between rounded-lg border border-base-300 bg-base-100 p-4 hover:bg-base-200">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{template.name}</h3>
          {template.origin === 'SYSTEM' && (
            <span className="badge badge-info badge-xs">System</span>
          )}
          {template.origin === 'IMPORT' && (
            <span className="badge badge-warning badge-xs">Import</span>
          )}
        </div>
        {template.description && (
          <p className="mt-1 text-sm text-base-content/60">{template.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-base-content/50">
          {template.type && (
            <span>
              {template.type.icon} {template.type.name}
            </span>
          )}
          <span>•</span>
          <span>{fieldCount} Feld{fieldCount !== 1 ? 'er' : ''}</span>
          <span>•</span>
          <span>{entryCount} Eintrag{entryCount !== 1 ? '/Einträge' : ''}</span>
        </div>
      </div>

      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="btn btn-ghost btn-sm"
          title={template.origin === 'SYSTEM' ? 'Ansehen' : 'Bearbeiten'}
        >
          <IconEdit className="h-4 w-4" />
        </button>
        <button onClick={onDuplicate} className="btn btn-ghost btn-sm" title="Duplizieren">
          <IconCopy className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
