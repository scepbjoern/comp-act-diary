'use client'

import { useState, useEffect } from 'react'
import { IconCheck, IconCalendar, IconUser } from '@tabler/icons-react'
import { format, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description?: string | null
  dueDate?: string | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  contact?: { id: string; name: string; slug: string } | null
}

interface TaskListProps {
  initialTasks?: Task[]
  contactId?: string
  showAddButton?: boolean
}

export default function TaskList({ initialTasks = [], contactId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (contactId) params.set('contactId', contactId)
        if (!showCompleted) params.set('status', 'PENDING')
        
        const res = await fetch(`/api/tasks?${params}`)
        const data = await res.json()
        
        if (data.tasks) {
          setTasks(data.tasks)
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [showCompleted, contactId])

  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      
      if (res.ok) {
        setTasks(prev => 
          prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' as const } : t)
        )
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleReopen = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      
      if (res.ok) {
        setTasks(prev => 
          prev.map(t => t.id === taskId ? { ...t, status: 'PENDING' as const } : t)
        )
      }
    } catch (error) {
      console.error('Error reopening task:', error)
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'PENDING')
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

  const getDateClass = (dueDate: string | null | undefined) => {
    if (!dueDate) return ''
    const date = new Date(dueDate)
    if (isPast(date) && !isToday(date)) return 'text-error'
    if (isToday(date)) return 'text-warning'
    return 'text-base-content/60'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Aufgaben</h2>
        <div className="flex items-center gap-2">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Erledigte zeigen</span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <>
          {/* Pending Tasks */}
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 bg-base-100 rounded-lg border border-base-200"
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  className="btn btn-ghost btn-xs btn-circle mt-0.5"
                >
                  <div className="w-4 h-4 rounded-full border-2 border-base-content/30"></div>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-base-content/60 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${getDateClass(task.dueDate)}`}>
                        <IconCalendar size={12} />
                        {format(new Date(task.dueDate), 'd. MMM', { locale: de })}
                      </span>
                    )}
                    {task.contact && (
                      <Link
                        href={`/prm/${task.contact.slug}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <IconUser size={12} />
                        {task.contact.name}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Completed Tasks */}
          {showCompleted && completedTasks.length > 0 && (
            <div className="space-y-2 opacity-60">
              <h3 className="text-sm font-medium text-base-content/60">Erledigt</h3>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 bg-base-200/50 rounded-lg"
                >
                  <button
                    onClick={() => handleReopen(task.id)}
                    className="btn btn-ghost btn-xs btn-circle mt-0.5"
                  >
                    <IconCheck size={16} className="text-success" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="line-through">{task.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingTasks.length === 0 && !showCompleted && (
            <p className="text-center text-base-content/60 py-4">Keine offenen Aufgaben</p>
          )}
        </>
      )}
    </div>
  )
}
