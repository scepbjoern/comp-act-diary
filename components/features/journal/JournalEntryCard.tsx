'use client'

/**
 * components/features/journal/JournalEntryCard.tsx
 * Unified card component for displaying journal entries.
 * Supports compact (list), expanded (day view), and detail (full page) modes.
 * 
 * Phase 1 Features (Read-Only):
 * - Type badge with icon
 * - Template name display
 * - Title display
 * - AI Summary/Analysis sections (collapsible)
 * - Content with Markdown rendering + @mentions
 * - Multi-Audio player with expandable transcripts
 * - Photo gallery with lightbox callback
 * - Compact/Expanded mode toggle
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
  IconCalendar,
  IconClipboard,
  IconSearch,
  IconFileText,
  IconClock,
  IconSettings,
} from '@tabler/icons-react'
import type { EntryWithRelations, EntryMediaAttachment } from '@/lib/services/journal/types'
import type { TaskCardData } from '@/components/features/tasks/TaskCard'
import clsx from 'clsx'
import { JournalEntrySection } from '@/components/features/diary/JournalEntrySection'
import { DiaryContentWithMentions } from '@/components/features/diary/DiaryContentWithMentions'
import { AudioPlayerH5 } from '@/components/features/media/AudioPlayerH5'
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import JournalTasksPanel from '@/components/features/tasks/JournalTasksPanel'
import { SharedBadge } from '@/components/features/diary/SharedBadge'

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
  /** Callback when user clicks on a photo thumbnail (Phase 1: Lightbox) */
  onViewPhoto?: (attachmentId: string, imageUrl: string) => void
  className?: string

  // Phase 2: Panels
  /** Show OCR sources panel (default: true if OCR attachments exist) */
  showOCRSources?: boolean
  /** Show tasks panel (default: true) */
  showTasks?: boolean
  /** Tasks associated with this entry */
  tasks?: TaskCardData[]
  /** Contacts for task assignment suggestions */
  contacts?: Array<{ id: string; name: string; slug: string }>
  /** Called when tasks change (create/complete/delete) */
  onTasksChange?: () => void

  // Phase 3: Modals & Header
  /** Whether the entry is shared with other users */
  isShared?: boolean
  /** Number of users this entry is shared with */
  sharedWithCount?: number
  /** Open share modal */
  onOpenShareModal?: () => void
  /** Open timestamp editing modal */
  onOpenTimestampModal?: () => void
  /** Open AI settings popup */
  onOpenAISettings?: () => void
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

/** 
 * Audio item with player and expandable transcript.
 * Uses AudioPlayerH5 for playback and shows transcript in collapsible panel.
 */
