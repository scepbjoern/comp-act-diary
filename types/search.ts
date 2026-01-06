/**
 * TypeScript-Interfaces für die Volltextsuche.
 * Definiert Response-Strukturen für die Search-API.
 */
import type { SearchableEntityType } from '@/lib/validators/search';

// Single search result item
export interface SearchResultItem {
  id: string;
  type: SearchableEntityType;
  title: string;
  snippet: string; // Contains <mark> tags for highlighting
  url: string; // Target URL for navigation
  date?: string; // ISO date string if available
  rank: number; // Relevance score (higher = more relevant)
}

// Group of results for a specific entity type
export interface SearchResultGroup {
  type: SearchableEntityType;
  label: string;
  icon: string;
  count: number;
  items: SearchResultItem[];
}

// Complete search response
export interface SearchResponse {
  query: string;
  totalCount: number;
  results: SearchResultGroup[];
}

// Search error response
export interface SearchError {
  error: string;
  code: 'INVALID_QUERY' | 'UNAUTHORIZED' | 'SERVER_ERROR';
}

// Internal search parameters (used by SearchService)
export interface SearchParams {
  query: string;
  types: SearchableEntityType[];
  limit: number;
  userId: string;
}

// Raw result from PostgreSQL FTS query (before transformation)
export interface RawSearchResult {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
  date?: Date | null;
  // Additional fields depending on entity type
  slug?: string;
  localDate?: string;
}
