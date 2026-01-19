/**
 * Beta page for bookmarks list.
 * This is a placeholder page for search result navigation.
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconBookmark, IconArrowLeft, IconExternalLink } from '@tabler/icons-react';

interface Bookmark {
  id: string;
  title: string;
  description: string | null;
  url: string;
}

export default function BookmarksPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookmarks() {
      try {
        const res = await fetch('/api/links');
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data.links || data.bookmarks || []);
        }
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
      } finally {
        setLoading(false);
      }
    }
    void loadBookmarks();
  }, []);

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && bookmarks.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`bookmark-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-pulse');
          setTimeout(() => element.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [highlightId, bookmarks]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Beta badge */}
      <div className="badge badge-warning mb-4">Beta</div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconBookmark size={28} />
        <h1 className="text-2xl font-bold">Lesezeichen</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          <p>Keine Lesezeichen gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              id={`bookmark-${bookmark.id}`}
              className="card bg-base-200"
            >
              <div className="card-body py-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="card-title text-base">{bookmark.title}</h2>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-xs"
                  >
                    <IconExternalLink size={16} />
                  </a>
                </div>
                {bookmark.description && (
                  <p className="text-sm text-base-content/70">{bookmark.description}</p>
                )}
                <p className="text-xs text-base-content/50 truncate">{bookmark.url}</p>
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
