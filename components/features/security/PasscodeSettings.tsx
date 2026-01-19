'use client'

import { useState, useEffect } from 'react'
import { IconShieldLock, IconLock, IconLockOpen, IconCheck, IconX } from '@tabler/icons-react'
import { hashPasscode } from '@/hooks/usePasscodeLock'

interface PasscodeSettingsProps {
  onSave: () => void
}

/**
 * Settings component for configuring passcode protection.
 * Allows enabling/disabling passcode, setting the code, and timeout duration.
 */
export function PasscodeSettings({ onSave }: PasscodeSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [passcodeLength, setPasscodeLength] = useState(4)
  const [timeoutMinutes, setTimeoutMinutes] = useState(5)
  const [currentPasscode, setCurrentPasscode] = useState('')
  const [newPasscode, setNewPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [hasExistingPasscode, setHasExistingPasscode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasscodeSetup, setShowPasscodeSetup] = useState(false)

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          const settings = data.user?.settings || {}
          
          setIsEnabled(Boolean(settings.passcodeEnabled))
          setPasscodeLength(settings.passcodeLength || 4)
          setTimeoutMinutes(settings.passcodeTimeoutMinutes || 5)
          setHasExistingPasscode(Boolean(settings.passcodeHash))
        }
      } catch (err) {
        console.error('Failed to load passcode settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    void loadSettings()
  }, [])

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleToggleEnabled = async () => {
    if (!isEnabled) {
      // Turning on - show setup
      setShowPasscodeSetup(true)
    } else {
      // Turning off - verify current passcode first if it exists
      if (hasExistingPasscode) {
        setShowPasscodeSetup(true)
      } else {
        // No passcode set, just disable
        await saveSettings({ passcodeEnabled: false })
      }
    }
  }

  const handleSetupPasscode = async () => {
    setError(null)

    // Validate passcode
    if (newPasscode.length < 2) {
      setError('Der Code muss mindestens 2 Ziffern haben')
      return
    }
    if (newPasscode.length > 6) {
      setError('Der Code darf maximal 6 Ziffern haben')
      return
    }
    if (!/^\d+$/.test(newPasscode)) {
      setError('Der Code darf nur Ziffern enthalten')
      return
    }
    if (newPasscode !== confirmPasscode) {
      setError('Die Codes stimmen nicht überein')
      return
    }

    // If changing existing passcode, verify current one
    if (hasExistingPasscode && isEnabled) {
      const currentHash = await hashPasscode(currentPasscode)
      const isValid = await verifyCurrentPasscode(currentHash)
      if (!isValid) {
        setError('Aktueller Code ist falsch')
        return
      }
    }

    // Hash and save
    const passcodeHash = await hashPasscode(newPasscode)
    await saveSettings({
      passcodeEnabled: true,
      passcodeHash,
      passcodeLength: newPasscode.length,
      passcodeTimeoutMinutes: timeoutMinutes,
    })

    setHasExistingPasscode(true)
    setIsEnabled(true)
    setShowPasscodeSetup(false)
    setCurrentPasscode('')
    setNewPasscode('')
    setConfirmPasscode('')
    setSuccess('Passcode erfolgreich gespeichert')
  }

  const handleDisablePasscode = async () => {
    setError(null)

    // Verify current passcode
    if (hasExistingPasscode) {
      const currentHash = await hashPasscode(currentPasscode)
      const isValid = await verifyCurrentPasscode(currentHash)
      if (!isValid) {
        setError('Aktueller Code ist falsch')
        return
      }
    }

    await saveSettings({
      passcodeEnabled: false,
      passcodeHash: null,
    })

    setHasExistingPasscode(false)
    setIsEnabled(false)
    setShowPasscodeSetup(false)
    setCurrentPasscode('')
    setSuccess('Passcode-Schutz deaktiviert')
  }

  const handleSaveTimeout = async () => {
    await saveSettings({ passcodeTimeoutMinutes: timeoutMinutes })
    setSuccess('Timeout-Einstellung gespeichert')
  }

  const verifyCurrentPasscode = async (hash: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/me/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcodeHash: hash }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      return data.valid === true
    } catch {
      return false
    }
  }

  const saveSettings = async (settings: Record<string, unknown>) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        throw new Error('Speichern fehlgeschlagen')
      }
      onSave()
    } catch (err) {
      setError('Speichern fehlgeschlagen')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card p-4 space-y-3 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="loading loading-spinner loading-sm" />
          <span className="text-sm text-gray-400">Lade Einstellungen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4 max-w-xl">
      <h2 className="font-medium">
        <span className="inline-flex items-center gap-2">
          <IconShieldLock className="w-5 h-5" />
          <span>Passcode-Schutz</span>
        </span>
      </h2>

      <p className="text-sm text-gray-400">
        Schütze dein Tagebuch mit einem zusätzlichen Code. Nach Inaktivität wird die App gesperrt.
      </p>

      {/* Status */}
      <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg border border-base-300">
        <div className="flex items-center gap-3">
          {isEnabled && hasExistingPasscode ? (
            <IconLock className="w-5 h-5 text-success" />
          ) : (
            <IconLockOpen className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <div className="font-medium text-sm">
              {isEnabled && hasExistingPasscode ? 'Passcode aktiv' : 'Kein Passcode'}
            </div>
            <div className="text-xs text-gray-400">
              {isEnabled && hasExistingPasscode 
                ? `${passcodeLength}-stelliger Code, ${timeoutMinutes} Min. Timeout`
                : 'Tippe um zu aktivieren'}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={`pill ${isEnabled && hasExistingPasscode ? '!bg-error/20 !text-error' : '!bg-success/20 !text-success'}`}
          disabled={isSaving}
        >
          {isEnabled && hasExistingPasscode ? 'Deaktivieren' : 'Aktivieren'}
        </button>
      </div>

      {/* Setup/Change Form */}
      {showPasscodeSetup && (
        <div className="space-y-4 p-4 bg-base-200 rounded-lg">
          <h3 className="font-medium text-sm">
            {isEnabled && hasExistingPasscode ? 'Passcode ändern oder deaktivieren' : 'Neuen Passcode einrichten'}
          </h3>

          {/* Current passcode (if changing) */}
          {hasExistingPasscode && isEnabled && (
            <label className="block text-sm">
              <span className="text-gray-400 mb-1 block">Aktueller Code</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={currentPasscode}
                onChange={e => setCurrentPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-base-100 border border-base-300 rounded px-3 py-2 text-lg tracking-widest"
                placeholder="••••"
                autoComplete="off"
              />
            </label>
          )}

          {/* New passcode */}
          {!(isEnabled && hasExistingPasscode) || currentPasscode.length >= 2 ? (
            <>
              <label className="block text-sm">
                <span className="text-gray-400 mb-1 block">
                  {isEnabled && hasExistingPasscode ? 'Neuer Code (oder leer lassen zum Deaktivieren)' : 'Code (2-6 Ziffern)'}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-base-100 border border-base-300 rounded px-3 py-2 text-lg tracking-widest"
                  placeholder="z.B. 12 oder 1234"
                  autoComplete="off"
                />
              </label>

              {newPasscode.length >= 2 && (
                <label className="block text-sm">
                  <span className="text-gray-400 mb-1 block">Code bestätigen</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPasscode}
                    onChange={e => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-base-100 border border-base-300 rounded px-3 py-2 text-lg tracking-widest"
                    placeholder="Code wiederholen"
                    autoComplete="off"
                  />
                </label>
              )}
            </>
          ) : null}

          {/* Error/Success */}
          {error && (
            <div className="flex items-center gap-2 text-error text-sm">
              <IconX className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {newPasscode.length >= 2 && confirmPasscode.length >= 2 && (
              <button
                onClick={handleSetupPasscode}
                className="pill !bg-success !text-white"
                disabled={isSaving}
              >
                {isSaving ? <span className="loading loading-spinner loading-xs" /> : <IconCheck className="w-4 h-4" />}
                <span className="ml-1">Speichern</span>
              </button>
            )}

            {isEnabled && hasExistingPasscode && currentPasscode.length >= 2 && !newPasscode && (
              <button
                onClick={handleDisablePasscode}
                className="pill !bg-error !text-white"
                disabled={isSaving}
              >
                Deaktivieren
              </button>
            )}

            <button
              onClick={() => {
                setShowPasscodeSetup(false)
                setCurrentPasscode('')
                setNewPasscode('')
                setConfirmPasscode('')
                setError(null)
              }}
              className="pill"
              disabled={isSaving}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Timeout setting (only shown when passcode is active) */}
      {isEnabled && hasExistingPasscode && !showPasscodeSetup && (
        <div className="space-y-3 pt-2">
          <label className="block text-sm">
            <span className="text-gray-400 mb-1 block">Automatische Sperre nach</span>
            <div className="flex items-center gap-2">
              <select
                value={timeoutMinutes}
                onChange={e => setTimeoutMinutes(Number(e.target.value))}
                className="bg-base-100 border border-base-300 rounded px-3 py-2 text-sm"
              >
                <option value={1}>1 Minute</option>
                <option value={2}>2 Minuten</option>
                <option value={5}>5 Minuten</option>
                <option value={10}>10 Minuten</option>
                <option value={15}>15 Minuten</option>
                <option value={30}>30 Minuten</option>
              </select>
              <span className="text-sm text-gray-400">Inaktivität</span>
              <button
                onClick={handleSaveTimeout}
                className="pill ml-auto"
                disabled={isSaving}
              >
                Speichern
              </button>
            </div>
          </label>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 text-success text-sm p-2 bg-success/10 rounded">
          <IconCheck className="w-4 h-4" />
          {success}
        </div>
      )}
    </div>
  )
}
