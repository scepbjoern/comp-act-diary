-- =============================================================================
-- POST-MIGRATION: DayEntry neu aus TimeBox erstellen
-- =============================================================================

-- Transaktionsstart
BEGIN;

-- Alte DayEntries löschen
DELETE FROM "DayEntry";

-- DayEntry aus TimeBox neu erstellen (eine pro DAY-TimeBox)
INSERT INTO "DayEntry" (id, "userId", "timeBoxId", "dayRating", "aiSummary", "weather", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  tb."userId",
  tb.id,
  NULL::integer, -- dayRating
  NULL::text,   -- aiSummary (wird später gesetzt)
  NULL::jsonb,  -- weather
  tb."createdAt",
  NOW()
FROM "TimeBox" tb
WHERE tb.kind = 'DAY';

-- Optional: aiSummary aus alten DaySummaries übernehmen, falls noch zugängig
-- Da DaySummary gelöscht wurde, können wir die Daten nicht wiederherstellen

-- Validierung
SELECT 'DayEntry Recreation abgeschlossen!' as status;
SELECT 
  COUNT(*) as total_dayentries,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(DISTINCT "timeBoxId") as unique_timeboxes
FROM "DayEntry";

-- Überprüfen, ob jeder DayEntry eine TimeBox hat
SELECT 
  COUNT(*) as total,
  COUNT("timeBoxId") as with_timebox,
  COUNT(*) - COUNT("timeBoxId") as without_timebox
FROM "DayEntry";

COMMIT;
