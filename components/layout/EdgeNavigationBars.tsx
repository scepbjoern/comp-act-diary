'use client'

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

interface EdgeNavigationBarsProps {
  onPrevious: () => void
  onNext: () => void
}

/**
 * Almost invisible edge navigation bars for quick day navigation.
 * Positioned fixed on left/right screen edges, vertically centered.
 */
export function EdgeNavigationBars({ onPrevious, onNext }: EdgeNavigationBarsProps) {
  return (
    <>
      {/* Left edge bar - Previous day */}
      <button
        onClick={onPrevious}
        aria-label="Vorheriger Tag"
        title="Vorheriger Tag"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40
          w-3 h-24 
          flex items-center justify-center
          bg-slate-700/10 hover:bg-slate-600/40
          text-slate-400/20 hover:text-slate-300
          transition-all duration-200 ease-in-out
          rounded-r-lg
          backdrop-blur-[1px] hover:backdrop-blur-sm
          cursor-pointer
          group"
      >
        <IconChevronLeft 
          className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" 
          stroke={2}
        />
      </button>

      {/* Right edge bar - Next day */}
      <button
        onClick={onNext}
        aria-label="Nächster Tag"
        title="Nächster Tag"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40
          w-3 h-24
          flex items-center justify-center
          bg-slate-700/10 hover:bg-slate-600/40
          text-slate-400/20 hover:text-slate-300
          transition-all duration-200 ease-in-out
          rounded-l-lg
          backdrop-blur-[1px] hover:backdrop-blur-sm
          cursor-pointer
          group"
      >
        <IconChevronRight 
          className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" 
          stroke={2}
        />
      </button>
    </>
  )
}
