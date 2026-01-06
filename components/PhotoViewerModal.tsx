import Image from 'next/image'
import type { DayNote } from '@/types/day'

interface PhotoViewerModalProps {
  viewer: { noteId: string; index: number; url?: string } | null
  notes: DayNote[]
  swipeStartX: number | null
  onClose: () => void
  onNavigate: (delta: number) => void
  onSwipeStart: (x: number | null) => void
  onSwipeEnd: (x: number | null, startX: number | null) => void
}

export function PhotoViewerModal({
  viewer,
  notes,
  swipeStartX,
  onClose,
  onNavigate,
  onSwipeStart,
  onSwipeEnd,
}: PhotoViewerModalProps) {
  if (!viewer) return null

  const note = notes.find(nn => nn.id === viewer.noteId)
  const photos = note?.photos || []
  const current = photos[viewer.index]
  
  // Use direct URL if provided (markdown image), otherwise use photo from array
  const imageUrl = viewer.url || (current ? `${current.url}?v=${current.id}` : null)
  
  if (!imageUrl) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" 
      onClick={onClose}
      onTouchStart={e => onSwipeStart(e.touches?.[0]?.clientX ?? null)}
      onTouchEnd={e => {
        const x = e.changedTouches?.[0]?.clientX
        onSwipeEnd(typeof x === 'number' ? x : null, swipeStartX)
      }}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center" 
        onClick={e => e.stopPropagation()}
      >
        <Image 
          src={imageUrl} 
          alt="Foto" 
          width={800}
          height={600}
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
        <button 
          aria-label="Vorheriges Foto" 
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" 
          onClick={() => onNavigate(-1)}
        >
          ‹
        </button>
        <button 
          aria-label="Nächstes Foto" 
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" 
          onClick={() => onNavigate(1)}
        >
          ›
        </button>
        <button 
          aria-label="Schließen" 
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" 
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  )
}
