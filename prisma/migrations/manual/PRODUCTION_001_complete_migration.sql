-- =============================================================================
-- PRODUKTIONS-MIGRATION: Komplette Datenmigration in einem Script
-- =============================================================================
-- WICHTIG: 
-- 1. VOR Ausführung Backup erstellen!
-- 2. Dieses Script MUSS VOR "prisma db push" ausgeführt werden!
-- 3. Ausführung: psql -d <database> -f PRODUCTION_001_complete_migration.sql
-- =============================================================================

-- Transaktionsstart
BEGIN;

-- =============================================================================
-- TEIL 1: Neue Tabellen erstellen (parallel zu alten)
-- =============================================================================

-- Entity-Registry erstellen
CREATE TABLE IF NOT EXISTS "Entity" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Entity_pkey" PRIMARY KEY (id)
);

-- TimeBox erstellen
CREATE TABLE IF NOT EXISTS "TimeBox" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  kind TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  "localDate" TEXT,
  title TEXT,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeBox_pkey" PRIMARY KEY (id)
);

-- JournalEntryType erstellen
CREATE TABLE IF NOT EXISTS "JournalEntryType" (
  id TEXT NOT NULL,
  "userId" TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  "defaultTemplateId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntryType_pkey" PRIMARY KEY (id)
);

-- JournalEntry erstellen
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "templateId" TEXT,
  "timeBoxId" TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  "aiSummary" TEXT,
  "isSensitive" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY (id)
);

-- MediaAsset erstellen
CREATE TABLE IF NOT EXISTS "MediaAsset" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "filePath" TEXT,
  "thumbnailData" BYTEA,
  "mimeType" TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration DOUBLE PRECISION,
  "externalProvider" TEXT,
  "externalId" TEXT,
  "externalUrl" TEXT,
  "thumbnailUrl" TEXT,
  "capturedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY (id)
);

-- MediaAttachment erstellen
CREATE TABLE IF NOT EXISTS "MediaAttachment" (
  id TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ATTACHMENT',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "timeBoxId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY (id)
);

-- =============================================================================
-- TEIL 2: Mapping-Tabellen erstellen
-- =============================================================================

CREATE TEMP TABLE day_entry_mapping AS
SELECT 
  de.id AS old_day_entry_id,
  gen_random_uuid()::text AS new_time_box_id,
  de."userId",
  de.date
FROM "DayEntry" de;

CREATE TEMP TABLE journal_entry_mapping AS
SELECT 
  dn.id AS old_day_note_id,
  gen_random_uuid()::text AS new_journal_entry_id,
  de."userId"
FROM "DayNote" dn
JOIN "DayEntry" de ON de.id = dn."dayEntryId";

-- =============================================================================
-- TEIL 3: Entity-Registry für Habits
-- =============================================================================

INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'HABIT', NOW(), NOW() FROM "Habit"
WHERE "userId" IS NOT NULL;

-- =============================================================================
-- TEIL 4: TimeBox erstellen (aus DayEntry.date)
-- =============================================================================

INSERT INTO "TimeBox" (id, "userId", kind, "startAt", "endAt", timezone, "localDate", "createdAt", "updatedAt")
SELECT 
  dem.new_time_box_id,
  dem."userId",
  'DAY',
  dem.date,
  dem.date + INTERVAL '1 day',
  'Europe/Zurich',
  TO_CHAR(dem.date, 'YYYY-MM-DD'),
  de."createdAt",
  NOW()
FROM day_entry_mapping dem
JOIN "DayEntry" de ON de.id = dem.old_day_entry_id;

