import { useCallback, useEffect, useMemo, useState } from 'react'

type SymptomData = Record<string, number | undefined>
type SymptomIcons = Record<string, string | null>

export function useSymptomManagement(
  day: { id: string; symptoms: SymptomData; userSymptoms?: { id: string; score?: number }[] } | null,
  date: string,
  onSavingChange: (saving: boolean) => void
) {
  // Draft states for symptoms to enable manual save and clear UX feedback
  const [draftSymptoms, setDraftSymptoms] = useState<SymptomData>({})
  const [draftUserSymptoms, setDraftUserSymptoms] = useState<SymptomData>({})
  const [clearedSymptoms, setClearedSymptoms] = useState<Set<string>>(new Set())
  const [clearedUserSymptoms, setClearedUserSymptoms] = useState<Set<string>>(new Set())
  const [symptomIcons, setSymptomIcons] = useState<SymptomIcons>({})

  // When day changes, discard any symptom drafts to avoid leaking to a different day
  useEffect(() => {
    setDraftSymptoms({})
    setDraftUserSymptoms({})
    setClearedSymptoms(new Set())
    setClearedUserSymptoms(new Set())
  }, [day?.id])

  // Draft helper for standard symptoms
  const setDraftSymptom = useCallback((type: string, score: number) => {
    if (!day) return
    // Selecting a new value removes any clear-intent
    setClearedSymptoms(prev => {
      if (prev.has(type)) {
        const next = new Set(prev)
        next.delete(type)
        return next
      }
      return prev
    })
    setDraftSymptoms(prev => {
      const serverVal = day?.symptoms?.[type]
      if (serverVal === score) {
        const { [type]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [type]: score }
    })
  }, [day])

  // Draft helper for user symptoms
  const setDraftUserSymptom = useCallback((id: string, score: number) => {
    if (!day) return
    setClearedUserSymptoms(prev => {
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      return prev
    })
    setDraftUserSymptoms(prev => {
      const serverVal = (day?.userSymptoms || []).find(u => u.id === id)?.score
      if (serverVal === score) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: score }
    })
  }, [day])

  // Clear draft symptom
  const clearDraftSymptom = useCallback((type: string) => {
    if (!day) return
    setDraftSymptoms(prev => {
      if (prev[type] !== undefined) {
        const { [type]: _omit, ...rest } = prev
        return rest
      }
      return prev
    })
    setClearedSymptoms(prev => new Set(prev).add(type))
  }, [day])

  // Clear draft user symptom
  const clearDraftUserSymptom = useCallback((id: string) => {
    if (!day) return
    setDraftUserSymptoms(prev => {
      if (prev[id] !== undefined) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return prev
    })
    setClearedUserSymptoms(prev => new Set(prev).add(id))
  }, [day])

  // Count unsaved changes
  const unsavedSymptomCount = useMemo(() => (
    Object.keys(draftSymptoms).length + 
    Object.keys(draftUserSymptoms).length + 
    clearedSymptoms.size + 
    clearedUserSymptoms.size
  ), [draftSymptoms, draftUserSymptoms, clearedSymptoms, clearedUserSymptoms])

  // Save all draft symptoms
  const saveDraftSymptoms = useCallback(async () => {
    if (!day) return
    
    const entries = Object.entries(draftSymptoms).filter(([, v]) => typeof v === 'number') as [string, number][]
    const userEntries = Object.entries(draftUserSymptoms).filter(([, v]) => typeof v === 'number') as [string, number][]
    const cleared = Array.from(clearedSymptoms)
    const clearedUser = Array.from(clearedUserSymptoms)
    
    if (entries.length === 0 && userEntries.length === 0 && cleared.length === 0 && clearedUser.length === 0) return
    
    onSavingChange(true)
    
    try {
      // Build scores object for system symptoms (includes cleared as null)
      const scores: Record<string, number | null> = {}
      for (const [type, score] of entries) {
        scores[type] = score
      }
      for (const type of cleared) {
        scores[type] = null
      }
      
      // Build scores object for user symptoms
      const userScores: Record<string, number | null> = {}
      for (const [id, score] of userEntries) {
        userScores[id] = score
      }
      for (const id of clearedUser) {
        userScores[id] = null
      }
      
      const promises: Promise<unknown>[] = []
      
      // Save system symptoms in one request
      if (Object.keys(scores).length > 0) {
        promises.push(
          fetch(`/api/day/${day.id}/symptoms`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scores }),
            credentials: 'same-origin',
          }).then(r => r.json()).catch(() => ({}))
        )
      }
      
      // Save user symptoms in one request
      if (Object.keys(userScores).length > 0) {
        promises.push(
          fetch(`/api/day/${day.id}/user-symptoms`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scores: userScores }),
            credentials: 'same-origin',
          }).then(r => r.json()).catch(() => ({}))
        )
      }
      
      await Promise.all(promises)
      
      // Clear drafts after successful save
      setDraftSymptoms({})
      setDraftUserSymptoms({})
      setClearedSymptoms(new Set())
      setClearedUserSymptoms(new Set())
      
      return true
    } catch (error) {
      console.error('Save symptoms failed:', error)
      return false
    } finally {
      onSavingChange(false)
    }
  }, [day, draftSymptoms, draftUserSymptoms, clearedSymptoms, clearedUserSymptoms, onSavingChange])

  // Discard all draft symptoms
  const discardDraftSymptoms = useCallback(() => {
    setDraftSymptoms({})
    setDraftUserSymptoms({})
    setClearedSymptoms(new Set())
    setClearedUserSymptoms(new Set())
  }, [])

  return {
    // State
    draftSymptoms,
    draftUserSymptoms,
    clearedSymptoms,
    clearedUserSymptoms,
    symptomIcons,
    unsavedSymptomCount,
    
    // Setters
    setSymptomIcons,
    setDraftSymptom,
    setDraftUserSymptom,
    clearDraftSymptom,
    clearDraftUserSymptom,
    
    // Actions
    saveDraftSymptoms,
    discardDraftSymptoms,
  }
}
