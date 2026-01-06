/**
 * Beta page for habits list.
 * This is a placeholder page for search result navigation.
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconRepeat, IconArrowLeft } from '@tabler/icons-react';

interface Habit {
  id: string;
  title: string;
  description: string | null;
  frequency: string | null;
  isActive: boolean;
}

export default function HabitsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHabits() {
      try {
        const res = await fetch('/api/habits');
        if (res.ok) {
          const data = await res.json();
          setHabits(data.habits || []);
        }
      } catch (error) {
        console.error('Failed to load habits:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHabits();
  }, []);

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && habits.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`habit-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-pulse');
          setTimeout(() => element.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightId, habits]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Beta badge */}
      <div className="badge badge-warning mb-4">Beta</div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconRepeat size={28} />
        <h1 className="text-2xl font-bold">Gewohnheiten</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          <p>Keine Gewohnheiten gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              id={`habit-${habit.id}`}
              className="card bg-base-200"
            >
              <div className="card-body py-4">
                <h2 className="card-title text-base">{habit.title}</h2>
                {habit.description && (
                  <p className="text-sm text-base-content/70">{habit.description}</p>
                )}
                {habit.frequency && (
                  <p className="text-xs text-base-content/50">Frequenz: {habit.frequency}</p>
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
