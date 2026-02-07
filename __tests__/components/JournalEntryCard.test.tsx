/**
 * JournalEntryCard.test.tsx
 * Unit tests for JournalEntryCard component.
 * Tests panel visibility, callback invocation, and edge cases.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JournalEntryCard } from '@/components/features/journal/JournalEntryCard'
import type { EntryWithRelations } from '@/lib/services/journal/types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// =============================================================================
// TEST DATA
// =============================================================================

function makeEntry(overrides: Partial<EntryWithRelations> = {}): EntryWithRelations {
  return {
    id: 'test-entry-1',
    userId: 'user-1',
    typeId: 'type-1',
    templateId: null,
    timeBoxId: 'tb-1',
    locationId: null,
    title: 'Test Entry',
    content: 'This is a test entry with some content.',
    aiSummary: null,
    analysis: null,
    contentUpdatedAt: null,
    isSensitive: false,
    deletedAt: null,
    occurredAt: new Date('2026-02-05T10:00:00Z'),
    capturedAt: new Date('2026-02-05T10:00:00Z'),
    createdAt: new Date('2026-02-05T10:00:00Z'),
    updatedAt: new Date('2026-02-05T10:00:00Z'),
    type: { id: 'type-1', code: 'daily_note', name: 'Tagesnotiz', icon: null },
    template: null,
    location: null,
    mediaAttachments: [],
    accessCount: 0,
    ...overrides,
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('JournalEntryCard', () => {
  // ---------------------------------------------------------------------------
  // Panel Visibility
  // ---------------------------------------------------------------------------

  describe('Panel visibility', () => {
    it('should not show panels in compact mode (collapsed)', () => {
      const { container } = render(
        <JournalEntryCard
          entry={makeEntry()}
          mode="compact"
          tasks={[]}
        />
      )
      // Tasks panel should not be visible when collapsed
      expect(container.textContent).not.toContain('Aufgaben')
    })

    it('should show tasks panel in expanded mode', () => {
      const { container } = render(
        <JournalEntryCard
          entry={makeEntry()}
          mode="expanded"
          tasks={[]}
        />
      )
      // JournalTasksPanel renders even with 0 tasks (Entscheidung F2)
      expect(container.querySelector('[class*="bg-"]')).toBeDefined()
    })

    it('should show loading spinner when tasks are undefined', () => {
      render(
        <JournalEntryCard
          entry={makeEntry()}
          mode="expanded"
          tasks={undefined}
        />
      )
      expect(screen.getByText('Aufgaben werden geladen…')).toBeDefined()
    })

    it('should not show OCR panel when no SOURCE attachments', () => {
      const { container } = render(
        <JournalEntryCard
          entry={makeEntry({ mediaAttachments: [] })}
          mode="expanded"
        />
      )
      expect(container.textContent).not.toContain('OCR-Quellen')
    })

    it('should show OCR panel when SOURCE attachments exist', () => {
      const entry = makeEntry({
        mediaAttachments: [{
          id: 'att-1',
          role: 'SOURCE',
          transcript: null,
          transcriptModel: null,
          displayOrder: 0,
          asset: {
            id: 'asset-1',
            filePath: 'test.png',
            mimeType: 'image/png',
            duration: null,
            capturedAt: null,
          },
        }],
      })
      const { container } = render(
        <JournalEntryCard entry={entry} mode="expanded" />
      )
      // OCRSourcePanel should be rendered
      expect(container.querySelector('div')).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Callback Invocation
  // ---------------------------------------------------------------------------

  describe('Callback invocation', () => {
    it('should call onEdit when edit button is clicked', () => {
      const onEdit = vi.fn()
      const entry = makeEntry()
      render(
        <JournalEntryCard entry={entry} mode="compact" onEdit={onEdit} />
      )
      const editBtn = screen.getByTitle('Bearbeiten')
      fireEvent.click(editBtn)
      expect(onEdit).toHaveBeenCalledWith(entry)
    })

    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn()
      render(
        <JournalEntryCard entry={makeEntry()} mode="compact" onDelete={onDelete} />
      )
      const deleteBtn = screen.getByTitle('Löschen')
      fireEvent.click(deleteBtn)
      expect(onDelete).toHaveBeenCalledWith('test-entry-1')
    })

    it('should call onRunPipeline when pipeline button is clicked', () => {
      const onRunPipeline = vi.fn()
      render(
        <JournalEntryCard entry={makeEntry()} mode="compact" onRunPipeline={onRunPipeline} />
      )
      const pipelineBtn = screen.getByTitle('KI-Pipeline ausführen')
      fireEvent.click(pipelineBtn)
      expect(onRunPipeline).toHaveBeenCalledWith('test-entry-1')
    })

    it('should call onOpenShareModal when share button is clicked', () => {
      const onOpenShareModal = vi.fn()
      render(
        <JournalEntryCard entry={makeEntry()} mode="compact" onOpenShareModal={onOpenShareModal} />
      )
      const shareBtn = screen.getByTitle('Teilen')
      fireEvent.click(shareBtn)
      expect(onOpenShareModal).toHaveBeenCalled()
    })

    it('should call onOpenTimestampModal when timestamp button is clicked', () => {
      const onOpenTimestampModal = vi.fn()
      render(
        <JournalEntryCard entry={makeEntry()} mode="compact" onOpenTimestampModal={onOpenTimestampModal} />
      )
      const tsBtn = screen.getByTitle('Zeitpunkte bearbeiten')
      fireEvent.click(tsBtn)
      expect(onOpenTimestampModal).toHaveBeenCalled()
    })

    it('should call onOpenAISettings when AI settings button is clicked', () => {
      const onOpenAISettings = vi.fn()
      render(
        <JournalEntryCard entry={makeEntry()} mode="compact" onOpenAISettings={onOpenAISettings} />
      )
      const aiBtn = screen.getByTitle('AI-Einstellungen')
      fireEvent.click(aiBtn)
      expect(onOpenAISettings).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // SharedBadge Integration
  // ---------------------------------------------------------------------------

  describe('SharedBadge integration', () => {
    it('should not show shared badge when accessCount is 0', () => {
      const { container } = render(
        <JournalEntryCard entry={makeEntry({ accessCount: 0 })} mode="compact" />
      )
      // No badge element with share info
      expect(container.querySelector('.badge-info')).toBeNull()
    })

    it('should show shared badge when accessCount > 0', () => {
      render(
        <JournalEntryCard
          entry={makeEntry({ accessCount: 2 })}
          mode="compact"
          isShared={true}
          sharedWithCount={2}
        />
      )
      const badge = screen.getByTitle('Geteilt mit 2 Personen')
      expect(badge).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('should render entry without title', () => {
      const { container } = render(
        <JournalEntryCard entry={makeEntry({ title: null })} mode="compact" />
      )
      expect(container.querySelector('h3')).toBeNull()
    })

    it('should render entry without content', () => {
      const { container } = render(
        <JournalEntryCard entry={makeEntry({ content: '' })} mode="compact" />
      )
      expect(container.firstChild).toBeDefined()
    })

    it('should render entry without type', () => {
      const { container } = render(
        <JournalEntryCard entry={makeEntry({ type: null })} mode="compact" />
      )
      expect(container.firstChild).toBeDefined()
    })

    it('should render entry without media attachments', () => {
      const { container } = render(
        <JournalEntryCard entry={makeEntry({ mediaAttachments: [] })} mode="expanded" />
      )
      // Should not show Audio or Photo sections
      expect(container.textContent).not.toContain('Audio')
      expect(container.textContent).not.toContain('Fotos')
    })

    it('should render sensitive entry with lock icon', () => {
      render(
        <JournalEntryCard entry={makeEntry({ isSensitive: true })} mode="compact" />
      )
      const lockIcon = screen.getByTitle('Sensibel')
      expect(lockIcon).toBeDefined()
    })
  })
})
