'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY_LAST_ACTIVITY = 'passcode_last_activity'
const STORAGE_KEY_UNLOCKED = 'passcode_unlocked'
const STORAGE_KEY_PAUSED = 'passcode_timeout_paused'
const DEFAULT_TIMEOUT_MINUTES = 5

interface PasscodeSettings {
  enabled: boolean
  timeoutMinutes: number
}

interface UsePasscodeLockReturn {
  isLocked: boolean
  isLoading: boolean
  settings: PasscodeSettings | null
  unlock: (passcode: string) => Promise<boolean>
  lock: () => void
  updateActivity: () => void
  pauseTimeout: () => void
  resumeTimeout: () => void
  isPaused: boolean
}

/**
 * Hash a passcode string using SHA-256
 */
async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(passcode)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hook to manage passcode lock state and inactivity timeout.
 * - Uses sessionStorage for "unlocked" state (cleared on tab close)
 * - Uses localStorage for last activity timestamp (persists across tabs)
 * - Tracks user activity to reset timeout
 */
export function usePasscodeLock(): UsePasscodeLockReturn {
  const [isLocked, setIsLocked] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<PasscodeSettings | null>(null)
  const [passcodeHash, setPasscodeHash] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load settings from server
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          const userSettings = data.user?.settings || {}
          
          const passcodeEnabled = userSettings.passcodeEnabled === true
          const timeoutMinutes = userSettings.passcodeTimeoutMinutes || DEFAULT_TIMEOUT_MINUTES
          const storedHash = userSettings.passcodeHash || null
          
          setSettings({
            enabled: passcodeEnabled,
            timeoutMinutes,
          })
          setPasscodeHash(storedHash)
          
          // If passcode not enabled, always unlocked
          if (!passcodeEnabled || !storedHash) {
            setIsLocked(false)
            setIsLoading(false)
            return
          }
          
          // Check if already unlocked in this session
          const sessionUnlocked = sessionStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true'
          const lastActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY)
          
          if (sessionUnlocked && lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10)
            const timeoutMs = timeoutMinutes * 60 * 1000
            
            if (elapsed < timeoutMs) {
              // Still within timeout, stay unlocked
              setIsLocked(false)
            } else {
              // Timeout exceeded, lock
              sessionStorage.removeItem(STORAGE_KEY_UNLOCKED)
              setIsLocked(true)
            }
          } else {
            // Not unlocked in this session
            setIsLocked(true)
          }
        }
      } catch (err) {
        console.error('Failed to load passcode settings:', err)
        // On error, default to unlocked to not block the user
        setIsLocked(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    void loadSettings()
  }, [])

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    if (settings?.enabled && !isLocked) {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString())
    }
  }, [settings?.enabled, isLocked])

  // Track user activity
  useEffect(() => {
    if (!settings?.enabled || isLocked || isLoading) return

    const events = ['click', 'keydown', 'touchstart', 'scroll', 'mousemove']
    
    // Throttle activity updates to max once per second
    let lastUpdate = 0
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastUpdate > 1000) {
        lastUpdate = now
        updateActivity()
      }
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial activity update
    updateActivity()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [settings?.enabled, isLocked, isLoading, updateActivity])

  // Check for timeout periodically (skip if paused, e.g. during audio recording)
  useEffect(() => {
    if (!settings?.enabled || isLocked || isLoading) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      return
    }

    const checkTimeout = () => {
      // Check if timeout is paused (e.g. during audio recording)
      const paused = sessionStorage.getItem(STORAGE_KEY_PAUSED) === 'true'
      if (paused) {
        // Update activity to keep timeout fresh while paused
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString())
        return
      }

      const lastActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY)
      if (!lastActivity) return

      const elapsed = Date.now() - parseInt(lastActivity, 10)
      const timeoutMs = settings.timeoutMinutes * 60 * 1000

      if (elapsed >= timeoutMs) {
        sessionStorage.removeItem(STORAGE_KEY_UNLOCKED)
        setIsLocked(true)
      }
    }

    // Check every 10 seconds
    checkIntervalRef.current = setInterval(checkTimeout, 10000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [settings, isLocked, isLoading])

  // Unlock with passcode
  const unlock = useCallback(async (passcode: string): Promise<boolean> => {
    if (!passcodeHash) return false

    try {
      const inputHash = await hashPasscode(passcode)
      
      if (inputHash === passcodeHash) {
        sessionStorage.setItem(STORAGE_KEY_UNLOCKED, 'true')
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString())
        setIsLocked(false)
        return true
      }
      return false
    } catch (err) {
      console.error('Unlock error:', err)
      return false
    }
  }, [passcodeHash])

  // Manual lock
  const lock = useCallback(() => {
    if (settings?.enabled) {
      sessionStorage.removeItem(STORAGE_KEY_UNLOCKED)
      setIsLocked(true)
    }
  }, [settings?.enabled])

  // Pause timeout (e.g. during audio recording)
  const pauseTimeout = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY_PAUSED, 'true')
    setIsPaused(true)
  }, [])

  // Resume timeout (e.g. after audio recording stops)
  const resumeTimeout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY_PAUSED)
    setIsPaused(false)
    // Update activity timestamp when resuming
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString())
  }, [])

  return {
    isLocked: settings?.enabled ? isLocked : false,
    isLoading,
    settings,
    unlock,
    lock,
    updateActivity,
    pauseTimeout,
    resumeTimeout,
    isPaused,
  }
}

/**
 * Export hash function for use in settings
 */
export { hashPasscode }
