'use client'

/**
 * components/features/journal/JournalEntryCard.tsx
 * Unified card component for displaying journal entries.
 * Supports compact (list), expanded (day view), and detail (full page) modes.
 */

import { useState, memo, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { IconChevronDown, IconChevronUp, IconEdit, IconTrash, IconShare, IconLock, IconMicrophone, IconPhoto, IconSparkles } from '@tabler/icons-react'
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

/** Displays media attachment indicators */
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

/** Formats the occurred date for display */
function formatOccurredAt(date: Date | null): string {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de })
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
            <span>{formatOccurredAt(entry.occurredAt)}</span>
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
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {/* Render content - could be enhanced with markdown rendering */}
          <p className="whitespace-pre-wrap text-sm">{displayContent}</p>
        </div>

        {/* Template fields rendering would go here if entry.template?.fields exists */}

        {/* Media attachments preview */}
        {hasMedia && mode !== 'compact' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.mediaAttachments.map((attachment) => (
              <MediaAttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Link to detail page in compact/expanded modes */}
        {mode !== 'detail' && (
          <div className="mt-2">
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
