'use client'

import { useState, useRef, useEffect } from 'react'
import { TablerIcon } from './TablerIcon'

interface AudioPlayerProps {
  audioFilePath: string
  className?: string
  compact?: boolean
}

export default function AudioPlayer({ audioFilePath, className = '', compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handleSeeking = () => {
      // Keep the UI synchronized during seek
      if (isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }
    const handleSeeked = () => {
      // Update UI after seek completes
      setCurrentTime(audio.currentTime)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('seeking', handleSeeking)
    audio.addEventListener('seeked', handleSeeked)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('seeking', handleSeeking)
      audio.removeEventListener('seeked', handleSeeked)
    }
  }, [isSeeking])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
  }

  const handleSeekStart = () => {
    setIsSeeking(true)
  }

  const handleSeekEnd = () => {
    const audio = audioRef.current
    if (audio && isFinite(currentTime)) {
      // For webm and other formats, seeking can be tricky
      // Try multiple times with a small delay to ensure it sticks
      const targetTime = currentTime
      
      const attemptSeek = (attempts = 0) => {
        if (attempts > 3) return
        
        audio.currentTime = targetTime
        
        // Verify seek worked after a brief delay
        setTimeout(() => {
          if (Math.abs(audio.currentTime - targetTime) > 0.5) {
            attemptSeek(attempts + 1)
          }
        }, 50)
      }
      
      attemptSeek()
    }
    setIsSeeking(false)
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Build the URL to serve the audio file
  const audioUrl = `/uploads/${audioFilePath}`

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <audio ref={audioRef} src={audioUrl} preload="auto" />
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <TablerIcon name={isPlaying ? 'pause' : 'play_arrow'} />
        </button>
        <span className="text-xs text-gray-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 p-3 rounded bg-slate-800/50 border border-slate-700 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <TablerIcon name={isPlaying ? 'pause' : 'play_arrow'} />
        </button>

        <div className="flex-1 flex flex-col gap-1">
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
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #334155 ${(currentTime / duration) * 100}%, #334155 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
