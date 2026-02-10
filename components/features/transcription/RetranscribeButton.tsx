"use client"
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { IconX } from '@tabler/icons-react'

interface RetranscribeButtonProps {
  audioFileId: string | null
  /** Called when re-transcription completes with the new text and model used */
  onRetranscribed: (text: string, model?: string) => void
  /** Called on error instead of alert() */
  onError?: (message: string) => void
  disabled?: boolean
}

export function RetranscribeButton({ audioFileId, onRetranscribed, onError, disabled = false }: RetranscribeButtonProps) {
  const [isRetranscribing, setIsRetranscribing] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // SSR hydration safety - Portal needs DOM
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
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
        const msg = `Re-Transkription fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`
        console.error('Retranscription failed:', errorData)
        onError?.(msg)
        return
      }
      
      const data = await response.json()
      console.warn('Retranscription successful:', data)
      onRetranscribed(data.text, data.model || model)
      
    } catch (error) {
      console.error('Retranscription error:', error)
      onError?.('Re-Transkription fehlgeschlagen: Netzwerkfehler')
    } finally {
      setIsRetranscribing(false)
    }
  }
  
  if (!audioFileId) {
    return null
  }
  
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square"
        onClick={() => setShowModelSelector(!showModelSelector)}
        disabled={isRetranscribing || disabled}
        title="Re-Transkribieren"
      >
        {isRetranscribing ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <TablerIcon name="language-hiragana" size={16} />
        )}
      </button>
      
      {showModelSelector && isMounted && createPortal(
        <div className="modal modal-open">
          <div className="modal-box max-w-xs">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowModelSelector(false)}
            >
              <IconX size={20} />
            </button>
            
            <h3 className="font-bold text-lg mb-4">Modell auswählen</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-base-content/60 font-medium mb-1">Whisper:</div>
                {whisperModels.map(model => (
                  <button
                    key={model}
                    className="btn btn-ghost btn-sm w-full justify-start text-left"
                    onClick={() => handleRetranscribe(model)}
                    disabled={isRetranscribing}
                  >
                    {model}
                  </button>
                ))}
              </div>
              
              <div>
                <div className="text-xs text-base-content/60 font-medium mb-1">Deepgram:</div>
                {deepgramModels.map(model => (
                  <button
                    key={model}
                    className="btn btn-ghost btn-sm w-full justify-start text-left"
                    onClick={() => handleRetranscribe(model)}
                    disabled={isRetranscribing}
                  >
                    {model}
                  </button>
                ))}
              </div>
              
              <div>
                <div className="text-xs text-base-content/60 font-medium mb-1">GPT:</div>
                {gptModels.map(model => (
                  <button
                    key={model}
                    className="btn btn-ghost btn-sm w-full justify-start text-left"
                    onClick={() => handleRetranscribe(model)}
                    disabled={isRetranscribing}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModelSelector(false)} />
        </div>,
        document.body
      )}
    </>
  )
}
