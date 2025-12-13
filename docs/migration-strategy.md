# Migrationsstrategie: Ist → Soll

Dieses Dokument beschreibt die Migration vom bestehenden Datenmodell zum neuen Ziel-Datenmodell.

---

## 1. Übersicht: Entitäten-Mapping

### 1.1 Direkte Übernahmen (minimale Änderungen)

| Alt | Neu | Änderungen |
|-----|-----|------------|
| `User` | `User` | + `settings` als Json (statt separate Tabelle) |
| `Habit` | `Habit` | + `goalId?`, `slug`, `icon`, `description`, `frequency` |
| `UserLink` | `Bookmark` | Rename, + `description?`, `faviconUrl?` |

### 1.2 Merges (mehrere alte → eine neue)

| Alt | Neu | Transformation |
|-----|-----|----------------|
| `UserSettings` | → `User.settings` | Als Json-Feld einbetten |
| `DaySummary` | → `DayEntry.aiSummary` | Als Feld einbetten |
| `AudioFile` + `PhotoFile` | `MediaAsset` | Vereinheitlicht |
| `DayNote` + `DailyReflectionFields` | `JournalEntry` | Merge, neues Type-System |
| `Reflection` | `JournalEntry` | Als kind=WEEKLY_REVIEW/MONTHLY_REVIEW |
| `SymptomScore` + `UserSymptomScore` + `StoolScore` | `Measurement` | Generisches Metric-System |
| `HabitIcon` | → `Habit.icon` | User-spezifische Icons entfallen |

### 1.3 Splits (eine alte → mehrere neue)

| Alt | Neu | Transformation |
|-----|-----|----------------|
| `DayEntry` | `TimeBox` + `DayEntry` | Zeitraum-Definition vs. Tages-Aggregat |

### 1.4 Spezial-Migration: Phase/CareCategory

| Alt | Neu | Transformation |
|-----|-----|----------------|
| `DayEntry.phase` + `DayEntry.careCategory` | `TimeBox` (kind=CUSTOM) | Pro Phase/CareCategory-Kombination eine Custom-TimeBox erstellen |

Beispiel: Ein User mit Phase=PHASE_1 und CareCategory=MEDIUM bekommt eine TimeBox:
- `kind`: CUSTOM
- `title`: "Darmkur Phase 1 Medium"
- `startAt`: Erster Tag mit dieser Kombination
- `endAt`: Letzter Tag mit dieser Kombination (oder offen)

### 1.5 Neue Entitäten (ohne Altdaten)

| Neu | Bemerkung |
|-----|-----------|
| `Entity` | Entity-Registry (alle migrierten Entitäten bekommen Entity-Eintrag) |
| `TimeBox` | Für WEEK/MONTH/YEAR/CUSTOM (DAY wird aus altem DayEntry erstellt) |
| `JournalEntryType` | Seed-Daten |
| `JournalTemplate` | Optional, initial leer |
| `ActValue`, `ActGoal` | Neu, initial leer |
| `Reward` | Neu, initial leer |
| `HabitCheckIn` | Migration aus `HabitTick` |
| `ExerciseDefinition`, `ExerciseSession` | Neu, initial leer |
| `Taxonomy`, `Tagging` | Seed-Daten für System-Taxonomien |
| `Contact`, `PersonRelation`, `Interaction` | Neu, initial leer |
| `Location` | Neu, initial leer |
| `MetricDefinition` | Seed-Daten + Migration aus Symptom-System |
| `SyncProvider`, `SyncRun`, `ExternalSync` | Neu, initial leer |
| `TimeTrackingEntry`, `CalendarEvent`, `Consumption` | Neu, initial leer |
| `InventoryItem` | Neu, initial leer |
| `EntityLink`, `Embedding` | Neu, initial leer |
| `EntryTimeBox` | Neu, initial leer |
| `Trash` | Neu, initial leer |
| `MediaAttachment` | Migration aus PhotoFile/AudioFile-Verknüpfungen |

### 1.5 Beibehaltene Entitäten (mit Erweiterungen)

| Alt | Neu | Änderungen |
|-----|-----|------------|
| `ChatMethod` | `ChatMethod` | + `icon?`, `imageUrl?`, `description?` |

