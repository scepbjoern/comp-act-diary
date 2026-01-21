/**
 * TaskForm Component
 * Form for creating and editing tasks with support for type, priority, and contact.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { IconX, IconPlus, IconFlag, IconFlag2, IconFlag3, IconSearch, IconUser } from '@tabler/icons-react'
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

interface Contact {
  id: string
  name: string
}

interface TaskFormProps {
  contactId?: string
  journalEntryId?: string
  onClose: () => void
  onSave: () => void
  initialData?: {
    id?: string
    title?: string
    description?: string
    dueDate?: string | null
    taskType?: TaskType
    priority?: TaskPriority
    contactId?: string
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'GENERAL', label: 'Allgemein' },
  { value: 'IMMEDIATE', label: 'Sofort' },
  { value: 'REFLECTION', label: 'Reflexion' },
  { value: 'PLANNED_INTERACTION', label: 'Interaktion' },
  { value: 'FOLLOW_UP', label: 'Nachfassen' },
  { value: 'RESEARCH', label: 'Recherche' },
  { value: 'HABIT_RELATED', label: 'Gewohnheit' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: React.ReactNode }[] = [
  { value: 'LOW', label: 'Niedrig', icon: <IconFlag3 size={16} className="text-base-content/40" /> },
  { value: 'MEDIUM', label: 'Mittel', icon: <IconFlag2 size={16} className="text-warning" /> },
  { value: 'HIGH', label: 'Hoch', icon: <IconFlag size={16} className="text-error" /> },
]

// =============================================================================

export default function TaskForm({
  contactId,
  journalEntryId,
  onClose,
  onSave,
  initialData,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate 
      ? format(new Date(initialData.dueDate), "yyyy-MM-dd'T'HH:mm")
      : ''
  )
  const [taskType, setTaskType] = useState<TaskType>(initialData?.taskType || 'GENERAL')
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'MEDIUM')
  const [selectedContactId, setSelectedContactId] = useState(contactId || initialData?.contactId || '')
  const [selectedContactName, setSelectedContactName] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const contactInputRef = useRef<HTMLInputElement>(null)

  const isEditing = Boolean(initialData?.id)

  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true)
      try {
        const res = await fetch('/api/contacts?limit=500')
        const data = await res.json()
        const contactList = data.contacts || []
        setContacts(contactList)
        setFilteredContacts(contactList)
        
        // Set initial contact name if editing
        if (initialData?.contactId) {
          const initialContact = contactList.find((c: Contact) => c.id === initialData.contactId)
          if (initialContact) {
            setSelectedContactName(initialContact.name)
            setContactSearch(initialContact.name)
          }
        }
      } catch (error) {
        console.error('Error fetching contacts:', error)
      } finally {
        setLoadingContacts(false)
      }
    }

    if (!contactId) {
      void fetchContacts()
    }
  }, [contactId, initialData?.contactId])

  // Filter contacts based on search input
  useEffect(() => {
    if (!contactSearch.trim()) {
      setFilteredContacts(contacts)
    } else {
      const search = contactSearch.toLowerCase()
      setFilteredContacts(
        contacts.filter(c => c.name.toLowerCase().includes(search))
      )
    }
  }, [contactSearch, contacts])

  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id)
    setSelectedContactName(contact.name)
    setContactSearch(contact.name)
    setShowContactDropdown(false)
  }

  const handleClearContact = () => {
    setSelectedContactId('')
    setSelectedContactName('')
    setContactSearch('')
    setShowContactDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return

    setLoading(true)
    try {
      const endpoint = journalEntryId
        ? `/api/journal-entries/${journalEntryId}/tasks`
        : selectedContactId
          ? `/api/contacts/${selectedContactId}/tasks`
          : '/api/tasks'
      
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/tasks/${initialData?.id}` : endpoint

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        taskType,
        priority,
        contactId: selectedContactId || null,
      }

      if (journalEntryId) {
        payload.journalEntryId = journalEntryId
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSave()
        onClose()
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error saving task:', res.status, errorData)
        alert(`Fehler beim Speichern: ${errorData.error || res.statusText}`)
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Netzwerkfehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal modal-open z-[1200]">
      <div className="modal-box max-w-md">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <IconX size={20} />
        </button>

        <h3 className="font-bold text-lg mb-4">
          {isEditing ? 'Task bearbeiten' : 'Neuer Task'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Titel *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Was ist zu tun?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Beschreibung</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-20"
              placeholder="Weitere Details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {!contactId && (
            <div className="form-control mb-3">
              <label className="label">
                <span className="label-text">Kontakt (optional)</span>
              </label>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      ref={contactInputRef}
                      type="text"
                      className="input input-bordered w-full pl-9"
                      placeholder="Kontakt suchen..."
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value)
                        setShowContactDropdown(true)
                        if (!e.target.value) {
                          setSelectedContactId('')
                          setSelectedContactName('')
                        }
                      }}
                      onFocus={() => setShowContactDropdown(true)}
                      disabled={loadingContacts}
                    />
                  </div>
                  {selectedContactId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={handleClearContact}
                      title="Kontakt entfernen"
                    >
                      <IconX size={16} />
                    </button>
                  )}
                </div>
                
                {/* Dropdown */}
                {showContactDropdown && !loadingContacts && (
                  <div className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="p-3 text-sm text-base-content/60">
                        {contactSearch ? 'Keine Kontakte gefunden' : 'Keine Kontakte vorhanden'}
                      </div>
                    ) : (
                      filteredContacts.slice(0, 20).map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-base-200 transition-colors ${
                            selectedContactId === contact.id ? 'bg-primary/10 text-primary' : ''
                          }`}
                          onClick={() => handleContactSelect(contact)}
                        >
                          <IconUser size={16} className="flex-shrink-0" />
                          <span className="truncate">{contact.name}</span>
                        </button>
                      ))
                    )}
                    {filteredContacts.length > 20 && (
                      <div className="p-2 text-xs text-base-content/50 text-center border-t">
                        Zeige 20 von {filteredContacts.length} Kontakten
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedContactName && (
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <IconUser size={12} />
                  Ausgewählt: {selectedContactName}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Typ</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
              >
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Priorität</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Fälligkeit</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <span className="loading loading-spinner" />
            ) : (
              <>
                <IconPlus size={20} />
                {isEditing ? 'Speichern' : 'Task erstellen'}
              </>
            )}
          </button>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  )
}
