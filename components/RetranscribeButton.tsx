"use client"
import React, { useState } from 'react'
import { TablerIcon } from './TablerIcon'

interface RetranscribeButtonProps {
  audioFileId: string | null
  onRetranscribed: (text: string) => void
  disabled?: boolean
}

export function RetranscribeButton({ audioFileId, onRetranscribed, disabled = false }: RetranscribeButtonProps) {
  const [isRetranscribing, setIsRetranscribing] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  
  const whisperModels = ['openai/whisper-large-v3']
  const deepgramModels = ['deepgram/nova-3']
  const gptModels = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe']
  
  const handleRetranscribe = async (model: string) => {
    if (!audioFileId) return
    
    setIsRetranscribing(true)
    setShowModelSelector(false)
    
    try {
      const formData = new FormData()
      formData.append('audioFileId', audioFileId)
      formData.append('model', model)
      
      const response = await fetch('/api/diary/retranscribe', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Retranscription failed:', errorData)
        alert(`Re-Transkription fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`)
        return
      }
      
      const data = await response.json()
      console.log('Retranscription successful:', data)
      onRetranscribed(data.text)
      
    } catch (error) {
      console.error('Retranscription error:', error)
      alert('Re-Transkription fehlgeschlagen: Netzwerkfehler')
    } finally {
      setIsRetranscribing(false)
    }
  }
  
  if (!audioFileId) {
    return null
  }
  
  return (
    <div className="relative">
      <button
        className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
        onClick={() => setShowModelSelector(!showModelSelector)}
        disabled={isRetranscribing || disabled}
        title="Audio erneut transkribieren"
      >
        <TablerIcon name="language-hiragana" size={16} />
        <span className="ml-1">{isRetranscribing ? '...' : 'Re-Transkribieren'}</span>
      </button>
      
      {showModelSelector && (
        <div className="absolute top-full right-0 mt-1 bg-surface border border-slate-700 rounded shadow-lg z-50 p-2 min-w-[200px]">
          <div className="text-xs text-gray-400 mb-2">Modell auswählen:</div>
          
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium mb-1">Whisper Modelle:</div>
            {whisperModels.map(model => (
              <button
                key={model}
                className="btn btn-ghost btn-xs w-full justify-start text-left"
                onClick={() => handleRetranscribe(model)}
                disabled={isRetranscribing}
              >
                {model}
              </button>
            ))}
          </div>
          
          <div className="space-y-1 mt-2">
            <div className="text-xs text-gray-500 font-medium mb-1">Deepgram Modelle:</div>
            {deepgramModels.map(model => (
              <button
                key={model}
                className="btn btn-ghost btn-xs w-full justify-start text-left"
                onClick={() => handleRetranscribe(model)}
                disabled={isRetranscribing}
              >
                {model}
              </button>
            ))}
          </div>
          
          <div className="space-y-1 mt-2">
            <div className="text-xs text-gray-500 font-medium mb-1">GPT Modelle:</div>
            {gptModels.map(model => (
              <button
                key={model}
                className="btn btn-ghost btn-xs w-full justify-start text-left"
                onClick={() => handleRetranscribe(model)}
                disabled={isRetranscribing}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