### 1.6 Entfallende Entitäten

| Alt | Grund |
|-----|-------|
| `SymptomIcon` | Icon-Override-Konzept entfällt (Icons auf MetricDefinition) |
| `UserSymptom` | → `MetricDefinition` (user-defined) |
| `HabitIcon` | Icon-Override-Konzept entfällt (Icons auf Habit) |
| `testField` auf DayNote | Test-Spalte, nicht mehr benötigt |

---

## 2. Migrations-Phasen

### Phase 1: Vorbereitung (Schema-Erweiterung)

**Ziel:** Neues Schema parallel zum alten aufbauen, ohne Altdaten zu verlieren.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHRITT 1.1: Neue Tabellen erstellen (leer)                               │
│                                                                             │
│  - Entity, TimeBox, JournalEntryType, JournalTemplate, JournalEntry        │
│  - Taxonomy, Tagging, MetricDefinition, Measurement                        │
│  - ActValue, ActGoal, Reward, HabitCheckIn                                 │
│  - MediaAsset, MediaAttachment                                             │
│  - Contact, Location, etc.                                                 │
│  - Bookmark (Kopie von UserLink)                                           │
│                                                                             │
│  ALTER TABLE: Keine Änderungen an bestehenden Tabellen                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Daten-Migration (SQL-Scripts)

**Ziel:** Altdaten in neue Struktur überführen.

#### 2.1 User & Settings migrieren

```sql
-- User.settings als Json befüllen
UPDATE "User" u
SET settings = (
  SELECT jsonb_build_object(
    'theme', us.theme,
    'timeFormat24h', us."timeFormat24h",
    'weekStart', us."weekStart",
    'autosaveEnabled', us."autosaveEnabled",
    'autosaveIntervalSec', us."autosaveIntervalSec",
    'transcriptionModel', us."transcriptionModel",
    'summaryModel', us."summaryModel",
    'summaryPrompt', us."summaryPrompt"
  )
  FROM "UserSettings" us
  WHERE us."userId" = u.id
);
```

#### 2.2 TimeBox + DayEntry migrieren

```sql
-- 1. TimeBox für jeden alten DayEntry erstellen
INSERT INTO "TimeBox" (id, "userId", kind, "startAt", "endAt", timezone, "localDate", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  de."userId",
  'DAY',
  de.date,
  de.date + INTERVAL '1 day',
  'Europe/Zurich',  -- Default-Zeitzone
  TO_CHAR(de.date, 'YYYY-MM-DD'),
  de."createdAt",
  de."updatedAt"
FROM "DayEntry" de;

-- 2. Entity-Registry für TimeBox
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'TIME_BOX', "createdAt", "updatedAt"
FROM "TimeBox";

-- 3. Neue DayEntry mit Referenz auf TimeBox
-- (Hier muss das Mapping DayEntry.id → TimeBox.id erstellt werden)
-- Temporäre Mapping-Tabelle:
CREATE TEMP TABLE day_entry_mapping AS
SELECT 
  de.id AS old_day_entry_id,
  tb.id AS new_time_box_id,
  de."userId"
FROM "DayEntry" de
JOIN "TimeBox" tb ON tb."userId" = de."userId" 
  AND tb."localDate" = TO_CHAR(de.date, 'YYYY-MM-DD');

-- 4. Neue DayEntry erstellen (mit neuer Struktur)
INSERT INTO "DayEntry_new" (id, "userId", "timeBoxId", "dayRating", "aiSummary", weather, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  dem."userId",
  dem.new_time_box_id,
  NULL,  -- dayRating: neu, keine Altdaten
  ds.content,  -- aiSummary aus DaySummary
  NULL  -- weather: neu
FROM day_entry_mapping dem
LEFT JOIN "DaySummary" ds ON ds."dayEntryId" = dem.old_day_entry_id;

-- Entity-Registry für DayEntry
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'DAY_ENTRY', "createdAt", "updatedAt"
FROM "DayEntry_new";
```

#### 2.3 JournalEntryType Seed-Daten

