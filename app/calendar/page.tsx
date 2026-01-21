'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { de } from 'date-fns/locale'
import { IconChevronLeft, IconChevronRight, IconCalendarEvent, IconMapPin, IconRefresh, IconEye, IconEyeOff, IconPencil, IconCheck, IconX } from '@tabler/icons-react'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startedAt: string
  endedAt: string | null
  isAllDay: boolean
  location: string | null
  sourceCalendar: string | null
  locationId: string | null
  isHidden: boolean
  matchedLocation: { id: string; name: string } | null
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let url: string
      const hiddenParam = showHidden ? '&includeHidden=true' : ''
      if (viewMode === 'day') {
        url = `/api/calendar/events?date=${selectedDate}${hiddenParam}`
      } else {
        const weekStart = format(startOfWeek(parseISO(selectedDate), { locale: de }), 'yyyy-MM-dd')
        const weekEnd = format(endOfWeek(parseISO(selectedDate), { locale: de }), 'yyyy-MM-dd')
        url = `/api/calendar/events?startDate=${weekStart}&endDate=${weekEnd}${hiddenParam}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Events')
      }

      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, showHidden])

  // Update event (hide/unhide, edit)
  const updateEvent = async (eventId: string, data: { title?: string; description?: string | null; isHidden?: boolean }) => {
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        void loadEvents()
      }
    } catch (error) {
      console.error('Failed to update event:', error)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  // Navigation
  const navigatePrev = () => {
    if (viewMode === 'day') {
      setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
    } else {
      setSelectedDate(format(subWeeks(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
    } else {
      setSelectedDate(format(addWeeks(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
    }
  }

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  // Format display date
  const getDisplayDate = () => {
    const date = parseISO(selectedDate)
    if (viewMode === 'day') {
      return format(date, 'EEEE, d. MMMM yyyy', { locale: de })
    } else {
      const start = startOfWeek(date, { locale: de })
      const end = endOfWeek(date, { locale: de })
      return `${format(start, 'd. MMM', { locale: de })} - ${format(end, 'd. MMM yyyy', { locale: de })}`
    }
  }

  // Group events by day for week view
  const getEventsByDay = () => {
    if (viewMode === 'day') {
      return { [selectedDate]: events }
    }

    const grouped: Record<string, CalendarEvent[]> = {}
    const start = startOfWeek(parseISO(selectedDate), { locale: de })
    
    for (let i = 0; i < 7; i++) {
      const day = format(addDays(start, i), 'yyyy-MM-dd')
      grouped[day] = []
    }

    for (const event of events) {
      const eventDay = format(parseISO(event.startedAt), 'yyyy-MM-dd')
      if (grouped[eventDay]) {
        grouped[eventDay].push(event)
      }
    }

    return grouped
  }

  const eventsByDay = getEventsByDay()

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconCalendarEvent className="w-6 h-6" />
          Kalender
        </h1>
        <Link 
          href="/settings/calendar" 
          className="btn btn-ghost btn-sm"
        >
          Einstellungen
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 bg-base-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <button onClick={navigatePrev} className="btn btn-ghost btn-sm btn-circle">
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToToday} className="btn btn-ghost btn-sm">
            Heute
          </button>
          <button onClick={navigateNext} className="btn btn-ghost btn-sm btn-circle">
            <IconChevronRight className="w-5 h-5" />
          </button>
        </div>

        <span className="font-medium text-lg">{getDisplayDate()}</span>

        <div className="flex items-center gap-2">
          <div className="join">
            <button 
              className={`join-item btn btn-sm ${viewMode === 'day' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Tag
            </button>
            <button 
              className={`join-item btn btn-sm ${viewMode === 'week' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Woche
            </button>
          </div>
          <button 
            onClick={() => setShowHidden(!showHidden)}
            className={`btn btn-sm ${showHidden ? 'btn-active' : 'btn-ghost'}`}
            title={showHidden ? 'Ausgeblendete verstecken' : 'Ausgeblendete anzeigen'}
          >
            {showHidden ? <IconEye className="w-4 h-4" /> : <IconEyeOff className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => void loadEvents()} 
            className="btn btn-ghost btn-sm btn-circle"
            title="Aktualisieren"
          >
            <IconRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(eventsByDay).map(([day, dayEvents]) => (
            <div key={day} className="card bg-base-100 shadow">
              {viewMode === 'week' && (
                <div className="card-title bg-base-200 px-4 py-2 text-sm rounded-t-lg">
                  {format(parseISO(day), 'EEEE, d. MMMM', { locale: de })}
                </div>
              )}
              <div className="card-body p-4">
                {dayEvents.length === 0 ? (
                  <p className="text-base-content/60 text-center py-4">
                    Keine Termine
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dayEvents.map(event => (
                      <EventCard key={event.id} event={event} onUpdate={updateEvent} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-12">
          <IconCalendarEvent className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Termine</h3>
          <p className="text-base-content/60 mb-4">
            Kalender-Events werden via Tasker-Webhook synchronisiert.
          </p>
          <Link href="/settings/calendar" className="btn btn-primary btn-sm">
            Kalender einrichten
          </Link>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// EVENT CARD COMPONENT
// =============================================================================

function EventCard({ event, onUpdate }: { 
  event: CalendarEvent
  onUpdate: (id: string, data: { title?: string; description?: string | null; isHidden?: boolean }) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(event.title)
  const [editDescription, setEditDescription] = useState(event.description || '')
  const [saving, setSaving] = useState(false)

  const startTime = parseISO(event.startedAt)
  const endTime = event.endedAt ? parseISO(event.endedAt) : null

  const timeDisplay = event.isAllDay 
    ? 'Ganztägig'
    : `${format(startTime, 'HH:mm')}${endTime ? ` - ${format(endTime, 'HH:mm')}` : ''}`

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(event.id, {
      title: editTitle,
      description: editDescription || null,
    })
    setSaving(false)
    setIsEditing(false)
  }

  const handleToggleHidden = async () => {
    await onUpdate(event.id, { isHidden: !event.isHidden })
  }

  if (isEditing) {
    return (
      <div className={`p-3 rounded-lg bg-base-200 border-2 border-primary ${event.isHidden ? 'opacity-50' : ''}`}>
        <div className="space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input input-bordered input-sm w-full"
            placeholder="Titel"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full"
            rows={3}
            placeholder="Beschreibung (optional)"
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsEditing(false)} 
              className="btn btn-ghost btn-xs"
              disabled={saving}
            >
              <IconX className="w-3 h-3" />
              Abbrechen
            </button>
            <button 
              onClick={() => void handleSave()} 
              className="btn btn-primary btn-xs"
              disabled={saving}
            >
              {saving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <IconCheck className="w-3 h-3" />
              )}
              Speichern
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors group ${event.isHidden ? 'opacity-50' : ''}`}>
      {/* Time column */}
      <div className="w-20 flex-shrink-0 text-sm">
        <span className={event.isAllDay ? 'badge badge-info badge-sm' : 'text-base-content/70'}>
          {timeDisplay}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium truncate">{event.title}</h3>
          
          {/* Action buttons */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-ghost btn-xs btn-square"
              title="Bearbeiten"
            >
              <IconPencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => void handleToggleHidden()}
              className="btn btn-ghost btn-xs btn-square"
              title={event.isHidden ? 'Einblenden' : 'Ausblenden'}
            >
              {event.isHidden ? (
                <IconEye className="w-3 h-3" />
              ) : (
                <IconEyeOff className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
        
        {/* Location */}
        {(event.location || event.matchedLocation) && (
          <div className="flex items-center gap-1 text-sm text-base-content/70 mt-1">
            <IconMapPin className="w-3 h-3 flex-shrink-0" />
            {event.matchedLocation ? (
              <Link 
                href={`/locations/${event.matchedLocation.id}`}
                className="link link-hover truncate"
              >
                {event.matchedLocation.name}
              </Link>
            ) : (
              <span className="truncate">{event.location}</span>
            )}
          </div>
        )}

        {/* Description preview */}
        {event.description && (
          <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 mt-2">
          {event.sourceCalendar && (
            <span className="badge badge-ghost badge-xs">
              {event.sourceCalendar}
            </span>
          )}
          {event.isHidden && (
            <span className="badge badge-warning badge-xs">
              Ausgeblendet
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
