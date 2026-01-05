'use client'

import { useState, useEffect } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MentionContact {
  id: string
  slug: string
  name: string
  namesToDetectAsMention?: string[]
}

interface DiaryContentWithMentionsProps {
  noteId: string
  markdown: string
  className?: string
}

export function DiaryContentWithMentions({ noteId, markdown, className }: DiaryContentWithMentionsProps) {
  const [mentionedContacts, setMentionedContacts] = useState<MentionContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMentions() {
      try {
        const res = await fetch(`/api/journal-entries/${noteId}/mentions`)
        if (res.ok) {
          const data = await res.json()
          if (data.mentions && data.mentions.length > 0) {
            setMentionedContacts(data.mentions.map((m: { contactId: string; contactName: string; contactSlug: string; namesToDetectAsMention: string[] }) => ({
              id: m.contactId,
              name: m.contactName,
              slug: m.contactSlug,
              namesToDetectAsMention: m.namesToDetectAsMention || [],
            })))
          }
        }
      } catch (error) {
        console.error('Error fetching mentions:', error)
      } finally {
        setLoading(false)
      }
    }

    if (noteId) {
      fetchMentions()
    } else {
      setLoading(false)
    }
  }, [noteId])

  // Show loading state briefly, then render with whatever mentions we have
  if (loading) {
    return <MarkdownRenderer markdown={markdown} className={className} />
  }

  return (
    <MarkdownRenderer 
      markdown={markdown} 
      className={className}
      mentionedContacts={mentionedContacts}
    />
  )
}
