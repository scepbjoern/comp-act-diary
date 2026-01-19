/**
 * Beta page for tasks list.
 * This is a placeholder page for search result navigation.
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconCheckbox, IconArrowLeft } from '@tabler/icons-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    }
    void loadTasks();
  }, []);

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && tasks.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`task-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-pulse');
          setTimeout(() => element.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightId, tasks]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="badge badge-success badge-sm">Erledigt</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-info badge-sm">In Bearbeitung</span>;
      case 'CANCELLED':
        return <span className="badge badge-error badge-sm">Abgebrochen</span>;
      default:
        return <span className="badge badge-ghost badge-sm">Offen</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Beta badge */}
      <div className="badge badge-warning mb-4">Beta</div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconCheckbox size={28} />
        <h1 className="text-2xl font-bold">Aufgaben</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          <p>Keine Aufgaben gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              id={`task-${task.id}`}
              className="card bg-base-200"
            >
              <div className="card-body py-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="card-title text-base">{task.title}</h2>
                  {getStatusBadge(task.status)}
                </div>
                {task.description && (
                  <p className="text-sm text-base-content/70">{task.description}</p>
                )}
                {task.dueDate && (
                  <p className="text-xs text-base-content/50">
                    Fällig: {new Date(task.dueDate).toLocaleDateString('de-CH')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link href="/" className="btn btn-ghost">
          <IconArrowLeft size={18} />
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
