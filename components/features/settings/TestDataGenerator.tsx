/**
 * TestDataGenerator Component
 * 
 * Provides UI for generating test data in development/testing environments.
 * Supports predefined data sets and AI-generated data with customizable prompts.
 */

'use client'

import { useState, useEffect } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'

type TestDataCategory = 'contacts' | 'tasks' | 'journal_entries' | 'habits' | 'locations' | 'measurements' | 'all'
type GenerationMode = 'predefined' | 'ai'

interface CategoryInfo {
  value: TestDataCategory
  label: string
  description: string
}

interface ModeInfo {
  value: GenerationMode
  label: string
  description: string
}

interface GenerationResult {
  success: boolean
  category: TestDataCategory
  itemsCreated: number
  details?: string[]
  error?: string
}

export function TestDataGenerator() {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [modes, setModes] = useState<ModeInfo[]>([])
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({})
  
  const [selectedCategory, setSelectedCategory] = useState<TestDataCategory>('all')
  const [selectedMode, setSelectedMode] = useState<GenerationMode>('predefined')
  const [count, setCount] = useState(5)
  const [customPrompt, setCustomPrompt] = useState('')
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GenerationResult[] | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/admin/seed')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
          setModes(data.modes || [])
          setAiPrompts(data.aiPrompts || {})
        }
      } catch (err) {
        console.error('Failed to load seed options:', err)
      }
    }
    void loadOptions()
  }, [])

  // Update custom prompt when category changes (show default AI prompt)
  useEffect(() => {
    if (selectedCategory !== 'all' && aiPrompts[selectedCategory]) {
      setCustomPrompt(aiPrompts[selectedCategory].replace('{count}', String(count)))
    }
  }, [selectedCategory, aiPrompts, count])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          mode: selectedMode,
          count,
          customPrompt: useCustomPrompt ? customPrompt : undefined,
          confirmed: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Fehler beim Generieren')
        return
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const selectedCategoryInfo = categories.find(c => c.value === selectedCategory)
  const selectedModeInfo = modes.find(m => m.value === selectedMode)

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">
        Generiere Testdaten für Entwicklung und Tests. Wähle zwischen vordefinierten 
        Datensätzen oder KI-generierten Daten mit anpassbaren Prompts.
      </div>

      {/* Category Selection */}
      <div className="grid gap-3 max-w-md">
        <label className="text-sm">
          <div className="text-gray-400 mb-1">Kategorie</div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as TestDataCategory)}
            className="w-full bg-base-100 border border-base-300 rounded px-2 py-1.5 text-sm"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {selectedCategoryInfo && (
            <div className="text-xs text-gray-500 mt-1">{selectedCategoryInfo.description}</div>
          )}
        </label>

        {/* Mode Selection */}
        <label className="text-sm">
          <div className="text-gray-400 mb-1">Modus</div>
          <select
            value={selectedMode}
            onChange={e => setSelectedMode(e.target.value as GenerationMode)}
            className="w-full bg-base-100 border border-base-300 rounded px-2 py-1.5 text-sm"
            disabled={selectedCategory === 'all' && selectedMode === 'ai'}
          >
            {modes.map(mode => (
              <option 
                key={mode.value} 
                value={mode.value}
                disabled={mode.value === 'ai' && selectedCategory === 'all'}
              >
                {mode.label}
              </option>
            ))}
          </select>
          {selectedModeInfo && (
            <div className="text-xs text-gray-500 mt-1">{selectedModeInfo.description}</div>
          )}
        </label>

        {/* AI-specific options */}
        {selectedMode === 'ai' && selectedCategory !== 'all' && (
          <>
            <label className="text-sm">
              <div className="text-gray-400 mb-1">Anzahl Einträge</div>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                className="w-24 bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomPrompt}
                onChange={e => setUseCustomPrompt(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span>Eigenen Prompt verwenden</span>
            </label>

            {useCustomPrompt && (
              <label className="text-sm">
                <div className="text-gray-400 mb-1">KI-Prompt (anpassbar)</div>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-base-100 border border-base-300 rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="Beschreibe, welche Art von Testdaten generiert werden sollen..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Tipp: Der Prompt sollte das gewünschte JSON-Format beschreiben.
                </div>
              </label>
            )}
          </>
        )}
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-3">
        {!showConfirm ? (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
          >
            <TablerIcon name="database" size={16} />
            Testdaten generieren
          </button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <TablerIcon name="warning" size={20} className="text-warning" />
            <div className="text-sm">
              <div className="font-medium">Bist du sicher?</div>
              <div className="text-gray-400">Dies fügt Demo-Daten zu deiner Datenbank hinzu.</div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  'Ja, generieren'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <TablerIcon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {results && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <TablerIcon name="check" size={18} className="text-success" />
            Ergebnis
          </div>
          <div className="bg-base-200 rounded-lg p-3 space-y-2">
            {results.map((result, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <TablerIcon name="circle-check" size={16} className="text-success" />
                  ) : (
                    <TablerIcon name="circle-x" size={16} className="text-error" />
                  )}
                  <span className="font-medium capitalize">{result.category.replace('_', ' ')}</span>
                  <span className="text-gray-400">
                    {result.itemsCreated} Einträge erstellt
                  </span>
                </div>
                {result.error && (
                  <div className="text-error text-xs ml-6">{result.error}</div>
                )}
                {result.details && result.details.length > 0 && (
                  <details className="ml-6 mt-1">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                      Details anzeigen ({result.details.length})
                    </summary>
                    <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {result.details.slice(0, 10).map((detail, i) => (
                        <li key={i}>• {detail}</li>
                      ))}
                      {result.details.length > 10 && (
                        <li className="text-gray-600">... und {result.details.length - 10} weitere</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