```sql
-- System-definierte Journal-Typen
INSERT INTO "JournalEntryType" (id, "userId", code, name, description, icon, "sortOrder")
VALUES
  (gen_random_uuid(), NULL, 'daily_note', 'Tagesnotiz', 'Allgemeine Notiz zum Tag', '📝', 1),
  (gen_random_uuid(), NULL, 'meal', 'Mahlzeit', 'Dokumentation einer Mahlzeit', '🍽️', 2),
  (gen_random_uuid(), NULL, 'daily_reflection', 'Tagesreflexion', 'Strukturierte Tagesreflexion', '🌅', 3),
  (gen_random_uuid(), NULL, 'weekly_review', 'Wochenreflexion', 'Wöchentliche Reflexion', '📅', 4),
  (gen_random_uuid(), NULL, 'monthly_review', 'Monatsreflexion', 'Monatliche Reflexion', '📆', 5),
  (gen_random_uuid(), NULL, 'diary', 'Tagebuch', 'Freier Tagebucheintrag', '📖', 6);
```

#### 2.4 Phase/CareCategory → Custom TimeBox migrieren

```sql
-- Custom TimeBoxes für jede Phase/CareCategory-Kombination erstellen
-- Gruppiert nach zusammenhängenden Zeiträumen

WITH phase_ranges AS (
  SELECT 
    "userId",
    phase,
    "careCategory",
    date,
    -- Gruppierung: Wenn Phase/CareCategory wechselt, neue Gruppe
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
  SELECT 
    "userId",
    phase,
    "careCategory",
    grp,
    MIN(date) AS start_date,
    MAX(date) AS end_date
  FROM phase_ranges
  GROUP BY "userId", phase, "careCategory", grp
)
INSERT INTO "TimeBox" (id, "userId", kind, "startAt", "endAt", timezone, "localDate", title, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  "userId",
  'CUSTOM',
  start_date,
  end_date + INTERVAL '1 day',
  'Europe/Zurich',
  NULL,  -- localDate nur für DAY
  'Darmkur ' || 
    CASE phase 
      WHEN 'PHASE_1' THEN 'Phase 1'
      WHEN 'PHASE_2' THEN 'Phase 2'
      WHEN 'PHASE_3' THEN 'Phase 3'
    END || ' ' ||
    CASE "careCategory"
      WHEN 'SANFT' THEN 'Sanft'
      WHEN 'MEDIUM' THEN 'Medium'
      WHEN 'INTENSIV' THEN 'Intensiv'
    END,
  NOW(),
  NOW()
FROM phase_summary;

-- DAY-TimeBoxes mit Custom-TimeBox verknüpfen (via EntryTimeBox)
INSERT INTO "EntryTimeBox" (id, "entityType", "entityId", "userId", "timeBoxId", "isPrimary")
SELECT 
  gen_random_uuid(),
  'TIME_BOX',  -- Die DAY-TimeBox als Entity
  day_tb.id,
  day_tb."userId",
  custom_tb.id,
  false
FROM "TimeBox" day_tb
JOIN "DayEntry_old" de_old ON de_old."userId" = day_tb."userId" 
  AND TO_CHAR(de_old.date, 'YYYY-MM-DD') = day_tb."localDate"
JOIN "TimeBox" custom_tb ON custom_tb."userId" = day_tb."userId"
  AND custom_tb.kind = 'CUSTOM'
  AND de_old.date >= custom_tb."startAt"
  AND de_old.date < custom_tb."endAt"
WHERE day_tb.kind = 'DAY';
```

#### 2.5 DayNote → JournalEntry migrieren

