"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MicrophoneButton } from './MicrophoneButton'
import { TablerIcon } from './TablerIcon'
import { DEFAULT_LLM_MODELS, DEFAULT_MODEL_ID, LLMModel } from '@/lib/llmModels'

type ImprovementPrompt = {
  id: string
  name: string
  prompt: string
  isSystem?: boolean
}

// Add cache-buster for development
const CACHE_BUSTER = Date.now()

export function TextImprovementDialog(props: {
  /** The current text content (may be already improved) */
  originalText: string
  /** The true original transcript (unedited, from speech-to-text). If provided, this is used for improvement. */
  sourceTranscript?: string | null
  onAccept: (improvedText: string) => void
  onCancel: () => void
}) {
  const { originalText, sourceTranscript, onAccept, onCancel } = props
  
  // Use sourceTranscript if available, otherwise fall back to originalText
  const textToImprove = sourceTranscript || originalText

  const [prompts, setPrompts] = useState<ImprovementPrompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [originalPromptText, setOriginalPromptText] = useState('')
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID)
  const [customModels, setCustomModels] = useState<LLMModel[]>([])
  const [improvedText, setImprovedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPrompts, setLoadingPrompts] = useState(true)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasImproved, setHasImproved] = useState(false)
  const [showAddPrompt, setShowAddPrompt] = useState(false)
  const [newPromptName, setNewPromptName] = useState('')

  // Check if current prompt has been modified
  const isPromptModified = customPrompt !== originalPromptText

  // Load prompts from API on mount
  useEffect(() => {
    async function loadPrompts() {
      try {
        const [promptsRes, meRes] = await Promise.all([
          fetch('/api/improvement-prompts'),
          fetch('/api/me')
        ])
        
        const promptsData = await promptsRes.json()
        if (promptsData.prompts && promptsData.prompts.length > 0) {
          setPrompts(promptsData.prompts)
          setSelectedPromptId(promptsData.prompts[0].id)
          setCustomPrompt(promptsData.prompts[0].prompt)
          setOriginalPromptText(promptsData.prompts[0].prompt)
        }

        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user?.settings?.customModels) {
            setCustomModels(meData.user.settings.customModels)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingPrompts(false)
      }
    }
    loadPrompts()
  }, [])

  // Update custom prompt when selected prompt changes
  useEffect(() => {
    const selected = prompts.find(p => p.id === selectedPromptId)
    if (selected) {
      setCustomPrompt(selected.prompt)
      setOriginalPromptText(selected.prompt)
    }
  }, [selectedPromptId, prompts])

  const improveText = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToImprove, prompt: customPrompt, model }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data?.improved) {
        setImprovedText(data.improved)
        setHasImproved(true)
      } else {
        setError('Keine Verbesserung möglich')
      }
    } catch (err) {
      console.error('Failed to improve text:', err)
      setError('Fehler bei der Textverbesserung')
    } finally {
      setLoading(false)
    }
  }, [textToImprove, customPrompt, model])

  // Save as new prompt
  const handleSaveAsNew = async () => {
    if (!newPromptName.trim() || !customPrompt.trim()) return
    
    setSavingPrompt(true)
    try {
      const res = await fetch('/api/improvement-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPromptName.trim(), prompt: customPrompt.trim() }),
      })
      const data = await res.json()
      if (data.prompt) {
        setPrompts(prev => [...prev, data.prompt])
        setSelectedPromptId(data.prompt.id)
        setOriginalPromptText(data.prompt.prompt)
        setNewPromptName('')
        setShowAddPrompt(false)
      }
    } catch (err) {
      console.error('Failed to save prompt:', err)
      setError('Fehler beim Speichern der Anweisung')
    } finally {
      setSavingPrompt(false)
    }
  }

  // Update existing prompt
  const handleUpdatePrompt = async () => {
    if (!selectedPromptId || !customPrompt.trim()) return
    const selected = prompts.find(p => p.id === selectedPromptId)
    if (!selected) return

    setSavingPrompt(true)
    try {
      const res = await fetch(`/api/improvement-prompts/${selectedPromptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected.name, prompt: customPrompt.trim() }),
      })
      const data = await res.json()
      if (data.prompt) {
        setPrompts(prev => prev.map(p => p.id === data.prompt.id ? data.prompt : p))
        setOriginalPromptText(data.prompt.prompt)
      }
    } catch (err) {
      console.error('Failed to update prompt:', err)
      setError('Fehler beim Aktualisieren der Anweisung')
    } finally {
      setSavingPrompt(false)
    }
  }

  // Delete prompt
  const handleDeletePrompt = async () => {
    if (!selectedPromptId) return
    const selected = prompts.find(p => p.id === selectedPromptId)
    if (!selected) return

    if (!confirm(`Anweisung "${selected.name}" wirklich löschen?`)) return

    setSavingPrompt(true)
    try {
      await fetch(`/api/improvement-prompts/${selectedPromptId}`, {
        method: 'DELETE',
      })
      const newPrompts = prompts.filter(p => p.id !== selectedPromptId)
      setPrompts(newPrompts)
      if (newPrompts.length > 0) {
        setSelectedPromptId(newPrompts[0].id)
      }
    } catch (err) {
      console.error('Failed to delete prompt:', err)
      setError('Fehler beim Löschen der Anweisung')
    } finally {
      setSavingPrompt(false)
    }
  }

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId)

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div 
        className="bg-base-200 w-full h-full md:w-[95vw] md:h-[95vh] md:rounded-lg shadow-xl overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-100">
          <h2 className="text-lg font-semibold text-base-content">Text verbessern</h2>
          <button onClick={onCancel} className="btn btn-ghost btn-sm btn-circle">
            <TablerIcon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {loadingPrompts ? (
            <div className="flex items-center justify-center h-32">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : (
          <div className="space-y-4">
            
            {/* Prompt selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-text font-medium">Verbesserungsanweisung</label>
                <div className="flex items-center gap-1">
                  <MicrophoneButton
                    onText={(t) => setCustomPrompt(prev => prev ? (prev + ' ' + t) : t)}
                    compact
                  />
                  {/* Delete button */}
                  {selectedPrompt && (
                    <button 
                      onClick={handleDeletePrompt}
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      title="Anweisung löschen"
                      disabled={savingPrompt}
                    >
                      <TablerIcon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Prompt dropdown */}
              <select
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className="select select-bordered select-sm w-full mb-2"
              >
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Custom prompt textarea */}
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="textarea textarea-bordered textarea-sm w-full"
                rows={3}
                placeholder="Anweisung für die Textverbesserung..."
              />

              {/* Save/Update buttons - show when prompt is modified */}
              {isPromptModified && (
                <div className="flex items-center gap-2 mt-2">
                  {/* Update existing */}
                  <button 
                    onClick={handleUpdatePrompt}
                    className="btn btn-outline btn-xs"
                    disabled={savingPrompt}
                    title="Aktuelle Anweisung überschreiben"
                  >
                    {savingPrompt ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <TablerIcon name="device-floppy" size={14} />
                    )}
                    <span>Überschreiben</span>
                  </button>
                  
                  {/* Save as new */}
                  <button 
                    onClick={() => setShowAddPrompt(!showAddPrompt)}
                    className="btn btn-outline btn-xs"
                    disabled={savingPrompt}
                    title="Als neue Anweisung speichern"
                  >
                    <TablerIcon name="plus" size={14} />
                    <span>Als neu speichern</span>
                  </button>
                </div>
              )}

              {/* Add new prompt form */}
              {showAddPrompt && (
                <div className="p-3 bg-base-300 rounded-lg space-y-2 mt-2">
                  <input
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="Name der neuen Anweisung"
                    className="input input-bordered input-sm w-full"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveAsNew} 
                      className="btn btn-primary btn-xs"
                      disabled={!newPromptName.trim() || savingPrompt}
                    >
                      {savingPrompt ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        'Speichern'
                      )}
                    </button>
                    <button onClick={() => { setShowAddPrompt(false); setNewPromptName('') }} className="btn btn-ghost btn-xs">
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Model selection with pricing */}
            <div>
              <label className="label-text font-medium mb-1 block">Modell</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                {DEFAULT_LLM_MODELS.concat(customModels).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.inputCost} input / {m.outputCost} output)
                  </option>
                ))}
              </select>
            </div>

            {/* Generate button */}
            <button
              onClick={improveText}
              disabled={loading || !customPrompt.trim()}
              className="btn btn-primary btn-sm w-full"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Wird verbessert...
                </>
              ) : hasImproved ? (
                'Neu verbessern'
              ) : (
                'Verbessern'
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="alert alert-error alert-sm">
                <TablerIcon name="warning" size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Preview */}
            <div className="flex-1">
              <label className="label-text font-medium mb-1 block">Vorschau</label>
              <div className="bg-base-100 border border-base-300 rounded-lg p-3 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm">
                {loading ? (
                  <div className="flex items-center gap-2 text-base-content/50">
                    <span className="loading loading-dots loading-sm"></span>
                    <span>Text wird verbessert...</span>
                  </div>
                ) : improvedText ? (
                  <div className="text-base-content">{improvedText}</div>
                ) : (
                  <span className="text-base-content/50 italic">
                    Klicke auf &quot;Verbessern&quot; um den Text zu optimieren.
                  </span>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-base-300 bg-base-100">
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              if (improvedText) {
                onAccept(improvedText)
              }
            }}
            disabled={loading || !improvedText}
            className="btn btn-primary btn-sm"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )

  // Render in portal to ensure proper z-index layering
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null
}
