# Konzept: Batch-Verarbeitung für Journal-AI-Pipeline

> **Status:** Entwurf  
> **Erstellt:** 2025-12-26  
> **Autor:** LLM-generiert

---

## Inhaltsverzeichnis

1. [Geplante Features](#1-geplante-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Erläuterung der Komponenten](#3-erläuterung-der-komponenten)
4. [Services, Libraries und API-Routen](#4-services-libraries-und-api-routen)
5. [UX (Komponenten und Screens)](#5-ux-komponenten-und-screens)
6. [Neue Dependencies](#6-neue-dependencies)
7. [Dateistruktur](#7-dateistruktur)
8. [Implementierungsplan](#8-implementierungsplan)
9. [Automatisiertes Testing](#9-automatisiertes-testing)
10. [Manuelles Testing](#10-manuelles-testing)

---

## 1. Geplante Features

### 1.1 Batch-Verarbeitung von Journal Entries

- **Datumsbereich-Auswahl**: Von-Bis-Datum zur Filterung der zu verarbeitenden Einträge
- **JournalEntryType-Filter**: Dynamisch geladene Checkboxen basierend auf vorhandenen Typen in der DB
- **Selektierbare Pipeline-Schritte**:
  - Titel generieren (NEU: konfigurierbar)
  - Content verbessern
  - Analyse erstellen
  - Zusammenfassung erstellen
  - Gesamte Pipeline (alle Schritte)
- **Überschreiben-Modus**:
  - "Nur leere Felder" → Überspringt Einträge, die bereits Werte haben
  - "Alles überschreiben" → Ersetzt auch bestehende Werte

### 1.2 Erweiterung der Titel-Generierung

- Integration in das bestehende AI-Settings-System
- Konfigurierbar pro JournalEntryType:
  - Modell (TogetherAI oder OpenAI)
  - Prompt
- Konsistent mit Content/Analysis/Summary-Konfiguration

### 1.3 Dry-Run mit Vorschau

- Vor der eigentlichen Verarbeitung: Anzeige der betroffenen Einträge
- Anzahl + Liste der Einträge (Datum, Titel, Typ)
- Explizite Bestätigung erforderlich

### 1.4 Fortschrittsanzeige

- Einfacher Spinner mit Zähler ("Verarbeite 5 von 42...")
- Kein Abbruch während der Verarbeitung (aus Konsistenzgründen)

### 1.5 Fehlerbehandlung

- Bei Fehler: Weitermachen mit nächstem Eintrag
- Am Ende: Zusammenfassung mit Erfolgen und Fehlern

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   /batch Page   │    │  /settings Page │    │     SiteNav (Menu)      │  │
│  │                 │    │                 │    │                         │  │
│  │ - DateRange     │    │ + Title Config  │    │ + Link zu /batch        │  │
│  │ - TypeFilter    │    │   (Modell,      │    │                         │  │
│  │ - StepSelector  │    │    Prompt)      │    └─────────────────────────┘  │
│  │ - OverwriteMode │    │                 │                                 │
│  │ - DryRun/Run    │    └────────┬────────┘                                 │
│  │ - Progress      │             │                                          │
│  │ - Results       │             │                                          │
│  └────────┬────────┘             │                                          │
│           │                      │                                          │
└───────────┼──────────────────────┼──────────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (Next.js Route Handlers)                  │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │ /api/batch/preview   │  │ /api/batch/run       │  │ /api/generate-title │  │
│  │                      │  │                      │  │ (erweitert)         │  │
│  │ - Dry-Run            │  │ - Batch-Verarbeitung │  │                     │  │
│  │ - Zählt betroffene   │  │ - Sequenziell        │  │ - Nutzt User-       │  │
│  │   Einträge           │  │ - Error-Handling     │  │   Settings          │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬──────────┘  │
│             │                         │                         │             │
│             └─────────────────────────┼─────────────────────────┘             │
│                                       ▼                                       │
│                    ┌─────────────────────────────────────┐                    │
│                    │     JournalAIService (erweitert)    │                    │
│                    │                                     │                    │
│                    │  + generateTitle()                  │                    │
│                    │  + runBatchPipeline()               │                    │
│                    │  + getAffectedEntries()             │                    │
│                    └─────────────────┬───────────────────┘                    │
│                                      │                                        │
└──────────────────────────────────────┼────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐              ┌─────────────────┐                        │
│  │   TogetherAI    │              │     OpenAI      │                        │
│  │                 │              │                 │                        │
│  │ - Content       │              │ - Titel (opt.)  │                        │
│  │ - Analysis      │              │ - Content       │                        │
│  │ - Summary       │              │ - Analysis      │                        │
│  │ - Titel (opt.)  │              │ - Summary       │                        │
│  └─────────────────┘              └─────────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (PostgreSQL)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │  JournalEntry   │  │ JournalEntryType│  │      User       │               │
│  │                 │  │                 │  │                 │               │
│  │ - title         │  │ - code          │  │ - settings      │               │
│  │ - content       │  │ - name          │  │   (JSON mit     │               │
│  │ - analysis      │  │ - icon          │  │    AI-Config)   │               │
│  │ - aiSummary     │  │                 │  │                 │               │
│  │ - typeId        │  │                 │  │                 │               │
│  │ - timeBoxId     │  │                 │  │                 │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Erläuterung der Komponenten

### 3.1 Frontend

| Komponente | Beschreibung |
|------------|--------------|
| **BatchPage** | Hauptseite `/batch` mit Formular für Batch-Konfiguration |
| **BatchFilterForm** | Formular mit Datumsbereich, Typ-Checkboxen, Step-Auswahl |
| **BatchPreview** | Zeigt Ergebnis des Dry-Runs (betroffene Einträge) |
| **BatchProgress** | Fortschrittsanzeige während der Verarbeitung |
| **BatchResults** | Zusammenfassung nach Abschluss (Erfolge/Fehler) |
| **SiteNav** | Erweitert um Link zu "Batch-Verarbeitung" im Hamburger-Menü |
| **AIConfigSection** | Erweitert um Titel-Konfiguration (Modell + Prompt) |

### 3.2 API Layer

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/batch/preview` | POST | Dry-Run: Liefert Liste betroffener Einträge |
| `/api/batch/run` | POST | Startet Batch-Verarbeitung |
| `/api/journal-entry-types` | GET | Liefert alle verfügbaren JournalEntryTypes |
| `/api/generate-title` | POST | **Erweitert**: Nutzt User-Settings für Modell/Prompt |

### 3.3 Services

| Service | Beschreibung |
|---------|--------------|
| **JournalAIService** | Erweitert um `generateTitle()`, `runBatchPipeline()`, `getAffectedEntries()` |

### 3.4 Externe Anbieter

| Anbieter | Verwendung |
|----------|------------|
| **TogetherAI** | Content, Analysis, Summary, Titel (je nach Konfiguration) |
| **OpenAI** | Titel, Content, Analysis, Summary (je nach Konfiguration) |

### 3.5 Datenbank

| Tabelle | Relevante Felder |
|---------|------------------|
| **JournalEntry** | `title`, `content`, `analysis`, `aiSummary`, `typeId`, `timeBoxId` |
| **JournalEntryType** | `code`, `name`, `icon` (dynamisch geladen) |
| **User** | `settings` (JSON mit AI-Konfiguration inkl. neuer Titel-Einstellungen) |
| **TimeBox** | `localDate` (für Datumsfilterung) |

---

## 4. Services, Libraries und API-Routen

### 4.1 Erweiterung JournalAIService

```typescript
// Neue Methoden in lib/services/journalAIService.ts

interface TitleGenerationResult {
  title: string
  tokensUsed: number
  modelUsed: string
}

interface BatchPipelineParams {
  userId: string
  dateFrom: string        // YYYY-MM-DD
  dateTo: string          // YYYY-MM-DD
  typeCodes: string[]     // z.B. ['diary', 'meal']
  steps: ('title' | 'content' | 'analysis' | 'summary')[]
  overwriteMode: 'empty_only' | 'overwrite_all'
}

interface BatchEntryResult {
  entryId: string
  entryTitle: string | null
  entryDate: string
  success: boolean
  stepsRun: string[]
  error?: string
}

interface BatchPipelineResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  results: BatchEntryResult[]
  totalTokensUsed: number
}

// Methoden:
async generateTitle(params: { journalEntryId: string; userId: string }): Promise<TitleGenerationResult>
async getAffectedEntries(params: BatchPipelineParams): Promise<JournalEntry[]>
async runBatchPipeline(params: BatchPipelineParams): Promise<BatchPipelineResult>
```

### 4.2 Neue API-Routen

#### POST /api/batch/preview

**Request:**
```json
{
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31",
  "typeCodes": ["diary", "meal"],
  "steps": ["title", "summary"],
  "overwriteMode": "empty_only"
}
```

**Response:**
```json
{
  "count": 42,
  "entries": [
    {
      "id": "uuid",
      "date": "2025-06-15",
      "title": "Mein Tagebucheintrag",
      "typeName": "Tagebuch",
      "typeIcon": "📔",
      "hasTitle": true,
      "hasContent": true,
      "hasAnalysis": false,
      "hasSummary": false
    }
  ]
}
```

#### POST /api/batch/run

**Request:** (gleich wie preview)

**Response:**
```json
{
  "totalProcessed": 42,
  "successCount": 40,
  "errorCount": 2,
  "totalTokensUsed": 125000,
  "results": [
    {
      "entryId": "uuid",
      "entryTitle": "Titel",
      "entryDate": "2025-06-15",
      "success": true,
      "stepsRun": ["title", "summary"]
    },
    {
      "entryId": "uuid2",
      "entryTitle": null,
      "entryDate": "2025-06-16",
      "success": false,
      "stepsRun": ["title"],
      "error": "API rate limit exceeded"
    }
  ]
}
```

#### GET /api/journal-entry-types

**Response:**
```json
{
  "types": [
    { "id": "uuid", "code": "diary", "name": "Tagebuch", "icon": "📔" },
    { "id": "uuid", "code": "meal", "name": "Mahlzeit", "icon": "🍽️" },
    { "id": "uuid", "code": "reflection", "name": "Reflexion", "icon": "🪞" }
  ]
}
```

### 4.3 Erweiterung defaultPrompts.ts

```typescript
// Neue Struktur für Title-Settings
interface TitleAISettings {
  modelId: string
  prompt: string
}

// Erweiterung JournalEntryTypeAISettings
interface JournalEntryTypeAISettings {
  title: TitleAISettings    // NEU
  content: { modelId: string; prompt: string }
  analysis: { modelId: string; prompt: string }
  summary: { modelId: string; prompt: string }
}

// Default-Prompt für Titel
const DEFAULT_TITLE_PROMPT = `Du bist ein Assistent, der prägnante, aussagekräftige Titel für Tagebucheinträge generiert. Der Titel soll kurz (maximal 5-7 Wörter), informativ und ansprechend sein. Antworte NUR mit dem Titel, ohne zusätzliche Erklärungen oder Anführungszeichen.`
```

---

## 5. UX (Komponenten und Screens)

### 5.1 Batch-Seite Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  CompACT Diary                                    [☰] [Avatar] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Batch-Verarbeitung                      │  │
│  │         Mehrere Journal-Einträge auf einmal bearbeiten    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────── Filter ────────────────────────────┐  │
│  │                                                           │  │
│  │  Zeitraum:  [2025-01-01] bis [2025-12-31]                │  │
│  │                                                           │  │
│  │  Eintragstypen:                                           │  │
│  │  [✓] 📔 Tagebuch    [✓] 🍽️ Mahlzeit    [ ] 🪞 Reflexion  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────── Aktionen ─────────────────────────────┐  │
│  │                                                           │  │
│  │  Was soll gemacht werden?                                 │  │
│  │  [ ] Titel generieren                                     │  │
│  │  [ ] Text verbessern (Content)                            │  │
│  │  [ ] Analyse erstellen                                    │  │
│  │  [ ] Zusammenfassung erstellen                            │  │
│  │  ─────────────────────────────────                        │  │
│  │  [✓] Gesamte Pipeline (alle oben)                         │  │
│  │                                                           │  │
│  │  Überschreiben-Modus:                                     │  │
│  │  (•) Nur leere Felder füllen                              │  │
│  │  ( ) Bestehende Werte überschreiben                       │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              [ Vorschau anzeigen (Dry-Run) ]             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Vorschau (Dry-Run Ergebnis)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────── Vorschau ────────────────────────────┐  │
│  │                                                           │  │
│  │  📊 42 Einträge werden verarbeitet                        │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Datum      │ Typ       │ Titel           │ Status   │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │ 2025-06-15 │ 📔 Tage.. │ Mein schöner... │ ⚪⚪🟢⚪ │  │  │
│  │  │ 2025-06-14 │ 🍽️ Mahl.. │ Frühstück       │ 🟢⚪⚪⚪ │  │  │
│  │  │ 2025-06-13 │ 📔 Tage.. │ (kein Titel)    │ ⚪⚪⚪⚪ │  │  │
│  │  │ ...        │ ...       │ ...             │ ...      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Legende: 🟢 = vorhanden, ⚪ = leer                       │  │
│  │           (Titel | Content | Analysis | Summary)          │  │
│  │                                                           │  │
│  │  ⚠️ Einige Einträge haben bereits Werte. Im Modus        │  │
│  │     "Nur leere Felder" werden diese übersprungen.         │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────────────────────┐ │
│  │     Abbrechen      │  │   ▶️ Verarbeitung starten (42)    │ │
│  └────────────────────┘  └────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Fortschrittsanzeige

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌────────────────── Verarbeitung läuft ─────────────────────┐  │
│  │                                                           │  │
│  │                      ⏳                                   │  │
│  │                                                           │  │
│  │              Verarbeite Eintrag 17 von 42                 │  │
│  │                                                           │  │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░  40%               │  │
│  │                                                           │  │
│  │  Aktuell: "Mein Tagebucheintrag vom 15.06."              │  │
│  │  Schritt: Zusammenfassung erstellen...                    │  │
│  │                                                           │  │
│  │  ✅ 16 erfolgreich | ❌ 0 Fehler                          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Ergebnis-Zusammenfassung

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────── Verarbeitung abgeschlossen ────────────┐  │
│  │                                                           │  │
│  │                      ✅                                   │  │
│  │                                                           │  │
│  │              42 Einträge verarbeitet                      │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ ✅ Erfolgreich:      40                             │  │  │
│  │  │ ❌ Fehler:            2                             │  │  │
│  │  │ 🔢 Tokens verwendet:  125'432                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Fehlerhafte Einträge:                                    │  │
│  │  • 2025-06-20 "Ausflug" - API rate limit exceeded         │  │
│  │  • 2025-06-25 (kein Titel) - Timeout                      │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Neue Verarbeitung starten               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Erweiterung Settings-Page (Titel-Konfiguration)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────── AI-Einstellungen: Tagebuch ───────────────┐  │
│  │                                                           │  │
│  │  📝 Titel                                          [NEU]  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Modell: [TogetherAI ▼] [meta-llama/...          ▼] │  │  │
│  │  │                                                     │  │  │
│  │  │ Prompt:                                             │  │  │
│  │  │ ┌─────────────────────────────────────────────────┐ │  │  │
│  │  │ │ Du bist ein Assistent, der prägnante, aussage-  │ │  │  │
│  │  │ │ kräftige Titel für Tagebucheinträge generiert...│ │  │  │
│  │  │ └─────────────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ✏️ Content (Text verbessern)                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ ... (bestehend)                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  🔍 Analyse                                               │  │
│  │  ... (bestehend)                                          │  │
│  │                                                           │  │
│  │  📋 Zusammenfassung                                       │  │
│  │  ... (bestehend)                                          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Neue Dependencies

**Keine neuen Dependencies erforderlich.** Alle benötigten Pakete sind bereits vorhanden:

- `together-ai` - TogetherAI SDK
- `openai` - OpenAI SDK  
- `zod` - Validierung
- `@hookform/resolvers` - React Hook Form mit Zod
- `react-hook-form` - Formular-Handling

---

## 7. Dateistruktur

### 7.1 Neue Dateien

| Pfad | Beschreibung |
|------|--------------|
| `app/batch/page.tsx` | Batch-Verarbeitungsseite |
| `app/api/batch/preview/route.ts` | API: Dry-Run / Vorschau |
| `app/api/batch/run/route.ts` | API: Batch-Verarbeitung starten |
| `app/api/journal-entry-types/route.ts` | API: JournalEntryTypes laden |
| `components/BatchFilterForm.tsx` | Formular mit Filter-Optionen |
| `components/BatchPreview.tsx` | Vorschau der betroffenen Einträge |
| `components/BatchProgress.tsx` | Fortschrittsanzeige |
| `components/BatchResults.tsx` | Ergebnis-Zusammenfassung |

### 7.2 Zu ändernde Dateien

| Pfad | Änderung |
|------|----------|
| `lib/services/journalAIService.ts` | + `generateTitle()`, `runBatchPipeline()`, `getAffectedEntries()` |
| `lib/defaultPrompts.ts` | + Titel-Settings-Struktur, Default-Prompt |
| `app/api/generate-title/route.ts` | Nutzt User-Settings statt hardcoded OpenAI |
| `components/SiteNav.tsx` | + Link zu `/batch` im Hamburger-Menü |
| `components/AIConfigSection.tsx` | + Titel-Konfiguration (Modell + Prompt) |
| `hooks/useAISettings.ts` | + Titel-Settings laden/speichern |

---

## 8. Implementierungsplan

### Schritt 1 (LLM): Titel-Settings-Struktur erweitern

**Ziel:** `defaultPrompts.ts` und `useAISettings.ts` um Titel-Konfiguration erweitern.

**Anforderungen:**
- `TitleAISettings` Interface hinzufügen mit `modelId` und `prompt`
- `JournalEntryTypeAISettings` um `title`-Feld erweitern
- Default-Prompt für Titel definieren (basierend auf bestehendem Prompt in `generate-title/route.ts`)
- `getDefaultAISettings()` anpassen, sodass auch Titel-Defaults zurückgegeben werden

**Tipp:** Struktur konsistent mit bestehenden Content/Analysis/Summary-Settings halten.

---

### Schritt 2 (LLM): AIConfigSection um Titel erweitern

**Ziel:** Settings-Page zeigt Titel-Konfiguration an.

**Anforderungen:**
- Neuer Accordion/Collapse-Bereich "Titel" in `AIConfigSection.tsx`
- Provider-Dropdown (TogetherAI / OpenAI)
- Modell-Dropdown (abhängig vom Provider)
- Prompt-Textarea
- Speichern/Laden über bestehenden `useAISettings` Hook

**Tipp:** Bestehende Struktur für Content/Analysis/Summary als Vorlage nutzen.

---

### Schritt 3 (LLM): generate-title API erweitern

**Ziel:** `/api/generate-title` nutzt User-Settings.

**Anforderungen:**
- User-ID aus Cookie lesen
- User-Settings aus DB laden
- Modell und Prompt aus Settings verwenden (Fallback auf Defaults)
- Unterstützung für TogetherAI zusätzlich zu OpenAI
- `journalEntryId` als optionaler Parameter (für Entry-Type-spezifische Settings)

**Tipp:** Bestehende `getSettingsForEntry()` aus JournalAIService wiederverwenden.

---

### Schritt 4 (LLM): generateTitle() in JournalAIService

**Ziel:** Titel-Generierung in den Service integrieren.

**Anforderungen:**
- Neue Methode `generateTitle({ journalEntryId, userId })`
- Lädt Entry und Settings
- Ruft LLM auf (TogetherAI oder OpenAI je nach Konfiguration)
- Aktualisiert `title` in JournalEntry
- Gibt `TitleGenerationResult` zurück

**Tipp:** Bestehende `generateContent()` als Vorlage verwenden.

---

### Schritt 5 (LLM): API /api/journal-entry-types

**Ziel:** Endpunkt zum Laden aller JournalEntryTypes.

**Anforderungen:**
- GET-Route
- Lädt alle JournalEntryTypes (System + User-spezifisch)
- Gibt `id`, `code`, `name`, `icon` zurück
- Authentifizierung prüfen

---

### Schritt 6 (LLM): getAffectedEntries() in JournalAIService

**Ziel:** Dry-Run-Logik implementieren.

**Anforderungen:**
- Parameter: `dateFrom`, `dateTo`, `typeCodes`, `steps`, `overwriteMode`
- Query: JournalEntries im Datumsbereich mit passenden Typen
- Bei `overwriteMode: 'empty_only'`: Filtere Einträge, die bereits Werte haben für die gewählten Steps
- Gibt Liste der betroffenen Einträge zurück

**Tipp:** Join über TimeBox für Datumsfilterung (`localDate`).

---

### Schritt 7 (LLM): API /api/batch/preview

**Ziel:** Dry-Run-Endpunkt.

**Anforderungen:**
- POST mit Zod-Validierung
- Ruft `getAffectedEntries()` auf
- Gibt Anzahl + Eintrags-Details zurück
- Für jeden Eintrag: Welche Felder sind bereits gefüllt?

---

### Schritt 8 (LLM): runBatchPipeline() in JournalAIService

**Ziel:** Batch-Verarbeitung implementieren.

**Anforderungen:**
- Iteriert über alle betroffenen Einträge
- Führt gewählte Steps aus (title, content, analysis, summary)
- Beachtet `overwriteMode`
- Fängt Fehler pro Eintrag ab (nicht abbrechen!)
- Sammelt Ergebnisse (Erfolge/Fehler/Tokens)
- Gibt `BatchPipelineResult` zurück

**Tipp:** Sequenzielle Verarbeitung (kein Promise.all) wegen Rate-Limits.

---

### Schritt 9 (LLM): API /api/batch/run

**Ziel:** Batch-Ausführungs-Endpunkt.

**Anforderungen:**
- POST mit Zod-Validierung
- Ruft `runBatchPipeline()` auf
- Gibt Ergebnis zurück

---

### Schritt 10 (LLM): BatchFilterForm Komponente

**Ziel:** Formular für Batch-Konfiguration.

**Anforderungen:**
- Datumsbereich (von/bis) mit Date-Inputs
- JournalEntryType-Checkboxen (dynamisch geladen)
- Step-Checkboxen (Titel, Content, Analysis, Summary, Gesamt-Pipeline)
- Radio-Buttons für Überschreiben-Modus
- React Hook Form + Zod-Validierung
- Submit löst Dry-Run aus

---

### Schritt 11 (LLM): BatchPreview Komponente

**Ziel:** Vorschau der betroffenen Einträge.

**Anforderungen:**
- Zeigt Anzahl betroffener Einträge
- Tabelle mit Datum, Typ, Titel, Status (welche Felder gefüllt)
- Legende für Status-Icons
- Buttons: Abbrechen / Verarbeitung starten

---

### Schritt 12 (LLM): BatchProgress Komponente

**Ziel:** Fortschrittsanzeige.

**Anforderungen:**
- Spinner/Loading-Indikator
- Aktueller Stand: "Verarbeite X von Y"
- Fortschrittsbalken (prozentual)
- Aktueller Eintrag + Schritt
- Laufende Zähler (Erfolge/Fehler)

---

### Schritt 13 (LLM): BatchResults Komponente

**Ziel:** Ergebnis-Zusammenfassung.

**Anforderungen:**
- Erfolgs-/Fehler-Zähler
- Token-Verbrauch
- Liste fehlerhafter Einträge mit Fehlermeldung
- Button: Neue Verarbeitung starten

---

### Schritt 14 (LLM): Batch-Seite zusammenführen

**Ziel:** `/batch` Page erstellen.

**Anforderungen:**
- Client Component (interaktiv)
- State-Machine: Filter → Preview → Progress → Results
- Integriert alle Batch-Komponenten
- Lädt JournalEntryTypes beim Mount
- Responsive Layout

---

### Schritt 15 (LLM): SiteNav erweitern

**Ziel:** Link zu Batch-Seite im Menü.

**Anforderungen:**
- Link "Batch-Verarbeitung" im Hamburger-Menü (Desktop + Mobile)
- Platzierung bei den anderen Tool-Links (Export, Einstellungen)

---

### Schritt 16 (Mensch): Manuelle Überprüfung der Settings-Page

**Ziel:** Sicherstellen, dass Titel-Konfiguration korrekt funktioniert.

**Schritte:**
1. Settings-Page öffnen
2. Titel-Konfiguration für einen JournalEntryType anpassen
3. Speichern und Seite neu laden
4. Prüfen, ob Settings korrekt geladen werden

---

### Schritt 17 (Mensch): End-to-End-Test der Batch-Verarbeitung

**Ziel:** Vollständiger Durchlauf testen.

**Schritte:**
1. Batch-Seite öffnen
2. Datumsbereich und Typen wählen
3. Dry-Run ausführen
4. Vorschau prüfen
5. Verarbeitung starten
6. Fortschritt beobachten
7. Ergebnis-Zusammenfassung prüfen
8. In Journal-Einträgen prüfen, ob Änderungen angewendet wurden

---

## 9. Automatisiertes Testing

### 9.1 Was das LLM selbstständig testen kann

| Test | Methode |
|------|---------|
| **TypeScript-Kompilierung** | `npx tsc --noEmit` |
| **ESLint** | `npm run lint` |
| **API-Routen Syntax** | Prüfung durch TypeScript-Compiler |
| **Zod-Schema-Validierung** | TypeScript-Typen |
| **Komponenten-Props** | TypeScript-Typen |

### 9.2 Empfohlene Unit-Tests (optional, falls gewünscht)

```typescript
// __tests__/journalAIService.test.ts
describe('JournalAIService', () => {
  describe('getAffectedEntries', () => {
    it('filters by date range')
    it('filters by type codes')
    it('respects overwriteMode empty_only')
    it('respects overwriteMode overwrite_all')
  })
})

// __tests__/api/batch.test.ts
describe('/api/batch/preview', () => {
  it('returns 401 without auth')
  it('validates request body with Zod')
  it('returns entry count and details')
})
```

---

## 10. Manuelles Testing

### 10.1 Titel-Konfiguration (Settings-Page)

| # | Testfall | Erwartetes Ergebnis |
|---|----------|---------------------|
| 1 | Settings-Page öffnen | Titel-Sektion sichtbar unter jedem JournalEntryType |
| 2 | Provider auf TogetherAI setzen | Modell-Dropdown zeigt TogetherAI-Modelle |
| 3 | Provider auf OpenAI setzen | Modell-Dropdown zeigt OpenAI-Modelle |
| 4 | Prompt ändern und speichern | Toast "Gespeichert", Wert bleibt nach Reload |
| 5 | Auf Defaults zurücksetzen | Ursprüngliche Werte wiederhergestellt |

### 10.2 Batch-Verarbeitung

| # | Testfall | Erwartetes Ergebnis |
|---|----------|---------------------|
| 1 | Seite `/batch` öffnen | Formular wird angezeigt |
| 2 | Ohne Datumsbereich absenden | Validierungsfehler |
| 3 | Dry-Run mit 0 Ergebnissen | Meldung "Keine Einträge gefunden" |
| 4 | Dry-Run mit Ergebnissen | Vorschau-Tabelle mit Einträgen |
| 5 | Modus "Nur leere" + alle haben Werte | Weniger Einträge in Vorschau |
| 6 | Verarbeitung starten | Fortschrittsanzeige erscheint |
| 7 | Verarbeitung abgeschlossen | Ergebnis-Zusammenfassung |
| 8 | Fehler provozieren (z.B. ungültiger API-Key) | Fehler in Zusammenfassung, Rest verarbeitet |
| 9 | Verarbeitete Einträge prüfen | Felder in DB aktualisiert |

### 10.3 Edge Cases

| # | Testfall | Erwartetes Ergebnis |
|---|----------|---------------------|
| 1 | Sehr grosser Datumsbereich (1 Jahr) | Funktioniert, evtl. langsam |
| 2 | Kein Typ ausgewählt | Validierungsfehler oder alle Typen |
| 3 | Nur "Gesamte Pipeline" gewählt | Alle 4 Steps werden ausgeführt |
| 4 | Einzelner Step + Gesamte Pipeline | Korrekte Handhabung (Pipeline hat Vorrang) |
| 5 | Session abgelaufen während Verarbeitung | Graceful Error Handling |

---

## Anhang: Offene Entscheidungen

_Keine offenen Entscheidungen. Alle Fragen wurden geklärt._
