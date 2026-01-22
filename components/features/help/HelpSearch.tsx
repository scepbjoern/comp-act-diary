'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { IconSearch, IconX } from '@tabler/icons-react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { searchTopics } from '@/lib/help/helpStructure'

export function HelpSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<ReturnType<typeof searchTopics>>([])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (value.trim().length >= 2) {
      const searchResults = searchTopics(value)
      setResults(searchResults.slice(0, 8))
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [])

  const handleSelect = (categorySlug: string, topicSlug: string) => {
    setQuery('')
    setIsOpen(false)
    router.push(`/help/${categorySlug}/${topicSlug}`)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
        <input
          type="text"
          placeholder="Hilfe durchsuchen..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="input input-bordered w-full pl-10 pr-10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-200 border border-base-300 rounded-lg shadow-lg overflow-hidden">
          {results.map(({ category, topic }) => (
            <button
              key={`${category.slug}-${topic.slug}`}
              onClick={() => handleSelect(category.slug, topic.slug)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-base-300 transition-colors text-left"
            >
              <TablerIcon name={topic.icon} size={20} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm">{topic.title}</div>
                <div className="text-xs text-base-content/60 truncate">
                  {category.title} • {topic.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-200 border border-base-300 rounded-lg shadow-lg p-4 text-center text-sm text-base-content/60">
          Keine Ergebnisse für "{query}"
        </div>
      )}
    </div>
  )
}
