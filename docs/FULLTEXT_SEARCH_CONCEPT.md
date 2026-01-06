# Konzept: Volltextsuche für Comp-ACT-Diary

*Erstellt: Januar 2025*  
*Version: 2.0 (nach Feedback)*

---

## Inhaltsverzeichnis

1. [Geplante Features](#1-geplante-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Komponentenbeschreibung](#3-komponentenbeschreibung)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Dependencies](#7-dependencies)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)

---

## 1. Geplante Features

### 1.1 Kernfunktionalität

- **Globale Volltextsuche**: Durchsuchung aller relevanten Inhalte über ein zentrales Suchfeld
- **Kategoriefilter**: Einschränkung der Suche auf bestimmte Entitätstypen (Journal, Kontakte, Orte, etc.)
- **Typo-Toleranz**: Fuzzy-Matching via PostgreSQL `pg_trgm` Extension
- **Relevanz-Ranking**: Sortierung der Ergebnisse nach Relevanz
- **Snippet-Vorschau**: Anzeige von Textausschnitten mit hervorgehobenen Suchbegriffen
- **Direkte Navigation**: Klick auf Treffer führt zur entsprechenden Detailseite

### 1.2 Suchbare Entitäten

| Priorität | Entität | Begründung |
|-----------|---------|------------|
| **Hoch** | JournalEntry | Kerndaten der App, häufig durchsucht |
| **Hoch** | Contact | Personen-Suche für PRM-Funktionalität |
| **Mittel** | Location | Orte durchsuchen |
| **Mittel** | Taxonomy | Tags/Kategorien finden |
| **Mittel** | Task | Aufgaben durchsuchen |
| **Mittel** | ActValue | ACT-Werte durchsuchen |
| **Mittel** | ActGoal | ACT-Ziele durchsuchen |
| **Mittel** | Habit | Gewohnheiten durchsuchen |
| **Niedrig** | Bookmark | Lesezeichen durchsuchen |
| **Niedrig** | CalendarEvent | Termine durchsuchen |
| **Niedrig** | Consumption | Medienkonsum durchsuchen |

### 1.3 Nicht suchbar (bewusst ausgeschlossen)

| Entität/Feld | Begründung |
|--------------|------------|
| DayEntry (aiSummary) | Auf Wunsch ausgeschlossen |
| MediaAsset (ocrText) | Auf Wunsch ausgeschlossen |
| Contact.emailPrivate/emailWork | Keine E-Mails durchsuchbar |
| JournalEntry mit `isSensitive=true` | Sensitive Einträge ausblenden |
| Archivierte Kontakte (`isArchived=true`) | Nicht durchsuchbar |
| Gelöschte Einträge (`deletedAt IS NOT NULL`) | Nicht durchsuchbar |
| User | Single-User-App, keine Suche nötig |
| Entity (Registry) | Meta-Tabelle, kein suchbarer Inhalt |
| TimeBox | Nur Zeitstruktur, kein Text |
| HabitCheckIn | Nur Status, selten Text |
| Measurement | Numerische Werte, keine Textsuche |
| SyncProvider/SyncRun/ExternalSync | Technische Daten |
| Embedding | Vektor-Daten |
| Trash | Gelöschte Daten nicht durchsuchen |

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           NAVBAR / HEADER                            │   │
│  │  ┌──────┐                                                           │   │
│  │  │  🔍  │  ← Lupensymbol (kompakt)                                  │   │
│  │  └──────┘                                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │ Klick                                   │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SearchOverlay (öffnet sich)                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  🔍 │ Suche...                                      │ ✕     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  Filter: [Alle] [Journal] [Kontakte] [Orte] [Tasks] ...    │   │   │
│  │  ├─────────────────────────────────────────────────────────────┤   │   │
│  │  │  📔 JOURNAL (12 Treffer)                                    │   │   │
│  │  │  ├─ 13.12.2024 - Meeting mit Anna                           │   │   │
│  │  │  │  "...das <mark>Meeting</mark> war produktiv..."          │   │   │
│  │  │  └─ Mehr anzeigen...                                         │   │   │
│  │  │                                                               │   │   │
│  │  │  👤 KONTAKTE (3 Treffer)                                    │   │   │
│  │  │  └─ Anna Müller - Kollegin                                   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTP GET /api/search?q=...&types=...
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Next.js API)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    app/api/search/route.ts                          │   │
│  │  - Query-Validierung (Zod)                                          │   │
│  │  - Auth-Check (userId aus Session)                                  │   │
│  │  - Delegiert an SearchService                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    lib/services/searchService.ts                    │   │
│  │  - Parallele Suche über alle aktivierten Entitätstypen              │   │
│  │  - PostgreSQL Full-Text Search + pg_trgm via $queryRaw              │   │
│  │  - Relevanz-Ranking und Snippet-Generierung                         │   │
│  │  - Ergebnis-Aggregation und Sortierung                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ SQL mit tsvector/tsquery + similarity()
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL DATABASE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Extensions: pg_trgm (Typo-Toleranz)                                        │
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │   JournalEntry    │  │     Contact       │  │    Location       │       │
│  │  + GIN Index FTS  │  │  + GIN Index FTS  │  │  + GIN Index FTS  │       │
│  │  + GIN Index TRGM │  │  + GIN Index TRGM │  │  + GIN Index TRGM │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │     Taxonomy      │  │      Task         │  │   ActValue/Goal   │       │
│  │  + GIN Index FTS  │  │  + GIN Index FTS  │  │  + GIN Index FTS  │       │
│  │  + GIN Index TRGM │  │  + GIN Index TRGM │  │  + GIN Index TRGM │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                              │
│  Weitere Tabellen: Habit, Bookmark, CalendarEvent, Consumption              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponentenbeschreibung

