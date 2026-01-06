/**
 * Unit tests for SearchQueryBuilder.
 * Tests query sanitization, tsquery construction, and helper functions.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchTerm,
  buildTsQuery,
  buildHeadlineOptions,
  escapeLikePattern,
  SIMILARITY_THRESHOLD,
  FTS_CONFIG,
} from '@/lib/services/searchQueryBuilder';

describe('searchQueryBuilder', () => {
  describe('sanitizeSearchTerm', () => {
    it('should remove special tsquery characters', () => {
      expect(sanitizeSearchTerm('test & query')).toBe('test query');
      expect(sanitizeSearchTerm('hello | world')).toBe('hello world');
      expect(sanitizeSearchTerm("it's a test")).toBe('it s a test');
      expect(sanitizeSearchTerm('test!')).toBe('test');
      expect(sanitizeSearchTerm('(test)')).toBe('test');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeSearchTerm('hello    world')).toBe('hello world');
      expect(sanitizeSearchTerm('  trimmed  ')).toBe('trimmed');
    });

    it('should handle empty strings', () => {
      expect(sanitizeSearchTerm('')).toBe('');
      expect(sanitizeSearchTerm('   ')).toBe('');
    });

    it('should preserve normal characters', () => {
      expect(sanitizeSearchTerm('Meeting mit Anna')).toBe('Meeting mit Anna');
      expect(sanitizeSearchTerm('Café Zürich')).toBe('Café Zürich');
    });
  });

  describe('buildTsQuery', () => {
    it('should build prefix query for single word', () => {
      expect(buildTsQuery('test')).toBe('test:*');
    });

    it('should build AND query for multiple words', () => {
      expect(buildTsQuery('hello world')).toBe('hello:* & world:*');
    });

    it('should handle special characters', () => {
      expect(buildTsQuery('test & query')).toBe('test:* & query:*');
    });

    it('should return empty string for empty input', () => {
      expect(buildTsQuery('')).toBe('');
      expect(buildTsQuery('   ')).toBe('');
    });

    it('should allow disabling prefix matching', () => {
      expect(buildTsQuery('test', false)).toBe('test');
      expect(buildTsQuery('hello world', false)).toBe('hello & world');
    });
  });

  describe('buildHeadlineOptions', () => {
    it('should return default options', () => {
      const options = buildHeadlineOptions();
      expect(options).toContain('StartSel=<mark>');
      expect(options).toContain('StopSel=</mark>');
      expect(options).toContain('MaxWords=35');
      expect(options).toContain('MinWords=15');
    });

    it('should accept custom word limits', () => {
      const options = buildHeadlineOptions(50, 20);
      expect(options).toContain('MaxWords=50');
      expect(options).toContain('MinWords=20');
    });
  });

  describe('escapeLikePattern', () => {
    it('should escape percent signs', () => {
      expect(escapeLikePattern('100%')).toBe('100\\%');
    });

    it('should escape underscores', () => {
      expect(escapeLikePattern('hello_world')).toBe('hello\\_world');
    });

    it('should escape backslashes', () => {
      expect(escapeLikePattern('path\\to')).toBe('path\\\\to');
    });

    it('should handle multiple escapes', () => {
      expect(escapeLikePattern('50%_test')).toBe('50\\%\\_test');
    });
  });

  describe('constants', () => {
    it('should have correct similarity threshold', () => {
      expect(SIMILARITY_THRESHOLD).toBe(0.2);
    });

    it('should use simple FTS config', () => {
      expect(FTS_CONFIG).toBe('simple');
    });
  });
});
