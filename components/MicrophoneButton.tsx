"use client"
import React, { useEffect, useRef, useState } from 'react'
import { TablerIcon } from './TablerIcon'
import fixWebmDuration from 'fix-webm-duration'
import { usePasscodeLock } from '@/hooks/usePasscodeLock'

type RecordingState = 'idle' | 'recording' | 'paused' | 'uploading'

/**
 * MicrophoneButton
 * - Records audio with MediaRecorder
 * - 4 states: idle, recording, paused, uploading
 * - Sends audio to /api/diary/upload-audio (if keepAudio/date provided) or /api/transcribe
 * - Calls onAudioData with transcribed text and optional audio file ID
 */
export function MicrophoneButton(props: {
  onAudioData?: (result: { text: string; audioFileId?: string | null; audioFilePath?: string | null }) => void
  onText?: (text: string) => void
  title?: string
  className?: string
  compact?: boolean
  initialModel?: string
  modelOptions?: string[]
  keepAudio?: boolean
  date?: string // ISO date string YYYY-MM-DD
  time?: string // HH:MM time string
}) {
  const {
    onAudioData,
    onText,
    title = 'Spracheingabe starten/stoppen',
    className,
    compact = true,
    initialModel,
    modelOptions,
    keepAudio = false,
    date,
    time,
  } = props

  const defaultModels = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TRANSCRIBE_MODELS)
    ? String(process.env.NEXT_PUBLIC_TRANSCRIBE_MODELS).split(',').map(s => s.trim()).filter(Boolean)
    : ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'openai/whisper-large-v3', 'deepgram/nova-3']

  const [selectedModel, setSelectedModel] = useState<string>(
    initialModel || 'gpt-4o-transcribe'
  )
  const [models] = useState<string[]>(modelOptions && modelOptions.length ? modelOptions : defaultModels)

  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showCfg, setShowCfg] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Get passcode lock functions to pause timeout during recording
  const { pauseTimeout, resumeTimeout } = usePasscodeLock()

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordingStartTimeRef = useRef<Date | null>(null)
  const isInitialMountRef = useRef(true)

  // Pause passcode timeout during recording
  useEffect(() => {
    if (state === 'recording' || state === 'paused') {
      pauseTimeout()
    } else {
      resumeTimeout()
    }
  }, [state, pauseTimeout, resumeTimeout])

  useEffect(() => {
    // Restore model from DB settings
    async function loadModel() {
      try {
        const res = await fetch('/api/user/settings', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          if (data.settings?.transcriptionModel) {
            setSelectedModel(data.settings.transcriptionModel)
          }
        }
      } catch {/* ignore */}
      finally {
        isInitialMountRef.current = false
      }
    }
    loadModel()
  }, [])

  useEffect(() => {
    // Persist model selection to DB (skip on initial mount)
    if (isInitialMountRef.current) return
    
    async function saveModel() {
      try {
        await fetch('/api/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptionModel: selectedModel }),
          credentials: 'same-origin',
        })
      } catch {/* ignore */}
    }
    saveModel()
  }, [selectedModel])

  async function startRec() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = getSupportedMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recordingStartTimeRef.current = new Date()
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      rec.onstop = async () => {
        try {
          let blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
          
          // Fix WebM duration/seeking if it's a WebM file
          if (blob.type.includes('webm') && recordingStartTimeRef.current) {
            const duration = Date.now() - recordingStartTimeRef.current.getTime()
            console.log('Fixing WebM duration/seeking...', duration, 'ms')
            blob = await fixWebmDuration(blob, duration, { logger: false })
            console.log('WebM fixed for seeking')
          }
          
          await sendForTranscription(blob)
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Transkription fehlgeschlagen')
          setState('idle')
        } finally {
          cleanup()
        }
      }
      recorderRef.current = rec
      rec.start()
      setState('recording')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mikrofon nicht verfügbar')
      cleanup()
    }
  }

  function pauseRec() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.pause()
      setState('paused')
    }
  }

  function resumeRec() {
    if (recorderRef.current && recorderRef.current.state === 'paused') {
      recorderRef.current.resume()
      setState('recording')
    }
  }

  function stopRec() {
    try { recorderRef.current?.stop() } catch {}
    setState('uploading')
    setStatusMessage('Datei wird hochgeladen...')
  }

  function cleanup() {
    try {
      recorderRef.current?.stream.getTracks().forEach(t => t.stop())
    } catch {}
    recorderRef.current = null
    mediaStreamRef.current = null
    chunksRef.current = []
    recordingStartTimeRef.current = null
  }

  function getSupportedMime(): string | null {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ]
    const MR = (globalThis as unknown as { MediaRecorder?: { isTypeSupported?: (m: string) => boolean } }).MediaRecorder
    for (const m of candidates) {
      if (MR && typeof MR.isTypeSupported === 'function' && MR.isTypeSupported(m)) return m
    }
    return null
  }

  async function sendForTranscription(blob: Blob) {
    setState('uploading')
    setStatusMessage('Datei wird hochgeladen...')
    setError(null)
    try {
      const fd = new FormData()
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('mpeg') ? 'mp3' : 'webm'
      
      const startTime = recordingStartTimeRef.current || new Date()
      const year = startTime.getFullYear()
      const month = String(startTime.getMonth() + 1).padStart(2, '0')
      const day = String(startTime.getDate()).padStart(2, '0')
      const hours = String(startTime.getHours()).padStart(2, '0')
      const minutes = String(startTime.getMinutes()).padStart(2, '0')
      const guid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
      
      const filename = `${year}-${month}-${day}_${hours}-${minutes}_${guid}.${ext}`
      fd.append('file', new File([blob], filename, { type: blob.type || 'audio/webm' }))
      fd.append('model', selectedModel)

      if (keepAudio && date) {
        fd.append('date', date)
        fd.append('time', time || '')
        fd.append('keepAudio', String(keepAudio))
        
        setStatusMessage('Wird transkribiert...')
        const res = await fetch('/api/diary/upload-audio', { method: 'POST', body: fd, credentials: 'same-origin' })
        if (!res.ok) {
          const errorData = await res.json()
          console.error('Server error response:', errorData)
          const errorMessage = errorData.error || 'Upload fehlgeschlagen'
          const details = errorData.details ? ` (${errorData.details})` : ''
          throw new Error(errorMessage + details)
        }
        const data = await res.json()
        if (onAudioData) {
          onAudioData({ 
            text: data.text, 
            audioFileId: data.audioFileId,
            audioFilePath: data.audioFilePath 
          })
        } else if (onText) {
          onText(data.text)
        }
      } else {
        setStatusMessage('Wird transkribiert...')
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd, credentials: 'same-origin' })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Transkription fehlgeschlagen')
        }
        const data = await res.json()
        if (onAudioData) {
          onAudioData({ text: data.text, audioFileId: null, audioFilePath: null })
        } else if (onText) {
          onText(data.text)
        }
      }
    } finally {
      setState('idle')
      setStatusMessage('')
    }
  }

  // Icon size consistent at 20px
  const ICON_SIZE = 20

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Main microphone/pause button */}
      <span
        role="button"
        tabIndex={0}
        title={state === 'idle' ? title : state === 'recording' ? 'Pause' : state === 'paused' ? 'Fortsetzen' : 'Wird hochgeladen...'}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          state === 'idle' ? 'text-green-500 hover:text-green-400' : '',
          state === 'recording' ? 'text-orange-500 hover:text-orange-400' : '',
          state === 'paused' ? 'text-orange-500 hover:text-orange-400 animate-pulse' : '',
          state === 'uploading' ? 'opacity-60 pointer-events-none' : '',
          className || ''
        ].join(' ')}
        onClick={() => {
          if (state === 'idle') startRec()
          else if (state === 'recording') pauseRec()
          else if (state === 'paused') resumeRec()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (state === 'idle') startRec()
            else if (state === 'recording') pauseRec()
            else if (state === 'paused') resumeRec()
          }
        }}
      >
        {state === 'idle' && <TablerIcon name="microphone-filled" size={ICON_SIZE} />}
        {state === 'recording' && <TablerIcon name="player-pause-filled" size={ICON_SIZE} />}
        {state === 'paused' && <TablerIcon name="player-pause-filled" size={ICON_SIZE} />}
        {state === 'uploading' && <TablerIcon name="hourglass-filled" size={ICON_SIZE} className="animate-spin text-amber-700" />}
      </span>

      {/* Stop button - only visible during recording or paused */}
      {(state === 'recording' || state === 'paused') && (
        <span
          role="button"
          tabIndex={0}
          title="Aufnahme beenden"
          aria-label="Aufnahme beenden"
          className="inline-flex items-center justify-center cursor-pointer select-none text-red-500 hover:text-red-400"
          onClick={stopRec}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              stopRec()
            }
          }}
        >
          <TablerIcon name="player-stop-filled" size={ICON_SIZE} />
        </span>
      )}

      {/* Settings button */}
      {compact && state === 'idle' && (
        <button 
          type="button" 
          title="Modell wählen" 
          aria-label="Modell wählen" 
          className="text-gray-500 hover:text-gray-400" 
          onClick={() => setShowCfg(v => !v)}
        >
          <TablerIcon name="settings-filled" size={ICON_SIZE} />
        </button>
      )}
      
      {/* Model selection dropdown */}
      {!compact && (
        <select
          className="bg-background border border-slate-700 rounded px-2 py-1 text-xs"
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          title="Transkriptionsmodell"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      
      {compact && showCfg && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-surface border border-slate-800 rounded p-2 shadow">
          <div className="text-xs mb-1 text-gray-400">Modell</div>
          <select
            className="bg-background border border-slate-700 rounded px-2 py-1 text-xs"
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value)
              setShowCfg(false)
            }}
          >
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
      
      {/* Status message during upload */}
      {state === 'uploading' && statusMessage && (
        <span className="text-sm text-base-content/70 ml-2">{statusMessage}</span>
      )}
      
      {error && <span className="text-sm text-error ml-2" title={error}>Fehler</span>}
    </div>
  )
}