```sql
-- Mapping NoteType → JournalEntryType
CREATE TEMP TABLE note_type_mapping AS
SELECT 'MEAL' AS old_type, (SELECT id FROM "JournalEntryType" WHERE code = 'meal') AS new_type_id
UNION ALL
SELECT 'REFLECTION', (SELECT id FROM "JournalEntryType" WHERE code = 'daily_reflection')
UNION ALL
SELECT 'DIARY', (SELECT id FROM "JournalEntryType" WHERE code = 'diary');

-- JournalEntry aus DayNote erstellen
INSERT INTO "JournalEntry" (id, "userId", "typeId", "timeBoxId", title, content, "isSensitive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  de."userId",
  ntm.new_type_id,
  dem.new_time_box_id,
  dn.title,
  COALESCE(dn.text, '') || 
    CASE WHEN drf.changed IS NOT NULL THEN E'\n\n## Was hat sich verändert?\n' || drf.changed ELSE '' END ||
    CASE WHEN drf.gratitude IS NOT NULL THEN E'\n\n## Wofür bin ich dankbar?\n' || drf.gratitude ELSE '' END ||
    CASE WHEN drf.vows IS NOT NULL THEN E'\n\n## Vorsätze\n' || drf.vows ELSE '' END,
  false,
  dn."createdAt",
  dn."updatedAt"
FROM "DayNote" dn
JOIN day_entry_mapping dem ON dem.old_day_entry_id = dn."dayEntryId"
JOIN note_type_mapping ntm ON ntm.old_type = dn.type::text
LEFT JOIN "DailyReflectionFields" drf ON drf."dayNoteId" = dn.id;

-- Entity-Registry
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'JOURNAL_ENTRY', "createdAt", "updatedAt"
FROM "JournalEntry";
```

#### 2.5 Reflection → JournalEntry migrieren

```sql
-- Reflection als JournalEntry
INSERT INTO "JournalEntry" (id, "userId", "typeId", "timeBoxId", title, content, "isSensitive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  r."userId",
  CASE r.kind 
    WHEN 'WEEK' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'weekly_review')
    WHEN 'MONTH' THEN (SELECT id FROM "JournalEntryType" WHERE code = 'monthly_review')
  END,
  NULL,  -- timeBoxId: muss manuell zugeordnet werden oder NULL bleiben
  CASE r.kind WHEN 'WEEK' THEN 'Wochenreflexion' WHEN 'MONTH' THEN 'Monatsreflexion' END || ' ' || TO_CHAR(r."createdAt", 'YYYY-MM-DD'),
  COALESCE(r.remarks, '') ||
    CASE WHEN r.changed IS NOT NULL THEN E'\n\n## Was hat sich verändert?\n' || r.changed ELSE '' END ||
    CASE WHEN r.gratitude IS NOT NULL THEN E'\n\n## Wofür bin ich dankbar?\n' || r.gratitude ELSE '' END ||
    CASE WHEN r.vows IS NOT NULL THEN E'\n\n## Vorsätze\n' || r.vows ELSE '' END ||
    CASE WHEN r."weightKg" IS NOT NULL THEN E'\n\n**Gewicht:** ' || r."weightKg" || ' kg' ELSE '' END,
  false,
  r."createdAt",
  r."updatedAt"
FROM "Reflection" r;
```

#### 2.6 MediaAsset + MediaAttachment migrieren

```sql
-- AudioFile → MediaAsset
INSERT INTO "MediaAsset" (id, "userId", "mimeType", "thumbnailData", width, height, duration, "externalProvider", "capturedAt", "createdAt")
SELECT 
  af.id,  -- Gleiche ID behalten
  de."userId",
  af."mimeType",
  NULL,  -- thumbnailData: nicht vorhanden
  NULL, NULL,
  af."durationSec",
  NULL,
  af."uploadedAt",
  af."uploadedAt"
FROM "AudioFile" af
JOIN "DayNote" dn ON dn."audioFileId" = af.id
JOIN "DayEntry" de ON de.id = dn."dayEntryId";

-- PhotoFile → MediaAsset
INSERT INTO "MediaAsset" (id, "userId", "mimeType", "thumbnailData", width, height, duration, "externalProvider", "capturedAt", "createdAt")
SELECT 
  pf.id,
  COALESCE(de."userId", r."userId"),
  pf."mimeType",
  NULL,
  pf."widthPx",
  pf."heightPx",
  NULL,
  NULL,
  pf."uploadedAt",
  pf."uploadedAt"
FROM "PhotoFile" pf
LEFT JOIN "DayNote" dn ON dn.id = pf."dayNoteId"
LEFT JOIN "DayEntry" de ON de.id = dn."dayEntryId"
LEFT JOIN "Reflection" r ON r.id = pf."reflectionId";

-- Entity-Registry für MediaAsset
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'MEDIA_ASSET', "createdAt", "createdAt"
FROM "MediaAsset";

-- MediaAttachment für DayNote-Fotos
INSERT INTO "MediaAttachment" (id, "assetId", "entityId", "userId", role, "displayOrder", "createdAt")
SELECT 
  gen_random_uuid(),
  pf.id,
  je.id,  -- Neue JournalEntry-ID (benötigt Mapping)
  je."userId",
  'ATTACHMENT',
  0,
  pf."uploadedAt"
FROM "PhotoFile" pf
JOIN "DayNote" dn ON dn.id = pf."dayNoteId"
JOIN journal_entry_mapping jem ON jem.old_day_note_id = dn.id  -- Mapping-Tabelle nötig
JOIN "JournalEntry" je ON je.id = jem.new_journal_entry_id;
```