### 3.1 Frontend-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **SearchButton** | Lupensymbol im Header, öffnet SearchOverlay bei Klick |
| **SearchOverlay** | Overlay/Modal mit Suchfeld und Ergebnissen |
| **SearchResultsPanel** | Gruppierte Suchergebnisse mit Filterchips |
| **SearchResultItem** | Einzelnes Suchergebnis mit Icon, Titel, Snippet |
| **SearchFilterChips** | Horizontale Chip-Leiste zur Filterung nach Entitätstyp |

### 3.2 Backend-Services

| Service | Beschreibung |
|---------|--------------|
| **SearchService** | Zentrale Suchlogik, koordiniert Suche über alle Entitäten |
| **SearchQueryBuilder** | Helper für PostgreSQL FTS + pg_trgm Query-Konstruktion |

### 3.3 API-Route

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/search` | GET | Globale Suche mit Query-Parameter `q`, `types[]`, `limit` |

### 3.4 Datenbank

| Komponente | Beschreibung |
|------------|--------------|
| **PostgreSQL** | Bestehende Datenbank, keine zusätzliche Infrastruktur |
| **pg_trgm Extension** | Trigram-basierte Fuzzy-Suche für Typo-Toleranz |
| **GIN-Indizes** | Generalized Inverted Index für FTS und Trigrams |
| **tsvector** | PostgreSQL-Datentyp für vorverarbeitete Suchdokumente |
| **simple/german Config** | Sprachkonfiguration (simple für gemischte Inhalte) |

---

## 4. Datenmodell

### 4.1 Betroffene Entitäten und suchbare Felder

#### JournalEntry (Höchste Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A (höchste) | Titel oft aussagekräftig |
| `content` | ✅ | B | Hauptinhalt |
| `aiSummary` | ✅ | B | KI-Zusammenfassung |
| `analysis` | ✅ | C | KI-Analyse |
| `originalTranscript` | ❌ | - | Duplikat zu content |

**Filter:** `isSensitive = false` AND `deletedAt IS NULL`

#### Contact (Hohe Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `name` | ✅ | A | Hauptidentifikator |
| `givenName` | ✅ | A | Vorname |
| `familyName` | ✅ | A | Nachname |
| `nickname` | ✅ | A | Spitzname |
| `notes` | ✅ | B | Notizen zur Person |
| `company` | ✅ | C | Firma |
| `jobTitle` | ✅ | C | Position |
| ~~`emailPrivate/emailWork`~~ | ❌ | - | Auf Wunsch ausgeschlossen |

**Filter:** `isArchived = false`

#### Location (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `name` | ✅ | A | Ortsname |
| `address` | ✅ | B | Adresse |
| `city` | ✅ | B | Stadt |
| `notes` | ✅ | C | Notizen |

#### Taxonomy (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `shortName` | ✅ | A | Kurzname |
| `longName` | ✅ | A | Langname |
| `description` | ✅ | B | Beschreibung |

**Filter:** `isArchived = false`

#### Task (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Aufgabentitel |
| `description` | ✅ | B | Beschreibung |

#### ActValue (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Wertetitel |
| `description` | ✅ | B | Beschreibung |

#### ActGoal (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Zieltitel |
| `description` | ✅ | B | Beschreibung |

#### Habit (Mittlere Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Gewohnheitstitel |
| `description` | ✅ | B | Beschreibung |

#### Bookmark (Niedrige Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Lesezeichen-Titel |
| `description` | ✅ | B | Beschreibung |
| `url` | ✅ | C | URL |

#### CalendarEvent (Niedrige Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Termintitel |
| `description` | ✅ | B | Beschreibung |
| `location` | ✅ | C | Ort |

#### Consumption (Niedrige Priorität)

| Feld | Suchbar | Gewichtung | Begründung |
|------|---------|------------|------------|
| `title` | ✅ | A | Medientitel |
| `artist` | ✅ | B | Künstler/Autor |

### 4.2 Datenbank-Setup (SQL-Skript)

Da `prisma db push` verwendet wird (keine Migrationen), werden die Indizes via **separates SQL-Skript** angelegt. Dieses Skript ist idempotent und kann jederzeit erneut ausgeführt werden.

#### Datei: `scripts/setup-fulltext-search.sql`

```sql
-- =============================================================================
-- Comp-ACT-Diary: Full-Text Search Setup
-- =============================================================================
-- Dieses Skript richtet die Volltextsuche ein. Es ist idempotent und kann
-- nach jedem `prisma db push` oder Datenbank-Reset ausgeführt werden.
--
-- Ausführung: psql -d <database> -f scripts/setup-fulltext-search.sql
-- Oder via Node.js: npx ts-node scripts/setup-fulltext-search.ts
-- =============================================================================

