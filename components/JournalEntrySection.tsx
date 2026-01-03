/**
 * JournalEntrySection - Reusable collapsible section for journal entry content.
 * Used for Summary, Content, Analysis, and Original Transcript sections.
 */

'use client'

import { useState } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconPencil,
  IconTrash,
  IconSparkles,
  IconRefresh,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { RichTextEditor } from './RichTextEditor'

// =============================================================================
// TYPES
// =============================================================================

export interface JournalEntrySectionProps {
  title: string
  icon: React.ReactNode
  content: string | null
  bgColorClass?: string
  defaultCollapsed?: boolean
  isEmpty?: boolean
  isOutdated?: boolean
  isLoading?: boolean
  canDelete?: boolean
  canGenerate?: boolean
  onEdit?: (newContent: string) => void
  onDelete?: () => void
  onGenerate?: () => void
  onRegenerate?: () => void
  children?: React.ReactNode
}

// =============================================================================
// COMPONENT
// =============================================================================

export function JournalEntrySection({
  title,
  icon,
  content,
  bgColorClass = '',
  defaultCollapsed = false,
  isEmpty = false,
  isOutdated = false,
  isLoading = false,
  canDelete = true,
  canGenerate = true,
  onEdit,
  onDelete,
  onGenerate,
  onRegenerate,
  children,
}: JournalEntrySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content || '')

  const handleSave = () => {
    if (onEdit) {
      onEdit(editContent)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent(content || '')
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setEditContent(content || '')
    setIsEditing(true)
  }

  const hasContent = content && content.trim().length > 0

  return (
    <div className={`${bgColorClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <IconChevronRight size={16} className="opacity-60" />
          ) : (
            <IconChevronDown size={16} className="opacity-60" />
          )}
          <span className="flex items-center gap-1.5">
            {icon}
            {title}
          </span>
          {isOutdated && hasContent && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <IconAlertTriangle size={14} />
              veraltet
            </span>
          )}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <>
              {/* Generate button (if empty) */}
              {isEmpty && canGenerate && onGenerate && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={onGenerate}
                  title="Generieren"
                >
                  <IconSparkles size={16} />
                </button>
              )}

              {/* Regenerate button (if has content) */}
              {hasContent && canGenerate && onRegenerate && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={onRegenerate}
                  title="Neu generieren"
                >
                  <IconRefresh size={16} />
                </button>
              )}

              {/* Edit button */}
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={handleStartEdit}
                  title="Bearbeiten"
                >
                  <IconPencil size={16} />
                </button>
              )}

              {/* Delete button */}
              {hasContent && canDelete && onDelete && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-error"
                  onClick={onDelete}
                  title="Löschen"
                >
                  <IconTrash size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="pb-3 px-1">
          {isEditing ? (
            <div className="space-y-2">
              <RichTextEditor
                markdown={editContent}
                onChange={setEditContent}
                placeholder="Inhalt eingeben..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleCancel}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSave}
                >
                  Speichern
                </button>
              </div>
            </div>
          ) : hasContent ? (
            children ? (
              children
            ) : (
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer markdown={content} />
              </div>
            )
          ) : (
            <p className="text-sm text-base-content/50 italic">
              Kein Inhalt vorhanden
            </p>
          )}
        </div>
      )}
    </div>
  )
}
