/**
 * SharingDefaultsSection Component
 * Settings UI for configuring default sharing behavior.
 * - Default share partner: Prefilled in the share modal for quick sharing
 * - Auto-share rules per entry type: Automatically share specific entry types
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  IconShare,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react'

interface AutoShareRule {
  journalEntryTypeId: string
  shareWithUserId: string
  shareWithUsername?: string
  role: 'VIEWER' | 'EDITOR'
}

interface SharingDefaults {
  defaultShareUserId: string | null
  defaultShareUsername?: string | null
  defaultShareRole: 'VIEWER' | 'EDITOR'
  autoShareByType?: AutoShareRule[]
}

interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
}

export function SharingDefaultsSection() {
  const [defaults, setDefaults] = useState<SharingDefaults>({
    defaultShareUserId: null,
    defaultShareUsername: null,
    defaultShareRole: 'EDITOR',
    autoShareByType: [],
  })
  const [entryTypes, setEntryTypes] = useState<JournalEntryType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state for default partner
  const [defaultUsername, setDefaultUsername] = useState('')
  const [defaultRole, setDefaultRole] = useState<'VIEWER' | 'EDITOR'>('EDITOR')
  const [usernameValidating, setUsernameValidating] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  // Form state for new auto-share rule
  const [newRuleTypeId, setNewRuleTypeId] = useState('')
  const [newRuleUsername, setNewRuleUsername] = useState('')
  const [newRuleRole, setNewRuleRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER')
  const [newRuleError, setNewRuleError] = useState<string | null>(null)

  // Load settings and entry types
  const loadSettings = useCallback(async () => {
    try {
      const [settingsRes, typesRes] = await Promise.all([
        fetch('/api/user/settings'),
        fetch('/api/journal-entry-types'),
      ])
      
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        const sharingDefaults = data.settings?.sharingDefaults || {
          defaultShareUserId: null,
          defaultShareUsername: null,
          defaultShareRole: 'EDITOR',
          autoShareByType: [],
        }
        setDefaults(sharingDefaults)
        setDefaultRole(sharingDefaults.defaultShareRole || 'EDITOR')
        setDefaultUsername(sharingDefaults.defaultShareUsername || '')
      }
      
      if (typesRes.ok) {
        const data = await typesRes.json()
        setEntryTypes(data.types || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // Validate username and get userId
  const validateUsername = async (username: string): Promise<{ valid: boolean; userId?: string; error?: string }> => {
    if (!username.trim()) {
      return { valid: true } // Empty is valid (clears the setting)
    }
    
    try {
      const res = await fetch(`/api/users/validate?username=${encodeURIComponent(username.trim())}`)
      const data = await res.json()
      
      if (!res.ok || !data.valid) {
        return { valid: false, error: data.error || `Benutzer "${username}" nicht gefunden` }
      }
      
      return { valid: true, userId: data.userId }
    } catch {
      return { valid: false, error: 'Fehler bei der Validierung' }
    }
  }

  // Save settings
  const saveSettings = async (newDefaults: SharingDefaults) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharingDefaults: newDefaults }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      setDefaults(newDefaults)
      setSuccess('Einstellungen gespeichert')
      void setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  // Handle username blur - validate and save
  const handleUsernameBlur = async () => {
    const username = defaultUsername.trim()
    setUsernameError(null)
    
    if (!username) {
      // Clear default partner
      if (defaults.defaultShareUserId) {
        void saveSettings({ ...defaults, defaultShareUserId: null, defaultShareUsername: null })
      }
      return
    }
    
    setUsernameValidating(true)
    const result = await validateUsername(username)
    setUsernameValidating(false)
    
    if (!result.valid) {
      setUsernameError(result.error || 'Benutzer nicht gefunden')
      return
    }
    
    if (result.userId) {
      void saveSettings({ 
        ...defaults, 
        defaultShareUserId: result.userId,
        defaultShareUsername: username 
      })
    }
  }

  // Update default role
  const handleDefaultRoleChange = (role: 'VIEWER' | 'EDITOR') => {
    setDefaultRole(role)
    void saveSettings({ ...defaults, defaultShareRole: role })
  }

  // Clear default share partner
  const handleClearDefaultPartner = () => {
    setDefaultUsername('')
    setUsernameError(null)
    void saveSettings({ ...defaults, defaultShareUserId: null, defaultShareUsername: null })
  }

  // Add new auto-share rule
  const handleAddRule = async () => {
    setNewRuleError(null)
    
    if (!newRuleTypeId) {
      setNewRuleError('Bitte einen Eintragstyp auswählen')
      return
    }
    
    if (!newRuleUsername.trim()) {
      setNewRuleError('Bitte einen Benutzernamen eingeben')
      return
    }
    
    // Check if rule for this type already exists
    const existingRules = defaults.autoShareByType || []
    if (existingRules.some(r => r.journalEntryTypeId === newRuleTypeId)) {
      setNewRuleError('Für diesen Eintragstyp existiert bereits eine Regel')
      return
    }
    
    // Validate username
    const result = await validateUsername(newRuleUsername)
    if (!result.valid || !result.userId) {
      setNewRuleError(result.error || 'Benutzer nicht gefunden')
      return
    }
    
    const newRule: AutoShareRule = {
      journalEntryTypeId: newRuleTypeId,
      shareWithUserId: result.userId,
      shareWithUsername: newRuleUsername.trim(),
      role: newRuleRole,
    }
    
    void saveSettings({
      ...defaults,
      autoShareByType: [...existingRules, newRule],
    })
    
    // Reset form
    setNewRuleTypeId('')
    setNewRuleUsername('')
    setNewRuleRole('VIEWER')
  }

  // Remove auto-share rule
  const handleRemoveRule = (index: number) => {
    const existingRules = defaults.autoShareByType || []
    const newRules = existingRules.filter((_, i) => i !== index)
    void saveSettings({ ...defaults, autoShareByType: newRules })
  }

  // Entry types not yet used in rules
  const existingRules = defaults.autoShareByType || []
  const availableTypes = entryTypes.filter(
    t => !existingRules.some(r => r.journalEntryTypeId === t.id)
  )

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <IconLoader2 size={24} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <IconShare size={24} />
        <h2 className="text-xl font-bold">Teilen-Einstellungen</h2>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="alert alert-error">
          <IconAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <IconCheck size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Default Share Role */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Standard-Rolle beim Teilen</span>
        </label>
        <select
          className="select select-bordered w-full max-w-xs"
          value={defaultRole}
          onChange={(e) => handleDefaultRoleChange(e.target.value as 'VIEWER' | 'EDITOR')}
          disabled={saving}
        >
          <option value="VIEWER">Viewer (nur lesen)</option>
          <option value="EDITOR">Editor (lesen & bearbeiten)</option>
        </select>
        <label className="label">
          <span className="label-text-alt">
            Diese Rolle wird verwendet, wenn du neue Einträge teilst.
          </span>
        </label>
      </div>

      {/* Default Share Partner */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Standard-Teilen-Partner</span>
        </label>
        <p className="text-sm text-base-content/60 mb-2">
          Gib hier den <strong>Benutzernamen</strong> des Partners ein, der beim Teilen von Einträgen 
          vorausgefüllt werden soll. Du musst dann nur noch auf &quot;+&quot; klicken, um den Eintrag zu teilen.
        </p>
        <div className="flex gap-2 items-start">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              className={`input input-bordered w-full ${usernameError ? 'input-error' : ''}`}
              placeholder="Benutzername eingeben"
              value={defaultUsername}
              onChange={(e) => {
                setDefaultUsername(e.target.value)
                setUsernameError(null)
              }}
              onBlur={handleUsernameBlur}
              disabled={saving || usernameValidating}
            />
            {usernameError && (
              <label className="label">
                <span className="label-text-alt text-error">{usernameError}</span>
              </label>
            )}
            {usernameValidating && (
              <label className="label">
                <span className="label-text-alt flex items-center gap-1">
                  <IconLoader2 size={14} className="animate-spin" />
                  Validiere...
                </span>
              </label>
            )}
          </div>
          {defaults.defaultShareUserId && (
            <button
              type="button"
              className="btn btn-ghost btn-square"
              onClick={handleClearDefaultPartner}
              disabled={saving}
              title="Partner entfernen"
            >
              <IconTrash size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Auto-Share Rules per Entry Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Automatische Freigabe pro Eintragstyp</span>
        </label>
        <p className="text-sm text-base-content/60 mb-2">
          Definiere Regeln, um bestimmte Eintragstypen <strong>automatisch</strong> mit ausgewählten 
          Personen zu teilen. Alle neuen Einträge dieses Typs werden sofort geteilt.
        </p>
        
        {/* Existing rules */}
        {existingRules.length > 0 && (
          <ul className="space-y-2 mb-4">
            {existingRules.map((rule, index) => {
              const entryType = entryTypes.find(t => t.id === rule.journalEntryTypeId)
              return (
                <li key={index} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{entryType?.name || rule.journalEntryTypeId}</span>
                    <span className="text-base-content/60">→</span>
                    <span>{rule.shareWithUsername || rule.shareWithUserId}</span>
                    <span className="badge badge-sm">{rule.role === 'EDITOR' ? 'Editor' : 'Viewer'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={() => handleRemoveRule(index)}
                    disabled={saving}
                    title="Regel entfernen"
                  >
                    <IconTrash size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        
        {/* Add new rule form */}
        {availableTypes.length > 0 && (
          <div className="bg-base-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium">Neue Regel hinzufügen</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="form-control">
                <label className="label py-0">
                  <span className="label-text text-xs">Eintragstyp</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={newRuleTypeId}
                  onChange={(e) => setNewRuleTypeId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Typ wählen...</option>
                  {availableTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-0">
                  <span className="label-text text-xs">Benutzername</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-40"
                  placeholder="Benutzername"
                  value={newRuleUsername}
                  onChange={(e) => {
                    setNewRuleUsername(e.target.value)
                    setNewRuleError(null)
                  }}
                  disabled={saving}
                />
              </div>
              <div className="form-control">
                <label className="label py-0">
                  <span className="label-text text-xs">Rolle</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={newRuleRole}
                  onChange={(e) => setNewRuleRole(e.target.value as 'VIEWER' | 'EDITOR')}
                  disabled={saving}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddRule}
                disabled={saving}
              >
                <IconPlus size={16} />
                Hinzufügen
              </button>
            </div>
            {newRuleError && (
              <div className="text-error text-sm">{newRuleError}</div>
            )}
          </div>
        )}
        
        {availableTypes.length === 0 && existingRules.length > 0 && (
          <div className="text-sm text-base-content/60">
            Alle Eintragstypen haben bereits eine Regel.
          </div>
        )}
        
        {entryTypes.length === 0 && (
          <div className="bg-base-200 rounded-lg p-4 text-center text-base-content/60">
            Keine Eintragstypen verfügbar.
          </div>
        )}
      </div>

    </div>
  )
}