-- 1. Extension für Typo-Toleranz aktivieren
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Full-Text Search Indizes (mit 'simple' Config für DE/EN gemischt)

-- JournalEntry: Hauptinhalt durchsuchbar
CREATE INDEX IF NOT EXISTS idx_journal_entry_fts ON "JournalEntry" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(content, '') || ' ' || 
  COALESCE("aiSummary", '') || ' ' || 
  COALESCE(analysis, '')
));

-- Contact: Namen und Notizen durchsuchbar (ohne E-Mails)
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

-- Location: Ortsinfos durchsuchbar
CREATE INDEX IF NOT EXISTS idx_location_fts ON "Location" 
USING gin(to_tsvector('simple', 
  COALESCE(name, '') || ' ' || 
  COALESCE(address, '') || ' ' || 
  COALESCE(city, '') || ' ' || 
  COALESCE(notes, '')
));

-- Taxonomy: Tags/Kategorien durchsuchbar
CREATE INDEX IF NOT EXISTS idx_taxonomy_fts ON "Taxonomy" 
USING gin(to_tsvector('simple', 
  COALESCE("shortName", '') || ' ' || 
  COALESCE("longName", '') || ' ' || 
  COALESCE(description, '')
));

-- Task: Aufgaben durchsuchbar
CREATE INDEX IF NOT EXISTS idx_task_fts ON "Task" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- ActValue: Werte durchsuchbar
CREATE INDEX IF NOT EXISTS idx_act_value_fts ON "ActValue" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- ActGoal: Ziele durchsuchbar
CREATE INDEX IF NOT EXISTS idx_act_goal_fts ON "ActGoal" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- Habit: Gewohnheiten durchsuchbar
CREATE INDEX IF NOT EXISTS idx_habit_fts ON "Habit" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
));

-- Bookmark: Lesezeichen durchsuchbar
CREATE INDEX IF NOT EXISTS idx_bookmark_fts ON "Bookmark" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(url, '')
));

-- CalendarEvent: Termine durchsuchbar
CREATE INDEX IF NOT EXISTS idx_calendar_event_fts ON "CalendarEvent" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(location, '')
));

-- Consumption: Medienkonsum durchsuchbar
CREATE INDEX IF NOT EXISTS idx_consumption_fts ON "Consumption" 
USING gin(to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(artist, '')
));

-- 3. Trigram-Indizes für Typo-Toleranz (wichtigste Tabellen)

-- JournalEntry Trigram
CREATE INDEX IF NOT EXISTS idx_journal_entry_trgm ON "JournalEntry" 
USING gin((COALESCE(title, '') || ' ' || COALESCE(content, '')) gin_trgm_ops);

-- Contact Trigram
CREATE INDEX IF NOT EXISTS idx_contact_trgm ON "Contact" 
USING gin((COALESCE(name, '') || ' ' || COALESCE(nickname, '')) gin_trgm_ops);

-- Location Trigram
CREATE INDEX IF NOT EXISTS idx_location_trgm ON "Location" 
USING gin((COALESCE(name, '') || ' ' || COALESCE(city, '')) gin_trgm_ops);

-- Task Trigram
CREATE INDEX IF NOT EXISTS idx_task_trgm ON "Task" 
USING gin(COALESCE(title, '') gin_trgm_ops);

-- Habit Trigram
CREATE INDEX IF NOT EXISTS idx_habit_trgm ON "Habit" 
USING gin(COALESCE(title, '') gin_trgm_ops);

-- 4. Ausgabe zur Bestätigung
DO $$
BEGIN
  RAISE NOTICE 'Full-Text Search Setup completed successfully!';
  RAISE NOTICE 'Extensions: pg_trgm enabled';
  RAISE NOTICE 'FTS Indexes: 11 created';
  RAISE NOTICE 'Trigram Indexes: 5 created';
