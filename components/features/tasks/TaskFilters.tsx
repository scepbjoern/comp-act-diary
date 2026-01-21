/**
 * TaskFilters Component
 * Provides filter controls for task lists including status, type, priority, and sorting.
 */

'use client'

import { memo } from 'react'
import {
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | undefined
export type TaskType =
  | 'IMMEDIATE'
  | 'REFLECTION'
  | 'PLANNED_INTERACTION'
  | 'FOLLOW_UP'
  | 'RESEARCH'
  | 'HABIT_RELATED'
  | 'GENERAL'
  | undefined
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | undefined
export type TaskSortBy = 'dueDate' | 'createdAt' | 'title' | 'priority'
export type SortOrder = 'asc' | 'desc'
export type GroupBy = 'none' | 'dueDate' | 'priority' | 'taskType'

export interface TaskFilterValues {
  status?: TaskStatus
  taskType?: TaskType
  priority?: TaskPriority
  sortBy: TaskSortBy
  sortOrder: SortOrder
  groupBy: GroupBy
}

interface TaskFiltersProps {
  values: TaskFilterValues
  onChange: (values: TaskFilterValues) => void
  showStatusFilter?: boolean
  compact?: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: undefined, label: 'Alle' },
  { value: 'PENDING', label: 'Offen' },
  { value: 'COMPLETED', label: 'Erledigt' },
]

// Typ-Optionen: Allgemein zuoberst, dann alphabetisch sortiert
const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: undefined, label: 'Alle Typen' },
  { value: 'GENERAL', label: 'Allgemein' },
  { value: 'HABIT_RELATED', label: 'Gewohnheit' },
  { value: 'PLANNED_INTERACTION', label: 'Interaktion' },
  { value: 'FOLLOW_UP', label: 'Nachfassen' },
  { value: 'RESEARCH', label: 'Recherche' },
  { value: 'REFLECTION', label: 'Reflexion' },
  { value: 'IMMEDIATE', label: 'Sofort' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: undefined, label: 'Alle Prioritäten' },
  { value: 'HIGH', label: 'Hoch' },
  { value: 'MEDIUM', label: 'Mittel' },
  { value: 'LOW', label: 'Niedrig' },
]

const SORT_OPTIONS: { value: TaskSortBy; label: string }[] = [
  { value: 'dueDate', label: 'Fälligkeit' },
  { value: 'priority', label: 'Priorität' },
  { value: 'createdAt', label: 'Erstellt' },
  { value: 'title', label: 'Titel' },
]

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'dueDate', label: 'Nach Fälligkeit' },
  { value: 'priority', label: 'Nach Priorität' },
  { value: 'taskType', label: 'Nach Typ' },
  { value: 'none', label: 'Keine Gruppierung' },
]

// =============================================================================
// COMPONENT
// =============================================================================

function TaskFiltersComponent({
  values,
  onChange,
  showStatusFilter = true,
  compact = false,
}: TaskFiltersProps) {
  const hasActiveFilters =
    values.status !== undefined ||
    values.taskType !== undefined ||
    values.priority !== undefined

  const handleClearFilters = () => {
    onChange({
      ...values,
      status: undefined,
      taskType: undefined,
      priority: undefined,
    })
  }

  const toggleSortOrder = () => {
    onChange({
      ...values,
      sortOrder: values.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Dropdown */}
        {showStatusFilter && (
          <select
            className="select select-bordered select-sm"
            value={values.status || ''}
            onChange={(e) =>
              onChange({
                ...values,
                status: (e.target.value || undefined) as TaskStatus,
              })
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Sort Dropdown with Order Toggle */}
        <div className="join">
          <select
            className="select select-bordered select-sm join-item"
            value={values.sortBy}
            onChange={(e) =>
              onChange({ ...values, sortBy: e.target.value as TaskSortBy })
            }
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-ghost join-item"
            onClick={toggleSortOrder}
            title={values.sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
          >
            {values.sortOrder === 'asc' ? (
              <IconSortAscending size={16} />
            ) : (
              <IconSortDescending size={16} />
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-base-200/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
        <IconFilter size={16} />
        <span>Filter</span>
        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={handleClearFilters}
          >
            <IconX size={14} />
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        {showStatusFilter && (
          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs">Status</span>
            </label>
            <select
              className="select select-bordered select-sm w-full max-w-[150px]"
              value={values.status || ''}
              onChange={(e) =>
                onChange({
                  ...values,
                  status: (e.target.value || undefined) as TaskStatus,
                })
              }
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Type Filter */}
        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs">Typ</span>
          </label>
          <select
            className="select select-bordered select-sm w-full max-w-[150px]"
            value={values.taskType || ''}
            onChange={(e) =>
              onChange({
                ...values,
                taskType: (e.target.value || undefined) as TaskType,
              })
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs">Priorität</span>
          </label>
          <select
            className="select select-bordered select-sm w-full max-w-[150px]"
            value={values.priority || ''}
            onChange={(e) =>
              onChange({
                ...values,
                priority: (e.target.value || undefined) as TaskPriority,
              })
            }
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Group By */}
        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs">Gruppierung</span>
          </label>
          <select
            className="select select-bordered select-sm w-full min-w-[160px]"
            value={values.groupBy}
            onChange={(e) =>
              onChange({ ...values, groupBy: e.target.value as GroupBy })
            }
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs">Sortierung</span>
          </label>
          <div className="join">
            <select
              className="select select-bordered select-sm join-item min-w-[120px]"
              value={values.sortBy}
              onChange={(e) =>
                onChange({ ...values, sortBy: e.target.value as TaskSortBy })
              }
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm join-item"
              onClick={toggleSortOrder}
              title={values.sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
            >
              {values.sortOrder === 'asc' ? (
                <IconSortAscending size={16} />
              ) : (
                <IconSortDescending size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TaskFilters = memo(TaskFiltersComponent)
export default TaskFilters
