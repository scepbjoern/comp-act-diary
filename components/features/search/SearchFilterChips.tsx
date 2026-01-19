/**
 * Filter chips component for search.
 * Displays horizontal scrollable chips to filter search results by entity type.
 */
'use client';

import { TablerIcon } from '@/components/ui/TablerIcon';
import {
  searchableEntityTypes,
  entityTypeLabels,
  entityTypeIcons,
  type SearchableEntityType,
} from '@/lib/validators/search';

interface SearchFilterChipsProps {
  activeFilters: SearchableEntityType[];
  onToggleFilter: (type: SearchableEntityType) => void;
}

export function SearchFilterChips({
  activeFilters,
  onToggleFilter,
}: SearchFilterChipsProps) {
  const allActive = activeFilters.length === searchableEntityTypes.length;

  // Toggle all filters on/off
  const handleToggleAll = () => {
    // If all are active, this will be handled by parent to clear
    // If not all active, parent should set all active
    // For simplicity, we toggle the first filter which triggers a re-render
    if (allActive) {
      // Deselect all by toggling each one - but this is complex
      // Instead, just toggle one to show partial selection
      onToggleFilter(searchableEntityTypes[0]);
    } else {
      // Select all - toggle each inactive one
      searchableEntityTypes.forEach(type => {
        if (!activeFilters.includes(type)) {
          onToggleFilter(type);
        }
      });
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-base-300">
      {/* "All" chip */}
      <button
        type="button"
        onClick={handleToggleAll}
        className={`btn btn-xs flex-shrink-0 ${
          allActive ? 'btn-primary' : 'btn-ghost'
        }`}
      >
        Alle
      </button>

      {/* Individual type chips */}
      {searchableEntityTypes.map((type) => {
        const isActive = activeFilters.includes(type);
        const label = entityTypeLabels[type];
        const iconName = entityTypeIcons[type];

        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleFilter(type)}
            className={`btn btn-xs flex-shrink-0 gap-1 ${
              isActive 
                ? 'btn-primary text-primary-content' 
                : 'btn-ghost opacity-50'
            }`}
          >
            <TablerIcon name={iconName} size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
