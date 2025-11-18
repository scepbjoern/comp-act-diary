"use client"
import React, { useEffect, useRef, useState } from 'react'
import { TablerIcon } from './TablerIcon'
import fixWebmDuration from 'fix-webm-duration'

/**
 * MicrophoneButton
 * - Records audio with MediaRecorder
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
    : ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'openai/whisper-large-v3']

  const [selectedModel, setSelectedModel] = useState<string>(
    initialModel || 'gpt-4o-transcribe'
  )
  const [models] = useState<string[]>(modelOptions && modelOptions.length ? modelOptions : defaultModels)

  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCfg, setShowCfg] = useState(false)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordingStartTimeRef = useRef<Date | null>(null)
  const isInitialMountRef = useRef(true)

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
      recordingStartTimeRef.current = new Date() // Record start time
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
        } finally {
          cleanup()
        }
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mikrofon nicht verfügbar')
      cleanup()
    }
  }

  function stopRec() {
    try { recorderRef.current?.stop() } catch {}
    setRecording(false)
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
    // Only rely on presence of MediaRecorder and its static isTypeSupported
    const MR = (globalThis as unknown as { MediaRecorder?: { isTypeSupported?: (m: string) => boolean } }).MediaRecorder
    for (const m of candidates) {
      if (MR && typeof MR.isTypeSupported === 'function' && MR.isTypeSupported(m)) return m
    }
    return null
  }

  async function sendForTranscription(blob: Blob) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('mpeg') ? 'mp3' : 'webm'
      
      // Generate filename with recording start time
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

      // Use /api/diary/upload-audio if we have date and want to save audio
      if (keepAudio && date) {
        fd.append('date', date)
        fd.append('time', time || '')
        fd.append('keepAudio', String(keepAudio))
        
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
        // Use /api/transcribe for transcription only
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
      setUploading(false)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          recording ? 'text-red-300 hover:text-red-200' : 'text-gray-300 hover:text-gray-100',
          uploading ? 'opacity-60 pointer-events-none' : '',
          className || ''
        ].join(' ')}
        onClick={() => (recording ? stopRec() : startRec())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (recording) {
              stopRec()
            } else {
              startRec()
            }
          }
        }}
      >
        {recording ? <TablerIcon name="player-stop" size={16} /> : <TablerIcon name="microphone" size={16} />}
      </span>
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
      {compact && (
        <button type="button" title="Modell wählen" aria-label="Modell wählen" className="text-xs text-gray-400 hover:text-gray-200" onClick={() => setShowCfg(v => !v)}>
          <TablerIcon name="settings" size={16} />
        </button>
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
      {uploading && <span className="text-xs text-gray-400">…übertrage</span>}
      {error && <span className="text-xs text-red-400" title={error}>Fehler</span>}
    </div>
  )
}
