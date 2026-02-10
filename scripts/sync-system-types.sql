-- scripts/sync-system-types.sql
-- Idempotent sync of system JournalEntryType + JournalTemplate records.
-- Run during Docker entrypoint or manually via psql.
-- Safe to run multiple times – uses conditional INSERT ... WHERE NOT EXISTS + UPDATE.

-- =============================================================================
-- 1. SYSTEM TYPES (create if missing, then update all)
-- =============================================================================
-- NOTE: PostgreSQL treats NULL as always-distinct in unique constraints,
-- so ON CONFLICT ("userId", code) won't match rows with userId IS NULL.
-- We use INSERT ... WHERE NOT EXISTS + UPDATE instead.

-- 1a. Insert missing system types (one per statement for correct per-row idempotency)
INSERT INTO "JournalEntryType" (id, code, name, icon, "bgColorClass", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'daily_note', 'Tagesnotiz', '📝', 'bg-blue-100 dark:bg-blue-900/30', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "JournalEntryType" WHERE code = 'daily_note' AND "userId" IS NULL);

INSERT INTO "JournalEntryType" (id, code, name, icon, "bgColorClass", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'reflection_week', 'Wochenreflexion', '📅', 'bg-purple-100 dark:bg-purple-900/30', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "JournalEntryType" WHERE code = 'reflection_week' AND "userId" IS NULL);

INSERT INTO "JournalEntryType" (id, code, name, icon, "bgColorClass", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'reflection_month', 'Monatsreflexion', '📆', 'bg-purple-100 dark:bg-purple-900/30', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "JournalEntryType" WHERE code = 'reflection_month' AND "userId" IS NULL);

INSERT INTO "JournalEntryType" (id, code, name, icon, "bgColorClass", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'diary', 'Allgemein', '📝', 'bg-green-100 dark:bg-green-900/30', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "JournalEntryType" WHERE code = 'diary' AND "userId" IS NULL);

-- 1b. Update existing system types (name, icon, bgColorClass)
UPDATE "JournalEntryType" SET name = 'Tagesnotiz',      icon = '📝', "bgColorClass" = 'bg-blue-100 dark:bg-blue-900/30',   "updatedAt" = now() WHERE code = 'daily_note'       AND "userId" IS NULL;
UPDATE "JournalEntryType" SET name = 'Wochenreflexion',  icon = '📅', "bgColorClass" = 'bg-purple-100 dark:bg-purple-900/30', "updatedAt" = now() WHERE code = 'reflection_week'  AND "userId" IS NULL;
UPDATE "JournalEntryType" SET name = 'Monatsreflexion',  icon = '📆', "bgColorClass" = 'bg-purple-100 dark:bg-purple-900/30', "updatedAt" = now() WHERE code = 'reflection_month' AND "userId" IS NULL;
UPDATE "JournalEntryType" SET name = 'Allgemein',        icon = '📝', "bgColorClass" = 'bg-green-100 dark:bg-green-900/30',   "updatedAt" = now() WHERE code = 'diary'            AND "userId" IS NULL;

-- =============================================================================
-- 2. SYSTEM TEMPLATES (create if missing, skip if already exists)
-- =============================================================================

-- Wochenreflexion (Standard)
INSERT INTO "JournalTemplate" (id, name, description, "typeId", fields, "aiConfig", origin, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Wochenreflexion (Standard)',
  'Strukturierte Reflexion mit Veränderungen, Dankbarkeit und Vorsätzen',
  t.id,
  '[{"id":"changed","label":"Was hat sich verändert?","icon":"🔄","type":"textarea","order":0,"required":true},{"id":"gratitude","label":"Wofür bin ich dankbar?","icon":"🙏","type":"textarea","order":1,"required":true},{"id":"vows","label":"Meine Vorsätze","icon":"🎯","type":"textarea","order":2,"required":false},{"id":"remarks","label":"Sonstige Bemerkungen","icon":"💭","type":"textarea","order":3,"required":false}]'::jsonb,
  '{"contentModel":"gpt-4o-mini","titleModel":"gpt-4o-mini","summaryModel":"gpt-4o-mini","analysisModel":"gpt-4o","segmentationModel":"gpt-4o-mini"}'::jsonb,
  'SYSTEM',
  now(),
  now()
FROM "JournalEntryType" t
WHERE t.code = 'reflection_week' AND t."userId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "JournalTemplate" tmpl
    WHERE tmpl.name = 'Wochenreflexion (Standard)' AND tmpl."userId" IS NULL
  );

-- Einfaches Tagebuch
INSERT INTO "JournalTemplate" (id, name, description, "typeId", fields, "aiConfig", origin, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Einfaches Tagebuch',
  'Minimales Template für freies Schreiben ohne Struktur',
  t.id,
  '[{"id":"content","type":"textarea","order":0,"required":false}]'::jsonb,
  '{"contentModel":"gpt-4o-mini","titleModel":"gpt-4o-mini"}'::jsonb,
  'SYSTEM',
  now(),
  now()
FROM "JournalEntryType" t
WHERE t.code = 'diary' AND t."userId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "JournalTemplate" tmpl
    WHERE tmpl.name = 'Einfaches Tagebuch' AND tmpl."userId" IS NULL
  );

-- Monatsreflexion
INSERT INTO "JournalTemplate" (id, name, description, "typeId", fields, "aiConfig", origin, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Monatsreflexion',
  'Rückblick auf den Monat mit Highlights und Learnings',
  t.id,
  '[{"id":"highlights","label":"Highlights des Monats","icon":"✨","type":"textarea","order":0,"required":true},{"id":"challenges","label":"Herausforderungen","icon":"💪","type":"textarea","order":1,"required":false},{"id":"learnings","label":"Was habe ich gelernt?","icon":"📚","type":"textarea","order":2,"required":false},{"id":"goals","label":"Ziele für nächsten Monat","icon":"🎯","type":"textarea","order":3,"required":false}]'::jsonb,
  '{"contentModel":"gpt-4o-mini","titleModel":"gpt-4o-mini","summaryModel":"gpt-4o-mini","analysisModel":"gpt-4o","segmentationModel":"gpt-4o-mini"}'::jsonb,
  'SYSTEM',
  now(),
  now()
FROM "JournalEntryType" t
WHERE t.code = 'reflection_month' AND t."userId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "JournalTemplate" tmpl
    WHERE tmpl.name = 'Monatsreflexion' AND tmpl."userId" IS NULL
  );
