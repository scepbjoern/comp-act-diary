'use client'

import { useState, useEffect } from 'react'
import { IconPlus, IconStar, IconArchive, IconRefresh, IconSearch, IconNetwork, IconSortAscending, IconFilter } from '@tabler/icons-react'
import ContactCard from './ContactCard'
import Link from 'next/link'
import { useReadMode } from '@/hooks/useReadMode'

interface Contact {
  id: string
  slug: string
  name: string
  givenName?: string | null
  familyName?: string | null
  emailPrivate?: string | null
  emailWork?: string | null
  phonePrivate?: string | null
  phoneWork?: string | null
  company?: string | null
  jobTitle?: string | null
  isFavorite: boolean
  googleResourceName?: string | null
}

interface ContactListProps {
  initialContacts?: Contact[]
  initialTotal?: number
}

export default function ContactList({ initialContacts = [], initialTotal = 0 }: ContactListProps) {
  const { readMode } = useReadMode()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites' | 'archived'>('all')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(initialTotal)
  const [groups, setGroups] = useState<Array<{ id: string; name: string; contactCount: number }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'givenName' | 'familyName' | 'updatedAt' | 'createdAt'>('givenName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const PAGE_SIZE = 24

  useEffect(() => {
    fetch('/api/contact-groups')
      .then(res => res.json())
      .then(data => setGroups(data.groups || []))
      .catch(console.error)
  }, [])

  const fetchContacts = async (reset = true) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter === 'favorites') params.set('isFavorite', 'true')
      if (filter === 'archived') params.set('isArchived', 'true')
      if (selectedGroupId) params.set('groupId', selectedGroupId)
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(reset ? 0 : contacts.length))
      
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      
      if (data.contacts) {
        if (reset) {
          setContacts(data.contacts)
        } else {
          setContacts(prev => {
            const newContacts = data.contacts.filter(
              (nc: Contact) => !prev.some(pc => pc.id === nc.id)
            )
            return [...prev, ...newContacts]
          })
        }
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => fetchContacts(false)

  useEffect(() => {
    // Only fetch if we don't have initial contacts or if search/filters changed from default
    const isDefaultFilter = filter === 'all' && !search && sortBy === 'givenName' && sortOrder === 'asc' && !selectedGroupId
    if (initialContacts.length > 0 && isDefaultFilter) {
      return
    }
    void fetchContacts(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, sortBy, sortOrder, selectedGroupId])


  const handleToggleFavorite = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleFavorite' }),
      })
      
      if (res.ok) {
        const { isFavorite } = await res.json()
        setContacts(prev => 
          prev.map(c => c.id === contactId ? { ...c, isFavorite } : c)
        )
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Kontakte</h1>
        <div className="flex gap-2">
          <Link href="/prm/network" className="btn btn-ghost btn-sm">
            <IconNetwork size={18} />
            Netzwerk
          </Link>
          {/* Hide new contact button in read mode */}
          {!readMode && (
            <Link href="/prm/new" className="btn btn-primary btn-sm">
              <IconPlus size={18} />
              Neuer Kontakt
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="join flex-1">
          <div className="join-item flex items-center px-3 bg-base-200">
            <IconSearch size={18} className="text-base-content/50" />
          </div>
          <input
            type="text"
            placeholder="Kontakte suchen..."
            className="input input-bordered join-item flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-active' : 'btn-ghost bg-base-200'}`}
            onClick={() => setFilter('all')}
          >
            Alle
          </button>
          <button
            className={`btn btn-sm ${filter === 'favorites' ? 'btn-active' : 'btn-ghost bg-base-200'}`}
            onClick={() => setFilter('favorites')}
          >
            <IconStar size={16} />
            Favoriten
          </button>
          <button
            className={`btn btn-sm ${filter === 'archived' ? 'btn-active' : 'btn-ghost bg-base-200'}`}
            onClick={() => setFilter('archived')}
          >
            <IconArchive size={16} />
            Archiv
          </button>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fetchContacts(true)}
          disabled={loading}
        >
          <IconRefresh size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sort & Filter Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <IconSortAscending size={20} className="text-base-content/60" />
          <select
            className="select select-bordered select-md min-w-[180px]"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
              setSortBy(field)
              setSortOrder(order)
            }}
          >
            <option value="givenName-asc">Vorname A-Z</option>
            <option value="givenName-desc">Vorname Z-A</option>
            <option value="familyName-asc">Nachname A-Z</option>
            <option value="familyName-desc">Nachname Z-A</option>
            <option value="updatedAt-desc">Zuletzt aktualisiert</option>
            <option value="createdAt-desc">Neueste zuerst</option>
            <option value="createdAt-asc">Älteste zuerst</option>
          </select>
        </div>

        {/* Groups Filter Dropdown */}
        {groups.length > 0 && (
          <div className="flex items-center gap-2">
            <IconFilter size={20} className="text-base-content/60" />
            <select
              className="select select-bordered select-md min-w-[180px]"
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value || null)}
            >
              <option value="">Alle Gruppen</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.contactCount})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-base-content/60 ml-auto">
          {total} Kontakt{total !== 1 ? 'e' : ''} gefunden
        </div>
      </div>

      {/* Contact Grid */}
      {loading && contacts.length === 0 ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60">Keine Kontakte gefunden</p>
          <Link href="/prm/new" className="btn btn-primary btn-sm mt-4">
            <IconPlus size={18} />
            Ersten Kontakt erstellen
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
          
          {contacts.length < total && (
            <div className="flex justify-center mt-6">
              <button
                className="btn btn-outline btn-sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  `Mehr laden (${contacts.length} von ${total})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
