/**
 * Client-side Header Component
 * Wraps header elements that require client-side interactivity (ReadModeToggle).
 */

'use client'

import { GlobalSearch } from '@/components/features/search/GlobalSearch'
import NotificationBell from '@/components/features/notifications/NotificationBell'
import { SiteNav } from '@/components/layout/SiteNav'
import { ReadModeToggle } from '@/components/ui/ReadModeToggle'

interface HeaderClientProps {
  user: { id: string; username: string; displayName: string | null; profileImageUrl?: string | null } | null
}

/**
 * Client component for header items that need interactivity.
 * Includes ReadModeToggle, GlobalSearch, NotificationBell, and SiteNav.
 */
export function HeaderClient({ user }: HeaderClientProps) {
  return (
    <div className="flex items-center gap-2">
      <ReadModeToggle />
      <GlobalSearch />
      <NotificationBell />
      <SiteNav user={user} />
    </div>
  )
}
