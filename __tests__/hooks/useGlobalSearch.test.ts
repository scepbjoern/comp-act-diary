/**
 * Hook tests for useGlobalSearch.
 * Tests state management and debouncing behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeFilters.length).toBe(11); // All types active
  });

  it('should open and close overlay', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    expect(result.current.isOpen).toBe(false);
    
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle overlay', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should update query', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    act(() => {
      result.current.setQuery('test');
    });
    
    expect(result.current.query).toBe('test');
  });

  it('should not search if query is less than 2 characters', async () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    act(() => {
      result.current.setQuery('a');
    });
    
    // Advance timers past debounce
    act(() => {
      vi.advanceTimersByTime(400);
    });
    
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should debounce search calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ query: 'test', totalCount: 0, results: [] }),
    });
    
    const { result } = renderHook(() => useGlobalSearch());
    
    // Type quickly
    act(() => {
      result.current.setQuery('t');
    });
    act(() => {
      result.current.setQuery('te');
    });
    act(() => {
      result.current.setQuery('tes');
    });
    act(() => {
      result.current.setQuery('test');
    });
    
    // Before debounce completes
    expect(mockFetch).not.toHaveBeenCalled();
    
    // After debounce
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    
    // Should only have called fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should toggle filter', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    const initialFilterCount = result.current.activeFilters.length;
    
    act(() => {
      result.current.toggleFilter('journal_entry');
    });
    
    expect(result.current.activeFilters.length).toBe(initialFilterCount - 1);
    expect(result.current.activeFilters).not.toContain('journal_entry');
    
    act(() => {
      result.current.toggleFilter('journal_entry');
    });
    
    expect(result.current.activeFilters).toContain('journal_entry');
  });

  it('should clear search state', () => {
    const { result } = renderHook(() => useGlobalSearch());
    
    act(() => {
      result.current.setQuery('test query');
    });
    
    act(() => {
      result.current.clear();
    });
    
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() => useGlobalSearch());
    
    act(() => {
      result.current.setQuery('test');
    });
    
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });
});