-- Custom TimeBoxes für Phase/CareCategory
WITH phase_ranges AS (
  SELECT 
    "userId", phase, "careCategory", date,
    SUM(CASE WHEN prev_phase IS DISTINCT FROM phase 
             OR prev_care IS DISTINCT FROM "careCategory" 
        THEN 1 ELSE 0 END) OVER (PARTITION BY "userId" ORDER BY date) AS grp
  FROM (
    SELECT 
      "userId", phase, "careCategory", date,
      LAG(phase) OVER (PARTITION BY "userId" ORDER BY date) AS prev_phase,
      LAG("careCategory") OVER (PARTITION BY "userId" ORDER BY date) AS prev_care
    FROM "DayEntry"
  ) sub
),
phase_summary AS (
  SELECT "userId", phase, "careCategory", grp,
    MIN(date) AS start_date, MAX(date) AS end_date
  FROM phase_ranges
  GROUP BY "userId", phase, "careCategory", grp
)
INSERT INTO "TimeBox" (id, "userId", kind, "startAt", "endAt", timezone, title, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text, "userId", 'CUSTOM', start_date, end_date + INTERVAL '1 day', 'Europe/Zurich',
  'Darmkur ' || 
    CASE phase WHEN 'PHASE_1' THEN 'Phase 1' WHEN 'PHASE_2' THEN 'Phase 2' WHEN 'PHASE_3' THEN 'Phase 3' END || ' ' ||
    CASE "careCategory" WHEN 'SANFT' THEN 'Sanft' WHEN 'MEDIUM' THEN 'Medium' WHEN 'INTENSIV' THEN 'Intensiv' END,
  NOW(), NOW()
FROM phase_summary;

-- DayEntry-TimeBox Mapping speichern
CREATE TEMP TABLE day_entry_timebox_mapping AS
SELECT 
  gen_random_uuid()::text AS new_day_entry_id,
  de.id AS old_day_entry_id,
  dem.new_time_box_id,
  de."userId",
  de."createdAt",
  de."updatedAt",
  ds.content AS "aiSummary"
FROM day_entry_mapping dem
JOIN "DayEntry" de ON de.id = dem.old_day_entry_id
LEFT JOIN "DaySummary" ds ON ds."dayEntryId" = dem.old_day_entry_id;

-- =============================================================================
-- TEIL 5: JournalEntryType Seed-Daten
-- =============================================================================

INSERT INTO "JournalEntryType" (id, "userId", code, name, description, icon, "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, NULL, 'daily_note', 'Tagesnotiz', 'Allgemeine Notiz zum Tag', '📝', 1, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'meal', 'Mahlzeit', 'Dokumentation einer Mahlzeit', '🍽️', 2, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'daily_reflection', 'Tagesreflexion', 'Strukturierte Tagesreflexion', '🌅', 3, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'weekly_review', 'Wochenreflexion', 'Wöchentliche Reflexion', '📅', 4, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'monthly_review', 'Monatsreflexion', 'Monatliche Reflexion', '📆', 5, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'diary', 'Tagebuch', 'Freier Tagebucheintrag', '📖', 6, NOW(), NOW());

-- =============================================================================
-- TEIL 6: JournalEntry aus DayNote
-- =============================================================================

INSERT INTO "JournalEntry" (id, "userId", "typeId", "timeBoxId", title, content, "isSensitive", "createdAt", "updatedAt")
SELECT 
  jem.new_journal_entry_id,
  de."userId",
  CASE dn.type::text
    WHEN 'MEAL' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'meal' AND "userId" IS NULL)
    WHEN 'REFLECTION' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'daily_reflection' AND "userId" IS NULL)
    WHEN 'DIARY' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'diary' AND "userId" IS NULL)
  END,
  dem.new_time_box_id,
  dn.title,
  COALESCE(dn.text, '') || 
    CASE WHEN drf.changed IS NOT NULL THEN E'\n\n## Was hat sich verändert?\n' || drf.changed ELSE '' END ||
    CASE WHEN drf.gratitude IS NOT NULL THEN E'\n\n## Wofür bin ich dankbar?\n' || drf.gratitude ELSE '' END ||
    CASE WHEN drf.vows IS NOT NULL THEN E'\n\n## Vorsätze\n' || drf.vows ELSE '' END,
  false,
  dn."createdAt",
  NOW()
FROM "DayNote" dn
JOIN journal_entry_mapping jem ON jem.old_day_note_id = dn.id
JOIN "DayEntry" de ON de.id = dn."dayEntryId"
JOIN day_entry_mapping dem ON dem.old_day_entry_id = de.id
LEFT JOIN "DailyReflectionFields" drf ON drf."dayNoteId" = dn.id;

-- Entity-Registry für JournalEntry
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'JOURNAL_ENTRY', "createdAt", NOW()
FROM "JournalEntry";

-- JournalEntry aus Reflection
INSERT INTO "JournalEntry" (id, "userId", "typeId", "timeBoxId", title, content, "isSensitive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  r."userId",
  CASE r.kind::text
    WHEN 'WEEK' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'weekly_review' AND "userId" IS NULL)
    WHEN 'MONTH' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'monthly_review' AND "userId" IS NULL)
  END,
  NULL,
  CASE r.kind::text WHEN 'WEEK' THEN 'Wochenreflexion' WHEN 'MONTH' THEN 'Monatsreflexion' END || ' ' || TO_CHAR(r."createdAt", 'YYYY-MM-DD'),
  COALESCE(r.remarks, '') ||
    CASE WHEN r.changed IS NOT NULL THEN E'\n\n## Was hat sich verändert?\n' || r.changed ELSE '' END ||
    CASE WHEN r.gratitude IS NOT NULL THEN E'\n\n## Wofür bin ich dankbar?\n' || r.gratitude ELSE '' END ||
    CASE WHEN r.vows IS NOT NULL THEN E'\n\n## Vorsätze\n' || r.vows ELSE '' END ||
    CASE WHEN r."weightKg" IS NOT NULL THEN E'\n\n**Gewicht:** ' || r."weightKg"::text || ' kg' ELSE '' END,
  false,
  r."createdAt",
  NOW()
FROM "Reflection" r;

-- =============================================================================
-- TEIL 7: MediaAsset aus AudioFile
-- =============================================================================

INSERT INTO "MediaAsset" (id, "userId", "filePath", "mimeType", duration, "capturedAt", "createdAt", "updatedAt")
SELECT 
  af.id, de."userId", af."filePath", af."mimeType", af."durationSec",
  af."uploadedAt", af."uploadedAt", NOW()
