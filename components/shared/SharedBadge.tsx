/**
 * SharedBadge Component
 * Displays a badge indicating the sharing status of a journal entry.
 * Shows different styles for owned, viewer, and editor access.
 */

'use client'

import React from 'react'
import { IconShare, IconEye, IconPencil } from '@tabler/icons-react'
import type { SharedStatus, AccessRole } from '@/types/day'

interface SharedBadgeProps {
  /** Sharing status of the entry */
  sharedStatus?: SharedStatus
  /** Access role (for shared entries) */
  accessRole?: AccessRole | null
  /** Owner name (for shared entries) */
  ownerName?: string | null
  /** Number of users this entry is shared with (for owned entries) */
  sharedWithCount?: number
  /** Show compact version (icon only) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Badge component showing the sharing status of a journal entry.
 * - Owned entries with sharedWithCount > 0: Shows share badge with count
 * - Shared-view: Shows viewer badge with owner name
 * - Shared-edit: Shows editor badge with owner name
 */
export function SharedBadge({
  sharedStatus,
  accessRole,
  ownerName,
  sharedWithCount = 0,
  compact = false,
  className = '',
}: SharedBadgeProps) {
  // For owned entries: show badge only if shared with others
  if (!sharedStatus || sharedStatus === 'owned') {
    if (sharedWithCount > 0) {
      const tooltip = `Geteilt mit ${sharedWithCount} ${sharedWithCount === 1 ? 'Person' : 'Personen'}`
      if (compact) {
        return (
          <div
            className={`badge badge-info gap-1 ${className}`}
            title={tooltip}
          >
            <IconShare size={14} className="shrink-0" />
          </div>
        )
      }
      return (
        <div
          className={`badge badge-info gap-1 ${className}`}
          title={tooltip}
        >
          <IconShare size={14} className="shrink-0" />
          <span className="text-xs">{sharedWithCount}</span>
        </div>
      )
    }
    return null
  }

  // For shared entries: show viewer/editor badge
  const isEditor = sharedStatus === 'shared-edit' || accessRole === 'EDITOR'

  // Determine badge styling based on access level
  const badgeClass = isEditor
    ? 'badge-primary'
    : 'badge-secondary'

  const icon = isEditor ? (
    <IconPencil size={14} className="shrink-0" />
  ) : (
    <IconEye size={14} className="shrink-0" />
  )

  const label = isEditor ? 'Editor' : 'Viewer'
  const tooltip = ownerName
    ? `Geteilt von ${ownerName} (${label})`
    : `Geteilter Eintrag (${label})`

  if (compact) {
    return (
      <div
        className={`badge ${badgeClass} gap-1 ${className}`}
        title={tooltip}
      >
        {icon}
      </div>
    )
  }

  return (
    <div
      className={`badge ${badgeClass} gap-1 ${className}`}
      title={tooltip}
    >
      {icon}
      <span className="text-xs">
        {ownerName ? `${ownerName}` : label}
      </span>
    </div>
  )
}

/**
 * Share button to open the share modal.
 * Only shown for owned entries.
 */
interface ShareButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function ShareButton({ onClick, disabled = false, className = '' }: ShareButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs ${className}`}
      onClick={onClick}
      disabled={disabled}
      title="Eintrag teilen"
    >
      <IconShare size={16} />
    </button>
  )
}
