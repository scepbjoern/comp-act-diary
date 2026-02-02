/**
 * app/settings/types/page.tsx
 * Management page for JournalEntryTypes (CRUD).
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { Toasts, useToasts } from '@/components/ui/Toast'

interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
  bgColorClass: string | null
  sortOrder: number
  userId: string | null
  _count: {
    journalEntries: number
    templates: number
  }
}

// Available background color classes
const BG_COLORS = [
  { value: 'bg-blue-100 dark:bg-blue-900/30', label: 'Blau' },
  { value: 'bg-green-100 dark:bg-green-900/30', label: 'Grün' },
  { value: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Gelb' },
  { value: 'bg-red-100 dark:bg-red-900/30', label: 'Rot' },
  { value: 'bg-purple-100 dark:bg-purple-900/30', label: 'Lila' },
  { value: 'bg-pink-100 dark:bg-pink-900/30', label: 'Pink' },
  { value: 'bg-orange-100 dark:bg-orange-900/30', label: 'Orange' },
  { value: 'bg-cyan-100 dark:bg-cyan-900/30', label: 'Cyan' },
  { value: 'bg-base-200', label: 'Neutral' },
]

export default function TypesPage() {
  const { toasts, push, dismiss } = useToasts()
  const [types, setTypes] = useState<JournalEntryType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create/Edit state
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    icon: '',
    bgColorClass: 'bg-base-200',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Fetch types
  const fetchTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/journal-entry-types')
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setTypes(data.types || [])
    } catch (err) {
      console.error('Error fetching types:', err)
      setError('Fehler beim Laden der Typen')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTypes()
  }, [fetchTypes])

  // Start creating
  const handleStartCreate = () => {
    setFormData({ code: '', name: '', icon: '', bgColorClass: 'bg-base-200' })
    setIsCreating(true)
    setEditingId(null)
  }

  // Start editing
  const handleStartEdit = (type: JournalEntryType) => {
    setFormData({
      code: type.code,
      name: type.name,
      icon: type.icon || '',
      bgColorClass: type.bgColorClass || 'bg-base-200',
    })
    setEditingId(type.id)
    setIsCreating(false)
  }

  // Cancel
  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({ code: '', name: '', icon: '', bgColorClass: 'bg-base-200' })
  }

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      push('Name ist erforderlich', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (isCreating) {
        // Generate code from name if not provided
        const code = formData.code.trim() || formData.name.toLowerCase().replace(/\s+/g, '-')
        
        const response = await fetch('/api/journal-entry-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            name: formData.name.trim(),
            icon: formData.icon || null,
            bgColorClass: formData.bgColorClass || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Fehler beim Erstellen')
        }

        push('Typ erstellt', 'success')
      } else if (editingId) {
        const response = await fetch(`/api/journal-entry-types/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            icon: formData.icon || null,
            bgColorClass: formData.bgColorClass || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Fehler beim Speichern')
        }

        push('Typ gespeichert', 'success')
      }

      handleCancel()
      void fetchTypes()
    } catch (err) {
      console.error('Error saving type:', err)
      push(err instanceof Error ? err.message : 'Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete
  const handleDelete = async (type: JournalEntryType) => {
    if (!confirm(`Typ "${type.name}" wirklich löschen?`)) return

    try {
      const response = await fetch(`/api/journal-entry-types/${type.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen')
      }

      push('Typ gelöscht', 'success')
      void fetchTypes()
    } catch (err) {
      console.error('Error deleting type:', err)
      push(err instanceof Error ? err.message : 'Fehler beim Löschen', 'error')
    }
  }

  // Separate system and user types (system types have userId = null)
  const systemTypes = types.filter((t) => t.userId === null)
  const userTypes = types.filter((t) => t.userId !== null)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <Toasts toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="btn btn-ghost btn-sm">
            <IconArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Eintragstypen</h1>
            <p className="text-sm text-base-content/60">
              Verwalte die Typen für deine Journal-Einträge
            </p>
          </div>
        </div>
        <button onClick={handleStartCreate} className="btn btn-primary btn-sm gap-2">
          <IconPlus className="h-4 w-4" />
          Neuer Typ
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="card bg-base-200 p-4">
          <h2 className="mb-4 font-medium">Neuen Typ erstellen</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="input input-bordered"
                placeholder="z.B. Morgenroutine"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Code (optional)</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                className="input input-bordered"
                placeholder="z.B. morning-routine"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Icon (Tabler Icon Name)</span>
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                className="input input-bordered"
                placeholder="z.B. sun, moon, heart"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Hintergrundfarbe</span>
              </label>
              <select
                value={formData.bgColorClass}
                onChange={(e) => setFormData((prev) => ({ ...prev, bgColorClass: e.target.value }))}
                className="select select-bordered"
              >
                {BG_COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={handleCancel} className="btn btn-ghost btn-sm" disabled={isSaving}>
              Abbrechen
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm gap-2" disabled={isSaving}>
              {isSaving ? <span className="loading loading-spinner loading-xs" /> : <IconCheck className="h-4 w-4" />}
              Erstellen
            </button>
          </div>
        </div>
      )}

      {/* User Types */}
      <div>
        <h2 className="mb-3 font-medium">Meine Typen</h2>
        {userTypes.length === 0 ? (
          <p className="text-sm text-base-content/60">
            Du hast noch keine eigenen Typen erstellt.
          </p>
        ) : (
          <div className="space-y-2">
            {userTypes.map((type) => (
              <div
                key={type.id}
                className={`flex items-center justify-between rounded-lg p-3 ${type.bgColorClass || 'bg-base-200'}`}
              >
                {editingId === type.id ? (
                  // Edit mode
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="input input-bordered input-sm flex-1"
                    />
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                      className="input input-bordered input-sm w-24"
                      placeholder="Icon"
                    />
                    <select
                      value={formData.bgColorClass}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bgColorClass: e.target.value }))}
                      className="select select-bordered select-sm"
                    >
                      {BG_COLORS.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                    <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isSaving}>
                      <IconCheck className="h-4 w-4" />
                    </button>
                    <button onClick={handleCancel} className="btn btn-ghost btn-sm" disabled={isSaving}>
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center gap-3">
                      {type.icon && <TablerIcon name={type.icon} size={20} />}
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-xs text-base-content/60">
                          {type._count.journalEntries} Einträge · {type._count.templates} Templates
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(type)}
                        className="btn btn-ghost btn-sm"
                        title="Bearbeiten"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
                        className="btn btn-ghost btn-sm text-error"
                        title="Löschen"
                        disabled={type._count.journalEntries > 0 || type._count.templates > 0}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Types */}
      <div>
        <h2 className="mb-3 font-medium">System-Typen</h2>
        <p className="mb-3 text-sm text-base-content/60">
          Diese Typen sind vordefiniert und können nicht bearbeitet werden.
        </p>
        <div className="space-y-2">
          {systemTypes.map((type) => (
            <div
              key={type.id}
              className={`flex items-center justify-between rounded-lg p-3 ${type.bgColorClass || 'bg-base-200'}`}
            >
              <div className="flex items-center gap-3">
                {type.icon && <TablerIcon name={type.icon} size={20} />}
                <div>
                  <div className="font-medium">{type.name}</div>
                  <div className="text-xs text-base-content/60">
                    {type._count.journalEntries} Einträge · {type._count.templates} Templates
                  </div>
                </div>
              </div>
              <span className="badge badge-ghost badge-sm">System</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link to Templates */}
      <div className="border-t border-base-300 pt-4">
        <Link href="/settings/templates" className="btn btn-ghost btn-sm gap-2">
          <TablerIcon name="template" size={16} />
          Templates verwalten
        </Link>
      </div>
    </div>
  )
}