#### 2.7 MetricDefinition + Measurement migrieren

```sql
-- System-definierte Metriken aus SymptomType
INSERT INTO "MetricDefinition" (id, "userId", code, name, "dataType", unit, "minValue", "maxValue", category, "isSensitive", origin)
VALUES
  (gen_random_uuid(), NULL, 'symptom_beschwerdefreiheit', 'Beschwerdefreiheit', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_energie', 'Energie', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_stimmung', 'Stimmung', 'SCALE', NULL, 0, 10, 'mood', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_schlaf', 'Schlafqualität', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_entspannung', 'Entspannung', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_heisshungerfreiheit', 'Heisshungerfreiheit', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'symptom_bewegung', 'Bewegung', 'SCALE', NULL, 0, 10, 'health', false, 'SYSTEM'),
  (gen_random_uuid(), NULL, 'bristol_stool', 'Bristol-Stuhlform', 'SCALE', NULL, 1, 7, 'health', true, 'SYSTEM');

-- User-definierte Symptome → MetricDefinition
INSERT INTO "MetricDefinition" (id, "userId", code, name, "dataType", "minValue", "maxValue", category, "isSensitive", origin)
SELECT 
  us.id,
  us."userId",
  'user_symptom_' || us.id,
  us.title,
  'SCALE',
  0, 10,
  'health',
  false,
  'USER'
FROM "UserSymptom" us;

-- SymptomScore → Measurement
INSERT INTO "Measurement" (id, "metricId", "userId", "timeBoxId", "valueNum", source, "occurredAt", "createdAt")
SELECT 
  gen_random_uuid(),
  md.id,
  de."userId",
  dem.new_time_box_id,
  ss.score,
  'MANUAL',
  de.date,
  de."createdAt"
FROM "SymptomScore" ss
JOIN "DayEntry" de ON de.id = ss."dayEntryId"
JOIN day_entry_mapping dem ON dem.old_day_entry_id = de.id
JOIN "MetricDefinition" md ON md.code = 'symptom_' || LOWER(ss.type::text);

-- UserSymptomScore → Measurement
INSERT INTO "Measurement" (id, "metricId", "userId", "timeBoxId", "valueNum", source, "occurredAt", "createdAt")
SELECT 
  gen_random_uuid(),
  uss."userSymptomId",  -- UserSymptom.id = MetricDefinition.id (gleiche ID)
  de."userId",
  dem.new_time_box_id,
  uss.score,
  'MANUAL',
  de.date,
  de."createdAt"
FROM "UserSymptomScore" uss
JOIN "DayEntry" de ON de.id = uss."dayEntryId"
JOIN day_entry_mapping dem ON dem.old_day_entry_id = de.id;

-- StoolScore → Measurement
INSERT INTO "Measurement" (id, "metricId", "userId", "timeBoxId", "valueNum", source, "isSensitive", "occurredAt", "createdAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM "MetricDefinition" WHERE code = 'bristol_stool'),
  de."userId",
  dem.new_time_box_id,
  st.bristol,
  'MANUAL',
  true,
  de.date,
  de."createdAt"
FROM "StoolScore" st
JOIN "DayEntry" de ON de.id = st."dayEntryId"
JOIN day_entry_mapping dem ON dem.old_day_entry_id = de.id;
```

