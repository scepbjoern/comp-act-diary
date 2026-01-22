import { useCallback, useEffect, useState } from 'react'

interface Summary {
  content: string
  model: string
  generatedAt: string
  sources: string[]
}

export function useDaySummary(
  dayId: string | null,
  onToast: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  // Fetch existing summary when dayId changes
  useEffect(() => {
    if (!dayId) {
      setSummary(null)
      setFetched(false)
      return
    }

    async function fetchSummary() {
      try {
        const res = await fetch(`/api/day/${dayId}/summary`, {
          credentials: 'same-origin'
        })
        const data = await res.json()
        
        if (data.summary) {
          setSummary(data.summary)
        } else {
          setSummary(null)
        }
        setFetched(true)
      } catch (err) {
        console.error('Failed to fetch summary', err)
        setFetched(true)
      }
    }

    void fetchSummary()
  }, [dayId])

  const generateSummary = useCallback(async (force = false): Promise<Summary | null> => {
    if (!dayId) return null

    setLoading(true)
    try {
      const url = `/api/day/${dayId}/summary${force ? '?force=true' : ''}`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin'
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.message || data.error || 'Generierung fehlgeschlagen')
        onToast(errorMsg, 'error')
        return null
      }

      if (data.summary) {
        setSummary(data.summary)
        onToast('Zusammenfassung generiert', 'success')
        return data.summary as Summary
      }

      return null
    } catch (err) {
      console.error('Failed to generate summary', err)
      onToast('Generierung fehlgeschlagen', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [dayId, onToast])

  const regenerateSummary = useCallback(async () => {
    return generateSummary(true)
  }, [generateSummary])

  const deleteSummary = useCallback(async () => {
    if (!dayId) return false
    if (!window.confirm('Zusammenfassung wirklich löschen?')) return false

    setLoading(true)
    try {
      const res = await fetch(`/api/day/${dayId}/summary`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })

      if (!res.ok) {
        onToast('Löschen fehlgeschlagen', 'error')
        return false
      }

      setSummary(null)
      onToast('Zusammenfassung gelöscht', 'info')
      return true
    } catch (err) {
      console.error('Failed to delete summary', err)
      onToast('Löschen fehlgeschlagen', 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [dayId, onToast])

  return {
    summary,
    loading,
    fetched,
    generateSummary,
    regenerateSummary,
    deleteSummary
  }
}
