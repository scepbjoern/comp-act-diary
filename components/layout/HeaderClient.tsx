/**
 * Client-side Header Component
 * Wraps header elements that require client-side interactivity (ReadModeToggle).
 */

'use client'

import Link from 'next/link'
import { IconMessageChatbot } from '@tabler/icons-react'
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
      <Link
        href="/coach"
        className="btn btn-ghost btn-circle btn-sm"
        title="Coach"
        aria-label="Coach"
      >
        <IconMessageChatbot size={20} />
      </Link>
      <NotificationBell />
      <SiteNav user={user} />
    </div>
  )
}
