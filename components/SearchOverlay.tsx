/**
 * Search overlay component.
 * Displays a modal overlay with search input, filters, and results.
 */
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconSearch, IconX, IconLoader2 } from '@tabler/icons-react';
import { SearchResultsPanel } from './SearchResultsPanel';
import { SearchFilterChips } from './SearchFilterChips';
import type { SearchResultGroup } from '@/types/search';
import type { SearchableEntityType } from '@/lib/validators/search';

interface SearchOverlayProps {
  isOpen: boolean;
  query: string;
  results: SearchResultGroup[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  activeFilters: SearchableEntityType[];
  onQueryChange: (query: string) => void;
  onToggleFilter: (type: SearchableEntityType) => void;
  onClose: () => void;
  onClear: () => void;
}

export function SearchOverlay({
  isOpen,
  query,
  results,
  totalCount,
  isLoading,
  error,
  activeFilters,
  onQueryChange,
  onToggleFilter,
  onClose,
  onClear,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Handle clear and close
  const handleClose = () => {
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  // Use portal to render at document root for proper z-index
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl bg-base-100 rounded-lg shadow-2xl border border-base-300 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
          <IconSearch size={20} className="text-base-content/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Suche in Tagebuch, Kontakte, Orte..."
            className="flex-1 bg-transparent border-none outline-none text-base-content placeholder:text-base-content/50"
            autoComplete="off"
            spellCheck={false}
          />
          {isLoading && (
            <IconLoader2 size={20} className="text-primary animate-spin flex-shrink-0" />
          )}
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-circle btn-sm"
            title="Schliessen"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Filter chips */}
        <div className="px-4 py-2 border-b border-base-300 bg-base-200/50">
          <SearchFilterChips
            activeFilters={activeFilters}
            onToggleFilter={onToggleFilter}
          />
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-error">
              <p>{error}</p>
            </div>
          ) : query.length < 2 ? (
            <div className="p-8 text-center text-base-content/50">
              <p>Gib mindestens 2 Zeichen ein, um zu suchen.</p>
            </div>
          ) : isLoading && results.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">
              <IconLoader2 size={32} className="mx-auto mb-2 animate-spin" />
              <p>Suche läuft...</p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-base-content/50">
              <p>Keine Ergebnisse für «{query}» gefunden.</p>
            </div>
          ) : (
            <SearchResultsPanel
              results={results}
              totalCount={totalCount}
              onResultClick={handleClose}
            />
          )}
        </div>

        {/* Footer with result count */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-base-300 bg-base-200/50 text-xs text-base-content/60">
            {totalCount} Treffer gefunden
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
