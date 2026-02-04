'use client'

/**
 * components/features/journal/JournalEntryCard.tsx
 * Unified card component for displaying journal entries.
 * Supports compact (list), expanded (day view), and detail (full page) modes.
 * 
 * Features:
 * - Type badge with icon
 * - Template name display
 * - Title display
 * - Content/Fields display
 * - Audio player (multiple)
 * - Photo gallery
 * - Time display (occurredAt)
 * - Edit/Delete/Share/Pipeline buttons
 */

import { useState, memo, useCallback } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { 
  IconChevronDown, 
  IconChevronUp, 
  IconEdit, 
  IconTrash, 
  IconShare, 
  IconLock, 
  IconMicrophone, 
  IconPhoto, 
  IconSparkles,
  IconPlayerPlay,
  IconPlayerPause,
  IconClock,
  IconCalendar,
} from '@tabler/icons-react'
import type { EntryWithRelations, EntryMediaAttachment } from '@/lib/services/journal/types'
import clsx from 'clsx'

// =============================================================================
// TYPES
// =============================================================================

export type CardMode = 'compact' | 'expanded' | 'detail'

export interface JournalEntryCardProps {
  entry: EntryWithRelations
  mode?: CardMode
  isEditing?: boolean
  onEdit?: (entry: EntryWithRelations) => void
  onDelete?: (entryId: string) => void
  onShare?: (entryId: string) => void
  onRunPipeline?: (entryId: string) => void
  className?: string
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/** Displays the entry type icon and name */
function EntryTypeTag({ type }: { type: EntryWithRelations['type'] }) {
  if (!type) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {type.icon && <TablerIcon name={type.icon} className="h-3.5 w-3.5" />}
      <span>{type.name}</span>
    </span>
  )
}

/** Displays media attachment indicators (for compact mode) */
function MediaIndicators({ attachments }: { attachments: EntryMediaAttachment[] }) {
  if (!attachments || attachments.length === 0) return null

  const audioCount = attachments.filter((a) => a.asset.mimeType?.startsWith('audio/')).length
  const imageCount = attachments.filter((a) => a.asset.mimeType?.startsWith('image/')).length

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {audioCount > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <IconMicrophone className="h-3.5 w-3.5" />
          {audioCount > 1 && <span>{audioCount}</span>}
        </span>
      )}
      {imageCount > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <IconPhoto className="h-3.5 w-3.5" />
          {imageCount > 1 && <span>{imageCount}</span>}
        </span>
      )}
    </span>
  )
}

