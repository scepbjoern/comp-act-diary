'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete'
import '@webscopeio/react-textarea-autocomplete/style.css'

interface Contact {
  id: string
  name: string
  slug: string
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange?: (mentions: Array<{ contactId: string; contactName: string }>) => void
  placeholder?: string
  className?: string
  rows?: number
}

const ContactItem = ({ entity }: { entity: Contact }) => (
  <div className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 cursor-pointer">
    <div className="avatar placeholder">
      <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm">
        {entity.name.charAt(0)}
      </div>
    </div>
    <span>{entity.name}</span>
  </div>
)

const Loading = () => (
  <div className="px-3 py-2 text-base-content/60">
    <span className="loading loading-spinner loading-xs mr-2" />
    Laden...
  </div>
)

export default function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  placeholder = 'Schreibe hier... Verwende @ für Erwähnungen',
  className = '',
  rows = 4,
}: MentionTextareaProps) {
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    // Preload contacts for faster autocomplete
    fetch('/api/contacts?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.contacts) {
          setContacts(data.contacts.map((c: { id: string; name: string; slug: string }) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          })))
        }
      })
      .catch(console.error)
  }, [])

  // Extract mentions from text when it changes
  useEffect(() => {
    if (onMentionsChange && contacts.length > 0) {
      const mentions: Array<{ contactId: string; contactName: string }> = []
      const textLower = value.toLowerCase()
      
      for (const contact of contacts) {
        const nameLower = contact.name.toLowerCase()
        if (textLower.includes(nameLower)) {
          // Check word boundaries
          const regex = new RegExp(`\\b${escapeRegex(contact.name)}\\b`, 'gi')
          if (regex.test(value)) {
            mentions.push({ contactId: contact.id, contactName: contact.name })
          }
        }
      }
      
      onMentionsChange(mentions)
    }
  }, [value, contacts, onMentionsChange])

  const loadContacts = useCallback(async (token: string): Promise<Contact[]> => {
    if (!token) return contacts.slice(0, 10)
    
    const filtered = contacts.filter(c => 
      c.name.toLowerCase().includes(token.toLowerCase())
    )
    
    if (filtered.length > 0) return filtered.slice(0, 10)
    
    // Fallback to API search
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(token)}`)
      const data = await res.json()
      return (data.contacts || []).map((c: { id: string; name: string; slug: string }) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }))
    } catch {
      return []
    }
  }, [contacts])

  return (
    <div className={`mention-textarea-wrapper ${className}`}>
      <ReactTextareaAutocomplete
        value={value}
        onChange={(e) => onChange(e.target.value)}
        loadingComponent={Loading}
        className="textarea textarea-bordered w-full"
        style={{ minHeight: `${rows * 1.5}rem` }}
        placeholder={placeholder}
        trigger={{
          '@': {
            dataProvider: loadContacts,
            component: ContactItem,
            output: (item: Contact) => `@${item.name}`,
          },
        }}
        containerClassName="mention-container"
        dropdownClassName="bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        listClassName="py-1"
      />
      <style jsx global>{`
        .mention-textarea-wrapper .rta__autocomplete {
          z-index: 50;
        }
        .mention-textarea-wrapper .rta__list {
          background: var(--fallback-b1, oklch(var(--b1)));
          border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.2));
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          max-height: 15rem;
          overflow-y: auto;
        }
        .mention-textarea-wrapper .rta__item {
          cursor: pointer;
        }
        .mention-textarea-wrapper .rta__item--selected {
          background: var(--fallback-b2, oklch(var(--b2)));
        }
      `}</style>
    </div>
  )
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
