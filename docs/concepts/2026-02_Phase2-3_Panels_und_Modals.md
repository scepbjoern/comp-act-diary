# Phase 2 & 3: Panels und Modals Integration - Implementierungskonzept

> **Status**: ✅ Implementiert  
> **Erstellt**: 2026-02-05  
> **Implementiert**: 2026-02-07  
> **Bezug**: [Unified JournalEntry Implementation Plan](2026-02_Unified_JournalEntry_Implementation_Plan.md)  
> **Vorgänger**: [Phase 1: JournalEntryCard Erweiterung](2026-02_Phase1_JournalEntryCard_Erweiterung.md) ✅  
> **Ziel**: Integration bestehender Panels und Modals in `JournalEntryCard` für Feature-Parität mit `DiaryEntriesAccordion`

---

## Inhaltsverzeichnis

1. [Ausgangslage](#1-ausgangslage)
2. [Anforderungen](#2-anforderungen)
3. [Architekturübersicht](#3-architekturübersicht)
4. [Komponenten-Analyse](#4-komponenten-analyse)
5. [Read-Mode vs. Edit-Mode Abgrenzung](#5-read-mode-vs-edit-mode-abgrenzung)
6. [Datenmodell & APIs](#6-datenmodell--apis)
7. [UX (Komponenten und Screens)](#7-ux-komponenten-und-screens)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Testdaten-Anpassungen](#10-testdaten-anpassungen)
11. [Automatisiertes Testing](#11-automatisiertes-testing)
12. [Manuelles Testing](#12-manuelles-testing)
13. [Fragen an den Auftraggeber](#13-fragen-an-den-auftraggeber)

---

## 1. Ausgangslage

### 1.1 Status nach Phase 1

`JournalEntryCard` unterstützt nun:
- ✅ Compact/Expanded Modes mit Toggle
- ✅ AI Summary/Analysis Sections (collapsible, farbig)
- ✅ Content mit Markdown-Rendering und @-Mentions
- ✅ Multi-Audio mit AudioPlayerH5 und expandierbaren Transkripten
- ✅ Foto-Galerie mit Lightbox

### 1.2 Feature-Gap zu DiaryEntriesAccordion

Folgende Features fehlen noch in `JournalEntryCard`:

| Feature | DiaryEntriesAccordion | JournalEntryCard | Phase |
|---------|----------------------|------------------|-------|
| OCRSourcePanel | ✅ | ❌ | **2** |
| JournalTasksPanel | ✅ | ❌ | **2** |
| ShareEntryModal + SharedBadge | ✅ | ❌ | **3** |
| TimestampModal | ✅ | ❌ | **3** |
| AISettingsPopup | ✅ | ❌ | **3** |
| Re-Transkription Button | ✅ | ❌ | **2** |

---

## 2. Anforderungen

### 2.1 Funktionale Anforderungen (Phase 2 & 3)

| ID | Anforderung | Phase | Modus |
|----|-------------|-------|-------|
| FR-01 | Re-Transkription pro Audio triggern können | 2 | Read* |
| FR-02 | OCR-Quellen (Bilder/PDFs) anzeigen und herunterladen | 2 | Read |
| FR-03 | Tasks des Eintrags anzeigen und verwalten | 2 | Read |
| FR-04 | KI-Task-Extraktion triggern können | 2 | Read |

> \* Re-Transkription ändert `MediaAttachment.transcript`, nicht `JournalEntry.content`  
> \** Timestamps sind Metadaten, kein Content-Edit

### 2.2 Auf Phase 4 verschobene Anforderungen

| ID | Anforderung | Grund |
|----|-------------|-------|
| FR-X1 | "Restore to Content" aus OCRSourcePanel | Erfordert Content-Bearbeitung |

### 2.3 Nicht-funktionale Anforderungen

| ID | Anforderung |
|----|-------------|
| NFR-01 | Panels werden lazy-loaded (erst bei Expand API-Call) |
| NFR-02 | Bestehende Panel-Komponenten unverändert importieren |
| NFR-03 | Alle neuen Features als optionale Props (Backward-Compatibility) |
| NFR-04 | Keine Breaking Changes an bestehenden APIs |

---

## 3. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           app/journal/page.tsx                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  State: lightboxPhoto, shareModalEntry, timestampModalEntry,          │  │
│  │         aiSettingsEntry                                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      JournalEntryCard (erweitert)                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Header: TypeBadge, SharedBadge, Actions (Edit,Delete,Share,     │  │  │
│  │  │         Timestamp, AISettings, Pipeline)                        │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Expanded Content:                                               │  │  │
│  │  │   - AI Summary Section                                          │  │  │
│  │  │   - AI Analysis Section                                         │  │  │
│  │  │   - Content Section (Markdown)                                  │  │  │
│  │  │   - Audio Section (mit Transkript-Toggle)                       │  │  │
│  │  │   - Photo Gallery                                               │  │  │
│  │  │   - OCRSourcePanel (NEU Phase 2)                                │  │  │
│  │  │   - JournalTasksPanel (NEU Phase 2)                             │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────────┐        ┌─────────────────┐    │
│  │ShareEntry   │          │TimestampModal   │        │AISettingsPopup  │    │
│  │Modal        │          │                 │        │                 │    │
│  └─────────────┘          └─────────────────┘        └─────────────────┘    │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  /api/notes/[id]/access    /api/notes/[id]           useAISettings Hook     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Komponenten-Analyse

### 4.1 OCRSourcePanel

**Pfad**: `components/features/ocr/OCRSourcePanel.tsx`

**Aktuelle Props**:
```typescript
interface OCRSourcePanelProps {
  noteId: string
  initialTranscript?: string | null
  onRestoreToContent?: (originalText: string) => void  // Bereits optional ✅
}
```

**Für Phase 2 relevant**:
- ✅ `noteId` für Laden der OCR-Quellen
- ✅ Anzeige und Download der Quell-Dateien
- ❌ `onRestoreToContent` → Phase 4

**Anpassung nötig**: Keine

### 4.2 JournalTasksPanel

**Pfad**: `components/features/tasks/JournalTasksPanel.tsx`

**Aktuelle Props**:
```typescript
interface JournalTasksPanelProps {
  journalEntryId: string
  tasks: TaskCardData[]
  contacts?: Contact[]
  onTasksChange?: () => void
  defaultExpanded?: boolean
}
```

**Für Phase 2 relevant**:
- ✅ Vollständig nutzbar im Read-Mode
- ✅ Tasks sind separate Entitäten, kein Entry-Edit nötig
- ✅ KI-Extraktion triggert `/api/journal-ai/extract-tasks`

**Anpassung nötig**: Keine

### 4.3 ShareEntryModal

**Pfad**: `components/features/diary/ShareEntryModal.tsx`

**Aktuelle Props**:
```typescript
interface ShareEntryModalProps {
  entryId: string
  isOpen: boolean
  onClose: () => void
  onAccessChange?: () => void
}
```

**Für Phase 3 relevant**:
- ✅ Vollständig nutzbar
- ✅ Nutzt `/api/notes/[id]/access` für Berechtigungen

**Anpassung nötig**: Keine

### 4.4 TimestampModal

**Pfad**: `components/features/day/TimestampModal.tsx`

**Aktuelle Props**:
```typescript
interface TimestampModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (occurredAt: string, capturedAt: string, audioFileId?: string | null) => Promise<void>
  occurredAtIso?: string
  capturedAtIso?: string
  audioCapturedAtIso?: string | null
  audioUploadedAtIso?: string | null
  audioFileId?: string | null
}
```

**Für Phase 3 relevant**:
- ✅ `onSave` ruft separaten API-Endpoint auf (nicht Entry-Edit)
- ⚠️ Nutzt `/api/notes/[id]` PATCH → muss für Journal-Entries funktionieren

**Anpassung nötig**: Prüfen ob `/api/journal-entries/[id]` Timestamp-Update unterstützt

### 4.5 AISettingsPopup

**Pfad**: `components/features/ai/AISettingsPopup.tsx`

**Aktuelle Props**:
```typescript
interface AISettingsPopupProps {
  isOpen: boolean
  onClose: () => void
  typeCode: string
  typeName: string
}
```

**Für Phase 3 relevant**:
- ✅ Reine Anzeige, kein Edit
- ✅ Nutzt `useAISettings` Hook

**Anpassung nötig**: Keine

### 4.6 SharedBadge

**Pfad**: `components/features/diary/SharedBadge.tsx` (oder inline in DiaryEntriesAccordion)

**Zu prüfen**: Existiert als separate Komponente oder muss extrahiert werden?

---

## 5. Read-Mode vs. Edit-Mode Abgrenzung

### 5.1 Phase 2 & 3 Scope (Read-Mode)

| Feature | Aktion | API | Ändert Entry? |
|---------|--------|-----|---------------|
| Re-Transkription | POST | `/api/transcribe` + PATCH attachment | Nein* |
| OCR-Quellen anzeigen | GET | `/api/notes/[id]/ocr-sources` | Nein |
| Tasks verwalten | CRUD | `/api/tasks/*` | Nein |
| KI-Tasks extrahieren | POST | `/api/journal-ai/extract-tasks` | Nein |
| Sharing verwalten | CRUD | `/api/notes/[id]/access` | Nein |
| Timestamps ändern | PATCH | `/api/journal-entries/[id]` | Ja** |
| AI-Settings anzeigen | GET | `useAISettings` | Nein |

> \* Ändert `MediaAttachment.transcript`, nicht `JournalEntry.content`  
> \** Timestamps sind Metadaten, kein Content-Edit

### 5.2 Phase 4 Scope (Edit-Mode)

Diese Features erfordern Content-Bearbeitung und werden auf Phase 4 verschoben:

| Feature | Grund |
|---------|-------|
| Restore OCR to Content | Überschreibt `entry.content` |
| AI-Summary/Analysis generieren/löschen | Ändert Entry-Felder |

---

## 6. Datenmodell & APIs

### 6.1 Bestehende APIs (unverändert nutzen)

| Endpoint | Methode | Zweck |
|----------|---------|-------|
| `/api/notes/[id]/ocr-sources` | GET | OCR-Quellen laden |
| `/api/notes/[id]/access` | GET/POST/DELETE | Sharing verwalten |
| `/api/tasks` | GET/POST | Tasks laden/erstellen |
| `/api/tasks/[id]` | PATCH/DELETE | Task bearbeiten/löschen |
| `/api/journal-ai/extract-tasks` | POST | KI-Task-Extraktion |
| `/api/transcribe` | POST | Audio transkribieren |

### 6.2 Zu prüfende APIs

| Endpoint | Prüfung |
|----------|---------|
| `/api/journal-entries/[id]` PATCH | Unterstützt `occurredAt`, `capturedAt` Update? |

### 6.3 Datenfluss für Tasks

```
JournalEntryCard
    │
    ├── useTasksForEntry(entryId)  // Hook zum Laden
    │       └── GET /api/tasks?journalEntryId=xxx
    │
    └── JournalTasksPanel
            ├── onTasksChange → refetch
            ├── handleComplete → PATCH /api/tasks/[id]
            ├── handleDelete → DELETE /api/tasks/[id]
            └── handleExtract → POST /api/journal-ai/extract-tasks
```

---

## 7. UX (Komponenten und Screens)

### 7.1 Expanded-Mode mit Panels (Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📓 Diary • Template       🔗(shared)    [✏️] [🗑️] [🔗] [🕐] [⚡]│
├─────────────────────────────────────────────────────────────────┤
│ Mein Tagebucheintrag                           14:30 · Heute    │
├─────────────────────────────────────────────────────────────────┤
│ [AI Summary - collapsible]                                      │
│ [AI Analysis - collapsible]                                     │
│ [Content - Markdown]                                            │
│ [Audio Section - collapsible]                                   │
│ [Photo Gallery]                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ OCR-Quellen ──────────────────────────────────────── [▼] ─┐  │
│ │ [📄] Scan_001.pdf           2026-02-05  [👁️ Vorschau] [⬇️] │  │
│ │ [🖼️] Foto_001.jpg           2026-02-04  [👁️ Vorschau] [⬇️] │  │
│ └────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Aufgaben (2 offen) ───────────────────────────────── [▼] ─┐  │
│ │ [ ] Arzt anrufen                              Fällig: Mo    │  │
│ │ [ ] Einkaufen gehen                                         │  │
│ │ [✓] Rechnung bezahlt                          ✓ erledigt    │  │
│ │                                    [+ Aufgabe] [✨ KI-Scan]  │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Header mit neuen Actions (Phase 3)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📓 Diary • Template  🔗    [✏️] [🗑️] [🔗] [🕐] [⚙️] [⚡]        │
│                      ↑      ↑    ↑    ↑    ↑    ↑    ↑          │
│                  SharedBadge │   │    │    │    │    │          │
│                          Edit│   │    │    │    │ Pipeline      │
│                        Delete│   │    │    │ AISettings        │
│                         Share│   │ Timestamp                    │
│                              │                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Modal-Trigger und State

| Button | Öffnet | State in Page |
|--------|--------|---------------|
| 🔗 Share | ShareEntryModal | `shareModalEntryId: string \| null` |
| 🕐 Timestamp | TimestampModal | `timestampModalEntry: Entry \| null` |
| ⚙️ AI Settings | AISettingsPopup | `aiSettingsEntry: Entry \| null` |

### 7.4 Interaktionen (Phase 2 & 3)

| Aktion | Trigger | Ergebnis |
|--------|---------|----------|
| Re-Transkription | Klick auf 🔄 bei Audio | Transcribe API, Attachment-Update, Toast |
| OCR-Quellen Panel öffnen | Klick auf Panel-Header | Lazy-load Quellen, Panel expandiert |
| OCR-Vorschau | Klick auf 👁️ | Bild/PDF in Modal anzeigen |
| Task erstellen | Klick auf [+ Aufgabe] | Inline-Form oder Modal |
| Task erledigen | Klick auf Checkbox | PATCH API, optimistic update |
| KI-Task-Scan | Klick auf [✨ KI-Scan] | Extract API, Suggestion-Modal |
| Share öffnen | Klick auf 🔗 Button | ShareEntryModal öffnet |
| Timestamp öffnen | Klick auf 🕐 Button | TimestampModal öffnet |
| AI Settings öffnen | Klick auf ⚙️ Button | AISettingsPopup öffnet |

---

## 8. Dateistruktur

### 8.1 Zu ändernde Dateien

| Datei | Änderungsart | Beschreibung |
|-------|--------------|--------------|
| `components/features/journal/JournalEntryCard.tsx` | Erweitern | Neue Props, Panels importieren, Header-Actions |
| `app/journal/page.tsx` | Erweitern | Modal-States, neue Callbacks |

### 8.2 Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `components/features/diary/SharedBadge.tsx` | Badge-Komponente (falls nicht existiert) |

### 8.3 Unverändert importierte Komponenten

| Komponente | Pfad |
|------------|------|
| `OCRSourcePanel` | `components/features/ocr/` |
| `JournalTasksPanel` | `components/features/tasks/` |
| `ShareEntryModal` | `components/features/diary/` |
| `TimestampModal` | `components/features/day/` |
| `AISettingsPopup` | `components/features/ai/` |

### 8.4 Import-Struktur nach Phase 2 & 3

```typescript
// JournalEntryCard.tsx - Neue Imports
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import JournalTasksPanel from '@/components/features/tasks/JournalTasksPanel'
import { SharedBadge } from '@/components/features/diary/SharedBadge'
```

```typescript
// app/journal/page.tsx - Neue Imports
import { ShareEntryModal } from '@/components/features/diary/ShareEntryModal'
import { TimestampModal } from '@/components/features/day/TimestampModal'
import { AISettingsPopup } from '@/components/features/ai/AISettingsPopup'
```

---

## 9. Implementierungsplan

### Phase 2: Panels integrieren

#### Schritt 2.1 (LLM): SharedBadge Komponente erstellen/extrahieren

**Ziel**: Wiederverwendbare Badge-Komponente für Sharing-Status

**Anforderungen**:
- Prüfen ob bereits in `DiaryEntriesAccordion` vorhanden → extrahieren
- Falls nicht: Neue Komponente erstellen
- Props: `isShared: boolean`, `sharedWith?: string[]`, optional `onClick`
- Icon: 🔗 oder ähnlich, mit Tooltip für Details

**Dateien**: `components/features/diary/SharedBadge.tsx` (neu oder extrahiert)

---

#### Schritt 2.2 (LLM): JournalEntryCard Props erweitern

**Ziel**: Neue Props für Panels und Modals hinzufügen

**Anforderungen**:
```typescript
interface JournalEntryCardProps {
  // ... bestehende Props ...
  
  // Phase 2: Panels
  showOCRSources?: boolean
  showTasks?: boolean
  tasks?: TaskCardData[]
  onTasksChange?: () => void
  onRetranscribe?: (attachmentId: string, newText: string, model: string) => void
  
  // Phase 3: Modals
  isShared?: boolean
  sharedWith?: string[]
  onOpenShareModal?: () => void
  onOpenTimestampModal?: () => void
  onOpenAISettings?: () => void
}
```

**Dateien**: `components/features/journal/JournalEntryCard.tsx`

---

#### Schritt 2.3 (LLM): OCRSourcePanel in JournalEntryCard integrieren

**Ziel**: Panel anzeigen wenn OCR-Quellen vorhanden

**Anforderungen**:
- Import OCRSourcePanel
- Anzeigen wenn `showOCRSources !== false` UND Entry OCR-Attachments hat
- `noteId` = `entry.id`
- Panel standardmässig collapsed
- Ohne `onRestoreToContent` (Phase 4)

**Hinweis**: OCR-Attachments erkennen via `role === 'SOURCE'` oder `mimeType`

**Dateien**: `components/features/journal/JournalEntryCard.tsx`

---

#### Schritt 2.4 (LLM): JournalTasksPanel in JournalEntryCard integrieren

**Ziel**: Task-Panel im expanded Mode anzeigen

**Anforderungen**:
- Import JournalTasksPanel
- Anzeigen wenn `showTasks !== false`
- Props: `journalEntryId`, `tasks`, `onTasksChange`
- Panel standardmässig expanded wenn Tasks vorhanden
- Grüner Hintergrund beibehalten (wie in DiaryEntriesAccordion)

**Dateien**: `components/features/journal/JournalEntryCard.tsx`

---

#### Schritt 2.5 (LLM): useTasksForEntry Hook nutzen

**Ziel**: Tasks für Entry laden in Journal-Page

**Anforderungen**:
- Prüfen ob `useTasksForEntry` Hook existiert, sonst erstellen
- In `app/journal/page.tsx` für jeden Entry Tasks laden
- Alternativ: Tasks im `useJournalEntries` Hook mitladen

**Dateien**: `app/journal/page.tsx`, evtl. `hooks/useTasksForEntry.ts`

---

### Phase 3: Modals & Popups

#### Schritt 3.1 (LLM): SharedBadge im Header integrieren

**Ziel**: Sharing-Status im Header anzeigen

**Anforderungen**:
- SharedBadge neben Type-Badge im Header
- Nur anzeigen wenn `isShared === true`
- Klick öffnet ShareEntryModal (falls `onOpenShareModal` vorhanden)

**Dateien**: `components/features/journal/JournalEntryCard.tsx`

---

#### Schritt 3.2 (LLM): Header-Actions erweitern

**Ziel**: Neue Buttons für Share, Timestamp, AI Settings

**Anforderungen**:
- Share-Button (🔗): Ruft `onOpenShareModal` auf
- Timestamp-Button (🕐): Ruft `onOpenTimestampModal` auf
- AI-Settings-Button (⚙️): Ruft `onOpenAISettings` auf
- Buttons nur anzeigen wenn entsprechender Callback vorhanden
- Konsistentes Styling mit bestehenden Buttons

**Dateien**: `components/features/journal/JournalEntryCard.tsx`

---

#### Schritt 3.3 (LLM): Modal-States in Journal-Page

**Ziel**: State-Management für alle Modals

**Anforderungen**:
```typescript
// Neue States
const [shareModalEntryId, setShareModalEntryId] = useState<string | null>(null)
const [timestampModalEntry, setTimestampModalEntry] = useState<EntryWithRelations | null>(null)
const [aiSettingsEntry, setAiSettingsEntry] = useState<EntryWithRelations | null>(null)
```

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 3.4 (LLM): ShareEntryModal integrieren

**Ziel**: Modal für Sharing-Verwaltung einbinden

**Anforderungen**:
- Import ShareEntryModal
- Rendern wenn `shareModalEntryId !== null`
- Props: `entryId`, `isOpen`, `onClose`, `onAccessChange`
- `onAccessChange` → Entry refetchen für SharedBadge-Update

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 3.5 (LLM): TimestampModal integrieren

**Ziel**: Modal für Zeitstempel-Bearbeitung einbinden

**Anforderungen**:
- Import TimestampModal
- Rendern wenn `timestampModalEntry !== null`
- Props aus Entry mappen: `occurredAtIso`, `capturedAtIso`, etc.
- `onSave` → PATCH `/api/journal-entries/[id]` mit neuen Timestamps
- Nach Save: Entry refetchen

**Prüfen**: API-Endpoint muss `occurredAt`, `capturedAt` Updates unterstützen

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 3.6 (LLM): AISettingsPopup integrieren

**Ziel**: Popup für AI-Einstellungen einbinden

**Anforderungen**:
- Import AISettingsPopup
- Rendern wenn `aiSettingsEntry !== null`
- Props: `typeCode` aus `entry.type.code`, `typeName` aus `entry.type.name`
- Nur Anzeige, kein Edit

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 3.7 (LLM): Callbacks an JournalEntryCard übergeben

**Ziel**: Alle neuen Callbacks in Entry-Loop verbinden

**Anforderungen**:
```typescript
<JournalEntryCard
  // ... bestehende Props ...
  isShared={entry.accessGrants?.length > 0}
  sharedWith={entry.accessGrants?.map(g => g.username)}
  onOpenShareModal={() => setShareModalEntryId(entry.id)}
  onOpenTimestampModal={() => setTimestampModalEntry(entry)}
  onOpenAISettings={() => setAiSettingsEntry(entry)}
  tasks={tasksForEntry[entry.id] || []}
  onTasksChange={() => refetchTasks(entry.id)}
/>
```

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 3.8 (Mensch): Code-Review und Testing

**Ziel**: Qualitätssicherung

**Aufgaben**:
- Code-Review der Änderungen
- Manuelle Tests gemäss Kapitel 12
- Feedback für eventuelle Korrekturen

---

#### Schritt 3.9 (LLM): Bugfixes und Polish

**Ziel**: Identifizierte Probleme beheben

**Anforderungen**:
- Bugs aus Review beheben
- Edge Cases: Entries ohne Audio, ohne OCR, ohne Tasks
- Loading-States für lazy-loaded Panels
- Responsive Anpassungen

---

## 10. Testdaten-Anpassungen

Phase 2 & 3 erfordern **Testdaten-Erweiterungen** für:

| Entität | Anforderung |
|---------|-------------|
| JournalEntry | Mindestens 1 Entry mit `accessGrants` (shared) |
| MediaAttachment | Mindestens 1 Entry mit `role: 'SOURCE'` (OCR) |
| Task | Mindestens 1 Entry mit verknüpften Tasks |

**Prüfung in `testDataService.ts`**:
- Existieren bereits Entries mit Sharing?
- Existieren OCR-Attachments?
- Existieren Tasks mit `journalEntryId`?

Falls fehlend, in `prisma/seed.ts` ergänzen.

---

## 11. Automatisiertes Testing

### 11.1 Unit Tests

| Test | Datei | Beschreibung |
|------|-------|--------------|
| SharedBadge Rendering | `SharedBadge.test.tsx` | Badge nur bei `isShared=true` |
| Panel-Visibility | `JournalEntryCard.test.tsx` | Panels nur in expanded Mode |
| Callback-Invocation | `JournalEntryCard.test.tsx` | Buttons rufen korrekte Callbacks |

### 11.2 Automatische Verifizierung

```bash
npm run lint
npm run type-check
npm run test -- --grep "JournalEntryCard"
npm run test -- --grep "SharedBadge"
```

---

## 12. Manuelles Testing

### 12.1 Testszenarien

| ID | Szenario | Schritte | Erwartetes Ergebnis |
|----|----------|----------|---------------------|
| MT-01 | Re-Transkription | Re-Transkription-Button bei Audio klicken | Neues Transkript wird generiert, Toast erscheint |
| MT-02 | OCR-Quellen anzeigen | Entry mit OCR expandieren, Panel öffnen | Quell-Dateien werden angezeigt |
| MT-03 | OCR-Vorschau | Vorschau-Button klicken | Bild/PDF wird angezeigt |
| MT-04 | Task erstellen | [+ Aufgabe] klicken, Form ausfüllen | Neue Task erscheint in Liste |
| MT-05 | Task erledigen | Checkbox bei Task klicken | Task wird als erledigt markiert |
| MT-06 | KI-Task-Scan | [✨ KI-Scan] klicken | Suggestion-Modal öffnet mit Vorschlägen |
| MT-07 | SharedBadge | Entry mit Sharing ansehen | Badge 🔗 erscheint im Header |
| MT-08 | ShareEntryModal | Share-Button klicken | Modal öffnet, Berechtigungen editierbar |
| MT-09 | TimestampModal | Timestamp-Button klicken | Modal öffnet, Zeiten editierbar |
| MT-10 | AI Settings | AI-Settings-Button klicken | Popup öffnet mit Einstellungen |
| MT-11 | Timestamp speichern | Neue Zeit eingeben, Speichern | Entry wird aktualisiert |

### 12.2 Browser-Kompatibilität

- Chrome (Desktop)
- Safari (iOS)
- Firefox (Desktop)

### 12.3 Responsive Testing

- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

---

## 13. Entscheidungen

> Die folgenden Fragen wurden vom Auftraggeber beantwortet und sind nun verbindliche Entscheidungen.

### Funktionale Entscheidungen

**F1**: (Nicht mehr relevant - Original-Transkript-Panel entfernt)

**F2**: Soll das Tasks-Panel auch bei 0 Tasks angezeigt werden?
- ✅ **Option A: Ja, immer anzeigen**
- ~~Option B: Nur anzeigen wenn Tasks vorhanden~~

**F3**: Welche Header-Buttons sollen immer sichtbar sein vs. nur bei Hover?
- ✅ **Option A: Alle Buttons immer sichtbar**
- ~~Option B: Edit/Delete sichtbar, Rest bei Hover~~

**F4**: Soll die Re-Transkription sofort starten oder einen Modell-Auswahl-Dialog zeigen?
- ~~Option A: Sofort mit aktuellem User-Default-Modell~~
- ✅ **Option B: Dialog mit Modell-Auswahl**

### Technische Entscheidungen

**F5**: Sollen Tasks im `useJournalEntries` Hook mitgeladen werden oder separat?
- ~~Option A: Im Hook mitladen~~
- ✅ **Option B: Separat per Entry laden**

---

*Ende des Dokuments*