/** Audio player component for attachments */
function AudioPlayer({ attachment }: { attachment: EntryMediaAttachment }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  const togglePlay = useCallback(() => {
    if (!audioElement) {
      const audio = new Audio(attachment.asset.filePath)
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setAudioElement(audio)
      setIsPlaying(true)
    } else if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      audioElement.play()
      setIsPlaying(true)
    }
  }, [audioElement, isPlaying, attachment.asset.filePath])

  const duration = attachment.asset.duration 
    ? `${Math.floor(attachment.asset.duration / 60)}:${String(Math.floor(attachment.asset.duration % 60)).padStart(2, '0')}`
    : null

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-base-200/50 border border-base-300">
      <button
        onClick={togglePlay}
        className="btn btn-circle btn-sm btn-ghost"
        title={isPlaying ? 'Pause' : 'Abspielen'}
      >
        {isPlaying ? (
          <IconPlayerPause className="h-4 w-4" />
        ) : (
          <IconPlayerPlay className="h-4 w-4" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        {attachment.transcript && (
          <p className="text-sm text-base-content/80 whitespace-pre-wrap">
            {attachment.transcript}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-base-content/50">
          <IconMicrophone className="h-3 w-3" />
          {duration && <span>{duration}</span>}
          {attachment.transcriptModel && (
            <span className="badge badge-xs">{attachment.transcriptModel}</span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Photo gallery for image attachments */
function PhotoGallery({ attachments }: { attachments: EntryMediaAttachment[] }) {
  const images = attachments.filter((a) => a.asset.mimeType?.startsWith('image/'))
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {images.map((img) => (
        <a
          key={img.id}
          href={img.asset.filePath}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-20 h-20 rounded-lg overflow-hidden bg-base-200 hover:ring-2 hover:ring-primary transition-all"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.asset.filePath}
            alt="Foto"
            className="w-full h-full object-cover"
          />
        </a>
      ))}
    </div>
  )
}

/** Formats the occurred date for display */
function formatOccurredAt(date: Date | null, mode: 'relative' | 'full'): string {
  if (!date) return ''
  const d = new Date(date)
  if (mode === 'relative') {
    return formatDistanceToNow(d, { addSuffix: true, locale: de })
  }
  return format(d, 'EEEE, d. MMMM yyyy, HH:mm', { locale: de })
}

/** Truncates content for preview */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength).trim() + '...'
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function JournalEntryCardComponent({
  entry,
  mode = 'compact',
  isEditing = false,
  onEdit,
  onDelete,
  onShare,
  onRunPipeline,
  className,
}: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'expanded' || mode === 'detail')

  const handleToggleExpand = useCallback(() => {
    if (mode === 'compact') {
      setIsExpanded((prev) => !prev)
    }
  }, [mode])

  // Determine content preview length based on mode
  const previewLength = mode === 'compact' ? 150 : mode === 'expanded' ? 300 : Infinity
  const displayContent = isExpanded ? entry.content : truncateContent(entry.content, previewLength)

  // Check for media
  const hasMedia = entry.mediaAttachments && entry.mediaAttachments.length > 0

  return (
    <article
      className={clsx(
        'group rounded-lg border bg-card text-card-foreground transition-shadow',
        mode === 'compact' && 'hover:shadow-sm',
        mode === 'detail' && 'shadow-sm',
        isEditing && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-start justify-between gap-2 p-3',
          mode === 'compact' && 'cursor-pointer'
        )}
        onClick={mode === 'compact' ? handleToggleExpand : undefined}
      >
        <div className="flex-1 min-w-0">
          {/* Title or type */}
          <div className="flex items-center gap-2 flex-wrap">
            {entry.title ? (
              <h3 className="font-medium text-sm truncate">{entry.title}</h3>
            ) : (
              <EntryTypeTag type={entry.type} />
            )}
            {entry.isSensitive && (
              <IconLock className="h-3.5 w-3.5 text-amber-500" title="Sensibel" />
            )}
            {entry.accessCount > 0 && (
              <IconShare className="h-3.5 w-3.5 text-blue-500" title={`Geteilt mit ${entry.accessCount} Person(en)`} />
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {entry.title && <EntryTypeTag type={entry.type} />}
            <span>{formatOccurredAt(entry.occurredAt, 'relative')}</span>
            <MediaIndicators attachments={entry.mediaAttachments} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRunPipeline && (
            <button
              onClick={(e) => { e.stopPropagation(); onRunPipeline(entry.id) }}
              className="p-1.5 rounded hover:bg-muted"
              title="KI-Pipeline ausführen"
            >
              <IconSparkles className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
              className="p-1.5 rounded hover:bg-muted"
              title="Bearbeiten"
            >
              <IconEdit className="h-4 w-4" />
            </button>
          )}
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(entry.id) }}
              className="p-1.5 rounded hover:bg-muted"
              title="Teilen"
            >
              <IconShare className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-1.5 rounded hover:bg-muted text-destructive"
              title="Löschen"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          )}
          {mode === 'compact' && (
            <button
              onClick={handleToggleExpand}
              className="p-1.5 rounded hover:bg-muted"
              title={isExpanded ? 'Einklappen' : 'Aufklappen'}
            >
              {isExpanded ? (
                <IconChevronUp className="h-4 w-4" />
              ) : (
                <IconChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={clsx('px-3 pb-3', !isExpanded && mode === 'compact' && 'hidden')}>
        {/* Template name if available */}
        {entry.template && (
          <div className="mb-2 text-xs text-base-content/50">
            Template: {entry.template.name}
          </div>
        )}

        {/* Content text */}
        {displayContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-base-content/90">{displayContent}</p>
          </div>
        )}

        {/* Audio attachments with player */}
        {hasMedia && (mode === 'expanded' || mode === 'detail') && (
          <div className="mt-3 space-y-2">
            {entry.mediaAttachments
              .filter((a) => a.asset.mimeType?.startsWith('audio/'))
              .map((attachment) => (
                <AudioPlayer key={attachment.id} attachment={attachment} />
              ))}
          </div>
        )}

        {/* Photo gallery */}
        {hasMedia && (mode === 'expanded' || mode === 'detail') && (
          <PhotoGallery attachments={entry.mediaAttachments} />
        )}

        {/* Full date/time in expanded/detail mode */}
        {(mode === 'expanded' || mode === 'detail') && entry.occurredAt && (
          <div className="mt-3 flex items-center gap-2 text-xs text-base-content/50">
            <IconCalendar className="h-3.5 w-3.5" />
            <span>{formatOccurredAt(entry.occurredAt, 'full')}</span>
          </div>
        )}

        {/* Link to detail page in compact/expanded modes */}
        {mode !== 'detail' && (
          <div className="mt-3 pt-2 border-t border-base-200">
            <Link
              href={`/journal/${entry.id}`}
              className="text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Details anzeigen →
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}

/** Preview component for media attachments */
function MediaAttachmentPreview({ attachment }: { attachment: EntryMediaAttachment }) {
  const isAudio = attachment.asset.mimeType?.startsWith('audio/')
  const isImage = attachment.asset.mimeType?.startsWith('image/')

  if (isAudio) {
    return (
      <div className="flex items-center gap-2 p-2 rounded bg-muted text-xs">
        <IconMicrophone className="h-4 w-4" />
        <span className="truncate max-w-[150px]">
          {attachment.transcript ? truncateContent(attachment.transcript, 50) : 'Audio'}
        </span>
        {attachment.asset.duration && (
          <span className="text-muted-foreground">
            {Math.round(attachment.asset.duration)}s
          </span>
        )}
      </div>
    )
  }

  if (isImage) {
    return (
      <div className="w-16 h-16 rounded overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.asset.filePath}
          alt="Anhang"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-muted text-xs">
      <TablerIcon name="file" className="h-4 w-4" />
      <span>Datei</span>
    </div>
  )
}

// Export with memo for performance
export const JournalEntryCard = memo(JournalEntryCardComponent)
