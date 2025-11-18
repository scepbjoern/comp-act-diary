import { useCallback, useState } from 'react'

export function useUIState() {
  const [darmkurCollapsed, setDarmkurCollapsed] = useState(true)
  const [viewer, setViewer] = useState<{ noteId: string; index: number } | null>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [forceBarVisible, setForceBarVisible] = useState(false)

  const toggleDarmkur = useCallback(() => {
    setDarmkurCollapsed(prev => !prev)
  }, [])

  const openViewer = useCallback((noteId: string, index: number) => {
    setViewer({ noteId, index })
  }, [])

  const closeViewer = useCallback(() => {
    setViewer(null)
    setSwipeStartX(null)
  }, [])

  const flashSaveBar = useCallback((duration = 2000) => {
    setForceBarVisible(true)
    setTimeout(() => setForceBarVisible(false), duration)
  }, [])

  return {
    // State
    darmkurCollapsed,
    viewer,
    swipeStartX,
    forceBarVisible,
    
    // Setters
    setDarmkurCollapsed,
    setViewer,
    setSwipeStartX,
    setForceBarVisible,
    
    // Actions
    toggleDarmkur,
    openViewer,
    closeViewer,
    flashSaveBar,
  }
}