END $$;
```

### 4.3 TypeScript-Wrapper für SQL-Setup

#### Datei: `scripts/setup-fulltext-search.ts`

```typescript
/**
 * Setup-Skript für Volltextsuche.
 * Kann nach jedem `prisma db push` oder DB-Reset ausgeführt werden.
 * 
 * Ausführung: npx ts-node scripts/setup-fulltext-search.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Setting up Full-Text Search...');
    
    const sqlPath = path.join(__dirname, 'setup-fulltext-search.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // SQL in einzelne Statements splitten und ausführen
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement + ';');
    }
    
    console.log('✅ Full-Text Search setup completed!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Technologie-Entscheidung

#### Entscheidung: **PostgreSQL Native FTS + pg_trgm**

**Begründung:**
1. **Infrastruktur**: Keine zusätzlichen Services nötig (wichtig für Docker Self-Hosting)
2. **Typo-Toleranz**: `pg_trgm` bietet Fuzzy-Matching out-of-the-box
3. **Datenmenge**: Persönliche Tagebuch-App, erwartet <50'000 Datensätze → ausreichend
4. **Konsistenz**: Suchergebnisse sind immer aktuell (keine Sync-Verzögerung)
5. **Kosten**: Keine zusätzlichen Lizenzkosten

### 5.2 API-Route

#### `GET /api/search`

**Query-Parameter:**

| Parameter | Typ | Pflicht | Default | Beschreibung |
|-----------|-----|---------|---------|--------------|
| `q` | string | Ja | - | Suchbegriff (min. 2 Zeichen) |
| `types` | string[] | Nein | alle | Entitätstypen zum Filtern |
| `limit` | number | Nein | 20 | Max. Ergebnisse pro Typ |

**Response:**

```typescript
interface SearchResponse {
  query: string;
  totalCount: number;
  results: SearchResultGroup[];
}

interface SearchResultGroup {
  type: SearchableEntityType;
  label: string;
  icon: string;
  count: number;
  items: SearchResultItem[];
}

interface SearchResultItem {
  id: string;
  type: SearchableEntityType;
  title: string;
  snippet: string;        // Mit <mark>-Tags für Highlighting
  url: string;            // Ziel-URL für Navigation
  date?: string;          // Datum falls vorhanden
  rank: number;           // Relevanz-Score
}

type SearchableEntityType = 
  | 'journal_entry'
  | 'contact'
  | 'location'
  | 'taxonomy'
  | 'task'
  | 'act_value'
  | 'act_goal'
  | 'habit'
  | 'bookmark'
  | 'calendar_event'
  | 'consumption';
```

### 5.3 Zod-Schemas

```typescript
// lib/validators/search.ts
import { z } from 'zod';

export const searchableEntityTypes = [
  'journal_entry',
  'contact',
  'location',
  'taxonomy',
  'task',
  'act_value',
  'act_goal',
  'habit',
  'bookmark',
  'calendar_event',
  'consumption',
] as const;

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Suchbegriff muss mindestens 2 Zeichen haben'),
  types: z.array(z.enum(searchableEntityTypes)).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
```

---

## 6. UX (Komponenten und Screens)

### 6.1 SearchButton (im Header)

**Position:** Im Header/Navbar als kompaktes Lupensymbol

**Features:**
- Nur ein Icon (🔍), um Platz zu sparen
- Klick öffnet SearchOverlay
- Kein Keyboard-Shortcut

**Mockup:**
```
┌──────────────────────────────────────────────────────────────────┐
│  LOGO    [Nav1] [Nav2] [Nav3]                         🔍  👤    │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 SearchOverlay

**Erscheint:** Als Overlay/Modal über der Seite (oder unterhalb der Navbar)

**Features:**
- Suchfeld mit Auto-Focus
- Filter-Chips horizontal scrollbar
- Gruppierte Ergebnisse nach Typ
- Max. 5 Ergebnisse pro Gruppe initial
- "Mehr anzeigen"-Link pro Gruppe
- Keyboard-Navigation (Pfeiltasten, Enter)
- ESC oder Klick ausserhalb schliesst Overlay
- X-Button zum Schliessen

**Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 │ Suche...                                          │ ✕     │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [Alle ✓] [📔 Journal] [👤 Kontakte] [📍 Orte] [→]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📔 JOURNAL (12 Treffer)                                        │
│  ├─ 13.12.2024 - Meeting mit Anna                               │
│  │  "...das <mark>Meeting</mark> war produktiv..."              │
│  ├─ 10.12.2024 - Wochenreflexion                                │
│  │  "...<mark>Anna</mark> hat mir geholfen bei..."              │
│  └─ Mehr anzeigen...                                             │
│                                                                  │
│  👤 KONTAKTE (3 Treffer)                                        │
│  ├─ Anna Müller                                                  │
│  │  Kollegin bei Firma XY                                       │
│  └─ Mehr anzeigen...                                             │
│                                                                  │
│  📍 ORTE (1 Treffer)                                            │
│  └─ Café Annalena - Zürich                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Navigation zu Suchergebnissen

#### Existierende Routes

| Entitätstyp | URL-Muster | Status |
|-------------|------------|--------|
| Contact | `/prm/{slug}` | ✅ Existiert |
| (Hauptseite mit Datum) | `/day/{date}` → Redirect zu `/` | ✅ Existiert |

#### Neue Routes (Beta-Prototypen zu erstellen)

| Entitätstyp | URL-Muster | Beispiel | Status |
|-------------|------------|----------|--------|
| JournalEntry | `/?date={localDate}&entry={id}` | `/?date=2024-12-13&entry=abc123` | 🆕 Query-Param |
| Location | `/locations/{slug}` | `/locations/cafe-annalena` | 🆕 Beta |
| Taxonomy | `/settings/tags?highlight={id}` | `/settings/tags?highlight=xyz` | 🆕 Beta |
| Task | `/tasks?highlight={id}` | `/tasks?highlight=abc` | 🆕 Beta |
| ActValue | `/values/{slug}` | `/values/family` | 🆕 Beta |
| ActGoal | `/goals/{slug}` | `/goals/marathon` | 🆕 Beta |
| Habit | `/habits?highlight={id}` | `/habits?highlight=xyz` | 🆕 Beta |
| Bookmark | `/bookmarks?highlight={id}` | `/bookmarks?highlight=abc` | 🆕 Beta |
| CalendarEvent | `/?date={localDate}&event={id}` | `/?date=2024-12-13&event=xyz` | 🆕 Query-Param |
| Consumption | `/?date={localDate}&consumption={id}` | `/?date=2024-12-13&consumption=abc` | 🆕 Query-Param |

### 6.4 Journal-Entry Navigation (Spezialfall)

**Problem:** Journal-Einträge haben aktuell keine eigene URL. Sie werden im `DiaryEntriesAccordion` auf der Hauptseite angezeigt.

**Lösung:** Query-Parameter-basierte Navigation:

1. **URL-Format:** `/?date={localDate}&entry={entryId}`
2. **Verhalten auf Hauptseite:**
   - Lese `entry` Query-Parameter
   - Navigiere zum entsprechenden Datum
   - Öffne das Accordion für den Eintrag
   - Scrolle zum Eintrag (`scrollIntoView`)
   - Highlighte den Eintrag kurz visuell

**Implementierung in `app/page.tsx`:**
```typescript
// In useEffect: Query-Params auslesen
const searchParams = useSearchParams();
const highlightEntryId = searchParams.get('entry');

// Nach Laden der Notes: Zum Eintrag scrollen
useEffect(() => {
  if (highlightEntryId && notes.length > 0) {
    const element = document.getElementById(`entry-${highlightEntryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-pulse'); // CSS-Animation
      setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
    }
  }
}, [highlightEntryId, notes]);
```

**Anpassung in `DiaryEntriesAccordion.tsx`:**
- Jedes Accordion-Item erhält `id={`entry-${n.id}`}`
- Wenn `highlightEntryId` gesetzt ist, wird das entsprechende Accordion automatisch geöffnet

---

## 7. Dependencies

### 7.1 Neue Dependencies

**Keine neuen npm-Dependencies erforderlich!**

PostgreSQL FTS + pg_trgm ist nativ verfügbar und wird via Prisma `$queryRaw` angesprochen.

### 7.2 Verwendete bestehende Dependencies

| Dependency | Verwendung |
|------------|------------|
| `@prisma/client` | `$queryRaw` für FTS-Queries |
| `zod` | Query-Parameter-Validierung |
| `@tabler/icons-react` | Icons für Suchergebnisse |
| `daisyui` | UI-Komponenten (Input, Modal, Chips) |

---

## 8. Dateistruktur

### 8.1 Neue Dateien

```
comp-act-diary/
├── app/
│   ├── api/
│   │   └── search/
│   │       └── route.ts                    # API-Route für globale Suche
│   ├── locations/
│   │   └── [slug]/
│   │       └── page.tsx                    # 🆕 Beta: Location-Detail
│   ├── values/
│   │   └── [slug]/
│   │       └── page.tsx                    # 🆕 Beta: ActValue-Detail
│   ├── goals/
│   │   └── [slug]/
│   │       └── page.tsx                    # 🆕 Beta: ActGoal-Detail
│   ├── habits/
│   │   └── page.tsx                        # 🆕 Beta: Habits-Liste
│   ├── tasks/
│   │   └── page.tsx                        # 🆕 Beta: Tasks-Liste
│   ├── bookmarks/
│   │   └── page.tsx                        # 🆕 Beta: Bookmarks-Liste
│   └── settings/
│       └── tags/
│           └── page.tsx                    # 🆕 Beta: Tag-Verwaltung
├── components/
│   ├── SearchButton.tsx                    # Lupensymbol für Header
│   ├── SearchOverlay.tsx                   # Such-Overlay/Modal
│   ├── SearchResultsPanel.tsx              # Ergebnis-Panel mit Gruppen
│   ├── SearchResultItem.tsx                # Einzelnes Suchergebnis
│   └── SearchFilterChips.tsx               # Filterchips für Entitätstypen
├── hooks/
│   └── useGlobalSearch.ts                  # Hook für Suchlogik
├── lib/
│   ├── services/
│   │   ├── searchService.ts                # Zentrale Suchlogik
│   │   └── searchQueryBuilder.ts           # FTS + Trigram Query-Helper
│   └── validators/
│       └── search.ts                       # Zod-Schemas für Suche
├── scripts/
│   ├── setup-fulltext-search.sql           # SQL für Indizes
│   └── setup-fulltext-search.ts            # TypeScript-Wrapper
└── types/
    └── search.ts                           # TypeScript-Interfaces
```

### 8.2 Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `components/Navbar.tsx` (oder Header) | Integration von `SearchButton` |
| `app/page.tsx` | Query-Param-Handler für `entry` zum Highlighting |
| `components/DiaryEntriesAccordion.tsx` | `id`-Attribut pro Eintrag, Auto-Open bei Highlight |
| `app/globals.css` | CSS für `.highlight-pulse` Animation |

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Zod-Schema und TypeScript-Interfaces erstellen

**Ziel:** Typsichere Grundlagen für die Suche definieren

**Anforderungen:**
- `lib/validators/search.ts` mit Zod-Schema für Query-Parameter
- `types/search.ts` mit TypeScript-Interfaces für Response
- Alle 11 suchbaren Entitätstypen als Union-Type (ohne DayEntry und MediaAsset)

**Tipps:**
- Verwende `as const` für Enum-ähnliche Arrays
- Exportiere sowohl Schema als auch inferred Types

---

### Schritt 2 (LLM): SQL-Setup-Skript erstellen

**Ziel:** Idempotentes SQL-Skript für Volltextsuche-Setup

**Anforderungen:**
- `scripts/setup-fulltext-search.sql` mit allen Indizes
- `scripts/setup-fulltext-search.ts` als TypeScript-Wrapper
- pg_trgm Extension aktivieren
- GIN-Indizes für FTS (tsvector mit 'simple' Config)
- GIN-Indizes für Trigram (wichtigste Tabellen)
- Alle `CREATE INDEX IF NOT EXISTS` für Idempotenz

**Tipps:**
- Verwende 'simple' Config statt 'german' für gemischte DE/EN Inhalte
- Trigram-Indizes nur für die wichtigsten Felder (Performance)

---

### Schritt 3 (LLM): SearchQueryBuilder implementieren

**Ziel:** Helper-Funktionen für sichere PostgreSQL FTS + Trigram Queries

**Anforderungen:**
- `lib/services/searchQueryBuilder.ts`
- Funktion `sanitizeSearchTerm()`: Escapen von Sonderzeichen für tsquery
- Funktion `buildTsQuery()`: Konvertiert User-Input in gültiges tsquery
- Funktion `buildSimilarityQuery()`: Generiert pg_trgm similarity-Query
- Funktion `buildHeadlineOptions()`: Generiert ts_headline-Optionen für Snippets

**Tipps:**
- Sonderzeichen die escaped werden müssen: `& | ! ( ) : ' \ *`
- Kombiniere FTS-Score mit Similarity-Score für bestes Ranking

---

### Schritt 4 (LLM): SearchService implementieren (JournalEntry + Contact)

**Ziel:** Kernlogik für die zwei wichtigsten Entitätstypen

**Anforderungen:**
- `lib/services/searchService.ts`
- Methode `searchJournalEntries()` mit:
  - FTS über title, content, aiSummary, analysis
  - pg_trgm für Fuzzy-Matching
  - ts_rank für Relevanz-Sortierung
  - ts_headline für Snippet-Generierung
  - Filter: `userId`, `isSensitive = false`, `deletedAt IS NULL`
- Methode `searchContacts()` mit:
  - FTS über name, givenName, familyName, nickname, notes, company, jobTitle
  - KEINE E-Mail-Felder
  - Filter: `userId`, `isArchived = false`

**Tipps:**
- Verwende `prisma.$queryRaw` mit Template-Strings
- Nutze `Prisma.sql` für sichere Parameter-Interpolation
- Setze `StartSel = '<mark>', StopSel = '</mark>'` für Highlighting

---

### Schritt 5 (LLM): Datenbank-Setup ausführen

**Ziel:** Indizes in Datenbank anlegen

**Aktionen:**
- `npx prisma db push` ausführen (falls Schema-Änderungen)
- `npx ts-node scripts/setup-fulltext-search.ts` ausführen
- Ausgabe prüfen auf Erfolg

---

### Schritt 6 (LLM): API-Route implementieren

**Ziel:** REST-Endpoint für Frontend

**Anforderungen:**
- `app/api/search/route.ts`
- GET-Handler mit Query-Parameter-Validierung via Zod
- Auth-Check: userId aus Session extrahieren
- Delegiert an SearchService
- Fehlerbehandlung mit aussagekräftigen Meldungen
- Response gemäss definiertem Interface

**Tipps:**
- Verwende `searchParams.get()` und `searchParams.getAll()` für Query-Params

---

### Schritt 7 (LLM): SearchService um weitere Entitäten erweitern

**Ziel:** Alle geplanten Entitätstypen suchbar machen

**Anforderungen:**
- Methoden für: Location, Taxonomy, Task, ActValue, ActGoal, Habit
- Hauptmethode `search()` die alle Einzelsuchen aggregiert
- Parallele Ausführung via `Promise.all()` für Performance
- Ergebnisse nach Typ gruppieren und sortieren

**Tipps:**
- Beachte die unterschiedlichen URL-Muster pro Typ
- Taxonomy: Filter auf `isArchived = false`

---

### Schritt 8 (LLM): SearchService um niedrig-priorisierte Entitäten erweitern

**Ziel:** Komplette Abdeckung aller suchbaren Entitäten

**Anforderungen:**
- Methoden für: Bookmark, CalendarEvent, Consumption
- Integration in Hauptsuche

---

### Schritt 9 (LLM): useGlobalSearch Hook implementieren

**Ziel:** Frontend-State-Management für Suche

**Anforderungen:**
- `hooks/useGlobalSearch.ts`
- State: query, results, isLoading, error, activeFilters, isOpen
- Debouncing mit 300ms Verzögerung
- Automatischer API-Call wenn query >= 2 Zeichen
- Filter-Toggle-Funktion
- Open/Close-Funktionen für Overlay

**Tipps:**
- Verwende `useCallback` für stabile Referenzen
- Cancellation bei neuem Input (AbortController)

---

### Schritt 10 (LLM): SearchButton Komponente

**Ziel:** Lupensymbol für Header

**Anforderungen:**
- `components/SearchButton.tsx`
- Nur Lupen-Icon (IconSearch von Tabler)
- onClick öffnet SearchOverlay (via Hook)
- Kompaktes Design passend zum Header

---

### Schritt 11 (LLM): SearchOverlay Komponente

**Ziel:** Such-Overlay mit Suchfeld und Ergebnissen

**Anforderungen:**
- `components/SearchOverlay.tsx`
- Modal/Overlay-Darstellung
- Auto-Focus auf Suchfeld bei Öffnen
- Integration von SearchResultsPanel und SearchFilterChips
- X-Button und ESC zum Schliessen
- Klick ausserhalb schliesst ebenfalls

**Tipps:**
- Verwende daisyUI `modal` oder eigene Overlay-Implementierung
- `createPortal` für korrektes Z-Index-Handling

---

### Schritt 12 (LLM): SearchResultsPanel und SearchResultItem

**Ziel:** Ergebnis-Darstellung

**Anforderungen:**
- `components/SearchResultsPanel.tsx`: Gruppierte Ergebnisse
- `components/SearchResultItem.tsx`: Einzelnes Ergebnis
- Icon basierend auf Typ
- Titel mit Link
- Snippet mit Highlighting (`dangerouslySetInnerHTML`)
- Datum falls vorhanden
- Hover-State

---

### Schritt 13 (LLM): SearchFilterChips Komponente

**Ziel:** Typ-Filter als horizontale Chips

**Anforderungen:**
- `components/SearchFilterChips.tsx`
- Horizontale Scrollbar bei vielen Chips
- Aktive Filter visuell hervorgehoben
- Toggle-Verhalten bei Klick

**Tipps:**
- Verwende daisyUI `badge` oder `btn btn-xs`
- Icons pro Typ aus Tabler

---

### Schritt 14 (LLM): Integration in Header/Navbar

**Ziel:** Suchbutton global verfügbar machen

**Anforderungen:**
- SearchButton in Navbar/Header einbauen
- SearchOverlay als Teil des Layouts

---

### Schritt 15 (LLM): Journal-Entry Highlighting implementieren

**Ziel:** Navigation zu spezifischem Journal-Eintrag

**Anforderungen:**
- `app/page.tsx`: Query-Parameter `entry` auslesen
- Bei gesetztem Parameter: Datum setzen, Accordion öffnen, scrollen
- `components/DiaryEntriesAccordion.tsx`: `id` Attribut pro Eintrag
- CSS-Animation für Highlight-Effekt

**Tipps:**
- `useSearchParams()` von Next.js
- `scrollIntoView({ behavior: 'smooth', block: 'center' })`

---

### Schritt 16 (LLM): Beta-Seiten als Prototypen erstellen

**Ziel:** Fehlende Zielseiten für Suchergebnisse

**Anforderungen:**
- Einfache Prototyp-Seiten für:
  - `/locations/[slug]/page.tsx`
  - `/values/[slug]/page.tsx`
  - `/goals/[slug]/page.tsx`
  - `/habits/page.tsx`
  - `/tasks/page.tsx`
  - `/bookmarks/page.tsx`
  - `/settings/tags/page.tsx`
- Jede Seite mit "Beta"-Badge markieren
- Grundlegende Daten-Anzeige aus DB
- Link zurück zur Hauptseite

**Tipps:**
- Minimaler Aufwand, nur Grundfunktionalität
- Bestehende API-Routes nutzen falls vorhanden

---

### Schritt 17 (LLM): Unit-Tests für SearchService

**Ziel:** Automatisierte Tests für Backend-Logik

**Anforderungen:**
- Vitest-Tests in `__tests__/lib/services/searchService.test.ts`
- Mock für Prisma-Client
- Tests für Query-Sanitization
- Tests für Ergebnis-Aggregation

---

### Schritt 18 (LLM): Komponenten-Tests

**Ziel:** Automatisierte Tests für Frontend-Komponenten

**Anforderungen:**
- Tests für SearchButton (Rendering, Click-Handler)
- Tests für SearchResultItem (Rendering, Highlighting)
- Tests für useGlobalSearch Hook (Debouncing, State)

---

### Schritt 19 (Mensch): Manuelle UI-Tests

**Ziel:** Funktionalität verifizieren

**Aktionen:**
- Suche testen mit verschiedenen Begriffen
- Typo-Toleranz testen (z.B. "Meting" statt "Meeting")
- Filter-Funktion testen
- Navigation zu Ergebnissen testen
- Journal-Entry-Highlighting testen
- Mobile-Darstellung prüfen
- Beta-Seiten aufrufen

---

## 10. Automatisiertes Testing

### 10.1 Unit-Tests (Vitest)

| Test | Datei | Beschreibung |
|------|-------|--------------|
| SearchQueryBuilder | `__tests__/lib/services/searchQueryBuilder.test.ts` | Sanitization, tsquery-Generierung, Trigram |
| SearchService | `__tests__/lib/services/searchService.test.ts` | Mock-Tests für Suchlogik |
| Zod-Schema | `__tests__/lib/validators/search.test.ts` | Schema-Validierung |

### 10.2 Komponenten-Tests (Vitest + React Testing Library)

| Test | Datei | Beschreibung |
|------|-------|--------------|
| SearchButton | `__tests__/components/SearchButton.test.tsx` | Rendering, Click |
| SearchResultItem | `__tests__/components/SearchResultItem.test.tsx` | Rendering, Highlighting |
| useGlobalSearch | `__tests__/hooks/useGlobalSearch.test.ts` | Hook-Logik, Debouncing |

### 10.3 Testbefehle

```bash
# Alle Tests
npm run test

# Nur Suche-bezogene Tests
npm run test -- --grep "search"

# Mit Coverage
npm run test -- --coverage
```

---

## 11. Manuelles Testing

### 11.1 Funktionale Tests

| Test-ID | Beschreibung | Erwartetes Ergebnis |
|---------|--------------|---------------------|
| MT-01 | Klick auf Lupensymbol | SearchOverlay öffnet sich |
| MT-02 | Suche nach existierendem Journaleintrag-Inhalt | Ergebnis erscheint mit korrektem Snippet |
| MT-03 | Suche nach Kontaktname | Kontakt erscheint in Ergebnissen |
| MT-04 | Suche mit Tippfehler (z.B. "Meting") | Ergebnisse dank pg_trgm gefunden |
| MT-05 | Suche mit < 2 Zeichen | Keine Suche ausgelöst |
| MT-06 | Suche nach nicht-existierendem Begriff | "Keine Ergebnisse"-Meldung |
| MT-07 | Klick auf Journal-Suchergebnis | Navigation zu Hauptseite, Eintrag highlighted |
| MT-08 | Klick auf Kontakt-Suchergebnis | Navigation zu `/prm/{slug}` |
| MT-09 | Filter auf "Journal" | Nur Journal-Ergebnisse angezeigt |
| MT-10 | Mehrere Filter aktiv | Nur ausgewählte Typen angezeigt |
| MT-11 | ESC-Taste | Overlay schliesst sich |
| MT-12 | Klick auf X-Button | Overlay schliesst sich |
| MT-13 | Klick ausserhalb Overlay | Overlay schliesst sich |
| MT-14 | Suche nach sensitivem Eintrag | Eintrag wird NICHT gefunden |
| MT-15 | Suche nach archiviertem Kontakt | Kontakt wird NICHT gefunden |

### 11.2 Performance-Tests

| Test-ID | Beschreibung | Erwartetes Ergebnis |
|---------|--------------|---------------------|
| PT-01 | Suche mit vielen Ergebnissen (> 100) | Antwortzeit < 500ms |
| PT-02 | Schnelles Tippen (10 Zeichen in 1s) | Nur 1-2 API-Calls (Debouncing) |

### 11.3 Beta-Seiten Tests

| Test-ID | Beschreibung | Erwartetes Ergebnis |
|---------|--------------|---------------------|
| BT-01 | Navigation zu `/locations/{slug}` | Beta-Seite wird angezeigt |
| BT-02 | Navigation zu `/values/{slug}` | Beta-Seite wird angezeigt |
| BT-03 | Navigation zu `/goals/{slug}` | Beta-Seite wird angezeigt |
| BT-04 | Navigation zu `/habits` | Beta-Seite wird angezeigt |
| BT-05 | Navigation zu `/tasks` | Beta-Seite wird angezeigt |
| BT-06 | Navigation zu `/bookmarks` | Beta-Seite wird angezeigt |
| BT-07 | Navigation zu `/settings/tags` | Beta-Seite wird angezeigt |

### 11.4 Mobile Tests

| Test-ID | Beschreibung | Erwartetes Ergebnis |
|---------|--------------|---------------------|
| RM-01 | Lupensymbol auf Mobile | Korrekt sichtbar und klickbar |
| RM-02 | SearchOverlay auf Mobile | Fullscreen oder gut scrollbar |
| RM-03 | Suchergebnisse auf Mobile | Lesbar, Touch-freundlich |

---

*Dieses Konzept (v2) berücksichtigt alle Rückmeldungen. Die Implementierung kann mit Schritt 1 beginnen.*
