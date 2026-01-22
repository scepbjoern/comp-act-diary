/**
 * Hook for global search functionality.
 * Handles state management, debouncing, and API calls for search.
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchResponse, SearchResultGroup } from '@/types/search';
import type { SearchableEntityType } from '@/lib/validators/search';
import { searchableEntityTypes } from '@/lib/validators/search';

interface UseGlobalSearchState {
  query: string;
  results: SearchResultGroup[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  activeFilters: SearchableEntityType[];
  isOpen: boolean;
}

interface UseGlobalSearchReturn extends UseGlobalSearchState {
  setQuery: (query: string) => void;
  toggleFilter: (type: SearchableEntityType) => void;
  setFilters: (types: SearchableEntityType[]) => void;
  clearFilters: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  clear: () => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [state, setState] = useState<UseGlobalSearchState>({
    query: '',
    results: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    activeFilters: [...searchableEntityTypes], // All types active by default
    isOpen: false,
  });

  // Refs for debouncing and cancellation
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Execute search API call
  const executeSearch = useCallback(async (query: string, filters: SearchableEntityType[]) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query is too short
    if (query.length < MIN_QUERY_LENGTH) {
      setState(prev => ({
        ...prev,
        results: [],
        totalCount: 0,
        isLoading: false,
        error: null,
      }));
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Build query string
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('limit', '20');
      filters.forEach(type => params.append('types', type));

      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Suche fehlgeschlagen');
      }

      const data: SearchResponse = await response.json();

      setState(prev => ({
        ...prev,
        results: data.results,
        totalCount: data.totalCount,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        results: [],
        totalCount: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Suche fehlgeschlagen',
      }));
    }
  }, []);

  // Debounced search trigger
  const triggerSearch = useCallback((query: string, filters: SearchableEntityType[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void executeSearch(query, filters);
    }, DEBOUNCE_MS);
  }, [executeSearch]);

  // Set query and trigger search
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));
    triggerSearch(query, state.activeFilters);
  }, [triggerSearch, state.activeFilters]);

  // Toggle a single filter
  const toggleFilter = useCallback((type: SearchableEntityType) => {
    setState(prev => {
      const isActive = prev.activeFilters.includes(type);
      const newFilters = isActive
        ? prev.activeFilters.filter(t => t !== type)
        : [...prev.activeFilters, type];
      
      // Trigger new search with updated filters
      if (prev.query.length >= MIN_QUERY_LENGTH) {
        triggerSearch(prev.query, newFilters);
      }
      
      return { ...prev, activeFilters: newFilters };
    });
  }, [triggerSearch]);

  // Set all filters at once
  const setFilters = useCallback((types: SearchableEntityType[]) => {
    setState(prev => {
      if (prev.query.length >= MIN_QUERY_LENGTH) {
        triggerSearch(prev.query, types);
      }
      return { ...prev, activeFilters: types };
    });
  }, [triggerSearch]);

  // Clear all filters (show all types)
  const clearFilters = useCallback(() => {
    setFilters([...searchableEntityTypes]);
  }, [setFilters]);

  // Open search overlay
  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  // Close search overlay
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Toggle search overlay
  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // Clear search state
  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    setState(prev => ({
      ...prev,
      query: '',
      results: [],
      totalCount: 0,
      isLoading: false,
      error: null,
    }));
  }, []);

  return {
    ...state,
    setQuery,
    toggleFilter,
    setFilters,
    clearFilters,
    open,
    close,
    toggle,
    clear,
  };
}