#### 2.8 Habit + HabitCheckIn migrieren

```sql
-- Habit erweitern (in-place, da gleiche Tabelle)
ALTER TABLE "Habit" 
  ADD COLUMN IF NOT EXISTS slug VARCHAR,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS "goalId" UUID,
  ADD COLUMN IF NOT EXISTS "streakCount" INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastCheckIn" TIMESTAMP;

-- Slug generieren
UPDATE "Habit" 
SET slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'));

-- Entity-Registry für Habit
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'HABIT', NOW(), NOW()
FROM "Habit";

-- HabitTick → HabitCheckIn
INSERT INTO "HabitCheckIn" (id, "habitId", "userId", "timeBoxId", status, "occurredAt", "createdAt")
SELECT 
  gen_random_uuid(),
  ht."habitId",
  de."userId",
  dem.new_time_box_id,
  CASE WHEN ht.checked THEN 'DONE' ELSE 'SKIPPED' END,
  de.date,
  de."createdAt"
FROM "HabitTick" ht
JOIN "DayEntry" de ON de.id = ht."dayEntryId"
JOIN day_entry_mapping dem ON dem.old_day_entry_id = de.id
WHERE ht.checked = true;  -- Nur erledigte Habits migrieren
```

#### 2.9 UserLink → Bookmark migrieren

```sql
INSERT INTO "Bookmark" (id, "userId", url, title, description, "createdAt")
SELECT 
  ul.id,
  ul."userId",
  ul.url,
  ul.name,
  NULL,
  ul."createdAt"
FROM "UserLink" ul;

-- Entity-Registry
INSERT INTO "Entity" (id, "userId", type, "createdAt", "updatedAt")
SELECT id, "userId", 'BOOKMARK', "createdAt", "createdAt"
FROM "Bookmark";
```

#### 2.10 Taxonomy Seed-Daten

```sql
-- System-Taxonomien (werden beim ersten User-Login kopiert)
INSERT INTO "Taxonomy" (id, "userId", "parentId", slug, "shortName", "longName", kind, origin, "isArchived", "sortOrder")
VALUES
  -- Kategorien (Top-Level)
  (gen_random_uuid(), NULL, NULL, 'emotions', 'Emotionen', 'Emotionen & Gefühle', 'CATEGORY', 'SYSTEM', false, 1),
  (gen_random_uuid(), NULL, NULL, 'topics', 'Themen', 'Themen & Bereiche', 'CATEGORY', 'SYSTEM', false, 2),
  (gen_random_uuid(), NULL, NULL, 'life-areas', 'Lebensbereiche', 'Lebensbereiche', 'CATEGORY', 'SYSTEM', false, 3),
  
  -- Emotionen (unter "emotions")
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'emotions'), 'happy', 'Glücklich', NULL, 'EMOTION', 'SYSTEM', false, 1),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'emotions'), 'sad', 'Traurig', NULL, 'EMOTION', 'SYSTEM', false, 2),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'emotions'), 'anxious', 'Ängstlich', NULL, 'EMOTION', 'SYSTEM', false, 3),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'emotions'), 'angry', 'Wütend', NULL, 'EMOTION', 'SYSTEM', false, 4),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'emotions'), 'calm', 'Ruhig', NULL, 'EMOTION', 'SYSTEM', false, 5),
  
  -- Lebensbereiche
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'life-areas'), 'family', 'Familie', NULL, 'LIFE_AREA', 'SYSTEM', false, 1),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'life-areas'), 'career', 'Karriere', NULL, 'LIFE_AREA', 'SYSTEM', false, 2),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'life-areas'), 'health', 'Gesundheit', NULL, 'LIFE_AREA', 'SYSTEM', false, 3),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'life-areas'), 'relationships', 'Beziehungen', NULL, 'LIFE_AREA', 'SYSTEM', false, 4),
  (gen_random_uuid(), NULL, (SELECT id FROM "Taxonomy" WHERE slug = 'life-areas'), 'personal-growth', 'Persönliche Entwicklung', NULL, 'LIFE_AREA', 'SYSTEM', false, 5);
```

