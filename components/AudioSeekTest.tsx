"use client"
import React, { useRef, useState, useEffect } from 'react'

export function AudioSeekTest() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [testUrl, setTestUrl] = useState('')

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50))
    console.log(msg)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlers = {
      loadstart: () => addLog('🔄 loadstart'),
      loadedmetadata: () => {
        addLog(`📊 loadedmetadata - duration: ${audio.duration}s`)
        setDuration(audio.duration)
      },
      loadeddata: () => addLog('📦 loadeddata'),
      canplay: () => addLog('✅ canplay'),
      canplaythrough: () => addLog('✅ canplaythrough'),
      seeking: () => addLog(`⏩ seeking to ${audio.currentTime}s`),
      seeked: () => addLog(`✓ seeked to ${audio.currentTime}s`),
      timeupdate: () => setCurrentTime(audio.currentTime),
      play: () => addLog('▶️ play'),
      pause: () => addLog('⏸️ pause'),
      ended: () => addLog('🏁 ended'),
      error: () => addLog(`❌ error: ${audio.error?.message}`),
      stalled: () => addLog('⚠️ stalled'),
      waiting: () => addLog('⏳ waiting'),
      progress: () => {
        if (audio.buffered.length > 0) {
          const buffered = audio.buffered.end(audio.buffered.length - 1)
          addLog(`📥 progress: buffered ${buffered.toFixed(1)}s`)
        }
      }
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler as EventListener)
    })

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        audio.removeEventListener(event, handler as EventListener)
      })
    }
  }, [testUrl])

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    
    addLog(`🎯 Attempting to seek to ${seconds}s`)
    audio.currentTime = seconds
  }

  const testSeekSequence = async () => {
    addLog('🧪 Starting seek test sequence...')
    const positions = [10, 30, 5, 60, 0]
    
    for (const pos of positions) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      seekTo(pos)
    }
  }

  return (
    <div className="card p-4 space-y-4 bg-base-200">
      <h2 className="text-xl font-bold">🔬 Audio Seek Test</h2>
      
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Audio URL testen:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="/uploads/2020s/2025/11/filename.webm"
            className="input input-bordered flex-1"
          />
          <button 
            onClick={() => audioRef.current?.load()}
            className="btn btn-primary"
          >
            Load
          </button>
        </div>
      </div>

      {/* Audio Element */}
      {testUrl && (
        <audio 
          ref={audioRef} 
          src={testUrl}
          preload="auto"
          className="w-full"
          controls
        />
      )}

      {/* Status */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="stat bg-base-300 rounded p-2">
          <div className="stat-title text-xs">Current</div>
          <div className="stat-value text-lg">{currentTime.toFixed(1)}s</div>
        </div>
        <div className="stat bg-base-300 rounded p-2">
          <div className="stat-title text-xs">Duration</div>
          <div className="stat-value text-lg">{duration.toFixed(1)}s</div>
        </div>
        <div className="stat bg-base-300 rounded p-2">
          <div className="stat-title text-xs">Buffered</div>
          <div className="stat-value text-lg">
            {audioRef.current?.buffered.length 
              ? audioRef.current.buffered.end(audioRef.current.buffered.length - 1).toFixed(1) 
              : '0'}s
          </div>
        </div>
      </div>

      {/* Seek Buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Manuelle Seek-Tests:</label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => seekTo(0)} className="btn btn-sm">0s</button>
          <button onClick={() => seekTo(5)} className="btn btn-sm">5s</button>
          <button onClick={() => seekTo(10)} className="btn btn-sm">10s</button>
          <button onClick={() => seekTo(30)} className="btn btn-sm">30s</button>
          <button onClick={() => seekTo(60)} className="btn btn-sm">60s</button>
          <button onClick={() => seekTo(duration / 2)} className="btn btn-sm">Mitte</button>
          <button onClick={() => seekTo(duration - 5)} className="btn btn-sm">Ende-5s</button>
        </div>
        <button 
          onClick={testSeekSequence}
          className="btn btn-accent w-full"
        >
          🧪 Auto-Test-Sequenz starten
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Seek Slider:</label>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            setCurrentTime(val)
            if (audioRef.current) {
              audioRef.current.currentTime = val
            }
          }}
          className="range range-primary"
          step="0.1"
        />
      </div>

      {/* Network Info */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Network Debug:</label>
        <div className="text-xs space-y-1 font-mono bg-base-300 p-2 rounded">
          <div>Audio src: {audioRef.current?.src}</div>
          <div>Network state: {audioRef.current?.networkState} (1=LOADING, 2=LOADED, 3=NO_SOURCE)</div>
          <div>Ready state: {audioRef.current?.readyState} (0-4, 4=HAVE_ENOUGH_DATA)</div>
          <div>Seeking: {audioRef.current?.seeking ? 'YES' : 'NO'}</div>
          <div>Paused: {audioRef.current?.paused ? 'YES' : 'NO'}</div>
        </div>
      </div>

      {/* Event Logs */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">Event Log:</label>
          <button 
            onClick={() => setLogs([])}
            className="btn btn-xs btn-ghost"
          >
            Clear
          </button>
        </div>
        <div className="bg-base-300 rounded p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500">Noch keine Events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
