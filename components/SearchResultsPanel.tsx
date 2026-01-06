/**
 * Search results panel component.
 * Displays grouped search results by entity type.
 */
'use client';

import { useState } from 'react';
import { TablerIcon } from './TablerIcon';
import { SearchResultItem } from './SearchResultItem';
import type { SearchResultGroup } from '@/types/search';
import { entityTypeIcons } from '@/lib/validators/search';

interface SearchResultsPanelProps {
  results: SearchResultGroup[];
  totalCount: number;
  onResultClick?: () => void;
}

// Number of items to show initially per group
const INITIAL_ITEMS_PER_GROUP = 5;

export function SearchResultsPanel({
  results,
  totalCount,
  onResultClick,
}: SearchResultsPanelProps) {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-base-300">
      {results.map((group) => {
        const isExpanded = expandedGroups.has(group.type);
        const visibleItems = isExpanded
          ? group.items
          : group.items.slice(0, INITIAL_ITEMS_PER_GROUP);
        const hasMore = group.items.length > INITIAL_ITEMS_PER_GROUP;
        const iconName = entityTypeIcons[group.type] || 'file';

        return (
          <div key={group.type} className="py-2">
            {/* Group header */}
            <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-base-content/70">
              <TablerIcon name={iconName} size={16} />
              <span className="uppercase tracking-wide">{group.label}</span>
              <span className="badge badge-sm badge-ghost">{group.count}</span>
            </div>

            {/* Group items */}
            <div>
              {visibleItems.map((item) => (
                <SearchResultItem
                  key={item.id}
                  item={item}
                  onClick={onResultClick}
                />
              ))}
            </div>

            {/* "Show more" button */}
            {hasMore && (
              <button
                type="button"
                onClick={() => toggleGroup(group.type)}
                className="w-full px-4 py-2 text-sm text-primary hover:bg-base-200 transition-colors text-left"
              >
                {isExpanded
                  ? 'Weniger anzeigen'
                  : `Alle ${group.count} Ergebnisse anzeigen`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
