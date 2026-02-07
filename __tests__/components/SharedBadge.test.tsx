/**
 * SharedBadge.test.tsx
 * Unit tests for the SharedBadge component.
 * Verifies badge rendering based on sharing status and access role.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SharedBadge } from '@/components/features/diary/SharedBadge'

describe('SharedBadge', () => {
  it('should render nothing when not shared (no status)', () => {
    const { container } = render(<SharedBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when owned with 0 shares', () => {
    const { container } = render(
      <SharedBadge sharedStatus="owned" sharedWithCount={0} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render share badge when owned with shares > 0', () => {
    render(<SharedBadge sharedStatus="owned" sharedWithCount={3} />)
    const badge = screen.getByTitle('Geteilt mit 3 Personen')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('3')
  })

  it('should render singular text for 1 share', () => {
    render(<SharedBadge sharedStatus="owned" sharedWithCount={1} />)
    const badge = screen.getByTitle('Geteilt mit 1 Person')
    expect(badge).toBeDefined()
  })

  it('should render compact badge (icon only) when compact=true', () => {
    render(<SharedBadge sharedStatus="owned" sharedWithCount={2} compact />)
    const badge = screen.getByTitle('Geteilt mit 2 Personen')
    expect(badge).toBeDefined()
    // Compact mode should NOT show the count text
    expect(badge.textContent).not.toContain('2')
  })

  it('should render viewer badge for shared-view status', () => {
    render(
      <SharedBadge sharedStatus="shared-view" ownerName="Max" />
    )
    const badge = screen.getByTitle('Geteilt von Max (Viewer)')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('Max')
  })

  it('should render editor badge for shared-edit status', () => {
    render(
      <SharedBadge sharedStatus="shared-edit" ownerName="Anna" />
    )
    const badge = screen.getByTitle('Geteilt von Anna (Editor)')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('Anna')
  })

  it('should use accessRole EDITOR to determine editor badge', () => {
    render(
      <SharedBadge sharedStatus="shared-view" accessRole="EDITOR" ownerName="Test" />
    )
    const badge = screen.getByTitle('Geteilt von Test (Editor)')
    expect(badge).toBeDefined()
  })

  it('should apply custom className', () => {
    render(
      <SharedBadge sharedStatus="owned" sharedWithCount={1} className="my-class" />
    )
    const badge = screen.getByTitle('Geteilt mit 1 Person')
    expect(badge.className).toContain('my-class')
  })
})
