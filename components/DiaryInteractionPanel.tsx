'use client'

import { useState, useEffect } from 'react'
import { IconUsers, IconPlus, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import MentionInput from './MentionInput'

interface Contact {
  id: string
  slug: string
  name: string
}

interface Interaction {
  id: string
  kind: string
  notes?: string | null
  occurredAt: string
  contact: Contact
}

interface DiaryInteractionPanelProps {
  date: string // YYYY-MM-DD format
  timeBoxId?: string
  onInteractionAdded?: () => void
}

const INTERACTION_KIND_LABELS: Record<string, string> = {
  GENERAL: 'Allgemein',
  CALL: 'Anruf',
  VIDEO: 'Videoanruf',
  MEETING: 'Treffen',
  MESSAGE: 'Nachricht',
  EMAIL: 'E-Mail',
  LETTER: 'Brief',
  SOCIAL: 'Social Media',
  MENTION: 'Erwähnung',
}

export default function DiaryInteractionPanel({
  date,
  timeBoxId,
  onInteractionAdded,
}: DiaryInteractionPanelProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [kind, setKind] = useState('MEETING')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchInteractions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, timeBoxId])

  const fetchInteractions = async () => {
    try {
      setLoading(true)
      const url = timeBoxId 
        ? `/api/interactions?timeBoxId=${timeBoxId}`
        : `/api/interactions?date=${date}`
      const res = await fetch(url)
      const data = await res.json()
      setInteractions(data.interactions || [])
    } catch (error) {
      console.error('Error fetching interactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts?limit=50')
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleOpenAddForm = () => {
    setShowAddForm(true)
    if (contacts.length === 0) {
      fetchContacts()
    }
  }

  const handleAddInteraction = async () => {
    if (!selectedContactId) return

    setSaving(true)
    try {
      // Set occurredAt to the selected date at current time
      const occurredAt = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`)
      const res = await fetch(`/api/contacts/${selectedContactId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          kind,
          notes: notes || null,
          occurredAt: occurredAt.toISOString(),
          timeBoxId: timeBoxId || undefined,
        }),
      })

      if (res.ok) {
        setShowAddForm(false)
        setSelectedContactId('')
        setKind('MEETING')
        setNotes('')
        fetchInteractions()
        onInteractionAdded?.()
      }
    } catch (error) {
      console.error('Error adding interaction:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card bg-base-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <IconUsers size={18} />
          Interaktionen
        </h3>
        <button
          className="btn btn-xs btn-ghost"
          onClick={handleOpenAddForm}
        >
          <IconPlus size={16} />
          Hinzufügen
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-sm" />
        </div>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">
          Keine Interaktionen verknüpft
        </p>
      ) : (
        <ul className="space-y-2">
          {interactions.map((interaction) => (
            <li key={interaction.id} className="flex items-center justify-between text-sm">
              <div>
                <Link
                  href={`/prm/${interaction.contact.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {interaction.contact.name}
                </Link>
                <span className="text-xs text-gray-500 ml-2">
                  {INTERACTION_KIND_LABELS[interaction.kind] || interaction.kind}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(interaction.occurredAt), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showAddForm && (
        <div className="mt-4 p-3 bg-base-300 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Neue Interaktion</span>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setShowAddForm(false)}
            >
              <IconX size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <select
              className="select select-sm select-bordered w-full"
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
            >
              <option value="">Kontakt wählen...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>

            <select
              className="select select-sm select-bordered w-full"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {Object.entries(INTERACTION_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <MentionInput
              value={notes}
              onChange={setNotes}
              placeholder="Notizen (optional, @Name für Erwähnungen)"
              rows={2}
              className="textarea-sm"
            />

            <button
              className="btn btn-sm btn-primary w-full"
              onClick={handleAddInteraction}
              disabled={!selectedContactId || saving}
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
