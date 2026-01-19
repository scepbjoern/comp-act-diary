'use client'

import React, { useMemo, useState } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { useLlmModels, LlmModelData } from '@/hooks/useLlmModels'
import { SaveIndicator } from '@/components/ui/SaveIndicator'

interface LlmModelManagerProps {
  startSaving: () => void
  doneSaving: () => void
  saving: boolean
  savedAt: number | null
}

export function LlmModelManager({ startSaving, doneSaving, saving, savedAt }: LlmModelManagerProps) {
  const {
    models: llmModels,
    syncDefaultModels,
    deleteModel,
    addModel: addLlmModel,
    updateModel: updateLlmModel
  } = useLlmModels()

  const [newModel, setNewModel] = useState({ 
    id: '', 
    name: '', 
    provider: 'openai' as 'openai' | 'togetherai',
    inputCost: '', 
    outputCost: '', 
    url: '', 
    supportsReasoningEffort: false, 
    defaultReasoningEffort: 'medium' 
  })
  const [editingModelId, setEditingModelId] = useState<string | null>(null)

  // Sorting state for LLM models
  const [sortField, setSortField] = useState<'name' | 'inputCost' | 'outputCost' | 'supportsReasoningEffort'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const sortedModels = useMemo(() => {
    if (!llmModels) return []
    return [...llmModels].sort((a, b) => {
      let comparison = 0
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'inputCost' || sortField === 'outputCost') {
        // Remove currency symbols and parse as float
        const parsePrice = (val: string | null) => {
          if (!val) return 0
          // Extract number including decimals
          const num = parseFloat(val.replace(/[^0-9.]/g, ''))
          return isNaN(num) ? 0 : num
        }
        comparison = parsePrice(a[sortField]) - parsePrice(b[sortField])
      } else if (sortField === 'supportsReasoningEffort') {
        comparison = (a.supportsReasoningEffort ? 1 : 0) - (b.supportsReasoningEffort ? 1 : 0)
      }

      // Secondary sorting: alphabetical by name
      if (comparison === 0 && sortField !== 'name') {
        comparison = a.name.localeCompare(b.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [llmModels, sortField, sortDirection])

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  async function handleSyncModels() {
    startSaving()
    try {
      await syncDefaultModels()
    } finally {
      doneSaving()
    }
  }

  async function handleSaveModel() {
    if (!newModel.id || !newModel.name) return
    
    startSaving()
    try {
      if (editingModelId) {
        await updateLlmModel(editingModelId, {
          modelId: newModel.id,
          name: newModel.name,
          provider: newModel.provider,
          inputCost: newModel.inputCost,
          outputCost: newModel.outputCost,
          url: newModel.url || null,
          supportsReasoningEffort: newModel.supportsReasoningEffort,
          defaultReasoningEffort: newModel.supportsReasoningEffort ? newModel.defaultReasoningEffort : null
        })
      } else {
        await addLlmModel({
          modelId: newModel.id,
          name: newModel.name,
          provider: newModel.provider,
          inputCost: newModel.inputCost,
          outputCost: newModel.outputCost,
          url: newModel.url || null,
          bestFor: null,
          supportsReasoningEffort: newModel.supportsReasoningEffort,
          defaultReasoningEffort: newModel.supportsReasoningEffort ? newModel.defaultReasoningEffort : 'medium'
        })
      }
      setNewModel({ 
        id: '', 
        name: '', 
        provider: 'openai',
        inputCost: '', 
        outputCost: '', 
        url: '', 
        supportsReasoningEffort: false, 
        defaultReasoningEffort: 'medium' 
      })
      setEditingModelId(null)
    } finally {
      doneSaving()
    }
  }

  function handleEditModel(m: LlmModelData) {
    setEditingModelId(m.id)
    setNewModel({
      id: m.modelId,
      name: m.name,
      provider: m.provider as 'openai' | 'togetherai',
      inputCost: m.inputCost || '',
      outputCost: m.outputCost || '',
      url: m.url || '',
      supportsReasoningEffort: m.supportsReasoningEffort || false,
      defaultReasoningEffort: m.defaultReasoningEffort || 'medium'
    })
    const form = document.getElementById('llm-form')
    if (form) form.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleDeleteModel(id: string) {
    if (!confirm('Möchten Sie dieses Modell wirklich löschen?')) return
    startSaving()
    try {
      await deleteModel(id)
      if (editingModelId === id) {
        setEditingModelId(null)
        setNewModel({ 
          id: '', 
          name: '', 
          provider: 'openai',
          inputCost: '', 
          outputCost: '', 
          url: '', 
          supportsReasoningEffort: false, 
          defaultReasoningEffort: 'medium' 
        })
      }
    } finally {
      doneSaving()
    }
  }

  return (
    <div className="card p-4 space-y-3 max-w-xl">
      <h2 className="font-medium">
        <span className="inline-flex items-center gap-1">
          <TablerIcon name="robot" />
          <span>KI-Modellverwaltung</span>
        </span>
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Hier kannst du eigene KI-Modelle hinzufügen oder die Standard-Modelle synchronisieren.
          </div>
          <button
            onClick={handleSyncModels}
            className="btn btn-xs btn-outline btn-primary"
            title="Standard-Modelle aus Konfiguration laden"
          >
            <TablerIcon name="refresh" size={14} className="mr-1" />
            Standard-Modelle laden
          </button>
        </div>
        
        <div id="llm-form" className="border border-base-300 rounded-lg p-3 space-y-2 bg-base-100/50">
          <h3 className="text-sm font-medium">{editingModelId ? 'Modell bearbeiten' : 'Neues Modell hinzufügen'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs">
              <div className="text-gray-400 mb-0.5">Modell ID (z.B. gpt-4)</div>
              <input
                type="text"
                placeholder="Modell ID"
                value={newModel.id}
                onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-gray-400 mb-0.5">Anzeigename</div>
              <input
                type="text"
                placeholder="Anzeigename"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-gray-400 mb-0.5">Provider</div>
              <select
                value={newModel.provider}
                onChange={(e) => setNewModel({ ...newModel, provider: e.target.value as 'openai' | 'togetherai' })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="togetherai">Together AI</option>
              </select>
            </label>
            <label className="text-xs">
              <div className="text-gray-400 mb-0.5">Input Preis (z.B. $0.50)</div>
              <input
                type="text"
                placeholder="Input Preis"
                value={newModel.inputCost}
                onChange={(e) => setNewModel({ ...newModel, inputCost: e.target.value })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-gray-400 mb-0.5">Output Preis (z.B. $1.50)</div>
              <input
                type="text"
                placeholder="Output Preis"
                value={newModel.outputCost}
                onChange={(e) => setNewModel({ ...newModel, outputCost: e.target.value })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              <div className="text-gray-400 mb-0.5">Dokumentations-URL (Optional)</div>
              <input
                type="text"
                placeholder="https://..."
                value={newModel.url}
                onChange={(e) => setNewModel({ ...newModel, url: e.target.value })}
                className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
              />
            </label>
            
            <div className="sm:col-span-2 flex flex-wrap items-center gap-4 py-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newModel.supportsReasoningEffort}
                  onChange={(e) => setNewModel({ ...newModel, supportsReasoningEffort: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs">Unterstützt Reasoning Effort</span>
              </label>
              
              {newModel.supportsReasoningEffort && (
                <label className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Standard:</span>
                  <select
                    value={newModel.defaultReasoningEffort}
                    onChange={(e) => setNewModel({ ...newModel, defaultReasoningEffort: e.target.value })}
                    className="bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingModelId && (
              <button
                onClick={() => {
                  setEditingModelId(null)
                  setNewModel({ 
                    id: '', 
                    name: '', 
                    provider: 'openai',
                    inputCost: '', 
                    outputCost: '', 
                    url: '', 
                    supportsReasoningEffort: false, 
                    defaultReasoningEffort: 'medium' 
                  })
                }}
                className="btn btn-sm btn-ghost"
              >
                Abbrechen
              </button>
            )}
            <button
              onClick={handleSaveModel}
              className="btn btn-sm btn-primary"
              disabled={!newModel.id || !newModel.name}
            >
              {editingModelId ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Verfügbare Modelle</h3>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>Sortieren nach:</span>
              <button 
                onClick={() => toggleSort('name')}
                className={`px-1 py-0.5 rounded hover:bg-base-200 transition-colors ${sortField === 'name' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'border border-transparent'}`}
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('inputCost')}
                className={`px-1 py-0.5 rounded hover:bg-base-200 transition-colors ${sortField === 'inputCost' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'border border-transparent'}`}
              >
                Input {sortField === 'inputCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('outputCost')}
                className={`px-1 py-0.5 rounded hover:bg-base-200 transition-colors ${sortField === 'outputCost' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'border border-transparent'}`}
              >
                Output {sortField === 'outputCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('supportsReasoningEffort')}
                className={`px-1 py-0.5 rounded hover:bg-base-200 transition-colors ${sortField === 'supportsReasoningEffort' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'border border-transparent'}`}
              >
                Reasoning {sortField === 'supportsReasoningEffort' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {sortedModels.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm p-2 bg-base-100 rounded border border-base-200">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{m.name}</div>
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5 text-xs"
                      >
                        <TablerIcon name="external-link" size={12} />
                        Info
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono truncate">{m.modelId}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-gray-500">{m.inputCost || '-'} / {m.outputCost || '-'}</div>
                    {m.supportsReasoningEffort && (
                      <span className="badge badge-ghost badge-xs text-[10px]">
                        Reasoning: {m.defaultReasoningEffort || 'auto'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`badge badge-sm ${m.provider === 'openai' ? 'badge-success' : 'badge-info'}`}>{m.provider}</span>
                  <button
                    onClick={() => handleEditModel(m)}
                    className="btn btn-ghost btn-xs p-0 h-6 w-6 min-h-0"
                    title="Modell bearbeiten"
                  >
                    <TablerIcon name="edit" size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteModel(m.id)}
                    className="btn btn-ghost btn-xs text-error p-0 h-6 w-6 min-h-0"
                    title="Modell löschen"
                  >
                    <TablerIcon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <SaveIndicator saving={saving} savedAt={savedAt} />
      </div>
    </div>
  )
}
