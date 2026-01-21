/**
 * TaskSuggestionModal Component
 * Displays AI-extracted task suggestions for review and confirmation.
 * Users can select, edit, and assign contacts before saving.
 * Tasks with confidence >= 70% are pre-selected.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  IconSparkles,
  IconX,
  IconCheck,
  IconCalendar,
  IconUser,
  IconFlag,
  IconFlag2,
  IconFlag3,
  IconLoader2,
} from '@tabler/icons-react'
import { format } from 'date-fns'

// =============================================================================
// TYPES
// =============================================================================

type TaskType =
  | 'IMMEDIATE'
  | 'REFLECTION'
  | 'PLANNED_INTERACTION'
  | 'FOLLOW_UP'
  | 'RESEARCH'
  | 'HABIT_RELATED'
  | 'GENERAL'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface TaskSuggestion {
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  suggestedDueDate?: string | null
  relatedContactName?: string | null
  confidence: number
}

export interface EditableSuggestion extends TaskSuggestion {
  selected: boolean
  contactId?: string
}

interface Contact {
  id: string
  name: string
  slug: string
}

interface TaskSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: TaskSuggestion[]
  journalEntryId: string
  contacts?: Contact[] // Optional - will fetch from API if not provided
  onSave: (suggestions: EditableSuggestion[]) => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIDENCE_THRESHOLD = 0.7 // Pre-select suggestions with >= 70% confidence

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: React.ReactNode }[] = [
  { value: 'HIGH', label: 'Hoch', icon: <IconFlag size={14} className="text-error" /> },
  { value: 'MEDIUM', label: 'Mittel', icon: <IconFlag2 size={14} className="text-warning" /> },
  { value: 'LOW', label: 'Niedrig', icon: <IconFlag3 size={14} className="text-base-content/40" /> },
]

// Typ-Optionen: Allgemein zuoberst, dann alphabetisch sortiert
const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'GENERAL', label: 'Allgemein' },
  { value: 'HABIT_RELATED', label: 'Gewohnheit' },
  { value: 'PLANNED_INTERACTION', label: 'Interaktion' },
  { value: 'FOLLOW_UP', label: 'Nachfassen' },
  { value: 'RESEARCH', label: 'Recherche' },
  { value: 'REFLECTION', label: 'Reflexion' },
  { value: 'IMMEDIATE', label: 'Sofort' },
]

// =============================================================================
// COMPONENT
// =============================================================================

export default function TaskSuggestionModal({
  isOpen,
  onClose,
  suggestions,
  journalEntryId: _journalEntryId,
  contacts: propContacts,
  onSave,
}: TaskSuggestionModalProps) {
  const [editableSuggestions, setEditableSuggestions] = useState<EditableSuggestion[]>([])
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>(propContacts || [])
  const [_loadingContacts, setLoadingContacts] = useState(false)

  // Fetch contacts from API if not provided as prop
  useEffect(() => {
    if (isOpen && !propContacts) {
      const fetchContacts = async () => {
        setLoadingContacts(true)
        try {
          const res = await fetch('/api/contacts?limit=500')
          const data = await res.json()
          setContacts(data.contacts || [])
        } catch (error) {
          console.error('Error fetching contacts:', error)
        } finally {
          setLoadingContacts(false)
        }
      }
      void fetchContacts()
    } else if (propContacts) {
      setContacts(propContacts)
    }
  }, [isOpen, propContacts])

  // Initialize editable suggestions when modal opens
  useEffect(() => {
    if (isOpen && suggestions.length > 0) {
      setEditableSuggestions(
        suggestions.map((s) => ({
          ...s,
          selected: s.confidence >= CONFIDENCE_THRESHOLD,
          contactId: undefined,
        }))
      )
    }
  }, [isOpen, suggestions])

  // Find matching contact for a suggestion
  const findMatchingContact = useCallback(
    (name: string | null | undefined): Contact | undefined => {
      if (!name) return undefined
      const lowerName = name.toLowerCase()
      return contacts.find(
        (c) =>
          c.name.toLowerCase().includes(lowerName) ||
          lowerName.includes(c.name.toLowerCase())
      )
    },
    [contacts]
  )

  // Auto-assign contacts based on relatedContactName
  useEffect(() => {
    if (contacts.length > 0 && editableSuggestions.length > 0) {
      setEditableSuggestions((prev) =>
        prev.map((s) => {
          if (s.relatedContactName && !s.contactId) {
            const match = findMatchingContact(s.relatedContactName)
            return match ? { ...s, contactId: match.id } : s
          }
          return s
        })
      )
    }
  }, [contacts, findMatchingContact, editableSuggestions.length])

  const toggleSelection = (index: number) => {
    setEditableSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    )
  }

  const updateSuggestion = (index: number, updates: Partial<EditableSuggestion>) => {
    setEditableSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    )
  }

  const handleSave = async () => {
    const selected = editableSuggestions.filter((s) => s.selected)
    if (selected.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    try {
      await onSave(selected)
      onClose()
    } catch (error) {
      console.error('Error saving tasks:', error)
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = editableSuggestions.filter((s) => s.selected).length

  if (!isOpen) return null

  return (
    <dialog className="modal modal-open z-50">
      <div className="modal-box max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconSparkles className="text-info" size={24} />
            <h3 className="font-bold text-lg">Erkannte Aufgaben</h3>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={saving}
          >
            <IconX size={20} />
          </button>
        </div>

        <p className="text-sm text-base-content/70 mb-4">
          Folgende Aufgaben wurden aus deinem Eintrag erkannt. Wähle aus, welche du speichern möchtest.
        </p>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {editableSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`
                border rounded-lg p-3 transition-colors
                ${suggestion.selected
                  ? 'border-primary bg-primary/5'
                  : 'border-base-200 bg-base-100 opacity-60'
                }
              `}
            >
              {/* Selection + Title Row */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleSelection(index)}
                  className="btn btn-ghost btn-xs btn-circle mt-0.5 flex-shrink-0"
                >
                  {suggestion.selected ? (
                    <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                      <IconCheck size={14} className="text-primary-content" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-base-content/30" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <input
                    type="text"
                    className="input input-sm input-ghost w-full font-medium p-0 h-auto focus:bg-base-200"
                    value={suggestion.title}
                    onChange={(e) => updateSuggestion(index, { title: e.target.value })}
                    disabled={!suggestion.selected}
                  />

                  {/* Confidence Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        suggestion.confidence >= 0.8
                          ? 'bg-success/20 text-success'
                          : suggestion.confidence >= 0.6
                            ? 'bg-warning/20 text-warning'
                            : 'bg-base-200 text-base-content/60'
                      }`}
                    >
                      {Math.round(suggestion.confidence * 100)}% Konfidenz
                    </span>
                  </div>

                  {/* Controls (visible when selected) */}
                  {suggestion.selected && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {/* Task Type Select */}
                      <select
                        className="select select-bordered select-xs"
                        value={suggestion.taskType}
                        onChange={(e) =>
                          updateSuggestion(index, {
                            taskType: e.target.value as TaskType,
                          })
                        }
                      >
                        {TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Priority Select */}
                      <select
                        className="select select-bordered select-xs"
                        value={suggestion.priority}
                        onChange={(e) =>
                          updateSuggestion(index, {
                            priority: e.target.value as TaskPriority,
                          })
                        }
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Due Date */}
                      <div className="flex items-center gap-1">
                        <IconCalendar size={14} className="text-base-content/60" />
                        <input
                          type="date"
                          className="input input-bordered input-xs w-auto"
                          value={
                            suggestion.suggestedDueDate
                              ? format(new Date(suggestion.suggestedDueDate), 'yyyy-MM-dd')
                              : ''
                          }
                          onChange={(e) =>
                            updateSuggestion(index, {
                              suggestedDueDate: e.target.value || null,
                            })
                          }
                        />
                      </div>

                      {/* Contact Select - immer anzeigen wenn Kontakte verfügbar */}
                      {contacts.length > 0 && (
                        <div className="flex items-center gap-1">
                          <IconUser size={14} className="text-base-content/60" />
                          <select
                            className="select select-bordered select-xs min-w-[140px]"
                            value={suggestion.contactId || ''}
                            onChange={(e) =>
                              updateSuggestion(index, {
                                contactId: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">
                              {suggestion.relatedContactName
                                ? `${suggestion.relatedContactName} zuordnen...`
                                : 'Kontakt wählen...'}
                            </option>
                            {contacts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-action mt-4 pt-4 border-t border-base-200">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Überspringen
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
          >
            {saving ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Speichern...
              </>
            ) : (
              `${selectedCount} Aufgabe${selectedCount !== 1 ? 'n' : ''} speichern`
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}
