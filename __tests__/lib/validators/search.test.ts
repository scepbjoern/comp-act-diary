/**
 * Unit tests for search validators.
 * Tests Zod schema validation for search queries.
 */
import { describe, it, expect } from 'vitest';
import {
  searchQuerySchema,
  searchableEntityTypes,
  entityTypeLabels,
  entityTypeIcons,
} from '@/lib/validators/search';

describe('search validators', () => {
  describe('searchQuerySchema', () => {
    it('should validate valid query', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test query',
        types: ['journal_entry', 'contact'],
        limit: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe('test query');
        expect(result.data.types).toEqual(['journal_entry', 'contact']);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should reject query shorter than 2 characters', () => {
      const result = searchQuerySchema.safeParse({ q: 'a' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('mindestens 2 Zeichen');
      }
    });

    it('should reject query longer than 200 characters', () => {
      const result = searchQuerySchema.safeParse({ q: 'a'.repeat(201) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('maximal 200 Zeichen');
      }
    });

    it('should use default limit of 20', () => {
      const result = searchQuerySchema.safeParse({ q: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should use all types by default', () => {
      const result = searchQuerySchema.safeParse({ q: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual([...searchableEntityTypes]);
      }
    });

    it('should reject invalid entity types', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
        types: ['invalid_type'],
      });
      expect(result.success).toBe(false);
    });

    it('should coerce limit to number', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit below 1', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchableEntityTypes', () => {
    it('should have 11 entity types', () => {
      expect(searchableEntityTypes.length).toBe(11);
    });

    it('should include journal_entry', () => {
      expect(searchableEntityTypes).toContain('journal_entry');
    });

    it('should include contact', () => {
      expect(searchableEntityTypes).toContain('contact');
    });

    it('should not include day_entry (excluded per requirements)', () => {
      expect(searchableEntityTypes).not.toContain('day_entry');
    });

    it('should not include media_asset (excluded per requirements)', () => {
      expect(searchableEntityTypes).not.toContain('media_asset');
    });
  });

  describe('entityTypeLabels', () => {
    it('should have labels for all entity types', () => {
      for (const type of searchableEntityTypes) {
        expect(entityTypeLabels[type]).toBeDefined();
        expect(typeof entityTypeLabels[type]).toBe('string');
      }
    });

    it('should have German labels', () => {
      expect(entityTypeLabels.journal_entry).toBe('Journal');
      expect(entityTypeLabels.contact).toBe('Kontakte');
      expect(entityTypeLabels.location).toBe('Orte');
    });
  });

  describe('entityTypeIcons', () => {
    it('should have icons for all entity types', () => {
      for (const type of searchableEntityTypes) {
        expect(entityTypeIcons[type]).toBeDefined();
        expect(typeof entityTypeIcons[type]).toBe('string');
      }
    });

    it('should use Tabler icon names', () => {
      expect(entityTypeIcons.journal_entry).toBe('notebook');
      expect(entityTypeIcons.contact).toBe('user');
      expect(entityTypeIcons.location).toBe('map-pin');
    });
  });
});
