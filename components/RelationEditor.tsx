'use client'

import { useState, useEffect } from 'react'
import { IconX, IconUserPlus, IconSearch } from '@tabler/icons-react'

interface Contact {
  id: string
  name: string
  slug: string
}

interface RelationEditorProps {
  contactId: string
  contactName: string
  existingRelations?: Array<{
    id: string
    relationType: string
    personB: Contact
  }>
  onClose: () => void
  onSave: () => void
}

const RELATION_TYPES = [
  'Partner', 'Ehepartner', 'Freund', 'Freundin', 'Bekannter', 'Bekannte',
  'Kollege', 'Kollegin', 'Chef', 'Chefin', 'Mitarbeiter', 'Mitarbeiterin',
  'Vater', 'Mutter', 'Sohn', 'Tochter', 'Bruder', 'Schwester',
  'Grossvater', 'Grossmutter', 'Onkel', 'Tante', 'Cousin', 'Cousine',
  'Neffe', 'Nichte', 'Schwager', 'Schwägerin', 'Schwiegervater', 'Schwiegermutter',
  'Nachbar', 'Nachbarin', 'Arzt', 'Ärztin', 'Therapeut', 'Therapeutin',
  'Lehrer', 'Lehrerin', 'Mentor', 'Mentorin', 'Sonstiges'
]

export default function RelationEditor({
  contactId,
  contactName,
  existingRelations = [],
  onClose,
  onSave,
}: RelationEditorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [relationType, setRelationType] = useState('Freund')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const searchContacts = async () => {
      // Don't search if query is too short OR if it matches the already selected contact's name
      if (searchQuery.length < 2 || (selectedContact && selectedContact.name === searchQuery)) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
        const data = await res.json()
        // Filter out current contact and already related contacts
        const existingIds = new Set([contactId, ...existingRelations.map(r => r.personB.id)])
        
        // Also filter out the currently selected contact to not show it in the results again
        const results = (data.contacts || []).filter((c: Contact) => 
          !existingIds.has(c.id) && c.id !== selectedContact?.id
        )
        
        setSearchResults(results)
      } catch (error) {
        console.error('Error searching contacts:', error)
      } finally {
        setSearching(false)
      }
    }

    const debounce = setTimeout(searchContacts, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, contactId, existingRelations])

  const handleAddRelation = async () => {
    if (!selectedContact) return

    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personAId: contactId,
          personBId: selectedContact.id,
          relationType,
        }),
      })

      if (res.ok) {
        onSave()
        setSelectedContact(null)
        setSearchQuery('')
      }
    } catch (error) {
      console.error('Error adding relation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await fetch(`/api/contacts/${contactId}/relations?relationId=${relationId}`, {
        method: 'DELETE',
      })
      onSave()
    } catch (error) {
      console.error('Error deleting relation:', error)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <IconX size={20} />
        </button>

        <h3 className="font-bold text-lg mb-4">
          Beziehungen von {contactName}
        </h3>

        {/* Existing Relations */}
        {existingRelations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Bestehende Beziehungen</h4>
            <div className="space-y-2">
              {existingRelations.map((relation) => (
                <div
                  key={relation.id}
                  className="flex items-center justify-between bg-base-200 rounded-lg p-2"
                >
                  <span>
                    <span className="font-medium">{relation.personB.name}</span>
                    <span className="text-sm opacity-70 ml-2">({relation.relationType})</span>
                  </span>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDeleteRelation(relation.id)}
                  >
                    <IconX size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Relation */}
        <div className="divider">Neue Beziehung</div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Person suchen</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className="input input-bordered w-full pr-10"
              placeholder="Name eingeben..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <IconSearch className="absolute right-3 top-3 opacity-50" size={20} />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <ul className="menu bg-base-200 rounded-box mt-1 max-h-40 overflow-y-auto">
              {searchResults.map((contact) => (
                <li key={contact.id}>
                  <button
                    className={selectedContact?.id === contact.id ? 'active' : ''}
                    onClick={() => {
                      setSelectedContact(contact)
                      setSearchQuery(contact.name)
                      setSearchResults([])
                    }}
                  >
                    {contact.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && <span className="loading loading-spinner loading-sm mt-2" />}
        </div>

        {selectedContact && (
          <>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Beziehungstyp</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
              >
                {RELATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt">
                  {contactName} ist {relationType} von {selectedContact.name}
                </span>
              </label>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleAddRelation}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <IconUserPlus size={20} />
                  Beziehung hinzufügen
                </>
              )}
            </button>
          </>
        )}
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  )
}
