"use client"
import React, { useCallback } from 'react'

/**
 * Coach Page - ACT Coach Chat Interface
 * 
 * This page provides a chat interface with different chat "modes" (methods).
 * Each mode has a different system prompt for specialized coaching.
 * 
 * Features:
 * - Dropdown to select chat method/mode
 * - Settings icon to manage chat methods (create, edit, delete)
 * - Chat interface with streaming responses
 * - Uses Together AI via Vercel AI SDK
 * - Orchestrated by Mastra (future: RAG, memory, tools)
 * 
 * This is a session-based prototype - messages are NOT persisted.
 * Only the chat methods themselves are stored in the database.
 */

import { useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { TablerIcon } from '@/components/TablerIcon'
import { MicrophoneButton } from '@/components/MicrophoneButton'

import { FALLBACK_MODEL_ID } from '@/lib/llmModels'
import { useLlmModels } from '@/hooks/useLlmModels'

type ChatMethod = {
  id: string
  name: string
  systemPrompt: string
  createdAt: string
  updatedAt: string
}

export default function CoachPage() {
  const [chatMethods, setChatMethods] = useState<ChatMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  // Settings form state
  const [editingMethod, setEditingMethod] = useState<ChatMethod | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrompt, setFormPrompt] = useState('')

  // Chat state using new AI SDK v5 useChat
  const [input, setInput] = useState('')
  const [loadingDiary, setLoadingDiary] = useState(false)

  // Models loaded from database
  const { models: llmModels, isLoading: modelsLoading } = useLlmModels()
  const [selectedModelId, setSelectedModelId] = useState<string>(FALLBACK_MODEL_ID)
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<string>('medium')
  
  // Get the selected model to check if it supports reasoning effort
  const selectedModel = llmModels.find(m => m.modelId === selectedModelId)
  const supportsReasoningEffort = selectedModel?.supportsReasoningEffort ?? false
  
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/coach/chat',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })
  
  const isLoading = status !== 'ready'

  const loadChatMethods = useCallback(async () => {
    try {
      setLoading(true)
      const [methodsRes, meRes] = await Promise.all([
        fetch('/api/coach/methods'),
        fetch('/api/me')
      ])
      
      const methodsData = await methodsRes.json()
      setChatMethods(methodsData.methods || [])
      
      // Models are now loaded via useLlmModels hook
      
      // Auto-select first method if available
      if (methodsData.methods && methodsData.methods.length > 0 && !selectedMethodId) {
        setSelectedMethodId(methodsData.methods[0].id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMethodId])

  // Load chat methods on mount
  useEffect(() => {
    loadChatMethods()
  }, [loadChatMethods])

  async function saveMethod() {
    try {
      const url = editingMethod
        ? `/api/coach/methods/${editingMethod.id}`
        : '/api/coach/methods'
      
      const res = await fetch(url, {
        method: editingMethod ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          systemPrompt: formPrompt,
        }),
      })

      if (res.ok) {
        await loadChatMethods()
        closeSettingsForm()
      }
    } catch (error) {
      console.error('Failed to save method:', error)
    }
  }

  async function deleteMethod(id: string) {
    if (!confirm('Diese Chat-Methode wirklich löschen?')) return

    try {
      const res = await fetch(`/api/coach/methods/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadChatMethods()
        if (selectedMethodId === id) {
          setSelectedMethodId('')
        }
      }
    } catch (error) {
      console.error('Failed to delete method:', error)
    }
  }

  function openCreateForm() {
    setEditingMethod(null)
    setFormName('')
    setFormPrompt('')
    setShowSettings(true)
  }

  function openEditForm(method: ChatMethod) {
    setEditingMethod(method)
    setFormName(method.name)
    setFormPrompt(method.systemPrompt)
    setShowSettings(true)
  }

  function closeSettingsForm() {
    setEditingMethod(null)
    setFormName('')
    setFormPrompt('')
    setShowSettings(false)
  }

  function resetChat() {
    setMessages([])
  }

  async function loadDiaryContext() {
    setLoadingDiary(true)
    try {
      const response = await fetch('/api/notes')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Tagebucheinträge')
      }
      const data = await response.json()
      
      if (data.notes && data.notes.length > 0) {
        // Format diary entries as context
        const contextText = data.notes
          .map((note: { date: string; text: string }) => `Am ${note.date}: ${note.text}`)
          .join('\n\n')
        
        // Add a system message with the diary context
        const contextMessage = {
          role: 'user' as const,
          content: `Hier sind meine bisherigen Tagebucheinträge als Kontext:\n\n${contextText}\n\nBitte berücksichtige diese Informationen bei deiner Antwort.`
        }
        
        // Send the context as a message to make it available for the conversation
        sendMessage({ text: contextMessage.content }, {
          body: {
            chatMethodId: selectedMethodId,
            modelId: selectedModelId,
            reasoningEffort: selectedReasoningEffort,
          }
        })
      } else {
        // Send a message indicating no diary entries found
        sendMessage({ text: 'Keine Tagebucheinträge gefunden.' }, {
          body: {
            chatMethodId: selectedMethodId,
            modelId: selectedModelId,
            reasoningEffort: selectedReasoningEffort,
          }
        })
      }
    } catch (error) {
      console.error('Error loading diary context:', error)
      sendMessage({ text: 'Fehler beim Laden der Tagebucheinträge.' }, {
        body: {
          chatMethodId: selectedMethodId,
          modelId: selectedModelId,
          reasoningEffort: selectedReasoningEffort,
        }
      })
    } finally {
      setLoadingDiary(false)
    }
  }

  const selectedMethod = chatMethods.find(m => m.id === selectedMethodId)

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🌱 ACT Coach</h1>

        {/* Mode Selection and Settings */}
        <div className="mb-6 flex items-center gap-2">
          <select
            value={selectedMethodId}
            onChange={(e) => {
              setSelectedMethodId(e.target.value)
              // Note: We don't auto-reset the chat when changing modes
              // User can manually reset if needed
            }}
            className="select select-bordered flex-1"
            disabled={loading}
          >
            {chatMethods.length === 0 ? (
              <option value="">Keine Chat-Methoden verfügbar</option>
            ) : (
              chatMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))
            )}
          </select>

          <select
            value={selectedModelId}
            onChange={(e) => {
              setSelectedModelId(e.target.value)
              // Reset reasoning effort when model changes
              const newModel = llmModels.find(m => m.modelId === e.target.value)
              if (newModel?.defaultReasoningEffort) {
                setSelectedReasoningEffort(newModel.defaultReasoningEffort)
              }
            }}
            className="select select-bordered flex-1 max-w-xs"
            title="KI-Modell auswählen"
          >
            {llmModels.length === 0 ? (
              <option value="">Lade Modelle...</option>
            ) : (
              llmModels.map(model => (
                <option key={model.modelId} value={model.modelId}>
                  {model.name} ({model.inputCost || '-'} / {model.outputCost || '-'}) [{model.provider}]
                </option>
              ))
            )}
          </select>

          {/* Reasoning Effort selector (only for supported models) */}
          {supportsReasoningEffort && (
            <select
              value={selectedReasoningEffort}
              onChange={(e) => setSelectedReasoningEffort(e.target.value)}
              className="select select-bordered select-sm"
              title="Reasoning-Aufwand (GPT-5)"
            >
              <option value="minimal">Minimal</option>
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
            </select>
          )}

          <button
            onClick={openCreateForm}
            className="btn btn-primary"
            title="Chat-Methode hinzufügen"
          >
            <TablerIcon name="settings" size={20} />
          </button>

          <button
            onClick={loadDiaryContext}
            className="btn btn-outline"
            title="Tagebucheinträge als Kontext hinzufügen"
            disabled={!selectedMethodId || loadingDiary || isLoading}
          >
            {loadingDiary ? (
              <TablerIcon name="hourglass_empty" className="animate-spin" size={20} />
            ) : (
              <TablerIcon name="book" size={20} />
            )}
          </button>

          <button
            onClick={resetChat}
            className="btn btn-outline"
            title="Chat zurücksetzen"
          >
            <TablerIcon name="refresh" size={20} />
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingMethod ? 'Methode bearbeiten' : 'Neue Chat-Methode'}
                </h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input input-bordered w-full"
                      placeholder="z.B. ACT Basics, Werte-Exploration"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">System Prompt</span>
                    </label>
                    <textarea
                      value={formPrompt}
                      onChange={(e) => setFormPrompt(e.target.value)}
                      className="textarea textarea-bordered w-full h-40"
                      placeholder="Du bist ein hilfreicher ACT Coach..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={closeSettingsForm} className="btn btn-ghost">
                    Abbrechen
                  </button>
                  <button
                    onClick={saveMethod}
                    className="btn btn-primary"
                    disabled={!formName || !formPrompt}
                  >
                    Speichern
                  </button>
                </div>

                {/* List of existing methods */}
                {!editingMethod && chatMethods.length > 0 && (
                  <div className="mt-8 border-t border-base-300 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Vorhandene Methoden</h3>
                    <div className="space-y-2">
                      {chatMethods.map(method => (
                        <div
                          key={method.id}
                          className="flex items-start gap-2 p-3 bg-base-300 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold">{method.name}</h4>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {method.systemPrompt}
                            </p>
                          </div>
                          <button
                            onClick={() => openEditForm(method)}
                            className="btn btn-sm btn-ghost"
                            title="Bearbeiten"
                          >
                            <TablerIcon name="edit" size={16} />
                          </button>
                          <button
                            onClick={() => deleteMethod(method.id)}
                            className="btn btn-sm btn-ghost text-error"
                            title="Löschen"
                          >
                            <TablerIcon name="trash" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="border border-base-300 rounded-lg bg-base-200 shadow-lg">
          {/* Chat Header */}
          <div className="p-4 border-b border-base-300 bg-base-300">
            <h2 className="font-semibold">
              {selectedMethod ? selectedMethod.name : 'Wähle eine Chat-Methode'}
            </h2>
            {selectedMethod && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                {selectedMethod.systemPrompt}
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-20">
                <TablerIcon name="message-2" size={48} className="mx-auto mb-4 opacity-50" />
                <p>Keine Nachrichten. Starte eine Unterhaltung!</p>
              </div>
            ) : (
              messages.map((message, index: number) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-300'
                    }`}
                  >
                    {message.parts.map((part, partIndex) => 
                      part.type === 'text' ? (
                        <p key={partIndex} className="whitespace-pre-wrap">{part.text}</p>
                      ) : null
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-base-300 p-3 rounded-lg">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={e => { 
            e.preventDefault(); 
            if (input.trim() && selectedMethodId) { 
              sendMessage({ text: input }, {
                body: {
                  chatMethodId: selectedMethodId,
                  modelId: selectedModelId,
                  reasoningEffort: selectedReasoningEffort,
                }
              }); 
              setInput(''); 
            } 
          }} className="p-4 border-t border-base-300">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedMethodId ? 'Schreibe oder sprich eine Nachricht...' : 'Wähle zuerst eine Chat-Methode'}
                className="input input-bordered flex-1"
                disabled={!selectedMethodId || isLoading}
              />
              <MicrophoneButton
                onText={(text) => {
                  setInput(text)
                }}
                title="Spracheingabe starten/stoppen"
                className={`${!selectedMethodId || isLoading ? 'opacity-50 pointer-events-none' : ''}`}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedMethodId || !input.trim() || isLoading}
              >
                <TablerIcon name="send" size={20} />
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-400 space-y-2">
          <p>
            💡 <strong>Tipp:</strong> Jede Chat-Methode hat einen eigenen System-Prompt.
            Wechsle zwischen Methoden, um verschiedene Coaching-Stile auszuprobieren.
          </p>
          <p>
            🔮 <strong>Zukünftige Features:</strong> RAG (ACT-Buch, Tagebuch-Einträge),
            Langzeit-Speicher, Tools für Reflexionen & Stimmungs-Logging.
          </p>
        </div>
      </div>
    </div>
  )
}
