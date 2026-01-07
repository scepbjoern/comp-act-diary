'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePasscodeLock } from '@/hooks/usePasscodeLock'
import { PasscodeLockScreen } from '@/components/PasscodeLockScreen'

interface PasscodeLockProviderProps {
  children: ReactNode
}

/**
 * Provider component that wraps the app and shows the lock screen when needed.
 * Should be placed high in the component tree (e.g., in layout.tsx).
 */
export function PasscodeLockProvider({ children }: PasscodeLockProviderProps) {
  const { isLocked, isLoading, settings, unlock } = usePasscodeLock()
  const [passcodeLength, setPasscodeLength] = useState(4)

  // Fetch passcode length from settings
  useEffect(() => {
    async function fetchPasscodeLength() {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          const length = data.user?.settings?.passcodeLength
          if (typeof length === 'number' && length >= 2 && length <= 6) {
            setPasscodeLength(length)
          }
        }
      } catch {}
    }
    if (isLocked && settings?.enabled) {
      fetchPasscodeLength()
    }
  }, [isLocked, settings?.enabled])

  // Show loading state briefly while checking lock status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // Show lock screen if locked
  if (isLocked && settings?.enabled) {
    return (
      <>
        {/* Render children but hidden behind lock screen */}
        <div className="invisible" aria-hidden="true">
          {children}
        </div>
        <PasscodeLockScreen 
          onUnlock={unlock} 
          passcodeLength={passcodeLength}
        />
      </>
    )
  }

  return <>{children}</>
}
