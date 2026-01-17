/**
 * Read Mode Context and Hook
 * Provides a global read-only mode that disables all CUD actions and AI generation.
 * State is persisted per device using LocalStorage.
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const STORAGE_KEY = 'readModeEnabled'

interface ReadModeContextValue {
  readMode: boolean
  setReadMode: (value: boolean) => void
  toggleReadMode: () => void
}

const ReadModeContext = createContext<ReadModeContextValue | undefined>(undefined)

interface ReadModeProviderProps {
  children: ReactNode
}

/**
 * Provider component for read mode state.
 * Wraps the app and provides read mode context to all children.
 */
export function ReadModeProvider({ children }: ReadModeProviderProps) {
  // Initialize with false, then load from localStorage in useEffect to avoid SSR mismatch
  const [readMode, setReadModeState] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load initial state from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setReadModeState(true)
      document.documentElement.setAttribute('data-read-mode', 'true')
    }
    setIsHydrated(true)
  }, [])

  // Update localStorage and document attribute when state changes
  const setReadMode = useCallback((value: boolean) => {
    setReadModeState(value)
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    
    if (value) {
      document.documentElement.setAttribute('data-read-mode', 'true')
    } else {
      document.documentElement.removeAttribute('data-read-mode')
    }
  }, [])

  const toggleReadMode = useCallback(() => {
    setReadMode(!readMode)
  }, [readMode, setReadMode])

  // Prevent flash of incorrect state before hydration
  const contextValue: ReadModeContextValue = {
    readMode: isHydrated ? readMode : false,
    setReadMode,
    toggleReadMode,
  }

  return (
    <ReadModeContext.Provider value={contextValue}>
      {children}
    </ReadModeContext.Provider>
  )
}

/**
 * Hook to access read mode state and controls.
 * Use this in any component that needs to check or change read mode.
 * 
 * @example
 * const { readMode, toggleReadMode } = useReadMode()
 * if (readMode) return null // Hide component in read mode
 */
export function useReadMode(): ReadModeContextValue {
  const context = useContext(ReadModeContext)
  if (context === undefined) {
    throw new Error('useReadMode must be used within a ReadModeProvider')
  }
  return context
}
