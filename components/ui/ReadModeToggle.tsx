/**
 * Read Mode Toggle Button
 * Navbar button to switch between edit and read-only mode.
 * Uses Tabler icons: IconBook (read mode active) / IconEdit (edit mode active)
 */

'use client'

import { IconBook, IconEdit } from '@tabler/icons-react'
import { useReadMode } from '@/hooks/useReadMode'

/**
 * Toggle button for switching between read and edit mode.
 * Placed in the navbar, left of the search button.
 */
export function ReadModeToggle() {
  const { readMode, toggleReadMode } = useReadMode()

  return (
    <button
      type="button"
      onClick={toggleReadMode}
      aria-pressed={readMode}
      title={readMode ? 'Bearbeiten aktivieren' : 'Lesemodus aktivieren'}
      className={`btn btn-ghost btn-circle btn-sm ${readMode ? 'text-primary' : ''}`}
    >
      {readMode ? (
        <IconBook className="w-5 h-5" />
      ) : (
        <IconEdit className="w-5 h-5" />
      )}
    </button>
  )
}
