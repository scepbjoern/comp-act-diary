'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconBell, IconCheck, IconArchive, IconX } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message?: string | null
  isRead: boolean
  createdAt: string
  archivedAt?: string | null
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // SSR hydration safety - Portal needs DOM
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    void fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead' }),
      })
      
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })
      
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error archiving notification:', error)
    }
  }

  const handleMarkAllRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BIRTHDAY_REMINDER':
        return '🎂'
      case 'SYNC_CONFLICT':
        return '⚠️'
      case 'SYNC_ERROR':
        return '❌'
      case 'CONTACT_MATCH_REQUIRED':
        return '👤'
      default:
        return '📌'
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm btn-circle relative"
        aria-label="Benachrichtigungen"
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && isMounted && createPortal(
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
          <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setOpen(false)}
            >
              <IconX size={20} />
            </button>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Benachrichtigungen</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="btn btn-ghost btn-xs"
                >
                  <IconCheck size={14} />
                  Alle gelesen
                </button>
              )}
            </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-base-content/60">
                Keine Benachrichtigungen
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-base-200 last:border-b-0 ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-base-content/60 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-base-content/40 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          className="btn btn-ghost btn-xs btn-circle"
                          title="Als gelesen markieren"
                        >
                          <IconCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(notification.id)}
                        className="btn btn-ghost btn-xs btn-circle"
                        title="Archivieren"
                      >
                        <IconArchive size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </>
  )
}
