/**
 * Global search component combining button and overlay.
 * This is a client component that can be used in the server-rendered layout.
 */
'use client';

import { SearchButton } from '@/components/features/search/SearchButton';
import { SearchOverlay } from '@/components/features/search/SearchOverlay';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

export function GlobalSearch() {
  const {
    query,
    results,
    totalCount,
    isLoading,
    error,
    activeFilters,
    isOpen,
    setQuery,
    toggleFilter,
    open,
    close,
    clear,
  } = useGlobalSearch();

  return (
    <>
      <SearchButton onClick={open} />
      <SearchOverlay
        isOpen={isOpen}
        query={query}
        results={results}
        totalCount={totalCount}
        isLoading={isLoading}
        error={error}
        activeFilters={activeFilters}
        onQueryChange={setQuery}
        onToggleFilter={toggleFilter}
        onClose={close}
        onClear={clear}
      />
    </>
  );
}
