'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconPlus, IconX, IconUsers } from '@tabler/icons-react'

interface Group {
  id: string
  name: string
  slug: string
  taggingId: string
}

interface AvailableGroup {
  id: string
  name: string
  contactCount: number
}

interface ContactGroupsEditorProps {
  contactId: string
}

export default function ContactGroupsEditor({ contactId }: ContactGroupsEditorProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/groups`)
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }, [contactId])

  const fetchAvailableGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/contact-groups')
      if (res.ok) {
        const data = await res.json()
        setAvailableGroups(data.groups || [])
      }
    } catch (error) {
      console.error('Error fetching available groups:', error)
    }
  }, [])

  useEffect(() => {
    void fetchGroups()
    void fetchAvailableGroups()
  }, [contactId, fetchGroups, fetchAvailableGroups])

  const handleAddGroup = async (groupId: string) => {
    setAdding(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        setGroups([...groups, data.group])
        setShowDropdown(false)
      }
    } catch (error) {
      console.error('Error adding to group:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveGroup = async (taggingId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/groups?taggingId=${taggingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setGroups(groups.filter(g => g.taggingId !== taggingId))
      }
    } catch (error) {
      console.error('Error removing from group:', error)
    }
  }

  // Filter out groups the contact is already in
  const unassignedGroups = availableGroups.filter(
    ag => !groups.some(g => g.id === ag.id)
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-base-content/60">
        <span className="loading loading-spinner loading-xs" />
        Gruppen laden...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
        <IconUsers size={16} />
        Gruppen
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.length === 0 && !showDropdown && (
          <span className="text-sm text-base-content/50">Keine Gruppen zugewiesen</span>
        )}

        {groups.map(group => (
          <div
            key={group.taggingId}
            className="badge badge-outline gap-1 pr-1"
          >
            {group.name}
            <button
              onClick={() => handleRemoveGroup(group.taggingId)}
              className="btn btn-ghost btn-xs btn-circle"
              title="Aus Gruppe entfernen"
            >
              <IconX size={12} />
            </button>
          </div>
        ))}

        {showDropdown ? (
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-xs"
              onChange={(e) => {
                if (e.target.value) void handleAddGroup(e.target.value)
              }}
              disabled={adding}
              defaultValue=""
            >
              <option value="" disabled>Gruppe wählen...</option>
              {unassignedGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowDropdown(false)}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <IconX size={14} />
            </button>
          </div>
        ) : (
          unassignedGroups.length > 0 && (
            <button
              onClick={() => setShowDropdown(true)}
              className="btn btn-ghost btn-xs gap-1"
            >
              <IconPlus size={14} />
              Gruppe
            </button>
          )
        )}
      </div>
    </div>
  )
}
