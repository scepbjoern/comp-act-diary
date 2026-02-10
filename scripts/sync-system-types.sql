-- scripts/sync-system-types.sql
-- Idempotent sync of system JournalEntryType records (name, icon, bgColorClass).
-- Run during Docker entrypoint or manually via psql.

UPDATE "JournalEntryType"
SET name = 'Tagesnotiz', icon = '📝', "bgColorClass" = 'bg-blue-100 dark:bg-blue-900/30'
WHERE code = 'daily_note' AND "userId" IS NULL;

UPDATE "JournalEntryType"
SET name = 'Wochenreflexion', icon = '📅', "bgColorClass" = 'bg-purple-100 dark:bg-purple-900/30'
WHERE code = 'reflection_week' AND "userId" IS NULL;

UPDATE "JournalEntryType"
SET name = 'Monatsreflexion', icon = '📆', "bgColorClass" = 'bg-purple-100 dark:bg-purple-900/30'
WHERE code = 'reflection_month' AND "userId" IS NULL;

UPDATE "JournalEntryType"
SET name = 'Allgemein', icon = '📝', "bgColorClass" = 'bg-green-100 dark:bg-green-900/30'
WHERE code = 'diary' AND "userId" IS NULL;
