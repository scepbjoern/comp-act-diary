'use client'

import { useState, useRef, useEffect } from 'react'

export default function AudioTest() {
  const [logs, setLogs] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
        addLog(`timeupdate: ${audio.currentTime.toFixed(2)}s`)
      }
    }
    const updateDuration = () => {
      setDuration(audio.duration)
      addLog(`loadedmetadata: duration=${audio.duration?.toFixed(2)}s`)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      addLog('ended')
    }
    const handleSeeked = () => {
      addLog(`seeked: ${audio.currentTime.toFixed(2)}s`)
    }
    const handleSeeking = () => {
      addLog(`seeking: ${audio.currentTime.toFixed(2)}s`)
    }
    const handleCanPlay = () => {
      addLog('canplay')
    }
    const handleLoadedData = () => {
      addLog('loadeddata')
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('seeked', handleSeeked)
    audio.addEventListener('seeking', handleSeeking)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadeddata', handleLoadedData)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('seeked', handleSeeked)
      audio.removeEventListener('seeking', handleSeeking)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [isSeeking])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      addLog('pause')
    } else {
      void audio.play()
      addLog('play')
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    addLog(`slider change: ${time.toFixed(2)}s`)
  }

  const handleSeekStart = () => {
    setIsSeeking(true)
    addLog('seek start')
  }

  const handleSeekEnd = () => {
    const audio = audioRef.current
    if (audio) {
      const time = currentTime
      addLog(`seek end: setting audio.currentTime to ${time.toFixed(2)}s`)
      
      // Try multiple approaches for robust seeking
      const trySeek = (attempts = 0) => {
        if (attempts >= 5) {
          addLog('seek failed after 5 attempts')
          return
        }
        
        if (audio) {
          audio.currentTime = time
          addLog(`seek attempt ${attempts + 1}: set currentTime to ${time.toFixed(2)}s`)
          
          // Check if seek worked after a short delay
          setTimeout(() => {
            if (audio && Math.abs(audio.currentTime - time) > 1.0) {
              addLog(`seek failed, current time is ${audio.currentTime.toFixed(2)}s, retrying...`)
              trySeek(attempts + 1)
            } else if (audio) {
              addLog(`seek successful! current time is ${audio.currentTime.toFixed(2)}s`)
            }
          }, 200)
        }
      }
      
      trySeek()
    }
    setIsSeeking(false)
  }

  const clearLogs = () => setLogs([])

  // Test with a known audio file
  const testAudioUrl = '/uploads/2020s/2025/11/2025-11-16_5b827256-7fec-42a9-84fd-c198ec279b35.m4a'

  return (
    <div className="p-6 bg-slate-900 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Audio Seek Test</h2>
      
      <div className="bg-slate-800 rounded p-4 mb-4">
        <audio 
          ref={audioRef} 
          src={testAudioUrl} 
          preload="auto"
          crossOrigin="anonymous"
        />
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              step="0.01"
              className="w-full"
            />
            <div className="text-white text-sm mt-1">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => { 
              if (audioRef.current) {
                addLog('jump to 5s')
                audioRef.current.currentTime = 5
                setCurrentTime(5)
              }
            }}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Jump to 5s
          </button>
          <button 
            onClick={() => { 
              if (audioRef.current) {
                addLog('jump to 10s')
                audioRef.current.currentTime = 10
                setCurrentTime(10)
              }
            }}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Jump to 10s
          </button>
          <button 
            onClick={() => { 
              if (audioRef.current) {
                addLog('jump to 30s')
                audioRef.current.currentTime = 30
                setCurrentTime(30)
              }
            }}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Jump to 30s
          </button>
          <button 
            onClick={clearLogs}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Clear Logs
          </button>
        </div>
      </div>
      
      <div className="bg-black rounded p-4">
        <h3 className="text-white font-bold mb-2">Event Logs:</h3>
        <div className="text-green-400 font-mono text-xs max-h-64 overflow-y-auto">
          {logs.length === 0 ? 'No events yet...' : logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-gray-400 text-sm">
        <p>Test file: {testAudioUrl}</p>
        <p>Seeking: {isSeeking ? 'YES' : 'NO'}</p>
        <p>Playing: {isPlaying ? 'YES' : 'NO'}</p>
      </div>
    </div>
  )
}
