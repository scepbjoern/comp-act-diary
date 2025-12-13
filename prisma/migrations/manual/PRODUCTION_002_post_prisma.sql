-- =============================================================================
-- PRODUKTIONS-MIGRATION TEIL 2: Nach Prisma db push
-- =============================================================================
-- Ausführung: NACH "prisma db push --accept-data-loss"
-- =============================================================================

BEGIN;

-- DayEntry neu erstellen (1:1 mit TimeBox)
DELETE FROM "DayEntry";

INSERT INTO "DayEntry" (id, "userId", "timeBoxId", "dayRating", "aiSummary", "weather", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  tb."userId",
  tb.id,
  NULL::integer,
  NULL::text,
  NULL::jsonb,
  tb."createdAt",
  NOW()
FROM "TimeBox" tb
WHERE tb.kind = 'DAY';

COMMIT;

-- Validierung
SELECT '=== MIGRATION KOMPLETT ABGESCHLOSSEN ===' as status;
SELECT 'DayEntry' as tabelle, COUNT(*) as anzahl FROM "DayEntry"
UNION ALL SELECT 'TimeBox', COUNT(*) FROM "TimeBox"
UNION ALL SELECT 'JournalEntry', COUNT(*) FROM "JournalEntry";
