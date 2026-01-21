/**
 * Tasks Page
 * Central task management view with filtering, grouping by due date, and task creation.
 */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { IconChecklist, IconPlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { isPast, isToday, isTomorrow, addDays, startOfDay } from 'date-fns'
import TaskCard, { type TaskCardData } from '@/components/features/tasks/TaskCard'
import TaskFilters, { type TaskFilterValues } from '@/components/features/tasks/TaskFilters'
import TaskForm from '@/components/features/tasks/TaskForm'

// =============================================================================
// TYPES
// =============================================================================

interface TaskGroup {
  id: string
  title: string
  tasks: TaskCardData[]
  defaultExpanded: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TasksPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  
  const [tasks, setTasks] = useState<TaskCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['overdue', 'today', 'upcoming', 'later']))
  
  const [filters, setFilters] = useState<TaskFilterValues>({
    status: 'PENDING',
    taskType: undefined,
    priority: undefined,
    sortBy: 'dueDate',
    sortOrder: 'asc',
    groupBy: 'dueDate',
  })

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.taskType) params.set('taskType', filters.taskType)
      if (filters.priority) params.set('priority', filters.priority)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)
      params.set('limit', '100')

      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && tasks.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`task-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('highlight-pulse')
          setTimeout(() => element.classList.remove('highlight-pulse'), 2500)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [highlightId, tasks])

  // Sort tasks with favorites first within each group
  const sortWithFavorites = (taskList: TaskCardData[]): TaskCardData[] => {
    return [...taskList].sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return 0
    })
  }

  // Group tasks based on groupBy setting
  const taskGroups = useMemo((): TaskGroup[] => {
    const { groupBy } = filters

    // No grouping - return all tasks as one group
    if (groupBy === 'none') {
      return [{
        id: 'all',
        title: `Alle Aufgaben (${tasks.length})`,
        tasks: sortWithFavorites(tasks),
        defaultExpanded: true,
      }]
    }

    // Group by priority
    if (groupBy === 'priority') {
      const high = tasks.filter((t) => t.priority === 'HIGH')
      const medium = tasks.filter((t) => t.priority === 'MEDIUM')
      const low = tasks.filter((t) => t.priority === 'LOW')

      const groups: TaskGroup[] = []
      if (high.length > 0) groups.push({ id: 'high', title: `Hohe Priorität (${high.length})`, tasks: sortWithFavorites(high), defaultExpanded: true })
      if (medium.length > 0) groups.push({ id: 'medium', title: `Mittlere Priorität (${medium.length})`, tasks: sortWithFavorites(medium), defaultExpanded: true })
      if (low.length > 0) groups.push({ id: 'low', title: `Niedrige Priorität (${low.length})`, tasks: sortWithFavorites(low), defaultExpanded: true })
      return groups
    }

    // Group by task type
    if (groupBy === 'taskType') {
      const typeLabels: Record<string, string> = {
        GENERAL: 'Allgemein',
        IMMEDIATE: 'Sofort',
        REFLECTION: 'Reflexion',
        PLANNED_INTERACTION: 'Interaktion',
        FOLLOW_UP: 'Nachfassen',
        RESEARCH: 'Recherche',
        HABIT_RELATED: 'Gewohnheit',
      }
      const byType: Record<string, TaskCardData[]> = {}
      tasks.forEach((t) => {
        const type = t.taskType || 'GENERAL'
        if (!byType[type]) byType[type] = []
        byType[type].push(t)
      })

      // Sort types: GENERAL first, then alphabetically by label
      const sortedTypes = Object.keys(byType).sort((a, b) => {
        if (a === 'GENERAL') return -1
        if (b === 'GENERAL') return 1
        return (typeLabels[a] || a).localeCompare(typeLabels[b] || b)
      })

      return sortedTypes.map((type) => ({
        id: type.toLowerCase(),
        title: `${typeLabels[type] || type} (${byType[type].length})`,
        tasks: sortWithFavorites(byType[type]),
        defaultExpanded: true,
      }))
    }

    // Default: Group by due date
    const today = startOfDay(new Date())
    const weekFromNow = addDays(today, 7)

    const completed: TaskCardData[] = []
    const overdue: TaskCardData[] = []
    const dueToday: TaskCardData[] = []
    const dueTomorrow: TaskCardData[] = []
    const upcoming: TaskCardData[] = []
    const later: TaskCardData[] = []
    const noDueDate: TaskCardData[] = []

    tasks.forEach((task) => {
      // Erledigte Aufgaben immer unter "Erledigt" gruppieren
      if (task.status === 'COMPLETED') {
        completed.push(task)
        return
      }

      if (!task.dueDate) {
        noDueDate.push(task)
        return
      }

      const dueDate = new Date(task.dueDate)
      
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task)
      } else if (isToday(dueDate)) {
        dueToday.push(task)
      } else if (isTomorrow(dueDate)) {
        dueTomorrow.push(task)
      } else if (dueDate <= weekFromNow) {
        upcoming.push(task)
      } else {
        later.push(task)
      }
    })

    const groups: TaskGroup[] = []

    if (overdue.length > 0) {
      groups.push({ id: 'overdue', title: `Überfällig (${overdue.length})`, tasks: sortWithFavorites(overdue), defaultExpanded: true })
    }
    if (dueToday.length > 0) {
      groups.push({ id: 'today', title: `Heute fällig (${dueToday.length})`, tasks: sortWithFavorites(dueToday), defaultExpanded: true })
    }
    if (dueTomorrow.length > 0) {
      groups.push({ id: 'tomorrow', title: `Morgen fällig (${dueTomorrow.length})`, tasks: sortWithFavorites(dueTomorrow), defaultExpanded: true })
    }
    if (upcoming.length > 0) {
      groups.push({ id: 'upcoming', title: `Bald fällig (${upcoming.length})`, tasks: sortWithFavorites(upcoming), defaultExpanded: true })
    }
    if (later.length > 0) {
      groups.push({ id: 'later', title: `Später (${later.length})`, tasks: sortWithFavorites(later), defaultExpanded: false })
    }
    if (noDueDate.length > 0) {
      groups.push({ id: 'no-date', title: `Ohne Fälligkeit (${noDueDate.length})`, tasks: sortWithFavorites(noDueDate), defaultExpanded: false })
    }
    if (completed.length > 0) {
      groups.push({ id: 'completed', title: `Erledigt (${completed.length})`, tasks: sortWithFavorites(completed), defaultExpanded: false })
    }

    return groups
  }, [tasks, filters])

  // Expand all groups when grouping changes
  useEffect(() => {
    const allGroupIds = taskGroups.map(g => g.id)
    setExpandedGroups(new Set(allGroupIds))
  }, [filters.groupBy, taskGroups.length])

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // Handle task actions
  const handleComplete = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      if (res.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }, [fetchTasks])

  const handleDelete = useCallback(async (taskId: string) => {
    if (!confirm('Möchtest du diese Aufgabe wirklich löschen?')) return

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }, [fetchTasks])

  const handleReopen = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      if (res.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error reopening task:', error)
    }
  }, [fetchTasks])

  const handleToggleFavorite = useCallback(async (taskId: string, isFavorite: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      })
      if (res.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }, [fetchTasks])

  const handleUpdateDueDate = useCallback(async (taskId: string, dueDate: string | null) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      })
      if (res.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error updating due date:', error)
    }
  }, [fetchTasks])

  const handleEdit = useCallback((taskId: string) => {
    setEditingTaskId(taskId)
  }, [])

  // Get task data for editing
  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconChecklist size={28} className="text-primary" />
          <h1 className="text-2xl font-bold">Aufgaben</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <IconPlus size={18} />
          <span className="hidden sm:inline">Neue Aufgabe</span>
        </button>
      </div>

      {/* Filters */}
      <TaskFilters values={filters} onChange={setFilters} />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <IconChecklist size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg">Keine Aufgaben gefunden</p>
          <p className="text-sm mt-1">Erstelle eine neue Aufgabe oder ändere die Filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {taskGroups.map((group) => (
            <div key={group.id} className="bg-base-200/30 rounded-lg overflow-hidden">
              {/* Group Header */}
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <span
                  className={`font-medium ${
                    group.id === 'overdue' ? 'text-error' : ''
                  }`}
                >
                  {group.title}
                </span>
                {expandedGroups.has(group.id) ? (
                  <IconChevronUp size={18} />
                ) : (
                  <IconChevronDown size={18} />
                )}
              </button>

              {/* Group Content */}
              {expandedGroups.has(group.id) && (
                <div className="px-3 pb-3 space-y-2">
                  {group.tasks.map((task) => (
                    <div key={task.id} id={`task-${task.id}`}>
                      <TaskCard
                        task={task}
                        onComplete={handleComplete}
                        onReopen={handleReopen}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleFavorite={handleToggleFavorite}
                        onUpdateDueDate={handleUpdateDueDate}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Form Modal - New */}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSave={() => {
            void fetchTasks()
          }}
        />
      )}

      {/* Task Form Modal - Edit */}
      {editingTask && (
        <TaskForm
          initialData={{
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description || undefined,
            dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : null,
            taskType: editingTask.taskType,
            priority: editingTask.priority,
            contactId: editingTask.contact?.id,
          }}
          onClose={() => setEditingTaskId(null)}
          onSave={() => {
            void fetchTasks()
          }}
        />
      )}
    </div>
  )
}