### Phase 3: Schema-Bereinigung

**Ziel:** Alte Tabellen entfernen, neue Tabellen umbenennen.

```sql
-- 1. Alte Tabellen umbenennen (Backup)
ALTER TABLE "DayEntry" RENAME TO "DayEntry_old";
ALTER TABLE "DayNote" RENAME TO "DayNote_old";
-- etc.

-- 2. Neue Tabellen aktivieren
ALTER TABLE "DayEntry_new" RENAME TO "DayEntry";

-- 3. Nach erfolgreicher Validierung: Alte Tabellen löschen
DROP TABLE "DayEntry_old" CASCADE;
DROP TABLE "DayNote_old" CASCADE;
DROP TABLE "DaySummary" CASCADE;
DROP TABLE "DailyReflectionFields" CASCADE;
DROP TABLE "SymptomScore" CASCADE;
DROP TABLE "UserSymptomScore" CASCADE;
DROP TABLE "StoolScore" CASCADE;
DROP TABLE "UserSymptom" CASCADE;
DROP TABLE "SymptomIcon" CASCADE;
DROP TABLE "HabitIcon" CASCADE;
DROP TABLE "HabitTick" CASCADE;
DROP TABLE "AudioFile" CASCADE;
DROP TABLE "PhotoFile" CASCADE;
DROP TABLE "Reflection" CASCADE;
DROP TABLE "UserLink" CASCADE;
DROP TABLE "UserSettings" CASCADE;
```

---

## 3. App-Migrationsstrategie

### 3.1 Betroffene Bereiche

| Bereich | Änderungen | Priorität |
|---------|------------|-----------|
| **API Routes** | Alle Routen auf neue Entitäten umstellen | Hoch |
| **Prisma Client** | Neues Schema, neue Typen | Hoch |
| **React Components** | Anpassung an neue Datenstrukturen | Hoch |
| **Services/Hooks** | Neue Query-Logik | Hoch |
| **Types** | Neue TypeScript-Typen | Mittel |

### 3.2 Migrations-Reihenfolge (App)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE A: Schema-Migration (Downtime)                                       │
│                                                                             │
│  1. App stoppen                                                            │
│  2. Datenbank-Backup erstellen                                             │
│  3. Neues Prisma-Schema deployen (prisma migrate)                          │
│  4. SQL-Scripts für Daten-Migration ausführen                              │
│  5. Validierung: Datenzählung, Stichproben                                 │
│  6. Alte Tabellen löschen                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE B: App-Code anpassen                                                 │
│                                                                             │
│  1. API Routes auf neue Entitäten umstellen                                │
│  2. Services/Hooks anpassen                                                │
│  3. React Components anpassen                                              │
│  4. TypeScript-Typen aktualisieren                                         │
│  5. Testen                                                                 │
│  6. App deployen                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Konkrete App-Änderungen

#### API Routes (Mapping Alt → Neu)

| Alte Route | Neue Route | Änderungen |
|------------|------------|------------|
| `GET /api/days` | `GET /api/timeboxes?kind=DAY` | Query auf TimeBox |
| `GET /api/days/[date]` | `GET /api/timeboxes/[localDate]` | Parameter-Änderung |
| `GET /api/days/[date]/notes` | `GET /api/journal-entries?timeboxId=X` | Neue Filterlogik |
| `POST /api/days/[date]/notes` | `POST /api/journal-entries` | Body-Struktur |
| `GET /api/habits` | `GET /api/habits` | Minimal, + neue Felder |
| `POST /api/habits/[id]/tick` | `POST /api/habit-check-ins` | Neue Entität |
| `GET /api/symptoms` | `GET /api/metrics?category=health` | Generalisiert |
| `POST /api/symptoms/score` | `POST /api/measurements` | Generalisiert |
| `GET /api/reflections` | `GET /api/journal-entries?type=weekly_review,monthly_review` | Merge |
| `GET /api/links` | `GET /api/bookmarks` | Rename |

#### Prisma Client Änderungen

