# Konzept: Journal Entry AI-Features

**Version:** 2.0  
**Erstellt:** Dezember 2025  
**Status:** Entwurf (überarbeitet nach Feedback)

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
12. [Änderungen an bestehender Dokumentation](#12-änderungen-an-bestehender-dokumentation)

---

## 1. Geplante Features

### 1.1 Erweiterung des JournalEntry-Datenmodells

Das `JournalEntry`-Model wird um ein neues Feld `analysis` erweitert. Damit existieren vier zusammenhängende Textfelder:

| Feld | Beschreibung | Quelle |
|------|--------------|--------|
| `originalTranscript` | Unbearbeitetes Speech-to-Text Transkript | Speech-to-Text API (Whisper, Groq, etc. – konfigurierbar) |
| `content` | Aufbereiteter, formatierter Markdown-Inhalt | LLM (aus originalTranscript) |
| `analysis` | **NEU:** ACT-basierte Analyse/Interpretation | LLM (aus content) |
| `aiSummary` | Kurze Zusammenfassung des Eintrags | LLM (aus content) |

### 1.2 One-Click AI-Pipeline

Ein einziger Button löst sequentiell folgende Aktionen aus:
1. **Content-Generierung:** originalTranscript → content (Formatierung, Rechtschreibung, Struktur)
2. **Analyse:** content → analysis (ACT-Perspektive, psychologische Einordnung)
3. **Zusammenfassung:** content → aiSummary (Kernaussagen komprimiert)

**Zusätzlich:** Jede Sektion (Content, Analyse, Summary) hat einen eigenen (Re-)Generieren-Button für individuelle Aktualisierung.

### 1.3 "Veraltet"-Warnung

Wenn der `content` nach Generierung von `analysis` oder `aiSummary` geändert wird, erscheint bei diesen Feldern eine visuelle Warnung "Möglicherweise veraltet", da sie auf einer älteren Version des Contents basieren.

**Technische Umsetzung:** Neues Feld `contentHash` (oder `contentUpdatedAt`) im JournalEntry. Nach jeder Content-Änderung wird dieser Wert aktualisiert. Die UI prüft, ob analysis/aiSummary vor der letzten Content-Änderung generiert wurden.

### 1.4 Pro-JournalEntryType AI-Konfiguration

Für jeden `JournalEntryType` können separat konfiguriert werden:
- **Content-Einstellungen:** LLM-Modell + Prompt für Transkript-Aufbereitung
- **Analysis-Einstellungen:** LLM-Modell + Prompt für Analyse
- **Summary-Einstellungen:** LLM-Modell + Prompt für Zusammenfassung

Die Prompts unterstützen **Variablen** wie `{{date}}`, `{{entryType}}`, `{{content}}` für dynamische Inhalte.

### 1.5 Neue UI-Elemente

- **Collapsible Sections:** Zusammenfassung, Content, Analyse, Original-Transkript einzeln auf-/zuklappbar
- **Default-Collapse-Status:** Zusammenfassung, Content, Analyse **offen** – nur Original-Transkript **geschlossen**
- **Farbcodierung:** Zusammenfassung (Blau), Analyse (Gelb), Original-Transkript (Grau)
- **Settings-Popup:** Zahnrad-Icon zeigt aktuelle Modell/Prompt-Konfiguration (nur Anzeige + Link zu Settings)
- **Inline-Aktionen:** Generieren/Regenerieren, Bearbeiten, Löschen pro Sektion
- **Original-Transkript:** Re-Transkribieren-Button (neu transkribieren mit anderem Modell via bestehendes Zahnrad-Popup)
- **Titel:** Generieren-Button wie bisher

### 1.6 AI-Konfiguration in der Settings-Page

**Entscheidung: Neuer Bereich innerhalb der bestehenden Settings-Page** (keine eigene Route)

**Begründung:**
- Konsistenz mit bestehendem UI-Pattern (Settings sind bereits eine Page)
- Weniger Navigation nötig
- AI-Settings sind thematisch Teil der allgemeinen Benutzereinstellungen
- Einfachere Implementation (kein neuer Route-Handler)
- Die AI-Konfiguration ist keine eigenständige "App-Funktion", sondern eine Einstellung

**Inhalt des neuen Bereichs:**
- Accordion pro JournalEntryType mit drei Konfigurations-Unterbereichen
- "Auf Standard zurücksetzen"-Button pro Konfigurationsbereich
- Modell-Dropdown + Prompt-Textarea pro AI-Funktion

---

## 2. Architekturübersicht

### 2.1 Systemübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  DiaryEntries       │  │  AISettingsPopup    │  │  SettingsPage       │  │
│  │  Accordion          │  │  (neu, nur Anzeige) │  │  (erweitert um      │  │
│  │  (stark erweitert)  │  │                     │  │   AI-Config-Bereich)│  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘  │
│             │                        │                        │             │
│             └────────────────────────┼────────────────────────┘             │
│                                      │                                      │
│                          ┌───────────▼───────────┐                          │
│                          │   useJournalAI Hook   │                          │
│                          │   (neu)               │                          │
│                          └───────────┬───────────┘                          │
│                                      │                                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                    API LAYER (Next.js API Routes)                            │
├──────────────────────────────────────┼──────────────────────────────────────┤
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                         /api/journal-ai/ (NEU)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  /generate  │  │  /generate  │  │  /generate  │  │  /pipeline   │  │  │
│  │  │  -content   │  │  -analysis  │  │  -summary   │  │  (One-Click) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BESTEHEND (wird ersetzt/refaktoriert)                                 │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────────┐ │  │
│  │  │  /api/improve-text  │→│  Wird durch /api/journal-ai/generate-   │ │  │
│  │  │  (DEPRECATED)       │  │  content ersetzt                        │ │  │
│  │  └─────────────────────┘  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BESTEHEND (bleibt, wird erweitert)                                    │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────────┐ │  │
│  │  │  /api/me            │→│  Erweitert um journalAISettings in       │ │  │
│  │  │                     │  │  User.settings JSON                      │ │  │
│  │  └─────────────────────┘  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                          SERVICE LAYER                                       │
├──────────────────────────────────────┼──────────────────────────────────────┤
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                     JournalAIService (NEU)                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ generate     │  │ generate     │  │ generate     │                 │  │
│  │  │ Content()    │  │ Analysis()   │  │ Summary()    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  │  ┌──────────────────────────────────────────────────┐                 │  │
│  │  │ runPipeline() - orchestriert alle drei           │                 │  │
│  │  └──────────────────────────────────────────────────┘                 │  │
│  │  ┌──────────────────────────────────────────────────┐                 │  │
│  │  │ interpolatePrompt() - ersetzt {{variablen}}      │                 │  │
│  │  └──────────────────────────────────────────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                      Together AI API (bestehend)                       │  │
│  │  LLM Models: Llama, DeepSeek, GPT-OSS, Cogito, etc.                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                                │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                      Prisma ORM                                        │  │
│  │                                                                        │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │  │
│  │  │  JournalEntry    │  │ User.settings    │  │ ImprovementPrompt   │  │  │
│  │  │  (erweitert:     │  │ (JSON erweitert  │  │ (DEPRECATED,        │  │  │
│  │  │   +analysis,     │  │  um AI-Config)   │  │  wird ersetzt)      │  │  │
│  │  │   +contentHash)  │  │                  │  │                     │  │  │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Zu löschende/ersetzende Komponenten

| Komponente | Status | Ersatz |
|------------|--------|--------|
| `components/TextImprovementDialog.tsx` | **DEPRECATED** | Inline-Generierung in DiaryEntriesAccordion |
| `components/ImproveTextButton.tsx` | **DEPRECATED** | Integriert in JournalEntrySection |
| `app/api/improve-text/route.ts` | **DEPRECATED** | `/api/journal-ai/generate-content` |
| `ImprovementPrompt` (DB-Tabelle) | **DEPRECATED** | AI-Settings in `User.settings` JSON |
| `app/api/improvement-prompts/*` | **DEPRECATED** | Nicht mehr benötigt |
| `lib/improvementPrompt.ts` | **DEPRECATED** | `lib/services/journalAIService.ts` |

**Hinweis:** Die alten Komponenten können zunächst bestehen bleiben und als "deprecated" markiert werden. Nach erfolgreicher Migration werden sie entfernt.

---

## 3. Komponentenbeschreibung

### 3.1 Frontend-Komponenten

| Komponente | Status | Beschreibung |
|------------|--------|--------------|
| **DiaryEntriesAccordion** | Erweitert | Hauptkomponente, enthält nun alle neuen Sektionen und Pipeline-Button |
| **JournalEntrySection** | NEU | Wiederverwendbare collapsible Sektion mit Header, Aktions-Buttons, Farbhintergrund |
| **AISettingsPopup** | NEU | Read-only Popup zur Anzeige der aktuellen AI-Konfiguration + Link zur Settings-Page |
| **AIConfigSection** | NEU | Neuer Bereich in der Settings-Page für AI-Konfiguration |
| **SettingsPage** | Erweitert | Bestehende Page, erweitert um AIConfigSection |

### 3.2 Hooks

| Hook | Status | Beschreibung |
|------|--------|--------------|
| **useJournalAI** | NEU | generateContent, generateAnalysis, generateSummary, runPipeline |
| **useAISettings** | NEU | Lädt und speichert AI-Settings aus User.settings |

### 3.3 Backend-Services

| Service | Status | Beschreibung |
|---------|--------|--------------|
| **JournalAIService** | NEU | Orchestriert LLM-Aufrufe, lädt Settings, interpoliert Prompts |

---

## 4. Datenmodell

### 4.1 Architektur-Entscheidung: JSON vs. Neue Tabelle

**Entscheidung: AI-Settings als JSON in `User.settings` speichern**

| Kriterium | Neue Tabelle | JSON in User.settings |
|-----------|--------------|----------------------|
| **Komplexität** | Höher (neue Tabelle, Relationen, Migration) | Niedriger (JSON-Struktur) |
| **Konsistenz** | Bereits `summaryModel`, `summaryPrompt` in User.settings | ✅ Passt zu bestehendem Pattern |
| **Typsicherheit** | ✅ Prisma-Types | TypeScript-Interface + Zod |
| **Queries** | Einfache SQL-Queries | JSON-Extraktion (Postgres JSONB) |
| **Flexibilität** | Schema-Migration bei Änderungen | ✅ Flexibel erweiterbar |
| **Multi-Type-Support** | Gut | ✅ Gut (verschachtelte Struktur) |

**Fazit:** JSON in `User.settings` ist die bessere Wahl, weil:
1. Bereits verwendet für `summaryModel`, `summaryPrompt`, `customModels`
2. Keine Schema-Migration für neue AI-Funktionen nötig
3. Einfachere Implementation
4. Die Settings werden selten abgefragt (nur beim Generieren)

### 4.2 Änderungen an JournalEntry

```prisma
model JournalEntry {
  // ... bestehende Felder ...
  
  /// Inhalt (Markdown) - bei Audio-Einträgen das verbesserte Transkript
  content            String
  /// Original-Transkript (unbearbeitet, direkt von Speech-to-Text)
  originalTranscript String?
  /// KI-generierte Zusammenfassung (optional)
  aiSummary          String?
  /// NEU: KI-generierte Analyse/Interpretation (z.B. ACT-Perspektive)
  analysis           String?
  /// NEU: Zeitstempel der letzten Content-Änderung (für "veraltet"-Warnung)
  contentUpdatedAt   DateTime?
  
  // ... weitere Felder ...
}
```

**Schema-Änderung:** `npx prisma db push` (siehe SCHEMA_WORKFLOW.md)

### 4.3 Erweiterung User.settings JSON-Struktur

```typescript
interface UserSettings {
  // Bestehende Felder
  theme: 'dark' | 'bright'
  timeFormat24h: boolean
  weekStart: 'mon' | 'sun'
  autosaveEnabled: boolean
  autosaveIntervalSec: number
  summaryModel: string      // Bestehend (für Day-Summary)
  summaryPrompt: string     // Bestehend (für Day-Summary)
  customModels: LLMModel[]  // Bestehend
  
  // NEU: AI-Settings pro JournalEntryType
  journalAISettings: {
    [journalEntryTypeCode: string]: {
      content: {
        modelId: string
        prompt: string
      }
      analysis: {
        modelId: string
        prompt: string
      }
      summary: {
        modelId: string
        prompt: string
      }
    }
  }
}
```

**Beispiel:**
```json
{
  "journalAISettings": {
    "diary": {
      "content": {
        "modelId": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "prompt": "Du bist ein professioneller Texteditor..."
      },
      "analysis": {
        "modelId": "deepseek-ai/DeepSeek-R1",
        "prompt": "Du bist ein ACT-Therapeut..."
      },
      "summary": {
        "modelId": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "prompt": "Fasse zusammen..."
      }
    }
  }
}
```

### 4.4 Default-Prompts

```typescript
// lib/defaultPrompts.ts

export const DEFAULT_CONTENT_PROMPT = `Du bist ein professioneller Texteditor. Verbessere das folgende Transkript:
- Korrigiere Grammatik und Rechtschreibung (Schweizer Rechtschreibung mit ss)
- Strukturiere den Text in sinnvolle Absätze
- Verwende Markdown für Formatierung (Überschriften, Listen wo sinnvoll)
- Behalte den persönlichen Stil und alle Inhalte bei
- Entferne Füllwörter und Wiederholungen

Datum des Eintrags: {{date}}
Eintragstyp: {{entryType}}

Gib nur den verbesserten Text zurück, ohne Erklärungen.`

export const DEFAULT_ANALYSIS_PROMPT = `Du bist ein ACT-Therapeut (Acceptance and Commitment Therapy). Analysiere den folgenden Tagebucheintrag aus ACT-Perspektive:

- Identifiziere Gedankenmuster (z.B. Fusion, Vermeidung)
- Erkenne Emotionen und deren Akzeptanz
- Beobachte wertebezogenes Handeln
- Gib konstruktive Reflexionsfragen

Datum: {{date}}

Formatiere als Markdown mit klaren Abschnitten. Sei einfühlsam und nicht wertend.`

export const DEFAULT_SUMMARY_PROMPT = `Fasse den folgenden Tagebucheintrag in 2-3 kurzen Sätzen zusammen.
Fokussiere auf: Hauptthemen, emotionale Kernaussage, wichtigste Ereignisse.

Datum: {{date}}

Antworte direkt mit der Zusammenfassung, ohne Einleitung.`

// Unterstützte Variablen
export const PROMPT_VARIABLES = {
  '{{date}}': 'Datum des Eintrags (z.B. "23. Dezember 2024")',
  '{{entryType}}': 'Typ des Eintrags (z.B. "Tagebucheintrag")',
  '{{content}}': 'Der zu verarbeitende Text',
  '{{title}}': 'Titel des Eintrags (falls vorhanden)',
}
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue API-Routen

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/journal-ai/generate-content` | POST | Generiert content aus originalTranscript |
| `/api/journal-ai/generate-analysis` | POST | Generiert analysis aus content |
| `/api/journal-ai/generate-summary` | POST | Generiert aiSummary aus content |
| `/api/journal-ai/pipeline` | POST | Führt content → analysis → summary aus |
| `/api/notes/[noteId]/analysis` | GET/PUT/DELETE | CRUD für Analysis-Feld |

### 5.2 Erweiterte API-Routen

| Route | Änderung |
|-------|----------|
| `/api/me` | GET: Gibt `journalAISettings` zurück; PATCH: Speichert `journalAISettings` |
| `/api/notes/[noteId]` | Response enthält neu `analysis` und `contentUpdatedAt` |

### 5.3 Deprecated API-Routen

| Route | Status |
|-------|--------|
| `/api/improve-text` | DEPRECATED → nutze `/api/journal-ai/generate-content` |
| `/api/improvement-prompts/*` | DEPRECATED → Settings in User.settings |

### 5.4 Request/Response-Schemas

```typescript
// POST /api/journal-ai/generate-content
interface GenerateContentRequest {
  journalEntryId: string
  // Optional: Text override (sonst wird originalTranscript aus DB geladen)
  text?: string
}

interface GenerateContentResponse {
  content: string
  modelUsed: string
  tokensUsed: number
}

// POST /api/journal-ai/pipeline
interface PipelineRequest {
  journalEntryId: string
  // Welche Schritte ausführen (default: alle)
  steps?: ('content' | 'analysis' | 'summary')[]
}

interface PipelineResponse {
  content?: string
  analysis?: string
  aiSummary?: string
  steps: {
    step: 'content' | 'analysis' | 'summary'
    success: boolean
    error?: string
    tokensUsed?: number
  }[]
  totalTokensUsed: number
}
```

### 5.5 JournalAIService

```typescript
// lib/services/journalAIService.ts

export class JournalAIService {
  constructor(private prisma: PrismaClient) {}
  
  /**
   * Generiert formatierten Content aus originalTranscript
   */
  async generateContent(params: {
    journalEntryId: string
    userId: string
    text?: string // Optional override
  }): Promise<{ content: string; tokensUsed: number }>
  
  /**
   * Generiert ACT-Analyse aus Content
   */
  async generateAnalysis(params: {
    journalEntryId: string
    userId: string
  }): Promise<{ analysis: string; tokensUsed: number }>
  
  /**
   * Generiert Zusammenfassung aus Content
   */
  async generateSummary(params: {
    journalEntryId: string
    userId: string
  }): Promise<{ summary: string; tokensUsed: number }>
  
  /**
   * Führt alle drei Schritte sequentiell aus
   */
  async runPipeline(params: {
    journalEntryId: string
    userId: string
    steps?: ('content' | 'analysis' | 'summary')[]
  }): Promise<PipelineResult>
  
  /**
   * Lädt AI-Settings für einen JournalEntry (über dessen Type)
   */
  private async getSettingsForEntry(
    journalEntryId: string, 
    userId: string
  ): Promise<AISettingsForType>
  
  /**
   * Ersetzt Variablen im Prompt
   */
  private interpolatePrompt(
    prompt: string, 
    variables: Record<string, string>
  ): string
  
  /**
   * Ruft LLM via Together AI auf
   */
  private async callLLM(params: {
    modelId: string
    systemPrompt: string
    userMessage: string
  }): Promise<{ text: string; tokensUsed: number }>
}
```

---

## 6. UX (Komponenten und Screens)

### 6.1 Erweiterter Journal-Entry (Accordion)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │  14:32  Nachmittagsreflexion                       ▼          │   │ ← Haupt-Collapse-Title
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │  ⚙️  🔄 AI-Pipeline  ✏️ Titel generieren  🗑️                 │   │ ← Action-Bar (innerhalb)
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   📋 Zusammenfassung                        ✨ 🔄 ✏️ 🗑️  ▼         │ ← Blauer Hintergrund, OFFEN
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │
│   Reflexion über Arbeitsstress. Positive Momente beim Spazier-      │
│   gang erkannt. Wunsch nach mehr Achtsamkeit im Alltag.             │
│                                                                     │
│   📝 Inhalt                                    ✨ 🔄 ✏️  ▼          │ ← Kein Hintergrund, OFFEN
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │
│   ## Mein Tag                                                       │
│                                                                     │
│   Heute war ein anstrengender Tag im Büro. Die Deadline für...      │
│   [...]                                                             │
│                                                                     │
│   🔍 Analyse                     ⚠️ veraltet   ✨ 🔄 ✏️ 🗑️  ▼      │ ← Gelber Hintergrund, OFFEN
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │
│   **Beobachtete Muster:**                                           │
│   - Tendenz zur Gedankenfusion bei Arbeitsstress                    │
│   [...]                                                             │
│                                                                     │
│   ▶️ 00:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10:32  🗑️          │ ← Audio-Player
│                                                                     │
│   📄 Original-Transkript                  ⚙️ 🔄 ✏️  ▶              │ ← Grauer Hintergrund, GESCHLOSSEN
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐                                │
│   │ Foto hochladen │  │ 📷 Kamera    │                                │
│   └──────────────┘  └──────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Legende:**
- ⚙️ = Settings-Popup öffnen (in Action-Bar) / Transkriptions-Modell wählen (bei Original-Transkript)
- 🔄 = AI-Pipeline starten (in Action-Bar) / Regenerieren (bei Sektionen)
- ✨ = Generieren (falls Sektion leer)
- ▼/▶ = Sektion auf-/zuklappen
- ✏️ = Bearbeiten
- 🗑️ = Löschen
- ⚠️ = Veraltet-Warnung

**Wichtige Änderungen vs. v1:**
- Action-Bar **innerhalb** des Collapse (nicht darüber)
- **Keine Rahmen** bei inneren Sektionen (nur Trennlinien)
- Nur Original-Transkript default **geschlossen**
- Re-Transkribieren beim Original-Transkript = neu transkribieren (anderes Modell)
- Veraltet-Warnung bei Analysis/Summary wenn Content neuer

### 6.2 Settings-Popup (nur Anzeige)

```
┌─────────────────────────────────────────────────────────────────┐
│ AI-Einstellungen: Tagebucheintrag                          ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📝 Content-Generierung                                         │
│  Modell: Llama-3.3-70B-Instruct-Turbo                          │
│  Prompt: "Du bist ein professioneller Texteditor..."           │
│                                                                 │
│  🔍 Analyse                                                     │
│  Modell: DeepSeek-R1                                           │
│  Prompt: "Du bist ein ACT-Therapeut..."                        │
│                                                                 │
│  📋 Zusammenfassung                                             │
│  Modell: Llama-3.3-70B-Instruct-Turbo                          │
│  Prompt: "Fasse den Tagebucheintrag zusammen..."               │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │           🔧 Einstellungen bearbeiten                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Hinweis:** Button "Einstellungen bearbeiten" öffnet Settings-Page und scrollt zum AI-Bereich.

### 6.3 AI-Konfiguration in Settings-Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Einstellungen                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ▼ Allgemein                                                            │
│   Theme, Zeitformat, Autosave...                                       │
│                                                                         │
│ ▼ AI-Konfiguration                                                      │ ← NEUER BEREICH
│                                                                         │
│   Hier legst du fest, welche KI-Modelle und Prompts für die            │
│   automatische Textverarbeitung deiner Tagebucheinträge verwendet      │
│   werden. Die Einstellungen gelten pro Eintragstyp.                    │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ ▼ 📓 Tagebucheintrag                                            │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                                                                 │   │
│   │   Content-Generierung (Transkript → Inhalt)                     │   │
│   │   Modell:  [Llama-3.3-70B-Instruct-Turbo          ▼]           │   │
│   │   Prompt:                                                       │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │ Du bist ein professioneller Texteditor...               │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │   [Auf Standard zurücksetzen]                                   │   │
│   │                                                                 │   │
│   │   Analyse (Inhalt → Analyse)                                    │   │
│   │   Modell:  [DeepSeek-R1                           ▼]           │   │
│   │   Prompt:                                                       │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │ Du bist ein ACT-Therapeut...                            │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │   [Auf Standard zurücksetzen]                                   │   │
│   │                                                                 │   │
│   │   Zusammenfassung (Inhalt → Zusammenfassung)                    │   │
│   │   Modell:  [Llama-3.3-70B-Instruct-Turbo          ▼]           │   │
│   │   Prompt:                                                       │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │ Fasse zusammen...                                       │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │   [Auf Standard zurücksetzen]                                   │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ ▶ 🍽️ Mahlzeit                                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Verfügbare Variablen: {{date}}, {{entryType}}, {{content}}, {{title}} │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Dependencies

### 7.1 Bestehende Dependencies (keine Änderung)

- `together-ai` - LLM-API-Client
- `@tabler/icons-react` - Icons
- `react-hook-form` + `@hookform/resolvers/zod` + `zod` - Formulare
- `prisma` + `@prisma/client` - ORM

### 7.2 Keine neuen Dependencies erforderlich

Das Feature kann vollständig mit bestehenden Dependencies umgesetzt werden.

---

## 8. Dateistruktur

### 8.1 Neue Dateien

```
comp-act-diary/
├── app/
│   └── api/
│       └── journal-ai/
│           ├── generate-content/
│           │   └── route.ts              # POST: Generiert content
│           ├── generate-analysis/
│           │   └── route.ts              # POST: Generiert analysis
│           ├── generate-summary/
│           │   └── route.ts              # POST: Generiert aiSummary
│           └── pipeline/
│               └── route.ts              # POST: One-Click Pipeline
├── components/
│   ├── JournalEntrySection.tsx           # Collapsible Sektion
│   ├── AISettingsPopup.tsx               # Read-only Settings-Popup
│   ├── AIConfigSection.tsx               # Bereich in Settings-Page
│   └── JournalAIPipelineButton.tsx       # One-Click Button
├── hooks/
│   ├── useJournalAI.ts                   # AI-Operationen Hook
│   └── useAISettings.ts                  # Settings-Hook
└── lib/
    ├── services/
    │   └── journalAIService.ts           # AI-Service
    └── defaultPrompts.ts                 # Default-Prompts + Variablen
```

### 8.2 Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | + `analysis`, `contentUpdatedAt` in JournalEntry |
| `components/DiaryEntriesAccordion.tsx` | Komplette Überarbeitung mit neuen Sektionen |
| `types/day.ts` | + `analysis`, `contentUpdatedAt` in DayNote Type |
| `app/api/notes/[noteId]/route.ts` | + analysis, contentUpdatedAt in Response |
| `app/api/me/route.ts` | + journalAISettings in Settings-Handling |
| `app/(main)/settings/page.tsx` | + AIConfigSection einbinden |

### 8.3 Zu löschende Dateien (nach Migration)

| Datei | Grund |
|-------|-------|
| `components/TextImprovementDialog.tsx` | Ersetzt durch Inline-Generierung |
| `components/ImproveTextButton.tsx` | Ersetzt durch JournalEntrySection |
| `app/api/improve-text/route.ts` | Ersetzt durch /api/journal-ai/* |
| `app/api/improvement-prompts/route.ts` | Settings in User.settings |
| `app/api/improvement-prompts/[id]/route.ts` | Settings in User.settings |
| `lib/improvementPrompt.ts` | Ersetzt durch journalAIService.ts |

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Schema-Erweiterung

**Ziel:** JournalEntry um `analysis` und `contentUpdatedAt` erweitern.

**Anforderungen:**
- Neue nullable Felder `analysis` (String) und `contentUpdatedAt` (DateTime) in JournalEntry
- Schema-Sync mit `npx prisma db push`
- `npx prisma generate` für Client-Update

**Tipps:**
- Siehe `docs/SCHEMA_WORKFLOW.md` für den korrekten Workflow

---

### Schritt 2 (LLM): Default-Prompts und TypeScript-Interfaces

**Ziel:** Zentrale Default-Prompts und Typen definieren.

**Anforderungen:**
- Datei `lib/defaultPrompts.ts` mit DEFAULT_CONTENT_PROMPT, DEFAULT_ANALYSIS_PROMPT, DEFAULT_SUMMARY_PROMPT
- Variable-Interpolation unterstützen (`{{date}}`, `{{entryType}}`, `{{content}}`, `{{title}}`)
- TypeScript-Interface für `JournalAISettings` (Struktur in User.settings)
- Zod-Schema für Validierung

**Tipps:**
- Prompts sollen Schweizer Rechtschreibung (ss) verwenden
- Dokumentiere verfügbare Variablen

---

### Schritt 3 (LLM): JournalAIService implementieren

**Ziel:** Zentrale Service-Klasse für alle AI-Operationen.

**Anforderungen:**
- `lib/services/journalAIService.ts` mit allen Methoden aus Abschnitt 5.5
- Variable-Interpolation in Prompts
- Token-Tracking (Together AI gibt das zurück)
- Fallback auf Default-Prompts wenn keine User-Settings
- Error-Handling

**Tipps:**
- `together-ai` SDK wie in `/api/improve-text/route.ts` verwenden
- Settings aus `User.settings.journalAISettings` laden

---

### Schritt 4 (LLM): API-Routen für Journal-AI

**Ziel:** REST-Endpunkte für AI-Generierung.

**Anforderungen:**
- `/api/journal-ai/generate-content`: POST
- `/api/journal-ai/generate-analysis`: POST
- `/api/journal-ai/generate-summary`: POST
- `/api/journal-ai/pipeline`: POST (orchestriert alle drei)
- Token-Tracking in Response
- User-Auth via Cookie
- Zod-Validierung für Requests

**Tipps:**
- JournalAIService instanziieren und aufrufen
- Bei Pipeline: Bei Fehler in einem Schritt trotzdem weitermachen

---

### Schritt 5 (LLM): API-Route für Analysis CRUD

**Ziel:** GET/PUT/DELETE für das `analysis`-Feld.

**Anforderungen:**
- Route `/api/notes/[noteId]/analysis`
- GET: Gibt `{ analysis: string | null }` zurück
- PUT: Aktualisiert `analysis`, Body `{ analysis: string }`
- DELETE: Setzt `analysis` auf `null`
- Bestehende Route `/api/notes/[noteId]` um `analysis` und `contentUpdatedAt` erweitern

**Tipps:**
- Analog zu `/api/notes/[noteId]/original-transcript`

---

### Schritt 6 (LLM): /api/me erweitern für AI-Settings

**Ziel:** AI-Settings über User.settings verwalten.

**Anforderungen:**
- GET `/api/me`: Gibt `journalAISettings` zurück (Default wenn nicht vorhanden)
- PATCH `/api/me`: Akzeptiert `settings.journalAISettings`
- Validierung der Settings-Struktur

**Tipps:**
- Bestehende Logik in `/api/me/route.ts` erweitern
- Deep-Merge für Settings-Objekt

---

### Schritt 7 (LLM): Hook useJournalAI

**Ziel:** Frontend-Hook für AI-Operationen.

**Anforderungen:**
- Funktionen: `generateContent`, `generateAnalysis`, `generateSummary`, `runPipeline`
- State: `isLoading`, `error`, `progress` (für Pipeline: welcher Schritt läuft)
- Token-Tracking zurückgeben

**Tipps:**
- `useState` für Loading/Error
- Pipeline-Progress als Array von Step-Status

---

### Schritt 8 (LLM): Hook useAISettings

**Ziel:** Frontend-Hook für AI-Settings.

**Anforderungen:**
- Lädt Settings aus `/api/me`
- Funktion `updateSettings(typeCode, settings)`
- Funktion `resetToDefault(typeCode, field)` ('content' | 'analysis' | 'summary')
- Caching

**Tipps:**
- User-Context oder direkter API-Call

---

### Schritt 9 (LLM): Komponente JournalEntrySection

**Ziel:** Wiederverwendbare collapsible Sektion.

**Anforderungen:**
- Props: `title`, `icon`, `content`, `bgColor`, `isCollapsed`, `onToggle`
- Props für Aktionen: `onEdit`, `onDelete`, `onGenerate`, `onRegenerate`
- Props: `isEmpty`, `isOutdated` (für "veraltet"-Badge)
- Zustände: leer (Generieren-Button), vorhanden, loading, editing
- Markdown-Rendering
- **Kein Rahmen** (nur Trennlinie)

**Tipps:**
- daisyUI `collapse` anpassen (Rahmen entfernen)
- Tailwind für Hintergrundfarben (`bg-blue-50/50`, `bg-yellow-50/50`, `bg-gray-100/50`)

---

### Schritt 10 (LLM): Komponente AISettingsPopup

**Ziel:** Read-only Popup zur Anzeige der AI-Konfiguration.

**Anforderungen:**
- Zeigt für Content/Analysis/Summary: Modell-Name + Prompt-Vorschau (gekürzt)
- Button "Einstellungen bearbeiten" → Link zu Settings-Page mit Anchor
- Schliesst bei Klick ausserhalb oder ESC

**Tipps:**
- `createPortal` für Modal
- Settings via `useAISettings` laden

---

### Schritt 11 (LLM): Komponente AIConfigSection

**Ziel:** Neuer Bereich in der Settings-Page.

**Anforderungen:**
- Accordion pro JournalEntryType
- Drei Konfigurationsbereiche pro Type (Content, Analysis, Summary)
- Modell-Dropdown (aus `lib/llmModels.ts` + customModels)
- Prompt-Textarea
- "Auf Standard zurücksetzen"-Button pro Bereich
- Hinweis zu verfügbaren Variablen
- Auto-Save oder expliziter Speichern-Button

**Tipps:**
- JournalEntryTypes laden (aktuell nur "diary")
- `react-hook-form` für Formulare
- `useAISettings` Hook nutzen

---

### Schritt 12 (LLM): Integration in DiaryEntriesAccordion

**Ziel:** Bestehende Komponente komplett überarbeiten.

**Anforderungen:**
- Action-Bar **innerhalb** des Haupt-Collapse
- Settings-Button (⚙️) öffnet AISettingsPopup
- Pipeline-Button (🔄) startet gesamte Pipeline
- Titel-Generieren-Button wie bisher
- Neue Sektionen: Zusammenfassung, Inhalt, Analyse, Original-Transkript
- Alle nutzen `JournalEntrySection`
- Default: Zusammenfassung/Inhalt/Analyse offen, Transkript geschlossen
- "Veraltet"-Badge wenn `contentUpdatedAt > analysis/aiSummary generiert`
- DayNote-Type erweitern um `analysis`, `aiSummary`, `contentUpdatedAt`
- Original-Transkript: Re-Transkribieren = bestehendes Zahnrad-Popup für Modell-Wahl

**Tipps:**
- Bestehende Struktur als Basis
- Schrittweise refaktorieren

---

### Schritt 13 (LLM): npm run dev und npm run build

**Ziel:** Selbständig Fehler entdecken und beheben.

**Anforderungen:**
- `npm run dev` ausführen und Console-Errors prüfen
- `npm run build` ausführen und Build-Errors beheben
- TypeScript-Fehler beheben

**Tipps:**
- Iterativ Fehler beheben bis Build erfolgreich

---

### Schritt 14 (Mensch): Review und Testing

**Ziel:** Funktionstest aller Features.

**Aufgaben:**
- Schema-Änderung erfolgreich?
- Neue API-Routen testen
- UI-Komponenten visuell prüfen
- Pipeline-Flow Ende-zu-Ende testen
- Settings speichern und laden testen

---

### Schritt 15 (LLM): Bugfixes und Feinschliff

**Ziel:** Nach Review identifizierte Probleme beheben.

**Anforderungen:**
- Bugs aus Review beheben
- Loading-States optimieren
- Error-Messages verbessern
- Responsive Design prüfen

---

### Schritt 16 (LLM): Deprecated-Komponenten entfernen

**Ziel:** Alte Komponenten nach erfolgreicher Migration löschen.

**Anforderungen:**
- `TextImprovementDialog.tsx` löschen
- `ImproveTextButton.tsx` löschen
- `/api/improve-text` löschen
- `/api/improvement-prompts/*` löschen
- `lib/improvementPrompt.ts` löschen
- Alle Referenzen auf diese Dateien entfernen

**Tipps:**
- Erst nach erfolgreichem Testing löschen
- grep nach Imports/Verwendungen

---

### Schritt 17 (Mensch): Finaler Akzeptanztest

**Ziel:** Freigabe des Features.

**Aufgaben:**
- Vollständiger Flow mit echten Daten
- Performance-Check
- Mobile-Ansicht testen

---

## 10. Automatisiertes Testing

### 10.1 Unit Tests (LLM kann erstellen)

| Test | Beschreibung |
|------|--------------|
| `journalAIService.test.ts` | Service-Methoden mit Mock-LLM, Variable-Interpolation |
| `defaultPrompts.test.ts` | Prompt-Variablen auf Vollständigkeit prüfen |

### 10.2 API-Tests (LLM kann erstellen)

| Test | Beschreibung |
|------|--------------|
| `api/journal-ai/*.test.ts` | Request/Response-Validierung, Auth |
| `api/me.test.ts` | AI-Settings speichern/laden |

---

## 11. Manuelles Testing

### 11.1 Happy Path

1. **Neuen Audio-Eintrag erstellen:**
   - Audio aufnehmen → Transkript erscheint
   - Pipeline-Button klicken
   - Prüfen: Content, Analysis, Summary werden generiert

2. **Einzelne Sektionen:**
   - Leere Sektion → Generieren-Button klicken
   - Vorhandene Sektion → Regenerieren-Button klicken
   - Bearbeiten → Speichern

3. **Veraltet-Warnung:**
   - Content ändern
   - Prüfen: Analysis/Summary zeigen "veraltet"

4. **Settings:**
   - Settings-Popup öffnen → Werte anzeigen
   - Link zu Settings klicken → AI-Config-Bereich
   - Modell/Prompt ändern → Speichern
   - Neuen Eintrag erstellen → neue Settings verwendet

### 11.2 Edge Cases

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Kein originalTranscript | Content-Generierung nicht möglich, nur Edit |
| AI-API nicht erreichbar | Fehlermeldung, Retry-Möglichkeit |
| Sehr langer Text | Truncation in Vorschau |
| Keine User-Settings | Default-Prompts werden verwendet |

---

## 12. Änderungen an bestehender Dokumentation

Nach Implementation dieses Konzepts müssen folgende Dokumente aktualisiert werden:

### 12.1 docs/data-model-architecture.md

**Änderungen:**
- Abschnitt 3.3 (Journal): JournalEntry-Tabelle um `analysis` und `contentUpdatedAt` erweitern
- Eventuell Hinweis auf deprecated `ImprovementPrompt` (falls im Dokument erwähnt)
- Abschnitt über User.settings erweitern um `journalAISettings`-Struktur

### 12.2 Weitere Dokumentation

- README.md: Feature-Beschreibung
- Eventuell CHANGELOG.md

---

*Dieses Konzept ist die autoritative Referenz für die Implementation der Journal AI-Features.*
