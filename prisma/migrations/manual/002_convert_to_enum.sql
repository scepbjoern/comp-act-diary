-- =============================================================================
-- ENUM-Konvertierung: TEXT → ENUM für Prisma-Kompatibilität
-- =============================================================================

-- Transaktionsstart
BEGIN;

-- Entity-Enum erstellen (falls nicht vorhanden)
DO $$ BEGIN
    CREATE TYPE "EntityType" AS ENUM ('JOURNAL_ENTRY', 'MEDIA_ASSET', 'HABIT', 'CONTACT', 'LOCATION', 'METRIC_DEFINITION', 'MEASUREMENT', 'HABIT_CHECK_IN', 'BOOKMARK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TimeBox-Enum erstellen (falls nicht vorhanden)
DO $$ BEGIN
    CREATE TYPE "TimeBoxKind" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Entity.type von TEXT nach ENUM konvertieren
ALTER TABLE "Entity" 
ALTER COLUMN "type" TYPE "EntityType" 
USING "type"::"EntityType";

-- TimeBox.kind von TEXT nach ENUM konvertieren
ALTER TABLE "TimeBox" 
ALTER COLUMN "kind" TYPE "TimeBoxKind" 
USING "kind"::"TimeBoxKind";

COMMIT;

-- Validierung
SELECT 'ENUM-Konvertierung abgeschlossen!' as status;
SELECT DISTINCT "type"::text FROM "Entity" ORDER BY "type";
SELECT DISTINCT "kind"::text FROM "TimeBox" ORDER BY "kind";