```typescript
// ALT
const notes = await prisma.dayNote.findMany({
  where: { dayEntryId: dayEntry.id },
  include: { audioFile: true, photos: true }
});

// NEU
const entries = await prisma.journalEntry.findMany({
  where: { timeBoxId: timeBox.id },
  include: { 
    type: true,
    // Media über separate Query
  }
});

const media = await prisma.mediaAttachment.findMany({
  where: { entityId: { in: entries.map(e => e.id) } },
  include: { asset: true }
});
```

#### React Components

| Alte Komponente | Neue Komponente | Änderungen |
|-----------------|-----------------|------------|
| `DayView` | `TimeBoxDayView` | Props: TimeBox + DayEntry |
| `NoteEditor` | `JournalEntryEditor` | Props: JournalEntry + Type |
| `SymptomTracker` | `MeasurementTracker` | Generisches UI |
| `HabitTracker` | `HabitTracker` | + CheckIn-History |
| `ReflectionForm` | `JournalEntryEditor` | Merge mit NoteEditor |

### 3.4 TypeScript-Typen

```typescript
// Neue zentrale Typen (generiert aus Prisma + erweitert)

// Entity-Type Union
type EntityType = 
  | 'JOURNAL_ENTRY' 
  | 'CONTACT' 
  | 'LOCATION' 
  | 'MEDIA_ASSET'
  | 'MEASUREMENT'
  | 'ACT_VALUE'
  | 'ACT_GOAL'
  | 'HABIT'
  | 'CALENDAR_EVENT'
  | 'CONSUMPTION'
  | 'INVENTORY_ITEM'
  | 'TIME_TRACKING_ENTRY'
  | 'BOOKMARK';

// Polymorphe Referenz (typsicher)
interface EntityRef<T extends EntityType = EntityType> {
  entityType: T;
  entityId: string;
}

// TimeBox mit zugehörigem DayEntry
interface TimeBoxWithDay {
  timeBox: TimeBox;
  dayEntry: DayEntry | null;  // Nur für kind=DAY
}
```

---

## 4. Validierungs-Checkliste

Nach der Migration prüfen:

### Datenbank
- [ ] Anzahl User identisch
- [ ] Anzahl TimeBox(DAY) = Anzahl alter DayEntry
- [ ] Anzahl JournalEntry ≥ Anzahl alter DayNote + Reflection
- [ ] Anzahl MediaAsset = Anzahl alter AudioFile + PhotoFile
- [ ] Anzahl Measurement = SymptomScore + UserSymptomScore + StoolScore
- [ ] Anzahl HabitCheckIn ≥ Anzahl HabitTick (wo checked=true)
- [ ] Alle Entity-Registry-Einträge haben gültige Referenzen
- [ ] Keine Orphan-Records in polymorphen Tabellen

### App
- [ ] Login funktioniert
- [ ] Tagesansicht zeigt korrekte Daten
- [ ] Journal-Einträge editierbar
- [ ] Habits können abgehakt werden
- [ ] Messwerte können erfasst werden
- [ ] Medien werden angezeigt
- [ ] AI-Summary wird angezeigt

---

## 5. Rollback-Plan

Falls die Migration fehlschlägt:

```sql
-- 1. Neue Tabellen löschen
DROP TABLE IF EXISTS "Entity" CASCADE;
DROP TABLE IF EXISTS "TimeBox" CASCADE;
DROP TABLE IF EXISTS "JournalEntry" CASCADE;
-- etc.

-- 2. Alte Tabellen wiederherstellen (falls umbenannt)
ALTER TABLE "DayEntry_old" RENAME TO "DayEntry";
-- etc.

-- 3. Backup einspielen (falls nötig)
-- pg_restore ...
```

---

## 6. Zeitschätzung

| Phase | Geschätzter Aufwand |
|-------|---------------------|
| Phase 1: Schema-Erweiterung | 1-2 Stunden |
| Phase 2: SQL-Migration | 2-4 Stunden (inkl. Debugging) |
| Phase 3: Schema-Bereinigung | 30 Minuten |
| App Phase B: Code-Anpassung | 4-8 Stunden |
| **Gesamt** | **~1-2 Tage** |


*Migrationsstrategie – Dezember 2024*
