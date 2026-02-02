/**
 * components/features/journal/EmojiPickerButton.tsx
 * Emoji picker button using Frimousse library.
 * Used in template editor for selecting field icons.
 */

'use client'

import { useState, useCallback } from 'react'
import { EmojiPicker, type Emoji } from 'frimousse'
import { IconMoodSmile } from '@tabler/icons-react'

interface EmojiPickerButtonProps {
  /** Currently selected emoji */
  value?: string
  /** Callback when an emoji is selected */
  onChange: (emoji: string) => void
  /** Additional CSS classes */
  className?: string
  /** Placeholder text when no emoji is selected */
  placeholder?: string
}

/**
 * Button that opens an emoji picker popover.
 * Displays the selected emoji or a placeholder icon.
 */
export function EmojiPickerButton({
  value,
  onChange,
  className = '',
  placeholder = 'Emoji wählen',
}: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleEmojiSelect = useCallback(
    (emoji: Emoji) => {
      onChange(emoji.emoji)
      setIsOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange('')
    setIsOpen(false)
  }, [onChange])

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm gap-2"
        aria-label={placeholder}
      >
        {value ? (
          <span className="text-xl">{value}</span>
        ) : (
          <IconMoodSmile className="h-5 w-5 text-base-content/60" />
        )}
        <span className="text-xs text-base-content/60">{value ? 'Ändern' : placeholder}</span>
      </button>

      {/* Click outside to close - must be before dropdown content */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-box bg-base-200 p-2 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-medium">Emoji wählen</span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-ghost btn-xs text-error"
              >
                Entfernen
              </button>
            )}
          </div>

          {/* Frimousse Emoji Picker with proper grid styling */}
          <EmojiPicker.Root
            onEmojiSelect={handleEmojiSelect}
            className="flex flex-col"
          >
            <EmojiPicker.Search
              placeholder="Suchen..."
              className="input input-bordered input-sm mb-2 w-full"
            />
            <EmojiPicker.Viewport className="h-64 overflow-y-auto">
              <EmojiPicker.Loading className="flex h-full items-center justify-center">
                <span className="loading loading-spinner loading-sm" />
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-base-content/60">
                Keine Emojis gefunden
              </EmojiPicker.Empty>
              <EmojiPicker.List
                components={{
                  CategoryHeader: ({ category }) => (
                    <div className="w-full py-2 px-1 text-xs font-medium text-base-content/60">
                      {category.label}
                    </div>
                  ),
                  Row: ({ children }) => (
                    <div className="flex flex-wrap gap-1">
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-base-300"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </div>
      )}
    </div>
  )
}

export default EmojiPickerButton
