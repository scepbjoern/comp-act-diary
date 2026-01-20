'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { de } from 'date-fns/locale'
import { IconChevronLeft, IconChevronRight, IconCalendarEvent, IconMapPin, IconRefresh } from '@tabler/icons-react'
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

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let url: string
      if (viewMode === 'day') {
        url = `/api/calendar/events?date=${selectedDate}`
      } else {
        const weekStart = format(startOfWeek(parseISO(selectedDate), { locale: de }), 'yyyy-MM-dd')
        const weekEnd = format(endOfWeek(parseISO(selectedDate), { locale: de }), 'yyyy-MM-dd')
        url = `/api/calendar/events?startDate=${weekStart}&endDate=${weekEnd}`
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
  }, [selectedDate, viewMode])

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
                      <EventCard key={event.id} event={event} />
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

function EventCard({ event }: { event: CalendarEvent }) {
  const startTime = parseISO(event.startedAt)
  const endTime = event.endedAt ? parseISO(event.endedAt) : null

  const timeDisplay = event.isAllDay 
    ? 'Ganztägig'
    : `${format(startTime, 'HH:mm')}${endTime ? ` - ${format(endTime, 'HH:mm')}` : ''}`

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
      {/* Time column */}
      <div className="w-20 flex-shrink-0 text-sm">
        <span className={event.isAllDay ? 'badge badge-info badge-sm' : 'text-base-content/70'}>
          {timeDisplay}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{event.title}</h3>
        
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
          <p className="text-sm text-base-content/60 mt-1 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Source calendar badge */}
        {event.sourceCalendar && (
          <span className="badge badge-ghost badge-xs mt-2">
            {event.sourceCalendar}
          </span>
        )}
      </div>
    </div>
  )
}
