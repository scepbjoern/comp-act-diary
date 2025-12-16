"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MicrophoneButton } from './MicrophoneButton'
import { TablerIcon } from './TablerIcon'

type ImprovementPrompt = {
  id: string
  name: string
  prompt: string
}

// Default prompts for text improvement
const DEFAULT_PROMPTS: ImprovementPrompt[] = [
  {
    id: 'grammar',
    name: 'Grammatik & Struktur',
    prompt: 'Verbessere diesen Text grammatikalisch. Bilde Abschnitte mit Überschriften. Gib alles formatiert als Markdown zurück.'
  },
  {
    id: 'formal',
    name: 'Formell umformulieren',
    prompt: 'Formuliere diesen Text in einem formelleren, professionellen Stil um. Behalte die Kernaussagen bei.'
  },
  {
    id: 'summary',
    name: 'Zusammenfassen',
    prompt: 'Fasse diesen Text in wenigen Sätzen zusammen. Behalte die wichtigsten Punkte bei.'
  },
  {
    id: 'expand',
    name: 'Erweitern & Detail',
    prompt: 'Erweitere diesen Text mit mehr Details und Beispielen, ohne die ursprüngliche Aussage zu verändern.'
  }
]

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

  const defaultModels = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LLM_MODELS)
    ? String(process.env.NEXT_PUBLIC_LLM_MODELS).split(',').map(s => s.trim()).filter(Boolean)
    : ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Llama-4-Scout-17B-16E-Instruct']

  const [prompts, setPrompts] = useState<ImprovementPrompt[]>(DEFAULT_PROMPTS)
  const [selectedPromptId, setSelectedPromptId] = useState<string>(DEFAULT_PROMPTS[0].id)
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPTS[0].prompt)
  const [model, setModel] = useState<string>(
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TOGETHERAI_LLM_MODEL)
      || (typeof process !== 'undefined' && process.env?.TOGETHERAI_LLM_MODEL)
      || defaultModels[0]
  )
  const [improvedText, setImprovedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasImproved, setHasImproved] = useState(false)
  const [showAddPrompt, setShowAddPrompt] = useState(false)
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptText, setNewPromptText] = useState('')

  // Update custom prompt when selected prompt changes
  useEffect(() => {
    const selected = prompts.find(p => p.id === selectedPromptId)
    if (selected) {
      setCustomPrompt(selected.prompt)
    }
  }, [selectedPromptId, prompts])

  const improveText = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Always use textToImprove (sourceTranscript if available, otherwise originalText)
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
    } catch (error) {
      console.error('Failed to improve text:', error)
      setError('Fehler bei der Textverbesserung')
    } finally {
      setLoading(false)
    }
  }, [textToImprove, customPrompt, model])

  const handleAddPrompt = () => {
    if (!newPromptName.trim() || !newPromptText.trim()) return
    
    const newPrompt: ImprovementPrompt = {
      id: `custom-${Date.now()}`,
      name: newPromptName.trim(),
      prompt: newPromptText.trim()
    }
    setPrompts(prev => [...prev, newPrompt])
    setSelectedPromptId(newPrompt.id)
    setNewPromptName('')
    setNewPromptText('')
    setShowAddPrompt(false)
  }

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
          <div className="space-y-4">
            
            {/* Prompt selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-text font-medium">Verbesserungsanweisung</label>
                <div className="flex items-center gap-2">
                  <MicrophoneButton
                    onText={(t) => setCustomPrompt(prev => prev ? (prev + ' ' + t) : t)}
                    compact
                  />
                  <button 
                    onClick={() => setShowAddPrompt(!showAddPrompt)}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Neue Anweisung hinzufügen"
                  >
                    <TablerIcon name="add" size={16} />
                  </button>
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

              {/* Add new prompt form */}
              {showAddPrompt && (
                <div className="p-3 bg-base-300 rounded-lg space-y-2 mb-2">
                  <input
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="Name der Anweisung"
                    className="input input-bordered input-sm w-full"
                  />
                  <textarea
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    placeholder="Anweisungstext..."
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddPrompt} className="btn btn-primary btn-xs">
                      Hinzufügen
                    </button>
                    <button onClick={() => setShowAddPrompt(false)} className="btn btn-ghost btn-xs">
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Custom prompt textarea */}
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="textarea textarea-bordered textarea-sm w-full"
                rows={3}
                placeholder="Anweisung für die Textverbesserung..."
              />
            </div>

            {/* Model selection */}
            <div>
              <label className="label-text font-medium mb-1 block">Modell</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                {defaultModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
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
