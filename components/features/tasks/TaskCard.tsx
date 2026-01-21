/**
 * TaskCard Component
 * Displays a single task with priority indicator, type badge, due date, and quick actions.
 * Supports both pending and completed states.
 */

'use client'

import { memo } from 'react'
import { useState } from 'react'
import {
  IconCheck,
  IconCalendar,
  IconUser,
  IconNotebook,
  IconSparkles,
  IconAlertCircle,
  IconFlag,
  IconFlag2,
  IconFlag3,
  IconStar,
  IconStarFilled,
  IconPencil,
  IconCalendarPlus,
} from '@tabler/icons-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

type TaskType =
  | 'IMMEDIATE'
  | 'REFLECTION'
  | 'PLANNED_INTERACTION'
  | 'FOLLOW_UP'
  | 'RESEARCH'
  | 'HABIT_RELATED'
  | 'GENERAL'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type TaskSource = 'MANUAL' | 'AI'

export interface TaskCardData {
  id: string
  title: string
  description?: string | null
  dueDate?: Date | string | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  taskType: TaskType
  priority: TaskPriority
  source: TaskSource
  aiConfidence?: number | null
  isFavorite?: boolean
  contact?: { id: string; name: string; slug: string } | null
  journalEntry?: { id: string; title?: string | null; occurredAt?: Date | string | null } | null
}

interface TaskCardProps {
  task: TaskCardData
  onComplete?: (taskId: string) => void
  onReopen?: (taskId: string) => void
  onEdit?: (taskId: string) => void
  onToggleFavorite?: (taskId: string, isFavorite: boolean) => void
  onUpdateDueDate?: (taskId: string, dueDate: string | null) => void
  compact?: boolean
  showJournalLink?: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  IMMEDIATE: 'Sofort',
  REFLECTION: 'Reflexion',
  PLANNED_INTERACTION: 'Interaktion',
  FOLLOW_UP: 'Nachfassen',
  RESEARCH: 'Recherche',
  HABIT_RELATED: 'Gewohnheit',
  GENERAL: 'Allgemein',
}

const TASK_TYPE_COLORS: Record<TaskType, string> = {
  IMMEDIATE: 'badge-error',
  REFLECTION: 'badge-info',
  PLANNED_INTERACTION: 'badge-primary',
  FOLLOW_UP: 'badge-warning',
  RESEARCH: 'badge-secondary',
  HABIT_RELATED: 'badge-accent',
  GENERAL: 'badge-ghost',
}

function getPriorityIcon(priority: TaskPriority) {
  switch (priority) {
    case 'HIGH':
      return <IconFlag size={14} className="text-error" />
    case 'MEDIUM':
      return <IconFlag2 size={14} className="text-warning" />
    case 'LOW':
      return <IconFlag3 size={14} className="text-base-content/40" />
  }
}

function getDateDisplay(dueDate: Date | string | null | undefined): {
  text: string
  className: string
  isOverdue: boolean
} {
  if (!dueDate) {
    return { text: '', className: '', isOverdue: false }
  }

  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const isOverdue = isPast(date) && !isToday(date)

  let text: string
  if (isToday(date)) {
    text = 'Heute'
  } else if (isTomorrow(date)) {
    text = 'Morgen'
  } else {
    text = format(date, 'd. MMM', { locale: de })
  }

  let className = 'text-base-content/60'
  if (isOverdue) {
    className = 'text-error font-medium'
  } else if (isToday(date)) {
    className = 'text-warning font-medium'
  }

  return { text, className, isOverdue }
}

// =============================================================================
// COMPONENT
// =============================================================================

