/**
 * Central search service for full-text search across all entity types.
 * Uses PostgreSQL FTS with pg_trgm for typo tolerance.
 */
import { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/core/prisma'
import { logger } from '@/lib/core/logger';
import {
  sanitizeSearchTerm,
  buildTsQuery,
  buildHeadlineOptions,
  FTS_CONFIG,
  SIMILARITY_THRESHOLD,
} from './searchQueryBuilder';
import type {
  SearchableEntityType,
} from '@/lib/validators/search';
import type {
  SearchParams,
  SearchResponse,
  SearchResultGroup,
  SearchResultItem,
} from '@/types/search';

// Re-export for convenience
export type { SearchParams, SearchResponse, SearchResultGroup, SearchResultItem };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

interface JournalEntryRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
  localDate: string;
}

interface ContactRaw {
  id: string;
  name: string | null;
  slug: string;
  snippet: string;
  rank: number;
}

interface LocationRaw {
  id: string;
  name: string | null;
  slug: string;
  snippet: string;
  rank: number;
}

interface TaxonomyRaw {
  id: string;
  shortName: string | null;
  longName: string | null;
  snippet: string;
  rank: number;
}

interface TaskRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
  dueDate: Date | null;
}

interface ActValueRaw {
  id: string;
  title: string | null;
  slug: string;
  snippet: string;
  rank: number;
}

interface ActGoalRaw {
  id: string;
  title: string | null;
  slug: string;
  snippet: string;
  rank: number;
}

interface HabitRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
}

interface BookmarkRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
}

interface CalendarEventRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
  startedAt: Date | null;
}

interface ConsumptionRaw {
  id: string;
  title: string | null;
  snippet: string;
  rank: number;
  occurredAt: Date | null;
}

// =============================================================================
// SEARCH SERVICE CLASS
// =============================================================================

export class SearchService {
  /**
   * Main search method: searches across all specified entity types.
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const { query, types, limit, userId } = params;
    const sanitized = sanitizeSearchTerm(query);
    
    if (!sanitized || sanitized.length < 2) {
      return { query, totalCount: 0, results: [] };
    }

    // Import labels and icons dynamically to avoid circular deps
    const { entityTypeLabels, entityTypeIcons } = await import('@/lib/validators/search');

    // Run searches in parallel for all requested types
    const searchPromises: Promise<SearchResultGroup | null>[] = [];

    for (const type of types) {
      searchPromises.push(
        this.searchEntityType(type, sanitized, userId, limit, entityTypeLabels, entityTypeIcons)
      );
    }

    const results = await Promise.all(searchPromises);
    
    // Filter out null results and empty groups
    const validResults = results.filter(
      (r): r is SearchResultGroup => r !== null && r.count > 0
    );

    // Sort by total count (most results first)
    validResults.sort((a, b) => b.count - a.count);

    const totalCount = validResults.reduce((sum, r) => sum + r.count, 0);

    return {
      query,
      totalCount,
      results: validResults,
    };
  }

  /**
   * Routes to the correct search method based on entity type.
   */
  private async searchEntityType(
    type: SearchableEntityType,
    query: string,
    userId: string,
    limit: number,
    labels: Record<SearchableEntityType, string>,
    icons: Record<SearchableEntityType, string>
  ): Promise<SearchResultGroup | null> {
    try {
      let items: SearchResultItem[] = [];

      switch (type) {
        case 'journal_entry':
          items = await this.searchJournalEntries(query, userId, limit);
          break;
        case 'contact':
          items = await this.searchContacts(query, userId, limit);
          break;
        case 'location':
          items = await this.searchLocations(query, userId, limit);
          break;
        case 'taxonomy':
          items = await this.searchTaxonomies(query, userId, limit);
          break;
        case 'task':
          items = await this.searchTasks(query, userId, limit);
          break;
        case 'act_value':
          items = await this.searchActValues(query, userId, limit);
          break;
        case 'act_goal':
          items = await this.searchActGoals(query, userId, limit);
          break;
        case 'habit':
          items = await this.searchHabits(query, userId, limit);
          break;
        case 'bookmark':
          items = await this.searchBookmarks(query, userId, limit);
          break;
        case 'calendar_event':
          items = await this.searchCalendarEvents(query, userId, limit);
          break;
        case 'consumption':
          items = await this.searchConsumptions(query, userId, limit);
          break;
        default:
          return null;
      }

      if (items.length === 0) return null;

      return {
        type,
        label: labels[type],
        icon: icons[type],
        count: items.length,
        items,
      };
    } catch (error) {
      logger.error({ type, error }, 'Search error');
      return null;
    }
  }

