/**
 * Beta page for tag management.
 * This is a placeholder page for search result navigation.
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconTag, IconArrowLeft } from '@tabler/icons-react';

interface Taxonomy {
  id: string;
  shortName: string;
  longName: string | null;
  description: string | null;
  category: string | null;
}

export default function TagsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTags() {
      try {
        // Try to load taxonomies from API
        const res = await fetch('/api/day?date=1970-01-01');
        if (res.ok) {
          // Tags might be loaded differently, for now show empty state
          setTags([]);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTags();
  }, []);

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && tags.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`tag-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-pulse');
          setTimeout(() => element.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightId, tags]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Beta badge */}
      <div className="badge badge-warning mb-4">Beta</div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconTag size={28} />
        <h1 className="text-2xl font-bold">Tags verwalten</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          <p>Die Tag-Verwaltung ist noch in Entwicklung.</p>
          <p className="mt-2 text-sm">Tags werden aktuell automatisch aus Journal-Einträgen extrahiert.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              id={`tag-${tag.id}`}
              className="card bg-base-200"
            >
              <div className="card-body py-4">
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary">{tag.shortName}</span>
                  {tag.longName && (
                    <span className="text-base-content/70">{tag.longName}</span>
                  )}
                </div>
                {tag.description && (
                  <p className="text-sm text-base-content/70">{tag.description}</p>
                )}
                {tag.category && (
                  <p className="text-xs text-base-content/50">Kategorie: {tag.category}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link href="/settings" className="btn btn-ghost">
          <IconArrowLeft size={18} />
          Zurück zu Einstellungen
        </Link>
      </div>
    </div>
  );
}
