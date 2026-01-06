/**
 * Helper functions for building PostgreSQL Full-Text Search queries.
 * Handles query sanitization, tsquery construction, and similarity search with pg_trgm.
 */

// Characters that need escaping in tsquery
const TSQUERY_SPECIAL_CHARS = /[&|!():'\\*<>]/g;

/**
 * Sanitizes user input for safe use in PostgreSQL tsquery.
 * Removes or escapes special characters that could break the query.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(TSQUERY_SPECIAL_CHARS, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Builds a PostgreSQL tsquery string from user input.
 * Supports multiple words connected with AND (&) operator.
 * 
 * @param searchTerm - Raw user input
 * @param usePrefix - If true, adds :* for prefix matching (default: true)
 * @returns Formatted tsquery string ready for plainto_tsquery or to_tsquery
 */
export function buildTsQuery(searchTerm: string, usePrefix: boolean = true): string {
  const sanitized = sanitizeSearchTerm(searchTerm);
  
  if (!sanitized) return '';
  
  const words = sanitized.split(' ').filter(w => w.length > 0);
  
  if (words.length === 0) return '';
  
  // For prefix search, add :* to each word
  if (usePrefix) {
    return words.map(w => `${w}:*`).join(' & ');
  }
  
  return words.join(' & ');
}

/**
 * Builds ts_headline options string for snippet generation.
 * 
 * @param maxWords - Maximum words in snippet (default: 35)
 * @param minWords - Minimum words in snippet (default: 15)
 * @returns Options string for ts_headline
 */
export function buildHeadlineOptions(
  maxWords: number = 35,
  minWords: number = 15
): string {
  return `StartSel=<mark>, StopSel=</mark>, MaxWords=${maxWords}, MinWords=${minWords}, MaxFragments=3`;
}

/**
 * Generates the SQL fragment for combined FTS + trigram ranking.
 * Higher weight for exact FTS matches, lower weight for fuzzy matches.
 * 
 * @param tsvectorExpr - The tsvector expression (e.g., "to_tsvector('simple', title)")
 * @param textExpr - The text expression for trigram similarity (e.g., "title || ' ' || content")
 * @returns SQL fragment for combined ranking
 */
export function buildCombinedRankExpression(
  tsvectorExpr: string,
  textExpr: string
): string {
  // Combine ts_rank (0-1 typically) with similarity (0-1) 
  // Weight FTS higher (0.7) than trigram (0.3) for better precision
  return `(
    COALESCE(ts_rank(${tsvectorExpr}, query), 0) * 0.7 +
    COALESCE(similarity(${textExpr}, $1), 0) * 0.3
  )`;
}

/**
 * Escapes a string for safe use in SQL LIKE patterns.
 */
export function escapeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Minimum similarity threshold for pg_trgm matching.
 * Values range from 0 to 1, where 1 is exact match.
 * 0.3 is the PostgreSQL default, we use 0.2 for more fuzzy results.
 */
export const SIMILARITY_THRESHOLD = 0.2;

/**
 * Configuration for PostgreSQL text search.
 * Using 'simple' for mixed German/English content.
 */
export const FTS_CONFIG = 'simple';

/**
 * Builds a complete search condition combining FTS and trigram.
 * Returns an object with the WHERE clause components.
 */
export interface SearchCondition {
  // The WHERE clause for matching (use with OR)
  ftsCondition: string;
  trigramCondition: string;
  // The ORDER BY expression for ranking
  rankExpression: string;
  // The snippet generation expression
  headlineExpression: string;
}

/**
 * Creates search condition components for a given table and columns.
 * 
 * @param columns - Array of column names to search
 * @param config - FTS configuration (default: 'simple')
 */
export function buildSearchConditions(
  columns: string[],
  config: string = FTS_CONFIG
): SearchCondition {
  // Build the combined text expression
  const textExpr = columns
    .map(col => `COALESCE(${col}, '')`)
    .join(" || ' ' || ");
  
  // Build tsvector expression
  const tsvectorExpr = `to_tsvector('${config}', ${textExpr})`;
  
  // FTS condition: tsvector matches tsquery
  const ftsCondition = `${tsvectorExpr} @@ query`;
  
  // Trigram condition: similarity above threshold
  const trigramCondition = `similarity(${textExpr}, $1) > ${SIMILARITY_THRESHOLD}`;
  
  // Combined rank expression
  const rankExpression = `(
    COALESCE(ts_rank(${tsvectorExpr}, query), 0) * 0.7 +
    COALESCE(similarity(${textExpr}, $1), 0) * 0.3
  ) AS rank`;
  
  // Headline expression for the first text column (usually main content)
  const mainColumn = columns.length > 1 ? columns[1] : columns[0]; // Prefer content over title
  const headlineExpression = `ts_headline(
    '${config}',
    COALESCE(${mainColumn}, ''),
    query,
    '${buildHeadlineOptions()}'
  ) AS snippet`;
  
  return {
    ftsCondition,
    trigramCondition,
    rankExpression,
    headlineExpression,
  };
}