function TaskCardComponent({
  task,
  onComplete,
  onReopen,
  onEdit,
  onToggleFavorite,
  onUpdateDueDate,
  compact = false,
  showJournalLink = true,
}: TaskCardProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const isCompleted = task.status === 'COMPLETED'
  const dateInfo = getDateDisplay(task.dueDate)

  const handleToggle = () => {
    if (isCompleted) {
      onReopen?.(task.id)
    } else {
      onComplete?.(task.id)
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(task.id, !task.isFavorite)
  }

  const handleQuickDate = (e: React.MouseEvent, days: number | null) => {
    e.stopPropagation()
    if (days === null) {
      onUpdateDueDate?.(task.id, null)
    } else {
      const date = new Date()
      date.setDate(date.getDate() + days)
      onUpdateDueDate?.(task.id, format(date, 'yyyy-MM-dd'))
    }
    setShowDatePicker(false)
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-colors relative
        ${isCompleted
          ? 'bg-base-200/50 border-base-200 opacity-60'
          : dateInfo.isOverdue
            ? 'bg-error/5 border-error/20'
            : task.isFavorite
              ? 'bg-warning/5 border-warning/30'
              : 'bg-base-100 border-base-200 hover:border-base-300'
        }
      `}
    >
      {/* Checkbox / Complete Button */}
      <button
        onClick={handleToggle}
        className="btn btn-ghost btn-xs btn-circle mt-0.5 flex-shrink-0"
        title={isCompleted ? 'Wiederherstellen' : 'Erledigen'}
      >
        {isCompleted ? (
          <IconCheck size={16} className="text-success" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-base-content/30 hover:border-primary" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* Favorite Star */}
          {!isCompleted && onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className="btn btn-ghost btn-xs btn-circle flex-shrink-0 -ml-1"
              title={task.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
            >
              {task.isFavorite ? (
                <IconStarFilled size={14} className="text-warning" />
              ) : (
                <IconStar size={14} className="text-base-content/30 hover:text-warning" />
              )}
            </button>
          )}
          
          {/* Title */}
          <p 
            className={`font-medium flex-1 cursor-pointer hover:text-primary ${isCompleted ? 'line-through' : ''}`}
            onClick={() => onEdit?.(task.id)}
          >
            {task.title}
          </p>
          
          {/* Action Buttons */}
          {!isCompleted && !compact && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Quick Date Picker */}
              {onUpdateDueDate && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker) }}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Fälligkeit ändern"
                  >
                    <IconCalendarPlus size={14} />
                  </button>
                  {showDatePicker && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <button onClick={(e) => handleQuickDate(e, 0)} className="btn btn-xs btn-ghost justify-start">Heute</button>
                        <button onClick={(e) => handleQuickDate(e, 1)} className="btn btn-xs btn-ghost justify-start">Morgen</button>
                        <button onClick={(e) => handleQuickDate(e, 7)} className="btn btn-xs btn-ghost justify-start">In 1 Woche</button>
                        <button onClick={(e) => handleQuickDate(e, 30)} className="btn btn-xs btn-ghost justify-start">In 1 Monat</button>
                        <div className="divider my-1"></div>
                        <button onClick={(e) => handleQuickDate(e, null)} className="btn btn-xs btn-ghost justify-start text-base-content/60">Entfernen</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Edit Button */}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(task.id) }}
                  className="btn btn-ghost btn-xs btn-circle"
                  title="Bearbeiten"
                >
                  <IconPencil size={14} />
                </button>
              )}
              
              {/* Priority Icon */}
              {getPriorityIcon(task.priority)}
            </div>
          )}
        </div>

        {/* Description (non-compact mode) */}
        {!compact && task.description && !isCompleted && (
          <p className="text-sm text-base-content/60 truncate mt-0.5">
            {task.description}
          </p>
        )}

        {/* Meta Row */}
        {!isCompleted && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
            {/* Type Badge */}
            {!compact && task.taskType !== 'GENERAL' && (
              <span className={`badge badge-xs ${TASK_TYPE_COLORS[task.taskType]}`}>
                {TASK_TYPE_LABELS[task.taskType]}
              </span>
            )}

            {/* AI Source Indicator */}
            {task.source === 'AI' && (
              <span className="flex items-center gap-0.5 text-info" title={`KI-Konfidenz: ${Math.round((task.aiConfidence || 0) * 100)}%`}>
                <IconSparkles size={12} />
                <span className="hidden sm:inline">KI</span>
              </span>
            )}

            {/* Due Date */}
            {dateInfo.text && (
              <span className={`flex items-center gap-1 ${dateInfo.className}`}>
                {dateInfo.isOverdue && <IconAlertCircle size={12} />}
                <IconCalendar size={12} />
                {dateInfo.text}
              </span>
            )}

            {/* Contact Link */}
            {task.contact && (
              <Link
                href={`/prm/${task.contact.slug}`}
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <IconUser size={12} />
                {task.contact.name}
              </Link>
            )}

            {/* Journal Entry Link */}
            {showJournalLink && task.journalEntry && (
              <Link
                href={`/day/${task.journalEntry.occurredAt ? format(new Date(task.journalEntry.occurredAt), 'yyyy-MM-dd') : ''}#entry-${task.journalEntry.id}`}
                className="flex items-center gap-1 text-secondary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <IconNotebook size={12} />
                <span className="hidden sm:inline truncate max-w-[100px]">
                  {task.journalEntry.title || 'Eintrag'}
                </span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const TaskCard = memo(TaskCardComponent)
export default TaskCard
