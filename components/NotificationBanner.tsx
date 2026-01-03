'use client'

import { useState, useEffect } from 'react'
import { IconX, IconAlertCircle, IconGift, IconAlertTriangle, IconUserQuestion } from '@tabler/icons-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message?: string | null
  isRead: boolean
  createdAt: string
  data?: Record<string, unknown>
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  GENERAL: <IconAlertCircle size={18} />,
  BIRTHDAY_REMINDER: <IconGift size={18} className="text-warning" />,
  SYNC_CONFLICT: <IconAlertTriangle size={18} className="text-error" />,
  SYNC_ERROR: <IconAlertTriangle size={18} className="text-error" />,
  CONTACT_MATCH_REQUIRED: <IconUserQuestion size={18} className="text-info" />,
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?unreadOnly=true&limit=3')
        const data = await res.json()
        setNotifications(data.notifications || [])
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const _handleDismiss = async (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead' }),
      })
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }

  const handleArchive = async (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })
    } catch (error) {
      console.error('Error archiving notification:', error)
    }
  }

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id))

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className="w-full bg-base-200 border-b border-base-300">
      <div className="max-w-4xl mx-auto">
        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-center justify-between px-4 py-2 border-b border-base-300 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0">
                {NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.GENERAL}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{notification.title}</p>
                {notification.message && (
                  <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notification.type === 'CONTACT_MATCH_REQUIRED' && (
                <Link href="/prm" className="btn btn-xs btn-ghost">
                  Anzeigen
                </Link>
              )}
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleArchive(notification.id)}
                title="Archivieren"
              >
                <IconX size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
