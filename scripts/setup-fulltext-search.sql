-- =============================================================================
-- Comp-ACT-Diary: Full-Text Search Setup
-- =============================================================================
-- This script sets up full-text search capabilities. It is idempotent and can
-- be run after every `prisma db push` or database reset.
--
-- Usage: psql -d <database> -f scripts/setup-fulltext-search.sql
-- Or via Node.js: npx ts-node scripts/setup-fulltext-search.ts
-- =============================================================================

-- 1. Enable pg_trgm extension for typo tolerance (fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Full-Text Search Indexes (using 'simple' config for mixed DE/EN content)

-- JournalEntry: Main content searchable
CREATE INDEX IF NOT EXISTS idx_journal_entry_fts ON "JournalEntry" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(content, '') || ' ' || 
  COALESCE("aiSummary", '') || ' ' || 
  COALESCE(analysis, '')
));

-- Contact: Names and notes searchable (without emails)
CREATE INDEX IF NOT EXISTS idx_contact_fts ON "Contact" 
USING gin(to_tsvector('simple', 
  COALESCE(name, '') || ' ' || 
  COALESCE("givenName", '') || ' ' || 
  COALESCE("familyName", '') || ' ' || 
  COALESCE(nickname, '') || ' ' || 
  COALESCE(notes, '') || ' ' || 
  COALESCE(company, '') || ' ' || 
  COALESCE("jobTitle", '')
));

-- Location: Place information searchable
CREATE INDEX IF NOT EXISTS idx_location_fts ON "Location" 
USING gin(to_tsvector('simple', 
  COALESCE(name, '') || ' ' || 
  COALESCE(address, '') || ' ' || 
  COALESCE(city, '') || ' ' || 
  COALESCE(notes, '')
));

-- Taxonomy: Tags/Categories searchable
CREATE INDEX IF NOT EXISTS idx_taxonomy_fts ON "Taxonomy" 
USING gin(to_tsvector('simple', 
  COALESCE("shortName", '') || ' ' || 
  COALESCE("longName", '') || ' ' || 
  COALESCE(description, '')
));

-- Task: Tasks searchable
CREATE INDEX IF NOT EXISTS idx_task_fts ON "Task" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- ActValue: Values searchable
CREATE INDEX IF NOT EXISTS idx_act_value_fts ON "ActValue" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- ActGoal: Goals searchable
CREATE INDEX IF NOT EXISTS idx_act_goal_fts ON "ActGoal" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- Habit: Habits searchable
CREATE INDEX IF NOT EXISTS idx_habit_fts ON "Habit" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- Bookmark: Bookmarks searchable
CREATE INDEX IF NOT EXISTS idx_bookmark_fts ON "Bookmark" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(url, '')
));

-- CalendarEvent: Events searchable
CREATE INDEX IF NOT EXISTS idx_calendar_event_fts ON "CalendarEvent" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(location, '')
));

-- Consumption: Media consumption searchable
CREATE INDEX IF NOT EXISTS idx_consumption_fts ON "Consumption" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(artist, '')
));

-- 3. Trigram indexes for typo tolerance (most important tables only)

-- JournalEntry Trigram (title + content for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_journal_entry_trgm ON "JournalEntry" 
USING gin((COALESCE(title, '') || ' ' || COALESCE(content, '')) gin_trgm_ops);

-- Contact Trigram (name + nickname for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_contact_trgm ON "Contact" 
USING gin((COALESCE(name, '') || ' ' || COALESCE(nickname, '')) gin_trgm_ops);

-- Location Trigram (name + city for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_location_trgm ON "Location" 
USING gin((COALESCE(name, '') || ' ' || COALESCE(city, '')) gin_trgm_ops);

-- Task Trigram (title for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_task_trgm ON "Task" 
USING gin(COALESCE(title, '') gin_trgm_ops);

-- Habit Trigram (title for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_habit_trgm ON "Habit" 
USING gin(COALESCE(title, '') gin_trgm_ops);
