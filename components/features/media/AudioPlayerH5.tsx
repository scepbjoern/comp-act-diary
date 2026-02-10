"use client"
import React, { useState, useEffect, useRef } from 'react'

interface AudioPlayerH5Props {
  audioFilePath: string
  className?: string
  compact?: boolean
}

/**
 * Audio Player using native HTML5 audio element
 * Simple and works with unlimited instances on a page
 */
export function AudioPlayerH5({ audioFilePath, className = '', compact = false }: AudioPlayerH5Props) {
  const audioUrl = `/uploads/${audioFilePath}`
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Playback speed cycle: 1 → 1.5 → 2 → 3 → 4 → 1
  const speedSteps = [1, 1.5, 2, 3, 4]
  const cycleSpeed = () => {
    const currentIndex = speedSteps.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % speedSteps.length
    const nextRate = speedSteps[nextIndex]
    setPlaybackRate(nextRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    
    const bounds = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - bounds.left) / bounds.width
    const seekTime = percent * duration
    
    audio.currentTime = seekTime
    setCurrentTime(seekTime)
    setProgress(percent * 100)
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <button
          onClick={togglePlay}
          className="btn btn-circle btn-sm btn-primary"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-400 tabular-nums">{formatTime(currentTime)}</span>
          <div 
            className="flex-1 h-2 bg-base-300 rounded-full cursor-pointer relative group"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{formatTime(duration)}</span>
        </div>
        {/* Playback speed toggle */}
        <button
          onClick={cycleSpeed}
          className="text-xs font-medium tabular-nums min-w-[2.5rem] text-center rounded px-1 py-0.5 bg-base-300 hover:bg-base-200 text-base-content/70"
          title="Abspieltempo ändern"
        >
          {playbackRate}x
        </button>
      </div>
    )
  }

  return (
    <div className={`p-3 bg-base-200 rounded-lg border border-base-300 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="btn btn-circle btn-primary"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <div className="flex-1 space-y-1">
          <div 
            className="h-2 bg-base-300 rounded-full cursor-pointer relative group"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        {/* Playback speed toggle */}
        <button
          onClick={cycleSpeed}
          className="btn btn-ghost btn-sm text-xs font-medium tabular-nums min-w-[3rem]"
          title="Abspieltempo ändern"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  )
}
