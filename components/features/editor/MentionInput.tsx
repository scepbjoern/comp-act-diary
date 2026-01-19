'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Contact {
  id: string
  slug: string
  name: string
  nickname?: string | null
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
}

interface Mention {
  contactId: string
  name: string
  startIndex: number
  endIndex: number
}

export default function MentionInput({
  value,
  onChange,
  placeholder = 'Text eingeben... Verwende @Name für Erwähnungen',
  className = '',
  rows = 4,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.contacts || [])
    } catch (error) {
      console.error('Error searching contacts:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (mentionQuery) {
        void searchContacts(mentionQuery)
      }
    }, 200)
    return () => clearTimeout(debounce)
  }, [mentionQuery, searchContacts])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    onChange(newValue)

    // Check if we're typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1)
      // Check if there's a space or newline between @ and cursor
      if (!/[\s\n]/.test(textAfterAt)) {
        setMentionQuery(textAfterAt)
        setMentionStartIndex(atIndex)
        setShowSuggestions(true)
        setSelectedIndex(0)
        return
      }
    }
    
    setShowSuggestions(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }

  const insertMention = (contact: Contact) => {
    if (mentionStartIndex === -1) return

    const beforeMention = value.substring(0, mentionStartIndex)
    const afterMention = value.substring(mentionStartIndex + mentionQuery.length + 1)
    const mentionText = `@${contact.name}`
    
    const newValue = beforeMention + mentionText + ' ' + afterMention
    onChange(newValue)
    
    setShowSuggestions(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
      const newCursorPos = beforeMention.length + mentionText.length + 1
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        insertMention(suggestions[selectedIndex])
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`textarea textarea-bordered w-full ${className}`}
      />
      
      {showSuggestions && (
        <div className="absolute z-50 w-64 bg-base-200 rounded-lg shadow-lg border border-base-300 mt-1 overflow-hidden">
          {loading ? (
            <div className="p-3 text-center">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="menu p-0">
              {suggestions.map((contact, index) => (
                <li key={contact.id}>
                  <button
                    className={`rounded-none ${index === selectedIndex ? 'active' : ''}`}
                    onClick={() => insertMention(contact)}
                  >
                    <span className="font-medium">{contact.name}</span>
                    {contact.nickname && (
                      <span className="text-xs opacity-60">({contact.nickname})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : mentionQuery.length > 0 ? (
            <div className="p-3 text-sm text-gray-400">
              Kein Kontakt gefunden
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Helper to extract mentions from text
export function extractMentions(text: string, contacts: Contact[]): Mention[] {
  const mentions: Mention[] = []
  const mentionRegex = /@([\wäöüÄÖÜß\s]+)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionedName = match[1].trim()
    const contact = contacts.find(c => 
      c.name.toLowerCase() === mentionedName.toLowerCase() ||
      c.nickname?.toLowerCase() === mentionedName.toLowerCase()
    )
    
    if (contact) {
      mentions.push({
        contactId: contact.id,
        name: contact.name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
  }

  return mentions
}

// Component to render text with clickable mentions
export function MentionText({ text, contacts }: { text: string; contacts: Contact[] }) {
  const mentions = extractMentions(text, contacts)
  
  if (mentions.length === 0) {
    return <>{text}</>
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  mentions.forEach((mention, i) => {
    // Text before mention
    if (mention.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, mention.startIndex))
    }
    
    // Mention link
    const contact = contacts.find(c => c.id === mention.contactId)
    if (contact) {
      parts.push(
        <Link
          key={i}
          href={`/prm/${contact.slug}`}
          className="text-primary hover:underline font-medium"
        >
          @{mention.name}
        </Link>
      )
    }
    
    lastIndex = mention.endIndex
  })

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return <>{parts}</>
}
