/**
 * Single search result item component.
 * Displays title, snippet with highlighting, and navigation link.
 */
'use client';

import { useRouter } from 'next/navigation';
import { TablerIcon } from './TablerIcon';
import type { SearchResultItem as SearchResultItemType } from '@/types/search';
import { entityTypeIcons } from '@/lib/validators/search';

interface SearchResultItemProps {
  item: SearchResultItemType;
  onClick?: () => void;
}

export function SearchResultItem({ item, onClick }: SearchResultItemProps) {
  const router = useRouter();
  const iconName = entityTypeIcons[item.type] || 'file';

  const handleClick = () => {
    // Navigate first
    router.push(item.url);
    // Then close overlay after a small delay to ensure navigation starts
    setTimeout(() => {
      onClick?.();
    }, 100);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-base-200 transition-colors cursor-pointer border-b border-base-200 last:border-b-0"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-base-content/70">
        <TablerIcon name={iconName} size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title and date */}
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-base-content truncate">
            {item.title}
          </span>
          {item.date && (
            <span className="text-xs text-base-content/50 flex-shrink-0">
              {formatDate(item.date)}
            </span>
          )}
        </div>

        {/* Snippet with highlighting */}
        {item.snippet && (
          <p
            className="text-sm text-base-content/70 mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: sanitizeSnippet(item.snippet) }}
          />
        )}
      </div>
    </div>
  );
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Sanitize snippet HTML (only allow <mark> tags)
function sanitizeSnippet(html: string): string {
  // Replace any HTML tags except <mark> and </mark>
  return html
    .replace(/<(?!\/?mark\b)[^>]*>/gi, '')
    .replace(/</g, (match, offset, str) => {
      // Check if this is a <mark> or </mark> tag
      const nextChars = str.slice(offset, offset + 6);
      if (nextChars.startsWith('<mark>') || nextChars.startsWith('</mark')) {
        return match;
      }
      return '&lt;';
    });
}