  // ===========================================================================
  // JOURNAL ENTRIES
  // ===========================================================================

  async searchJournalEntries(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<JournalEntryRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        j.id,
        j.title,
        t."localDate",
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(j.content, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(j.title, '') || ' ' || 
              COALESCE(j.content, '') || ' ' || 
              COALESCE(j."aiSummary", '') || ' ' || 
              COALESCE(j.analysis, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(j.title, '') || ' ' || COALESCE(j.content, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "JournalEntry" j
      JOIN "TimeBox" t ON j."timeBoxId" = t.id
      CROSS JOIN query
      WHERE 
        j."userId" = ${userId}
        AND j."isSensitive" = false
        AND j."deletedAt" IS NULL
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(j.title, '') || ' ' || 
            COALESCE(j.content, '') || ' ' || 
            COALESCE(j."aiSummary", '') || ' ' || 
            COALESCE(j.analysis, '')
          ) @@ query.q
          OR similarity(
            COALESCE(j.title, '') || ' ' || COALESCE(j.content, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'journal_entry' as const,
      title: r.title || 'Tagebucheintrag',
      snippet: r.snippet || '',
      url: `/?date=${r.localDate}&entry=${r.id}`,
      date: r.localDate,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // CONTACTS
  // ===========================================================================

  async searchContacts(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<ContactRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        c.id,
        c.name,
        c.slug,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(c.name, '') || ' - ' || COALESCE(c.notes, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(c.name, '') || ' ' || 
              COALESCE(c."givenName", '') || ' ' || 
              COALESCE(c."familyName", '') || ' ' || 
              COALESCE(c.nickname, '') || ' ' || 
              COALESCE(c.notes, '') || ' ' || 
              COALESCE(c.company, '') || ' ' || 
              COALESCE(c."jobTitle", '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(c.name, '') || ' ' || COALESCE(c.nickname, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Contact" c
      CROSS JOIN query
      WHERE 
        c."userId" = ${userId}
        AND c."isArchived" = false
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(c.name, '') || ' ' || 
            COALESCE(c."givenName", '') || ' ' || 
            COALESCE(c."familyName", '') || ' ' || 
            COALESCE(c.nickname, '') || ' ' || 
            COALESCE(c.notes, '') || ' ' || 
            COALESCE(c.company, '') || ' ' || 
            COALESCE(c."jobTitle", '')
          ) @@ query.q
          OR similarity(
            COALESCE(c.name, '') || ' ' || COALESCE(c.nickname, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'contact' as const,
      title: r.name || 'Kontakt',
      snippet: r.snippet || '',
      url: `/prm/${r.slug}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // LOCATIONS
  // ===========================================================================

  async searchLocations(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<LocationRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        l.id,
        l.name,
        l.slug,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(l.name, '') || ' - ' || COALESCE(l.city, '') || ' ' || COALESCE(l.address, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(l.name, '') || ' ' || 
              COALESCE(l.address, '') || ' ' || 
              COALESCE(l.city, '') || ' ' || 
              COALESCE(l.notes, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(l.name, '') || ' ' || COALESCE(l.city, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Location" l
      CROSS JOIN query
      WHERE 
        l."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(l.name, '') || ' ' || 
            COALESCE(l.address, '') || ' ' || 
            COALESCE(l.city, '') || ' ' || 
            COALESCE(l.notes, '')
          ) @@ query.q
          OR similarity(
            COALESCE(l.name, '') || ' ' || COALESCE(l.city, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'location' as const,
      title: r.name || 'Ort',
      snippet: r.snippet || '',
      url: `/locations/${r.slug}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // TAXONOMIES (Tags)
  // ===========================================================================

  async searchTaxonomies(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<TaxonomyRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        t.id,
        t."shortName",
        t."longName",
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(t."shortName", '') || ' - ' || COALESCE(t."longName", '') || ' ' || COALESCE(t.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(t."shortName", '') || ' ' || 
              COALESCE(t."longName", '') || ' ' || 
              COALESCE(t.description, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(t."shortName", '') || ' ' || COALESCE(t."longName", ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Taxonomy" t
      CROSS JOIN query
      WHERE 
        t."userId" = ${userId}
        AND t."isArchived" = false
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(t."shortName", '') || ' ' || 
            COALESCE(t."longName", '') || ' ' || 
            COALESCE(t.description, '')
          ) @@ query.q
          OR similarity(
            COALESCE(t."shortName", '') || ' ' || COALESCE(t."longName", ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'taxonomy' as const,
      title: r.shortName || r.longName || 'Tag',
      snippet: r.snippet || '',
      url: `/settings/tags?highlight=${r.id}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // TASKS
  // ===========================================================================

  async searchTasks(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<TaskRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        t.id,
        t.title,
        t."dueDate",
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(t.title, '') || ' - ' || COALESCE(t.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(t.title, '') || ' ' || 
              COALESCE(t.description, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(t.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Task" t
      CROSS JOIN query
      WHERE 
        t."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(t.title, '') || ' ' || 
            COALESCE(t.description, '')
          ) @@ query.q
          OR similarity(
            COALESCE(t.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'task' as const,
      title: r.title || 'Aufgabe',
      snippet: r.snippet || '',
      url: `/tasks?highlight=${r.id}`,
      date: r.dueDate?.toISOString().split('T')[0],
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // ACT VALUES
  // ===========================================================================

  async searchActValues(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<ActValueRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        v.id,
        v.title,
        v.slug,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(v.title, '') || ' - ' || COALESCE(v.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(v.title, '') || ' ' || 
              COALESCE(v.description, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(v.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "ActValue" v
      CROSS JOIN query
      WHERE 
        v."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(v.title, '') || ' ' || 
            COALESCE(v.description, '')
          ) @@ query.q
          OR similarity(
            COALESCE(v.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'act_value' as const,
      title: r.title || 'Wert',
      snippet: r.snippet || '',
      url: `/values/${r.slug}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // ACT GOALS
  // ===========================================================================

  async searchActGoals(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<ActGoalRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        g.id,
        g.title,
        g.slug,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(g.title, '') || ' - ' || COALESCE(g.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(g.title, '') || ' ' || 
              COALESCE(g.description, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(g.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "ActGoal" g
      CROSS JOIN query
      WHERE 
        g."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(g.title, '') || ' ' || 
            COALESCE(g.description, '')
          ) @@ query.q
          OR similarity(
            COALESCE(g.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'act_goal' as const,
      title: r.title || 'Ziel',
      snippet: r.snippet || '',
      url: `/goals/${r.slug}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // HABITS
  // ===========================================================================

  async searchHabits(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<HabitRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        h.id,
        h.title,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(h.title, '') || ' - ' || COALESCE(h.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(h.title, '') || ' ' || 
              COALESCE(h.description, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(h.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Habit" h
      CROSS JOIN query
      WHERE 
        h."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(h.title, '') || ' ' || 
            COALESCE(h.description, '')
          ) @@ query.q
          OR similarity(
            COALESCE(h.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'habit' as const,
      title: r.title || 'Gewohnheit',
      snippet: r.snippet || '',
      url: `/habits?highlight=${r.id}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // BOOKMARKS
  // ===========================================================================

  async searchBookmarks(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<BookmarkRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        b.id,
        b.title,
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(b.title, '') || ' - ' || COALESCE(b.description, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(b.title, '') || ' ' || 
              COALESCE(b.description, '') || ' ' ||
              COALESCE(b.url, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(b.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Bookmark" b
      CROSS JOIN query
      WHERE 
        b."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(b.title, '') || ' ' || 
            COALESCE(b.description, '') || ' ' ||
            COALESCE(b.url, '')
          ) @@ query.q
          OR similarity(
            COALESCE(b.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'bookmark' as const,
      title: r.title || 'Lesezeichen',
      snippet: r.snippet || '',
      url: `/bookmarks?highlight=${r.id}`,
      rank: r.rank,
    }));
  }

  // ===========================================================================
  // CALENDAR EVENTS
  // ===========================================================================

  async searchCalendarEvents(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<CalendarEventRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        e.id,
        e.title,
        e."startedAt",
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(e.title, '') || ' - ' || COALESCE(e.description, '') || ' ' || COALESCE(e.location, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(e.title, '') || ' ' || 
              COALESCE(e.description, '') || ' ' ||
              COALESCE(e.location, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(e.title, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "CalendarEvent" e
      CROSS JOIN query
      WHERE 
        e."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(e.title, '') || ' ' || 
            COALESCE(e.description, '') || ' ' ||
            COALESCE(e.location, '')
          ) @@ query.q
          OR similarity(
            COALESCE(e.title, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => {
      const dateStr = r.startedAt?.toISOString().split('T')[0];
      return {
        id: r.id,
        type: 'calendar_event' as const,
        title: r.title || 'Termin',
        snippet: r.snippet || '',
        url: dateStr ? `/?date=${dateStr}&event=${r.id}` : `/?event=${r.id}`,
        date: dateStr,
        rank: r.rank,
      };
    });
  }

  // ===========================================================================
  // CONSUMPTION (Media)
  // ===========================================================================

  async searchConsumptions(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const prisma = getPrisma();
    const tsQuery = buildTsQuery(query);
    const headlineOpts = buildHeadlineOptions();

    const results = await prisma.$queryRaw<ConsumptionRaw[]>`
      WITH query AS (SELECT to_tsquery('${Prisma.raw(FTS_CONFIG)}', ${tsQuery}) AS q)
      SELECT 
        c.id,
        c.title,
        c."occurredAt",
        ts_headline(
          '${Prisma.raw(FTS_CONFIG)}',
          COALESCE(c.title, '') || ' - ' || COALESCE(c.artist, ''),
          query.q,
          ${headlineOpts}
        ) AS snippet,
        (
          COALESCE(ts_rank(
            to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
              COALESCE(c.title, '') || ' ' || 
              COALESCE(c.artist, '')
            ),
            query.q
          ), 0) * 0.7 +
          COALESCE(similarity(
            COALESCE(c.title, '') || ' ' || COALESCE(c.artist, ''),
            ${query}
          ), 0) * 0.3
        ) AS rank
      FROM "Consumption" c
      CROSS JOIN query
      WHERE 
        c."userId" = ${userId}
        AND (
          to_tsvector('${Prisma.raw(FTS_CONFIG)}', 
            COALESCE(c.title, '') || ' ' || 
            COALESCE(c.artist, '')
          ) @@ query.q
          OR similarity(
            COALESCE(c.title, '') || ' ' || COALESCE(c.artist, ''),
            ${query}
          ) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => {
      const dateStr = r.occurredAt?.toISOString().split('T')[0];
      return {
        id: r.id,
        type: 'consumption' as const,
        title: r.title || 'Medium',
        snippet: r.snippet || '',
        url: dateStr ? `/?date=${dateStr}&consumption=${r.id}` : `/bookmarks?highlight=${r.id}`,
        date: dateStr,
        rank: r.rank,
      };
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}
