/**
 * JournalTasksPanel Component
 * Displays tasks associated with a specific journal entry in a green-themed panel.
 * Shows only tasks linked to the current entry with options to add new tasks
 * and trigger AI task extraction.
 */

'use client'

import { useState, useCallback } from 'react'
import {
  IconChecklist,
  IconPlus,
  IconSparkles,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
import TaskCard, { type TaskCardData } from './TaskCard'
import TaskSuggestionModal, { type TaskSuggestion, type EditableSuggestion } from './TaskSuggestionModal'
import TaskForm from './TaskForm'

// =============================================================================
// TYPES
// =============================================================================

interface Contact {
  id: string
  name: string
  slug: string
}

interface JournalTasksPanelProps {
  journalEntryId: string
  tasks: TaskCardData[]
  contacts?: Contact[]
  onTasksChange?: () => void
  defaultExpanded?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function JournalTasksPanel({
  journalEntryId,
  tasks,
  contacts = [],
  onTasksChange,
  defaultExpanded = true,
}: JournalTasksPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [extracting, setExtracting] = useState(false)
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING')
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED')
  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  // Handle task completion
  const handleComplete = useCallback(
    async (taskId: string) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        })
        if (res.ok) {
          onTasksChange?.()
        }
      } catch (error) {
        console.error('Error completing task:', error)
      }
    },
    [onTasksChange]
  )

  // Handle task reopening
  const handleReopen = useCallback(
    async (taskId: string) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reopen' }),
        })
        if (res.ok) {
          onTasksChange?.()
        }
      } catch (error) {
        console.error('Error reopening task:', error)
      }
    },
    [onTasksChange]
  )

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    async (taskId: string, isFavorite: boolean) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite }),
        })
        if (res.ok) {
          onTasksChange?.()
        }
      } catch (error) {
        console.error('Error toggling favorite:', error)
      }
    },
    [onTasksChange]
  )

  // Handle due date update
  const handleUpdateDueDate = useCallback(
    async (taskId: string, dueDate: string | null) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate }),
        })
        if (res.ok) {
          onTasksChange?.()
        }
      } catch (error) {
        console.error('Error updating due date:', error)
      }
    },
    [onTasksChange]
  )

  // Handle edit
  const handleEdit = useCallback((taskId: string) => {
    setEditingTaskId(taskId)
  }, [])

  // Extract tasks using AI
  const handleExtractTasks = async () => {
    setExtracting(true)
    try {
      const res = await fetch('/api/journal-ai/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions)
          setShowSuggestionModal(true)
        }
        // No tasks found - silent, no action needed
      }
    } catch (error) {
      console.error('Error extracting tasks:', error)
    } finally {
      setExtracting(false)
    }
  }

  // Save extracted tasks
  const handleSaveSuggestions = async (selected: EditableSuggestion[]) => {
    try {
      const res = await fetch('/api/journal-ai/extract-tasks?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalEntryId,
          suggestions: selected.map((s) => ({
            title: s.title,
            description: s.description,
            taskType: s.taskType,
            priority: s.priority,
            suggestedDueDate: s.suggestedDueDate,
            relatedContactName: s.relatedContactName,
            confidence: s.confidence,
            contactId: s.contactId,
          })),
        }),
      })

      if (res.ok) {
        onTasksChange?.()
        setSuggestions([])
      }
    } catch (error) {
      console.error('Error saving tasks:', error)
      throw error
    }
  }

  return (
    <>
      {/* Panel with green background */}
      <div className="bg-success/10 border border-success/20 rounded-lg overflow-hidden">
        {/* Header */}
        <button
          className="w-full flex items-center justify-between p-3 hover:bg-success/5 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <IconChecklist size={20} className="text-success" />
            <span className="font-medium">Aufgaben</span>
            {pendingTasks.length > 0 && (
              <span className="badge badge-success badge-sm">{pendingTasks.length}</span>
            )}
          </div>
          {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </button>

        {/* Content */}
        {expanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* Task List */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onReopen={handleReopen}
                    onEdit={handleEdit}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdateDueDate={handleUpdateDueDate}
                    showJournalLink={false}
                  />
                ))}
              </div>
            )}

            {/* Completed Tasks (collapsed by default) */}
            {completedTasks.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-base-content/60 hover:text-base-content">
                  {completedTasks.length} erledigt
                </summary>
                <div className="mt-2 space-y-2">
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onReopen={handleReopen}
                      compact
                      showJournalLink={false}
                    />
                  ))}
                </div>
              </details>
            )}

            {/* Empty State */}
            {tasks.length === 0 && (
              <p className="text-center text-sm text-base-content/60 py-2">
                Keine Aufgaben für diesen Eintrag
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost text-success"
                onClick={() => setShowTaskForm(true)}
              >
                <IconPlus size={14} />
                Aufgabe hinzufügen
              </button>
              <button
                className="btn btn-sm btn-ghost text-info"
                onClick={handleExtractTasks}
                disabled={extracting}
              >
                {extracting ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconSparkles size={14} />
                )}
                Tasks erkennen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      <TaskSuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => {
          setShowSuggestionModal(false)
          setSuggestions([])
        }}
        suggestions={suggestions}
        journalEntryId={journalEntryId}
        contacts={contacts}
        onSave={handleSaveSuggestions}
      />

      {/* Task Form Modal - New */}
      {showTaskForm && (
        <TaskForm
          journalEntryId={journalEntryId}
          onClose={() => setShowTaskForm(false)}
          onSave={() => {
            onTasksChange?.()
          }}
        />
      )}

      {/* Task Form Modal - Edit */}
      {editingTask && (
        <TaskForm
          journalEntryId={journalEntryId}
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
            onTasksChange?.()
          }}
        />
      )}
    </>
  )
}
