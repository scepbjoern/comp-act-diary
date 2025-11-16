"use client"
import React, { useEffect, useState } from 'react'
import { MicrophoneButton } from './MicrophoneButton'

export function TextImprovementDialog(props: {
  originalText: string
  onAccept: (improvedText: string) => void
  onCancel: () => void
}) {
  const { originalText, onAccept, onCancel } = props

  const defaultModels = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LLM_MODELS)
    ? String(process.env.NEXT_PUBLIC_LLM_MODELS).split(',').map(s => s.trim()).filter(Boolean)
    : ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Llama-4-Scout-17B-16E-Instruct']

  const [prompt, setPrompt] = useState('Verbessere diesen Text')
  const [model, setModel] = useState<string>(
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TOGETHERAI_LLM_MODEL)
      || (typeof process !== 'undefined' && process.env?.TOGETHERAI_LLM_MODEL)
      || defaultModels[0]
  )
  const [improvedText, setImprovedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-trigger improvement when dialog opens
  useEffect(() => {
    improveText()
  // eslint-disable-next-line
  }, [])

  async function improveText() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, prompt, model }),
        credentials: 'same-origin',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Verbesserung fehlgeschlagen')
      }

      const data = await res.json()
      setImprovedText(data?.improvedText || originalText)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten')
      setImprovedText(originalText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal modal-open" onClick={onCancel}>
      <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Text verbessern</h2>

        <div className="space-y-4">
          {/* Prompt input */}
          <div>
            <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
              <span>Anweisung</span>
              <MicrophoneButton
                onText={(t) => setPrompt(prev => prev ? (prev + ' ' + t) : t)}
                className="text-gray-300 hover:text-gray-100"
                compact
              />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input input-bordered w-full"
              placeholder="z.B. Verbessere diesen Text"
            />
          </div>

          {/* Model selection */}
          <div>
            <div className="text-sm text-gray-400 mb-1">Modell</div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="select select-bordered w-full"
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
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Wird verbessert...' : 'Neu generieren'}
          </button>

          {/* Error message */}
          {error && (
            <div className="alert alert-error">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Preview */}
          <div>
            <div className="text-sm text-gray-400 mb-1">Vorschau</div>
            <div className="textarea textarea-bordered min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {loading ? (
                <span className="text-gray-500 italic">Wird geladen...</span>
              ) : (
                improvedText || <span className="text-gray-500 italic">Kein Text</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onAccept(improvedText)}
              disabled={loading || !improvedText}
              className="btn btn-primary flex-1"
            >
              Übernehmen
            </button>
            <button
              onClick={onCancel}
              className="btn btn-ghost flex-1"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