FROM "AudioFile" af
JOIN "DayNote" dn ON dn."audioFileId" = af.id
JOIN "DayEntry" de ON de.id = dn."dayEntryId";

-- MediaAsset aus PhotoFile
INSERT INTO "MediaAsset" (id, "userId", "filePath", "mimeType", width, height, "capturedAt", "createdAt", "updatedAt")
SELECT 
  pf.id, COALESCE(de."userId", r."userId"), pf."filePath", pf."mimeType",
  pf."widthPx", pf."heightPx", pf."uploadedAt", pf."uploadedAt", NOW()
FROM "PhotoFile" pf
LEFT JOIN "DayNote" dn ON dn.id = pf."dayNoteId"
LEFT JOIN "DayEntry" de ON de.id = dn."dayEntryId"
LEFT JOIN "Reflection" r ON r.id = pf."reflectionId";

-- Entity-Registry für MediaAsset
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'MEDIA_ASSET', "createdAt", NOW()
FROM "MediaAsset";

-- =============================================================================
-- TEIL 8: MediaAttachment erstellen
-- =============================================================================

-- Audio-Attachments
INSERT INTO "MediaAttachment" (id, "assetId", "entityId", "userId", role, "displayOrder", "timeBoxId", "createdAt")
SELECT 
  gen_random_uuid()::text, af.id, je.id, je."userId", 'ATTACHMENT', 0, je."timeBoxId", NOW()
FROM "AudioFile" af
JOIN "DayNote" dn ON dn."audioFileId" = af.id
JOIN "JournalEntry" je ON je.id = (
  SELECT new_journal_entry_id FROM journal_entry_mapping WHERE old_day_note_id = dn.id
);

-- Photo-Attachments
INSERT INTO "MediaAttachment" (id, "assetId", "entityId", "userId", role, "displayOrder", "timeBoxId", "createdAt")
SELECT 
  gen_random_uuid()::text, pf.id, COALESCE(je.id, je2.id),
  COALESCE(je."userId", je2."userId"), 'ATTACHMENT', 0, COALESCE(je."timeBoxId", je2."timeBoxId"), NOW()
FROM "PhotoFile" pf
LEFT JOIN "DayNote" dn ON dn.id = pf."dayNoteId"
LEFT JOIN "JournalEntry" je ON je.id = (
  SELECT new_journal_entry_id FROM journal_entry_mapping WHERE old_day_note_id = dn.id
)
LEFT JOIN "JournalEntry" je2 ON je2."createdAt" = (SELECT "createdAt" FROM "Reflection" WHERE id = pf."reflectionId");

-- =============================================================================
-- TEIL 9: Indexes erstellen
-- =============================================================================

CREATE INDEX IF NOT EXISTS "Entity_userId_type_idx" ON "Entity"("userId", type);
CREATE INDEX IF NOT EXISTS "TimeBox_userId_kind_startAt_idx" ON "TimeBox"("userId", kind, "startAt");
CREATE INDEX IF NOT EXISTS "JournalEntry_userId_idx" ON "JournalEntry"("userId");
CREATE INDEX IF NOT EXISTS "JournalEntry_timeBoxId_idx" ON "JournalEntry"("timeBoxId");
CREATE INDEX IF NOT EXISTS "MediaAsset_userId_idx" ON "MediaAsset"("userId");
CREATE INDEX IF NOT EXISTS "MediaAttachment_entityId_idx" ON "MediaAttachment"("entityId");

-- =============================================================================
-- TEIL 10: ENUM-Typen erstellen und konvertieren
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "EntityType" AS ENUM ('JOURNAL_ENTRY', 'MEDIA_ASSET', 'HABIT', 'CONTACT', 'LOCATION', 'METRIC_DEFINITION', 'MEASUREMENT', 'HABIT_CHECK_IN', 'BOOKMARK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TimeBoxKind" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Entity" ALTER COLUMN "type" TYPE "EntityType" USING "type"::"EntityType";
ALTER TABLE "TimeBox" ALTER COLUMN "kind" TYPE "TimeBoxKind" USING "kind"::"TimeBoxKind";

COMMIT;

-- =============================================================================
-- VALIDIERUNG
-- =============================================================================

SELECT '=== MIGRATION TEIL 1 ABGESCHLOSSEN ===' as status;
SELECT 'TimeBox' as tabelle, COUNT(*) as anzahl FROM "TimeBox"
UNION ALL SELECT 'JournalEntry', COUNT(*) FROM "JournalEntry"
UNION ALL SELECT 'MediaAsset', COUNT(*) FROM "MediaAsset"
UNION ALL SELECT 'MediaAttachment', COUNT(*) FROM "MediaAttachment"
UNION ALL SELECT 'Entity', COUNT(*) FROM "Entity";

SELECT '=== NÄCHSTER SCHRITT: prisma db push --accept-data-loss ===' as hinweis;
