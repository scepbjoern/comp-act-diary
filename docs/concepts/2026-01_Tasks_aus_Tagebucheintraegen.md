# Tasks aus Tagebucheinträgen

**Erstellt:** Januar 2026  
**Status:** Konzept

---

## Inhaltsverzeichnis

1. [Beschreibung des geplanten Features](#1-beschreibung-des-geplanten-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Komponenten-Erläuterungen](#3-komponenten-erläuterungen)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Neue Dependencies](#7-neue-dependencies)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)
12. [Fragen an den Auftraggeber](#12-fragen-an-den-auftraggeber)

---

## 1. Beschreibung des geplanten Features

### Übersicht

Dieses Feature erweitert das CompACT Diary um ein intelligentes Task-Management-System, das:

1. **Automatisch Tasks aus Tagebucheinträgen ableitet** mittels KI-Analyse
2. **Manuelles Hinzufügen von Tasks** zu einzelnen Tagebucheinträgen ermöglicht
3. **Tasks pro Tagebucheintrag** in einem eigenen Bereich (grüne Hintergrundfarbe) anzeigt
4. **Einen zentralen Tasks-Bereich** in der Navigation bereitstellt

### Task-Kategorien

Die automatisch abgeleiteten und manuell erstellten Tasks werden in folgende Kategorien unterteilt:

| Kategorie | Beschreibung | Beispiel |
|-----------|--------------|----------|
| **IMMEDIATE** | Kurzfristige, konkrete Aufgaben | "Arzttermin vereinbaren" |
| **REFLECTION** | Anweisungen zum Reflektieren/Nachdenken | "Über Konflikt mit Kollege nachdenken" |
| **PLANNED_INTERACTION** | Geplante Interaktionen mit Personen | "Mit Maria über Projekt sprechen" |
| **FOLLOW_UP** | Nachfassaktionen | "Bei Bewerbung nachfragen" |
| **RESEARCH** | Recherche-Aufgaben | "Therapiemöglichkeiten recherchieren" |
| **HABIT_RELATED** | Gewohnheits-bezogene Tasks | "Meditation wieder aufnehmen" |
| **GENERAL** | Allgemeine Tasks ohne spezifische Kategorie | - |

### Kernfunktionen

- **KI-gestützte Task-Extraktion**: Nach dem Speichern eines Tagebucheintrags werden potenzielle Tasks erkannt
- **Task-Review**: User kann vorgeschlagene Tasks akzeptieren, bearbeiten oder ablehnen
- **Prioritäten**: Jeder Task hat eine Priorität (LOW, MEDIUM, HIGH)
- **Fälligkeitsdatum**: Optionales Due-Date für zeitkritische Tasks
- **Verknüpfungen**: Tasks können mit Tagebucheinträgen UND/ODER Kontakten verknüpft sein
- **Filter & Sortierung**: Nach Typ, Status, Priorität, Fälligkeit filterbar

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   /tasks Page   │    │  DiarySection   │    │  ContactDetail  │             │
│  │  (NavBar Link)  │    │  + TasksPanel   │    │   + TaskList    │             │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘             │
│           │                      │                      │                       │
│           └──────────────────────┼──────────────────────┘                       │
│                                  │                                              │
│                    ┌─────────────▼─────────────┐                               │
│                    │      TaskComponents       │                               │
│                    │  ├─ TaskList.tsx         │                               │
│                    │  ├─ TaskForm.tsx         │                               │
│                    │  ├─ TaskCard.tsx         │                               │
│                    │  ├─ TaskFilters.tsx      │                               │
│                    │  └─ TaskSuggestionModal  │                               │
│                    └─────────────┬─────────────┘                               │
│                                  │                                              │
└──────────────────────────────────┼──────────────────────────────────────────────┘
                                   │
                                   │ fetch/mutate
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │  /api/tasks/*    │  │/api/journal-ai/  │  │/api/journal-     │              │
│  │  CRUD + Filter   │  │ extract-tasks    │  │ entries/[id]/    │              │
│  │                  │  │                  │  │ tasks            │              │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │
│           │                     │                     │                         │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   taskService    │  │ taskAIService    │  │journalAIService  │              │
│  │  (erweitert)     │  │ (NEU)            │  │  (erweitert)     │              │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │
│           │                     │                     │                         │
│           │                     ▼                     │                         │
│           │            ┌──────────────────┐           │                         │
│           │            │   OpenAI / LLM   │           │                         │
│           │            │   (Task-Prompt)  │           │                         │
│           │            └──────────────────┘           │                         │
│           │                                           │                         │
└───────────┼───────────────────────────────────────────┼─────────────────────────┘
            │                                           │
            ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               DATABASE (Prisma)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              Task (erweitert)                             │   │
│  │  + journalEntryId (FK → JournalEntry)                                    │   │
│  │  + priority (Enum: LOW, MEDIUM, HIGH)                                    │   │
│  │  + taskType (Enum: IMMEDIATE, REFLECTION, PLANNED_INTERACTION, ...)     │   │
│  │  + source (Enum: MANUAL, AI)                                             │   │
│  │  + aiConfidence (Float, optional)                                        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           JournalEntry (Relation)                         │   │
│  │  tasks: Task[] ← 1:N Beziehung                                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Erläuterungen

### 3.1 Frontend-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **TasksPage** (`/tasks`) | Zentrale Übersichtsseite aller Tasks mit Filtern und Sortierung |
| **TaskList** | Wiederverwendbare Liste von Tasks (erweitert bestehende Komponente) |
| **TaskCard** | Einzelne Task-Darstellung mit Quick-Actions (erledigen, bearbeiten) |
| **TaskForm** | Formular zum Erstellen/Bearbeiten von Tasks (erweitert) |
| **TaskFilters** | Filter-Komponente für Typ, Status, Priorität, Zeitraum |
| **TaskSuggestionModal** | Modal zur Anzeige und Bestätigung von KI-vorgeschlagenen Tasks |
| **JournalTasksPanel** | Grüner Panel-Bereich in der Tagebuch-Ansicht für Entry-Tasks |

### 3.2 Backend-Services

| Service | Beschreibung |
|---------|--------------|
| **taskService** | Erweitert um journalEntryId-Support, Prioritäten, Typen |
| **taskAIService** | NEU: KI-basierte Task-Extraktion aus Tagebuchtext |
| **journalAIService** | Integration der Task-Extraktion in die AI-Pipeline |

### 3.3 Externe Anbieter

| Anbieter | Verwendung |
|----------|------------|
| **OpenAI / Together AI** | LLM für Task-Extraktion (bestehendes Setup) |

---

## 4. Datenmodell

### 4.1 Schema-Erweiterungen

#### Neue Enums

```prisma
/// Typ/Kategorie einer Aufgabe
enum TaskType {
  IMMEDIATE           /// Kurzfristige, sofort umsetzbare Aufgabe
  REFLECTION          /// Reflexions-/Nachdenkaufgabe
  PLANNED_INTERACTION /// Geplante Interaktion mit einer Person
  FOLLOW_UP           /// Nachfassaktion
  RESEARCH            /// Recherche-Aufgabe
  HABIT_RELATED       /// Gewohnheits-bezogene Aufgabe
  GENERAL             /// Allgemeine Aufgabe
}

/// Priorität einer Aufgabe
enum TaskPriority {
  LOW    /// Niedrig
  MEDIUM /// Mittel
  HIGH   /// Hoch
}

/// Quelle/Herkunft einer Aufgabe
enum TaskSource {
  MANUAL /// Manuell vom User erstellt
  AI     /// Automatisch von KI abgeleitet
}
```

#### Erweitertes Task-Model

```prisma
model Task {
  /// Eindeutige ID
  id              String        @id @default(uuid())
  /// Besitzer-User
  userId          String
  /// Optionale Verknüpfung mit Entity (via Entity-Registry)
  entityId        String?
  /// Optionale Verknüpfung mit Kontakt
  contactId       String?
  /// NEU: Optionale Verknüpfung mit Tagebucheintrag
  journalEntryId  String?
  /// Titel der Aufgabe
  title           String
  /// Beschreibung (optional)
  description     String?
  /// Fälligkeitsdatum (optional)
  dueDate         DateTime?
  /// Status der Aufgabe
  status          TaskStatus    @default(PENDING)
  /// NEU: Typ/Kategorie der Aufgabe
  taskType        TaskType      @default(GENERAL)
  /// NEU: Priorität
  priority        TaskPriority  @default(MEDIUM)
  /// NEU: Quelle (manuell oder KI)
  source          TaskSource    @default(MANUAL)
  /// NEU: KI-Konfidenz (0-1, nur bei source=AI)
  aiConfidence    Float?
  /// Erledigungszeitpunkt
  completedAt     DateTime?
  /// Erstellungszeitpunkt
  createdAt       DateTime      @default(now())
  /// Letztes Update
  updatedAt       DateTime      @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  contact      Contact?      @relation(fields: [contactId], references: [id], onDelete: Cascade)
  journalEntry JournalEntry? @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, taskType])
  @@index([userId, priority])
  @@index([contactId])
  @@index([journalEntryId])
  @@index([dueDate])
}
```

#### JournalEntry-Erweiterung

```prisma
model JournalEntry {
  // ... bestehende Felder ...
  
  // NEU: Relation zu Tasks
  tasks Task[]
}
```

### 4.2 Betroffene Entitäten

| Entität | Änderung |
|---------|----------|
| **Task** | Erweitert um `journalEntryId`, `taskType`, `priority`, `source`, `aiConfidence` |
| **JournalEntry** | Neue Relation `tasks: Task[]` |

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue/Erweiterte Services

#### `lib/services/taskAIService.ts` (NEU)

```typescript
// Hauptfunktionen:
export async function extractTasksFromContent(
  content: string,
  journalEntryId: string,
  userId: string
): Promise<TaskSuggestion[]>

export async function buildTaskExtractionPrompt(content: string): string

export interface TaskSuggestion {
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  suggestedDueDate?: Date
  relatedContactName?: string  // Für spätere Kontakt-Verknüpfung
  confidence: number
}
```

#### `lib/services/taskService.ts` (erweitert)

```typescript
// Neue Funktionen:
export async function getTasksForJournalEntry(
  userId: string, 
  journalEntryId: string
): Promise<TaskWithRelations[]>

export async function createTasksFromSuggestions(
  userId: string,
  journalEntryId: string,
  suggestions: TaskSuggestion[]
): Promise<Task[]>

// Erweiterte Filter:
export interface TaskFilter {
  // ... bestehend ...
  taskType?: TaskType
  priority?: TaskPriority
  source?: TaskSource
  journalEntryId?: string
}
```

### 5.2 Neue API-Routen

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/tasks` | GET | Erweitert um `taskType`, `priority`, `journalEntryId` Filter |
| `/api/tasks` | POST | Erweitert um neue Felder |
| `/api/tasks/[id]` | PATCH | Erweitert um neue Felder |
| `/api/journal-entries/[id]/tasks` | GET | Tasks für einen Tagebucheintrag |
| `/api/journal-entries/[id]/tasks` | POST | Manuell Task zu Entry hinzufügen |
| `/api/journal-ai/extract-tasks` | POST | KI-Task-Extraktion triggern |
| `/api/journal-ai/extract-tasks` | POST | Body: `{ journalEntryId, content }` |

### 5.3 Erweiterte Validators

#### `lib/validators/task.ts` (erweitert)

```typescript
export const TaskTypeEnum = z.enum([
  'IMMEDIATE', 'REFLECTION', 'PLANNED_INTERACTION', 
  'FOLLOW_UP', 'RESEARCH', 'HABIT_RELATED', 'GENERAL'
])

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const TaskSourceEnum = z.enum(['MANUAL', 'AI'])

export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  entityId: z.string().uuid().optional().nullable(),
  journalEntryId: z.string().uuid().optional().nullable(),  // NEU
  taskType: TaskTypeEnum.default('GENERAL'),                 // NEU
  priority: TaskPriorityEnum.default('MEDIUM'),              // NEU
  source: TaskSourceEnum.default('MANUAL'),                  // NEU
})

export const TaskFilterSchema = z.object({
  // ... bestehend ...
  taskType: TaskTypeEnum.optional(),      // NEU
  priority: TaskPriorityEnum.optional(),  // NEU
  source: TaskSourceEnum.optional(),      // NEU
  journalEntryId: z.string().uuid().optional(),  // NEU
})
```

---

## 6. UX (Komponenten und Screens)

### 6.1 Tagebuch-Tagesansicht: Task-Panel (grün)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Montag, 20. Januar 2026                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Zusammenfassung ──────────────────────────────────────────┐  │
│ │ KI-generierte Zusammenfassung des Tages...                 │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ Inhalt ───────────────────────────────────────────────────┐  │
│ │ [Accordion mit Tagebucheinträgen]                          │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ Analyse ──────────────────────────────────────────────────┐  │
│ │ ACT-Perspektive und Insights...                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ Aufgaben ─────────────────────────────────── bg-success/10 ┐  │  ← GRÜN
│ │                                                              │  │
│ │  ☐ Arzttermin vereinbaren              🔴 HIGH   📅 22.01.  │  │
│ │    ↳ Aus: "Muss endlich zum Arzt..."   🤖 AI                │  │
│ │                                                              │  │
│ │  ☐ Mit Maria über Projekt sprechen     🟡 MED    📅 25.01.  │  │
│ │    ↳ Aus: "Maria erwähnt..."           🤖 AI                │  │
│ │                                                              │  │
│ │  ☑ Meditation wieder aufnehmen         🟢 LOW               │  │
│ │    ↳ Manuell hinzugefügt               ✋ Manual            │  │
│ │                                                              │  │
│ │  [+ Aufgabe hinzufügen]                                     │  │
│ │                                                              │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Zentrale Tasks-Seite (`/tasks`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☑ Aufgaben                                        [+ Neue Aufgabe]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Filter ───────────────────────────────────────────────────┐  │
│ │ Status: [Offen ▼]  Typ: [Alle ▼]  Priorität: [Alle ▼]      │  │
│ │ Sortierung: [Fälligkeit ▼] [↑↓]                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ── Überfällig (2) ───────────────────────────────────────────── │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☐ Arzttermin vereinbaren                      🔴 HIGH      │  │
│ │   📅 18.01. (überfällig!)  👤 -  📝 Tagebuch 15.01.        │  │
│ │   🏷️ IMMEDIATE                                             │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ── Heute fällig (1) ─────────────────────────────────────────── │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☐ Mit Maria über Projekt sprechen             🟡 MEDIUM    │  │
│ │   📅 Heute  👤 Maria  📝 Tagebuch 18.01.                   │  │
│ │   🏷️ PLANNED_INTERACTION                                   │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ── Bald fällig (3) ──────────────────────────────────────────── │
│ ...                                                              │
│                                                                  │
│ ── Ohne Fälligkeit (5) ──────────────────────────────────────── │
│ ...                                                              │
│                                                                  │
│ [Erledigte anzeigen ▼]                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Task-Suggestion Modal (nach Speichern eines Eintrags)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 Erkannte Aufgaben                                    [✕]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Folgende Aufgaben wurden aus deinem Eintrag erkannt:            │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☑ Arzttermin vereinbaren                     Konfidenz: 92%│  │
│ │   Typ: IMMEDIATE  Priorität: [HIGH ▼]  Fällig: [22.01. 📅] │  │
│ │   [Bearbeiten]                                              │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☑ Mit Maria sprechen                         Konfidenz: 78%│  │
│ │   Typ: PLANNED_INTERACTION  Priorität: [MED ▼]  Kontakt: ? │  │
│ │   [Maria zuordnen ▼]  [Bearbeiten]                         │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☐ Über Work-Life-Balance nachdenken          Konfidenz: 45%│  │
│ │   Typ: REFLECTION  (abgewählt - niedrige Konfidenz)        │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│                          [Überspringen]  [Ausgewählte speichern] │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Navigation

Der Tasks-Link wird in der bestehenden Navigation ergänzt:

```
┌─────────────────────────────────────────────────────────────────┐
│ [🏠 Heute] [📅 Kalender] [👥 Kontakte] [☑ Aufgaben] [⚙️ ...]   │
└─────────────────────────────────────────────────────────────────┘
                                           ↑ NEU
```

---

## 7. Neue Dependencies

Keine neuen npm-Packages erforderlich. Das Feature nutzt:

- **Vercel AI SDK** (bereits vorhanden) - für LLM-Aufrufe
- **Zod** (bereits vorhanden) - für Validierung
- **Prisma** (bereits vorhanden) - für Datenbankzugriff
- **date-fns** (bereits vorhanden) - für Datumsformatierung
- **@tabler/icons-react** (bereits vorhanden) - für Icons

---

## 8. Dateistruktur

### Neue Dateien

```
prisma/
└── schema.prisma                          # ÄNDERN: Task erweitern + Enums

lib/
├── services/
│   ├── taskService.ts                     # ÄNDERN: Erweitern
│   └── taskAIService.ts                   # NEU: KI-Task-Extraktion
├── validators/
│   └── task.ts                            # ÄNDERN: Neue Felder
└── config/
    └── taskPrompts.ts                     # NEU: Prompts für Task-Extraktion

app/
├── tasks/
│   └── page.tsx                           # ÄNDERN: Vollständig überarbeiten
└── api/
    ├── tasks/
    │   └── route.ts                       # ÄNDERN: Filter erweitern
    ├── journal-entries/
    │   └── [id]/
    │       └── tasks/
    │           └── route.ts               # NEU: Entry-Tasks CRUD
    └── journal-ai/
        └── extract-tasks/
            └── route.ts                   # NEU: Task-Extraktion

components/
└── features/
    └── tasks/
        ├── TaskList.tsx                   # ÄNDERN: Erweitern
        ├── TaskForm.tsx                   # ÄNDERN: Neue Felder
        ├── TaskCard.tsx                   # NEU: Einzelne Task-Karte
        ├── TaskFilters.tsx                # NEU: Filter-Komponente
        ├── TaskSuggestionModal.tsx        # NEU: KI-Vorschläge
        └── JournalTasksPanel.tsx          # NEU: Grüner Panel für Entry

hooks/
└── useTasksForEntry.ts                    # NEU: Hook für Entry-Tasks
```

### Geänderte Dateien

```
components/
└── features/
    └── diary/
        └── DiarySection.tsx               # ÄNDERN: TasksPanel integrieren

components/
└── layout/
    └── SiteNav.tsx (oder ähnlich)         # ÄNDERN: Tasks-Link hinzufügen
```

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Datenmodell erweitern

**Ziel:** Schema-Erweiterungen für Task

**Anforderungen:**
- Neue Enums `TaskType`, `TaskPriority`, `TaskSource` in `schema.prisma`
- Task-Model erweitern um `journalEntryId`, `taskType`, `priority`, `source`, `aiConfidence`
- Relation `tasks` auf `JournalEntry` hinzufügen
- Neue Indizes für Performance
- `prisma db push` ausführen

---

### Schritt 2 (LLM): Validators und Types erweitern

**Ziel:** Zod-Schemas für neue Felder

**Anforderungen:**
- `lib/validators/task.ts` erweitern
- Neue Enums als Zod-Typen
- `TaskCreateSchema`, `TaskUpdateSchema`, `TaskFilterSchema` anpassen
- TypeScript-Types exportieren

---

### Schritt 3 (LLM): taskService erweitern

**Ziel:** Backend-Logik für erweiterte Tasks

**Anforderungen:**
- `getTasksForJournalEntry()` implementieren
- Filter um `taskType`, `priority`, `journalEntryId` erweitern
- `createTask()` um neue Felder erweitern
- Bestehende Tests anpassen

---

### Schritt 4 (LLM): taskAIService erstellen

**Ziel:** KI-basierte Task-Extraktion

**Anforderungen:**
- Neuer Service `lib/services/taskAIService.ts`
- Prompt-Template für Task-Extraktion (strukturiertes JSON-Output)
- Funktion `extractTasksFromContent()`
- Confidence-Score pro Task
- Kontaktnamen-Erkennung (für spätere Zuordnung)

**Prompt-Strategie:**
```
Analysiere den folgenden Tagebucheintrag und extrahiere konkrete Aufgaben.
Für jede Aufgabe gib zurück:
- title: Kurzer, aktionsorientierter Titel
- description: Optionale Details
- taskType: IMMEDIATE|REFLECTION|PLANNED_INTERACTION|FOLLOW_UP|RESEARCH|HABIT_RELATED|GENERAL
- priority: LOW|MEDIUM|HIGH
- suggestedDueDate: ISO-Datum falls erkennbar, sonst null
- relatedPersonName: Name der Person falls erwähnt, sonst null
- confidence: 0-1 Konfidenz-Score

Antworte als JSON-Array.
```

---

### Schritt 5 (LLM): API-Routen erweitern/erstellen

**Ziel:** REST-Endpoints für Tasks

**Anforderungen:**
- `/api/tasks` GET erweitern (neue Filter)
- `/api/tasks` POST erweitern (neue Felder)
- `/api/journal-entries/[id]/tasks` GET/POST erstellen
- `/api/journal-ai/extract-tasks` POST erstellen

---

### Schritt 6 (LLM): TaskCard Komponente

**Ziel:** Wiederverwendbare Task-Karte

**Anforderungen:**
- Kompakte Darstellung eines Tasks
- Checkbox zum Abhaken
- Prioritäts-Indikator (farbig)
- Typ-Badge
- Fälligkeitsdatum (mit Überfällig-Warnung)
- Links zu verknüpftem Entry/Kontakt
- Quick-Edit inline

---

### Schritt 7 (LLM): TaskFilters Komponente

**Ziel:** Filter-UI für Task-Listen

**Anforderungen:**
- Status-Filter (Offen, Erledigt, Alle)
- Typ-Filter (Dropdown mit TaskTypes)
- Prioritäts-Filter
- Sortierung (Fälligkeit, Erstellung, Priorität)
- Responsive Design

---

### Schritt 8 (LLM): TaskSuggestionModal Komponente

**Ziel:** Modal für KI-Vorschläge

**Anforderungen:**
- Liste der vorgeschlagenen Tasks
- Checkboxes zum Auswählen/Abwählen
- Konfidenz-Anzeige
- Inline-Bearbeitung (Titel, Priorität, Datum)
- Kontakt-Zuordnung (Dropdown)
- "Überspringen" und "Speichern" Buttons

---

### Schritt 9 (LLM): JournalTasksPanel Komponente

**Ziel:** Grüner Task-Bereich in Tagesansicht

**Anforderungen:**
- Grüne Hintergrundfarbe (`bg-success/10` oder ähnlich)
- Header "Aufgaben" mit Icon
- Liste der Tasks für diesen Tag/Entry
- "+ Aufgabe hinzufügen" Button
- Integration in `DiarySection.tsx`

---

### Schritt 10 (LLM): TaskList und TaskForm erweitern

**Ziel:** Bestehende Komponenten anpassen

**Anforderungen:**
- TaskList: Neue Props für Filter, Gruppierung
- TaskForm: Neue Felder (taskType, priority)
- Styling-Anpassungen

---

### Schritt 11 (LLM): Tasks-Seite überarbeiten

**Ziel:** Vollständige `/tasks` Seite

**Anforderungen:**
- Server Component für initiale Daten
- Client Component für Interaktivität
- Filter-Integration
- Gruppierung nach Fälligkeit
- Pagination
- Neuer Task erstellen

---

### Schritt 12 (LLM): Navigation erweitern

**Ziel:** Tasks-Link in NavBar

**Anforderungen:**
- Icon + Label "Aufgaben"
- Badge mit Anzahl offener Tasks (optional)
- Mobile-responsive

---

### Schritt 13 (LLM): useTasksForEntry Hook

**Ziel:** React Hook für Entry-Tasks

**Anforderungen:**
- Laden der Tasks für einen Entry
- Mutations (erstellen, abschliessen, löschen)
- Optimistic Updates
- Error Handling

---

### Schritt 14 (LLM): Integration in DiarySection

**Ziel:** Panel in Tagesansicht einbinden

**Anforderungen:**
- JournalTasksPanel nach "Analyse" einfügen
- Daten laden via useTasksForEntry
- Task-Erstellung inline

---

### Schritt 15 (LLM): KI-Extraktion in Pipeline integrieren

**Ziel:** Automatische Task-Erkennung

**Anforderungen:**
- Nach Speichern eines Entries optional Task-Extraktion triggern
- User-Setting für automatische vs. manuelle Extraktion
- TaskSuggestionModal anzeigen wenn Tasks erkannt

---

### Schritt 16 (Mensch): Review und Feintuning

**Ziel:** Qualitätssicherung

**Anforderungen:**
- KI-Prompt feintunen basierend auf echten Einträgen
- UX-Feedback einarbeiten
- Performance-Optimierung

---

## 10. Automatisiertes Testing

### Unit Tests

| Test-Datei | Beschreibung |
|------------|--------------|
| `__tests__/lib/services/taskService.test.ts` | Service-Funktionen |
| `__tests__/lib/services/taskAIService.test.ts` | KI-Extraktion (mocked) |
| `__tests__/lib/validators/task.test.ts` | Zod-Schema-Validierung |

### Komponenten-Tests

| Test-Datei | Beschreibung |
|------------|--------------|
| `__tests__/components/TaskCard.test.tsx` | Rendering, Click-Handler |
| `__tests__/components/TaskFilters.test.tsx` | Filter-Interaktion |
| `__tests__/components/TaskSuggestionModal.test.tsx` | Modal-Workflow |

### Integration Tests

| Test-Datei | Beschreibung |
|------------|--------------|
| `__tests__/api/tasks.test.ts` | API-Routen |

---

## 11. Manuelles Testing

### Test-Szenarien

1. **Task manuell erstellen**
   - Auf `/tasks` gehen → "+ Neue Aufgabe" klicken
   - Alle Felder ausfüllen (Titel, Beschreibung, Typ, Priorität, Datum)
   - Speichern → Task erscheint in Liste

2. **Task zu Tagebucheintrag hinzufügen**
   - Tagesansicht öffnen
   - Im grünen "Aufgaben"-Bereich "+ Aufgabe hinzufügen"
   - Task erstellen → erscheint im Panel UND auf `/tasks`

3. **KI-Task-Extraktion**
   - Neuen Tagebucheintrag schreiben mit Aufgaben-Hinweisen
   - Speichern → Modal mit Vorschlägen erscheint
   - Tasks auswählen/bearbeiten → Speichern
   - Tasks erscheinen im Panel und auf `/tasks`

4. **Filter und Sortierung**
   - Auf `/tasks` verschiedene Filter testen
   - Nach Priorität sortieren
   - Nach Typ filtern
   - Kombinierte Filter

5. **Task abschliessen**
   - Checkbox klicken → Task wird als erledigt markiert
   - "Erledigte anzeigen" → Task erscheint dort
   - Wiederherstellen möglich

6. **Überfällige Tasks**
   - Task mit vergangenem Datum erstellen
   - Prüfen: Rote Markierung, Gruppierung "Überfällig"

---

## 12. Fragen an den Auftraggeber

### Funktionalität

1. **Automatische vs. manuelle Task-Extraktion:** Soll die KI-Extraktion automatisch nach jedem Speichern laufen, oder soll der User sie explizit triggern (z.B. via Button "Tasks erkennen")? -> explizit

2. **Konfidenz-Schwellwert:** Ab welcher Konfidenz sollen Tasks automatisch vorselektiert sein im Suggestion-Modal? (Vorschlag: ≥70%)

3. **Kontakt-Zuordnung:** Wenn die KI einen Personennamen erkennt: Soll automatisch nach passenden Kontakten gesucht und vorgeschlagen werden?

### UX

4. **Tasks in Tagesansicht:** Sollen im grünen Panel ALLE Tasks des Tages angezeigt werden, oder nur die, die mit Einträgen dieses Tages verknüpft sind?

5. **Badge in Navigation:** Soll ein Badge mit der Anzahl offener (oder überfälliger) Tasks im Nav-Link angezeigt werden?

6. **Mobile-Ansicht:** Soll das Task-Panel auf Mobile initial eingeklappt sein?

### Datenmodell

7. **Wiederkehrende Tasks:** Ist Unterstützung für wiederkehrende Tasks (z.B. "Jeden Montag meditieren") gewünscht? (Könnte später ergänzt werden)

8. **Task-Historie:** Soll eine Historie der Änderungen an Tasks gespeichert werden?

### Sonstiges

9. **Benachrichtigungen:** Sollen Benachrichtigungen für fällige Tasks generiert werden (Integration mit bestehendem Notification-System)?

10. **Export:** Sollen Tasks im PDF-Export des Tagebuchs enthalten sein?

---

**Ende des Konzeptdokuments**
