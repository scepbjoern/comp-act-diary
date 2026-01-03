'use client'

import { useState } from 'react'
import { IconX, IconMessagePlus } from '@tabler/icons-react'
import { format } from 'date-fns'

interface InteractionEditorProps {
  contactId: string
  contactName: string
  onClose: () => void
  onSave: () => void
}

const INTERACTION_KINDS = [
  { value: 'GENERAL', label: 'Allgemein' },
  { value: 'CALL', label: 'Anruf' },
  { value: 'VIDEO', label: 'Videoanruf' },
  { value: 'MEETING', label: 'Treffen' },
  { value: 'MESSAGE', label: 'Nachricht' },
  { value: 'EMAIL', label: 'E-Mail' },
  { value: 'LETTER', label: 'Brief' },
  { value: 'SOCIAL', label: 'Social Media' },
]

export default function InteractionEditor({
  contactId,
  contactName,
  onClose,
  onSave,
}: InteractionEditorProps) {
  const [kind, setKind] = useState('GENERAL')
  const [notes, setNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          kind,
          notes: notes || null,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      })

      if (res.ok) {
        onSave()
        onClose()
      }
    } catch (error) {
      console.error('Error adding interaction:', error)
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
          Interaktion mit {contactName}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Art der Interaktion</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {INTERACTION_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Zeitpunkt</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Notizen (optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Was wurde besprochen?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner" />
            ) : (
              <>
                <IconMessagePlus size={20} />
                Interaktion speichern
              </>
            )}
          </button>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  )
}