function AudioItemWithTranscript({ attachment }: { attachment: EntryMediaAttachment }) {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false)
  const hasTranscript = attachment.transcript && attachment.transcript.trim().length > 0

  return (
    <div className="rounded-lg bg-base-200/50 border border-base-300 overflow-hidden">
      {/* Audio Player */}
      <div className="p-2">
        <AudioPlayerH5 audioFilePath={attachment.asset.filePath} compact />
      </div>
      
      {/* Transcript Toggle & Content */}
      {hasTranscript && (
        <div className="border-t border-base-300">
          <button
            type="button"
            onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
            className="w-full px-3 py-1.5 text-left text-xs text-base-content/60 hover:bg-base-200 flex items-center gap-1"
          >
            {isTranscriptExpanded ? (
              <IconChevronUp className="h-3 w-3" />
            ) : (
              <IconChevronDown className="h-3 w-3" />
            )}
            <span>Transkript {isTranscriptExpanded ? 'verbergen' : 'anzeigen'}</span>
            {attachment.transcriptModel && (
              <span className="badge badge-xs ml-auto">{attachment.transcriptModel}</span>
            )}
          </button>
          {isTranscriptExpanded && (
            <div className="px-3 pb-3 pt-1">
              <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                {attachment.transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Collapsible audio section containing all audio players.
 * Default collapsed to reduce visual noise.
 */
function AudioSection({ attachments }: { attachments: EntryMediaAttachment[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-base-300 overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 bg-base-200/50 hover:bg-base-200 flex items-center gap-2 text-sm font-medium"
      >
        {isExpanded ? (
          <IconChevronUp className="h-4 w-4" />
        ) : (
          <IconChevronDown className="h-4 w-4" />
        )}
        <IconMicrophone size={16} />
        <span>Audio ({attachments.length})</span>
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
        <div className="p-2 space-y-2 border-t border-base-300">
          {attachments.map((attachment) => (
            <AudioItemWithTranscript key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 
 * Photo gallery for image attachments.
 * Clicking a photo triggers onViewPhoto callback for lightbox display.
 */
interface PhotoGalleryProps {
  attachments: EntryMediaAttachment[]
  onViewPhoto?: (attachmentId: string, imageUrl: string) => void
}

function PhotoGallery({ attachments, onViewPhoto }: PhotoGalleryProps) {
  const images = attachments.filter((a) => a.asset.mimeType?.startsWith('image/'))
  if (images.length === 0) return null

  const handlePhotoClick = (img: EntryMediaAttachment, e: React.MouseEvent) => {
    if (onViewPhoto) {
      e.preventDefault()
      onViewPhoto(img.id, img.asset.filePath)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={(e) => handlePhotoClick(img, e)}
          className="block w-20 h-20 rounded-lg overflow-hidden bg-base-200 hover:ring-2 hover:ring-primary transition-all cursor-pointer"
          title="Foto ansehen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.asset.filePath.startsWith('/') ? img.asset.filePath : `/${img.asset.filePath}`}
            alt="Foto"
            className="w-full h-full object-cover"
          />
        </button>
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
  onShare: _onShare,
  onRunPipeline,
  onViewPhoto,
  className,
  // Phase 2: Panels
  showOCRSources,
  showTasks = true,
  tasks,
  contacts,
  onTasksChange,
  // Phase 3: Modals & Header
  isShared,
  sharedWithCount = 0,
  onOpenShareModal,
  onOpenTimestampModal,
  onOpenAISettings,
}: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'expanded' || mode === 'detail')

  const handleToggleExpand = useCallback(() => {
    if (mode === 'compact') {
      setIsExpanded((prev) => !prev)
    }
  }, [mode])

  // Filter media attachments by type
  const audioAttachments = entry.mediaAttachments?.filter(
    (a) => a.asset.mimeType?.startsWith('audio/')
  ) || []
  const imageAttachments = entry.mediaAttachments?.filter(
    (a) => a.asset.mimeType?.startsWith('image/')
  ) || []

  // Determine if OCR sources should be shown (auto-detect SOURCE attachments)
  const hasOCRSources = entry.mediaAttachments?.some((a) => a.role === 'SOURCE') || false
  const shouldShowOCR = showOCRSources !== false && hasOCRSources
  
  // Determine if we should show full content (expanded/detail mode or manually expanded in compact)
  const showFullContent = isExpanded || mode === 'expanded' || mode === 'detail'
  
  // Content preview for compact mode (first ~100 chars)
  const contentPreview = entry.content 
    ? truncateContent(entry.content.replace(/\n/g, ' '), 100) 
    : ''

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
          mode === 'compact' && !isExpanded && 'cursor-pointer'
        )}
        onClick={mode === 'compact' && !isExpanded ? handleToggleExpand : undefined}
      >
        <div className="flex-1 min-w-0">
          {/* Type badge and template */}
          <div className="flex items-center gap-2 flex-wrap">
            <EntryTypeTag type={entry.type} />
            {entry.template && (
              <span className="text-xs text-base-content/50">• {entry.template.name}</span>
            )}
          </div>

          {/* Title */}
          {entry.title && (
            <h3 className="font-medium text-base mt-1">{entry.title}</h3>
          )}

          {/* Meta info: timestamp, media indicators, badges */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{formatOccurredAt(entry.occurredAt, 'relative')}</span>
            <MediaIndicators attachments={entry.mediaAttachments} />
            {entry.isSensitive && (
              <IconLock className="h-3.5 w-3.5 text-amber-500" title="Sensibel" />
            )}
            {/* SharedBadge - Phase 3 */}
            {(isShared || entry.accessCount > 0) && (
              <SharedBadge
                sharedStatus="owned"
                sharedWithCount={sharedWithCount || entry.accessCount}
                compact
              />
            )}
          </div>

          {/* Content preview in compact mode (when not expanded) */}
          {mode === 'compact' && !isExpanded && contentPreview && (
            <p className="mt-2 text-sm text-base-content/70 line-clamp-1">
              {contentPreview}
            </p>
          )}
        </div>

        {/* Actions - all buttons always visible (Entscheidung F3)
            Secondary actions hidden on mobile when collapsed for space */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {onRunPipeline && (
            <button
              onClick={(e) => { e.stopPropagation(); onRunPipeline(entry.id) }}
              className="p-1.5 rounded hover:bg-muted"
              title="KI-Pipeline ausführen"
            >
              <IconSparkles className="h-4 w-4" />
            </button>
          )}
          {onOpenAISettings && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenAISettings() }}
              className={clsx('p-1.5 rounded hover:bg-muted', !isExpanded && 'hidden sm:inline-flex')}
              title="AI-Einstellungen"
            >
              <IconSettings className="h-4 w-4" />
            </button>
          )}
          {onOpenTimestampModal && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenTimestampModal() }}
              className={clsx('p-1.5 rounded hover:bg-muted', !isExpanded && 'hidden sm:inline-flex')}
              title="Zeitpunkte bearbeiten"
            >
              <IconClock className="h-4 w-4" />
            </button>
          )}
          {onOpenShareModal && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenShareModal() }}
              className={clsx('p-1.5 rounded hover:bg-muted', !isExpanded && 'hidden sm:inline-flex')}
              title="Teilen"
            >
              <IconShare className="h-4 w-4" />
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
              onClick={(e) => { e.stopPropagation(); handleToggleExpand() }}
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

      {/* Expanded Content Area */}
      {showFullContent && (
        <div className="px-3 pb-3 space-y-3">
          {/* AI Summary Section (blue background) */}
          {entry.aiSummary && (
            <div className="bg-sky-100 dark:bg-sky-900/20 rounded-lg">
              <JournalEntrySection
                title="Zusammenfassung"
                icon={<IconClipboard size={16} className="text-sky-600 dark:text-sky-400" />}
                content={entry.aiSummary}
                defaultCollapsed={false}
                canGenerate={false}
                canDelete={false}
              />
            </div>
          )}

          {/* AI Analysis Section (yellow background) */}
          {entry.analysis && (
            <div className="bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <JournalEntrySection
                title="Analyse"
                icon={<IconSearch size={16} className="text-amber-600 dark:text-amber-400" />}
                content={entry.analysis}
                defaultCollapsed={false}
                canGenerate={false}
                canDelete={false}
              />
            </div>
          )}

          {/* Content with Markdown rendering and @mentions */}
          {entry.content && (
            <JournalEntrySection
              title="Inhalt"
              icon={<IconFileText size={16} />}
              content={entry.content}
              canGenerate={false}
              canDelete={false}
            >
              <DiaryContentWithMentions 
                noteId={entry.id} 
                markdown={entry.content} 
              />
            </JournalEntrySection>
          )}

          {/* Audio Section with players and transcripts - collapsible, default collapsed */}
          {audioAttachments.length > 0 && (
            <AudioSection attachments={audioAttachments} />
          )}

          {/* Photo Gallery */}
          {imageAttachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <IconPhoto size={16} />
                Fotos ({imageAttachments.length})
              </h4>
              <PhotoGallery 
                attachments={entry.mediaAttachments} 
                onViewPhoto={onViewPhoto} 
              />
            </div>
          )}

          {/* OCR Source Panel - Phase 2 (lazy-loaded, collapsed by default) */}
          {shouldShowOCR && (
            <OCRSourcePanel
              noteId={entry.id}
              initialTranscript={entry.content}
            />
          )}

          {/* Journal Tasks Panel - Phase 2 (always shown per Entscheidung F2) */}
          {showTasks && (
            tasks === undefined ? (
              /* Loading state while tasks are being fetched */
              <div className="rounded-lg border border-base-300 bg-base-200/30 p-3">
                <div className="flex items-center gap-2 text-sm text-base-content/50">
                  <span className="loading loading-spinner loading-xs" />
                  Aufgaben werden geladen…
                </div>
              </div>
            ) : (
              <JournalTasksPanel
                journalEntryId={entry.id}
                tasks={tasks}
                contacts={contacts}
                onTasksChange={onTasksChange}
                defaultExpanded={tasks.length > 0}
              />
            )
          )}

          {/* Full date/time */}
          {entry.occurredAt && (
            <div className="flex items-center gap-2 text-xs text-base-content/50 pt-2 border-t border-base-200">
              <IconCalendar className="h-3.5 w-3.5" />
              <span>{formatOccurredAt(entry.occurredAt, 'full')}</span>
            </div>
          )}

          {/* Link to detail page (not in detail mode) */}
          {mode !== 'detail' && (
            <div className="pt-2">
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
      )}
    </article>
  )
}

// Export with memo for performance
export const JournalEntryCard = memo(JournalEntryCardComponent)
