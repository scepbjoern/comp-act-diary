'use client'

import { useState, useEffect } from 'react'
import { IconX, IconPlus } from '@tabler/icons-react'
import { format } from 'date-fns'

interface Contact {
  id: string
  name: string
}

interface TaskFormProps {
  contactId?: string
  onClose: () => void
  onSave: () => void
  initialData?: {
    id?: string
    title?: string
    description?: string
    dueDate?: string | null
    priority?: number
    contactId?: string
  }
}

export default function TaskForm({
  contactId,
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
  const [selectedContactId, setSelectedContactId] = useState(contactId || initialData?.contactId || '')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)

  const isEditing = Boolean(initialData?.id)

  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true)
      try {
        const res = await fetch('/api/contacts?limit=100')
        const data = await res.json()
        setContacts(data.contacts || [])
      } catch (error) {
        console.error('Error fetching contacts:', error)
      } finally {
        setLoadingContacts(false)
      }
    }

    if (!contactId) {
      void fetchContacts()
    }
  }, [contactId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return

    setLoading(true)
    try {
      const endpoint = selectedContactId
        ? `/api/contacts/${selectedContactId}/tasks`
        : '/api/tasks'
      
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/tasks/${initialData?.id}` : endpoint

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          contactId: selectedContactId || null,
        }),
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
    <div className="modal modal-open">
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
              <select
                className="select select-bordered w-full"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                disabled={loadingContacts}
              >
                <option value="">Kein Kontakt</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="form-control">
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
