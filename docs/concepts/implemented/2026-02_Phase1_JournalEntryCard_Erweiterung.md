# Phase 1: JournalEntryCard Erweiterung - Implementierungskonzept

> **Status**: ✅ Implementiert  
> **Erstellt**: 2026-02-05  
> **Implementiert**: 2026-02-05  
> **Bezug**: [Unified JournalEntry Implementation Plan](2026-02_Unified_JournalEntry_Implementation_Plan.md)  
> **Ziel**: Feature-Parität zwischen `JournalEntryCard` und `DiaryEntriesAccordion` herstellen

---

## Inhaltsverzeichnis

1. [Beschreibung des geplanten Features](#1-beschreibung-des-geplanten-features)
2. [Anforderungen](#2-anforderungen)
   - 2.1 Funktionale Anforderungen
   - 2.2 Nicht-funktionale Anforderungen
3. [Architekturübersicht](#3-architekturübersicht)
4. [Komponenten-Erläuterung](#4-komponenten-erläuterung)
5. [Datenmodell](#5-datenmodell)
6. [Services, Libraries und API-Routen](#6-services-libraries-und-api-routen)
7. [UX (Komponenten und Screens)](#7-ux-komponenten-und-screens)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Testdaten-Anpassungen](#10-testdaten-anpassungen)
11. [Automatisiertes Testing](#11-automatisiertes-testing)
12. [Manuelles Testing](#12-manuelles-testing)
13. [Fragen an den Auftraggeber](#13-fragen-an-den-auftraggeber)

---

## 1. Beschreibung des geplanten Features

### Ausgangslage

Die Anwendung hat zwei Komponenten zur Anzeige von Journal-Einträgen:

| Komponente | Verwendung | Status |
|------------|------------|--------|
| `DiaryEntriesAccordion` | Startseite (`/`) | Feature-reich, aber Legacy |
| `JournalEntryCard` | Journal-Seite (`/journal`) | Neu, aber Feature-arm |

**Problem**: `JournalEntryCard` fehlen kritische Features, die in `DiaryEntriesAccordion` vorhanden sind:
- Inline-Editing (Title, Content, Timestamps)
- Multi-Audio-Player mit Transkript-Anzeige
- Foto-Galerie mit Upload/Delete
- AI-Sektionen (Summary, Analysis)
- Original-Transkript-Anzeige

### Ziel von Phase 1

`JournalEntryCard` wird erweitert, sodass sie dieselben **Anzeige-Features** wie `DiaryEntriesAccordion` bietet:

1. **JournalEntrySection** - AI-Sektionen (Summary, Analysis) anzeigen
2. **Multi-Audio-Support** - Mehrere Audios abspielen mit `AudioPlayerH5` + Transkript-Anzeige
3. **Foto-Galerie** - Alle Fotos anzeigen mit Lightbox
4. **Compact/Expanded Modes** - Unterschiedliche Darstellung je nach Kontext

> **Hinweis zu Inline-Editing**: Das Bearbeiten von Einträgen erfolgt **nicht** durch einen Edit-Mode innerhalb der `JournalEntryCard`, sondern durch Laden des `DynamicJournalForm` an derselben Stelle (inline). Wenn der Edit-Button geklickt wird, wird die Card durch das Form ersetzt - keine Navigation zu einer separaten Seite. Diese Logik wird in **Phase 4** implementiert.

---

## 2. Anforderungen

### 2.1 Funktionale Anforderungen

#### Phase 1: Anzeige-Features (Fokus dieses Dokuments)

| ID | Anforderung | Priorität | Quelle |
|----|-------------|-----------|--------|
| FR-01 | **AI Summary Section**: Anzeige des AI-generierten Summaries (blaue Sektion) | Hoch | DiaryEntriesAccordion |
| FR-02 | **AI Analysis Section**: Anzeige der AI-generierten Analyse (gelbe Sektion) | Hoch | DiaryEntriesAccordion |
| FR-03 | **Content-Rendering**: Markdown-Content wird korrekt gerendert | Hoch | DiaryEntriesAccordion |
| FR-04 | **Multi-Audio-Player**: Anzeige aller Audio-Attachments mit Play/Pause | Hoch | DiaryEntriesAccordion |
| FR-05 | **Audio-Transkript-Anzeige**: Jedes Audio zeigt sein Transkript (expandierbar) | Hoch | Entscheidung F2 |
| FR-06 | **Foto-Galerie**: Anzeige aller Fotos eines Eintrags als Thumbnails | Hoch | DiaryEntriesAccordion |
| FR-07 | **Foto-Lightbox**: Foto in Vollbild anzeigen bei Klick (einfaches Modal) | Hoch | Entscheidung F3 |
| FR-08 | **Compact-Mode**: Minimale Darstellung für Listen (nur Header + Preview) | Hoch | JournalEntryCard |
| FR-09 | **Expanded-Mode**: Vollständige Darstellung mit allen Sektionen | Hoch | DiaryEntriesAccordion |

#### Spätere Phasen: Edit-Features (hier nur Vorbereitung)

| ID | Anforderung | Phase | Beschreibung |
|----|-------------|-------|-------------|
| FR-10 | **Edit-Button**: Klick öffnet `DynamicJournalForm` inline (ersetzt Card) | 4 | Keine Navigation zu separater Seite |
| FR-11 | **Audio-Delete**: Löschen einzelner Audios | 4 | Im Edit-Form |
| FR-12 | **Audio-Upload**: Neues Audio hinzufügen | 4 | Via DynamicJournalForm |
| FR-13 | **Foto-Delete**: Einzelne Fotos löschen | 4 | Im Edit-Form |
| FR-14 | **Foto-Upload**: Neue Fotos hinzufügen | 4 | Via DynamicJournalForm |
| FR-15 | **Generate/Delete AI Sections**: Buttons für Summary/Analysis | 4 | Im Edit-Form |

### 2.2 Nicht-funktionale Anforderungen

| ID | Anforderung | Akzeptanzkriterium |
|----|-------------|-------------------|
| NFR-01 | **Performance**: Komponente rendert <100ms bei Einträgen mit bis zu 5 Audios und 10 Fotos | Lighthouse Performance Score >80 |
| NFR-02 | **Code-Reuse**: Bestehende Komponenten (`AudioPlayerH5`, `RichTextEditor`, `JournalEntrySection`) werden wiederverwendet | Keine Code-Duplizierung |
| NFR-03 | **Backward Compatibility**: Bestehende Props und Callbacks bleiben funktionsfähig | Keine Breaking Changes für `/journal` |
| NFR-04 | **Accessibility**: Edit-Mode ist per Tastatur bedienbar (Tab, Enter, Escape) | WCAG 2.1 AA |
| NFR-05 | **Mobile-First**: UI funktioniert auf Screens ab 320px Breite | Responsive Layout |

---

## 3. Architekturübersicht

### 3.1 Read-Mode (Phase 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JournalEntryCard (Read-Only)                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Header: Type-Badge | Title | Timestamp | Actions [✏️ Edit] [🗑️] [🔗]   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ JournalEntrySection (importiert, refactored für EntryWithRelations)     ││
│  │  ├── AI Summary Section (blau, collapsible)                             ││
│  │  └── AI Analysis Section (gelb, collapsible)                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Content Section: Markdown-Rendering                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Media Section                                                            ││
│  │  ├── AudioList: AudioPlayerH5[] mit Transkript (expandierbar)           ││
│  │  └── PhotoGallery: Thumbnails mit Lightbox                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Edit-Konzept (Phase 4 - nur Vorschau)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Klick auf [✏️ Edit]                                                         │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │              DynamicJournalForm (ersetzt JournalEntryCard)              ││
│  │  - Lädt inline an derselben Stelle                                       ││
│  │  - Keine Navigation zu separater Seite                                   ││
│  │  - existingEntry Prop für Edit-Mode                                      ││
│  │  - onCancel → zurück zu JournalEntryCard                                 ││
│  │  - onSubmit → Update, dann JournalEntryCard                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Komponenten-Erläuterung

### 4.1 Zu importierende Komponenten (Phase 1)

| Komponente | Pfad | Funktion |
|------------|------|----------|
| `JournalEntrySection` | `components/features/diary/` | Zeigt Summary (blau) und Analysis (gelb) Sektionen - **wird refactored** |
| `AudioPlayerH5` | `components/features/media/` | HTML5-basierter Audio-Player mit Fortschrittsbalken |
| `JournalEntryImage` | `components/features/diary/` | Foto-Thumbnail mit Lightbox-Trigger |
| `DiaryContentWithMentions` | `components/features/diary/` | Markdown-Rendering mit @-Mentions Support |

### 4.2 Komponenten für spätere Phasen (nicht in Phase 1)

| Komponente | Pfad | Phase |
|------------|------|-------|
| `RichTextEditor` | `components/features/editor/` | Phase 4 (Edit via DynamicJournalForm) |
| `MicrophoneButton` | `components/features/transcription/` | Phase 4 (Audio-Upload via DynamicJournalForm) |
| `CameraPicker` | `components/features/media/` | Phase 4 (Foto-Upload via DynamicJournalForm) |

### 4.3 Zu erweiternde Komponente

| Komponente | Pfad | Änderungen |
|------------|------|-----------|
| `JournalEntryCard` | `components/features/journal/` | Anzeige-Features importieren, refactored JournalEntrySection nutzen |
| `JournalEntrySection` | `components/features/diary/` | Refactoring für `EntryWithRelations` Typ (Entscheidung F4) |

### 4.4 Props für JournalEntryCard (Phase 1)

```typescript
interface JournalEntryCardProps {
  // BESTEHEND (unverändert)
  entry: EntryWithRelations
  mode?: CardMode  // 'compact' | 'expanded' | 'detail'
  onEdit?: (entry: EntryWithRelations) => void  // Triggert DynamicJournalForm inline (Phase 4)
  onDelete?: (entryId: string) => void
  onShare?: (entryId: string) => void
  onRunPipeline?: (entryId: string) => void
  className?: string

  // NEU Phase 1: Foto-Lightbox
  onViewPhoto?: (attachmentId: string) => void

  // VORBEREITET für Phase 4 (noch nicht implementiert):
  // onDeleteAudio, onDeletePhoto, etc. werden via DynamicJournalForm gehandelt
}
```

---

## 5. Datenmodell

### 5.1 Bestehende Entitäten (keine Änderungen)

Phase 1 erfordert **keine Datenmodell-Änderungen**. Alle benötigten Felder existieren bereits:

| Entität | Relevante Felder | Status |
|---------|------------------|--------|
| `JournalEntry` | `title`, `content`, `aiSummary`, `analysis` | ✅ Vorhanden |
| `MediaAttachment` | `entityId`, `assetId`, `role`, `transcript` | ✅ Vorhanden |
| `MediaAsset` | `filePath`, `mimeType`, `duration` | ✅ Vorhanden |

### 5.2 Datenfluss

```
JournalEntry
    │
    ├── type: JournalEntryType
    ├── template: JournalTemplate
    ├── content: string (Markdown)
    ├── aiSummary: string | null
    ├── analysis: string | null
    │
    └── mediaAttachments[] ─┬─► MediaAttachment (role='ATTACHMENT', Audio)
                            │       └── asset: MediaAsset (mimeType='audio/*')
                            │
                            └─► MediaAttachment (role='GALLERY', Foto)
                                    └── asset: MediaAsset (mimeType='image/*')
```

---

## 6. Services, Libraries und API-Routen

### 6.1 Bestehende APIs (werden genutzt)

| Endpunkt | Methode | Funktion | Phase-1-Nutzung |
|----------|---------|----------|-----------------|
| `/api/journal-entries/[id]` | PATCH | Eintrag aktualisieren | FR-01, FR-04 |
| `/api/journal-entries/[id]/audio` | POST | Audio hinzufügen | FR-11 |
| `/api/journal-entries/[id]/audio` | DELETE | Audio löschen | FR-10 |
| `/api/journal-entries/[id]/media` | POST | Foto hinzufügen | FR-13 |
| `/api/journal-entries/[id]/media/[attachmentId]` | DELETE | Foto löschen | FR-14 |
| `/api/journal-ai/generate-summary` | POST | Summary generieren | FR-07 |
| `/api/journal-ai/generate-analysis` | POST | Analysis generieren | FR-07 |

### 6.2 Hook: useJournalEntries

Bestehender Hook wird um Callbacks erweitert:

```typescript
// hooks/useJournalEntries.ts - Bereits vorhanden, nur Nutzung dokumentiert

const {
  entries,
  updateEntry,      // PATCH /api/journal-entries/[id]
  addAudioToEntry,  // POST /api/journal-entries/[id]/audio
  deleteAudio,      // DELETE Audio-Attachment
  addPhotosToEntry, // POST /api/journal-entries/[id]/media
  deletePhoto,      // DELETE Photo-Attachment
} = useJournalEntries({ timeBoxId })
```

---

## 7. UX (Komponenten und Screens)

### 7.1 Compact-Mode (für Listen)

Minimale Darstellung für Übersichtslisten. Zeigt nur die wichtigsten Informationen.

```
┌─────────────────────────────────────────────────────────────────┐
│ 📓 Diary                              14:30    🎵2 📷4  [▼]    │
│ Mein Tagebucheintrag                                            │
│ Erste Zeile des Contents als Preview...                         │
└─────────────────────────────────────────────────────────────────┘
```

**Elemente im Compact-Mode:**
- Type-Badge mit Icon
- Timestamp (occurredAt)
- Media-Indikatoren (Anzahl Audios, Anzahl Fotos)
- Expand-Button [▼]
- Titel (fett)
- Content-Preview (erste ~100 Zeichen, einzeilig)

### 7.2 Expanded-Mode (Tagesansicht)

Vollständige Darstellung mit allen Sektionen. Standard für Tagesansicht.

```
┌─────────────────────────────────────────────────────────────────┐
│ 📓 Diary • Template Name                    [✏️] [🗑️] [🔗] [⚡]│
├─────────────────────────────────────────────────────────────────┤
│ Mein Tagebucheintrag                           14:30 · Heute    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ AI Summary ──────────────────────────────────────────────┐   │
│ │ 💡 Zusammenfassung des Eintrags...                    [▲] │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌─ AI Analysis ─────────────────────────────────────────────┐   │
│ │ 🔍 Analyse und Erkenntnisse...                        [▲] │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Der eigentliche Content des Eintrags wird hier als             │
│ **Markdown** gerendert angezeigt. Links, Listen und            │
│ Formatierungen werden korrekt dargestellt.                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 🎵 Audio 1                              [▶️]  02:34             │
│    ┌─ Transkript ─────────────────────────────────────────┐     │
│    │ "Das ist der transkribierte Text des Audios..."  [▲] │     │
│    └──────────────────────────────────────────────────────┘     │
│ 🎵 Audio 2                              [▶️]  01:15             │
│    └─ Transkript anzeigen... [▼]                                │
├─────────────────────────────────────────────────────────────────┤
│ [📷] [📷] [📷] [📷]                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Elemente im Expanded-Mode:**
- **Header**: Type-Badge, Template-Name, Action-Buttons (Edit, Delete, Share, Pipeline)
- **Title-Row**: Titel, Timestamp
- **AI Sections** (collapsible): Summary (blau), Analysis (gelb)
- **Content**: Vollständiges Markdown-Rendering
- **Audio-Liste**: Alle Audios mit Player + expandierbarem Transkript
- **Foto-Galerie**: Thumbnails, Klick öffnet Lightbox

### 7.3 Foto-Lightbox (Modal)

Einfaches Modal zur Vollbild-Anzeige eines Fotos (Entscheidung F3: Option A).

```
┌─────────────────────────────────────────────────────────────────┐
│                                                           [✕]   │
│                                                                 │
│                                                                 │
│                    ┌─────────────────────┐                      │
│                    │                     │                      │
│                    │    � FOTO          │                      │
│                    │    (Vollbild)       │                      │
│                    │                     │                      │
│                    └─────────────────────┘                      │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Interaktionen (Phase 1)

| Aktion | Trigger | Ergebnis |
|--------|---------|----------|
| Expand/Collapse | Klick auf [▼]/[▲] | Wechsel zwischen compact/expanded |
| Audio abspielen | Klick auf [▶️] | AudioPlayerH5 startet Wiedergabe |
| Transkript anzeigen | Klick auf "Transkript anzeigen" | Transkript-Bereich expandiert |
| Foto ansehen | Klick auf Thumbnail | Lightbox öffnet sich |
| Lightbox schliessen | Klick auf [✕] oder Escape | Modal schliesst |
| Edit starten | Klick auf [✏️] | *Phase 4: DynamicJournalForm inline laden* |
| Delete | Klick auf [🗑️] | Bestätigungsdialog (Phase 1: nur Callback) |
| Share | Klick auf [🔗] | *Phase 3: ShareEntryModal* |
| Pipeline | Klick auf [⚡] | *Phase 2/4: AI-Pipeline triggern* |

---

## 8. Dateistruktur

### 8.1 Zu ändernde Dateien

| Datei | Änderungsart | Beschreibung |
|-------|--------------|--------------|
| `components/features/journal/JournalEntryCard.tsx` | Erweitern | Anzeige-Komponenten importieren, compact/expanded Logik |
| `components/features/diary/JournalEntrySection.tsx` | Refactoring | `EntryWithRelations` Typ akzeptieren (Entscheidung F4) |
| `app/journal/page.tsx` | Erweitern | Lightbox-State, onViewPhoto Callback |

### 8.2 Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `components/features/journal/PhotoLightbox.tsx` | Einfaches Modal für Foto-Vollbildansicht |

### 8.3 Import-Struktur nach Phase 1

```typescript
// JournalEntryCard.tsx - Neue Imports (nur Anzeige-Komponenten)
import { JournalEntrySection } from '@/components/features/diary/JournalEntrySection'
import { AudioPlayerH5 } from '@/components/features/media/AudioPlayerH5'
import { JournalEntryImage } from '@/components/features/diary/JournalEntryImage'
import { DiaryContentWithMentions } from '@/components/features/diary/DiaryContentWithMentions'
import { PhotoLightbox } from '@/components/features/journal/PhotoLightbox'
```

---

## 9. Implementierungsplan

### Schritt 1 (LLM): JournalEntrySection refactoren

**Ziel**: `JournalEntrySection` für `EntryWithRelations` Typ anpassen (Entscheidung F4)

**Anforderungen**:
- Neuer Prop-Typ der sowohl `DayNote` als auch `EntryWithRelations` akzeptiert
- Union-Type oder generischer Typ für Flexibilität
- Bestehende Verwendung in `DiaryEntriesAccordion` darf nicht brechen
- JSDoc-Kommentare aktualisieren

**Dateien**: `components/features/diary/JournalEntrySection.tsx`

---

### Schritt 2 (LLM): Props-Interface erweitern

**Ziel**: Neue Props zu `JournalEntryCardProps` für Phase 1 hinzufügen

**Anforderungen**:
- `onViewPhoto?: (attachmentId: string) => void` hinzufügen
- JSDoc-Kommentare für Props
- Backward-Compatibility sicherstellen

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 3 (LLM): Compact-Mode implementieren

**Ziel**: Minimale Darstellung für Listen

**Anforderungen**:
- Wenn `mode === 'compact'`: Nur Header + Title + Content-Preview
- Media-Indikatoren (Anzahl Audios, Anzahl Fotos) im Header
- Expand-Button [▼] zum Wechsel in expanded
- Content-Preview: erste ~100 Zeichen, einzeilig, mit Ellipsis

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 4 (LLM): JournalEntrySection integrieren

**Ziel**: AI-Sektionen (Summary, Analysis) in expanded Mode einbauen

**Anforderungen**:
- `JournalEntrySection` importieren (nach Refactoring in Schritt 1)
- Props mappen: `entry.aiSummary`, `entry.analysis`
- Collapsible-Verhalten beibehalten
- Nur anzeigen wenn `mode !== 'compact'` und Inhalt vorhanden

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 5 (LLM): Content-Bereich mit Markdown-Rendering

**Ziel**: Vollständige Content-Anzeige im expanded Mode

**Anforderungen**:
- `DiaryContentWithMentions` importieren für Markdown-Rendering
- Nur anzeigen wenn `mode !== 'compact'`
- @-Mentions korrekt verlinken

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 6 (LLM): Multi-Audio-Sektion mit Transkript

**Ziel**: Alle Audio-Attachments anzeigen mit expandierbarem Transkript

**Anforderungen**:
- Audio-Attachments aus `entry.mediaAttachments` filtern (mimeType startet mit `audio/`)
- Pro Audio: `AudioPlayerH5` mit filePath, duration
- Pro Audio: Expandierbares Transkript-Panel (Entscheidung F2: immer anzeigen)
- State für expanded/collapsed pro Audio
- Nur anzeigen wenn `mode !== 'compact'`

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 7 (LLM): Foto-Galerie mit Lightbox

**Ziel**: Foto-Thumbnails mit einfacher Lightbox

**Anforderungen**:
- Foto-Attachments aus `entry.mediaAttachments` filtern (mimeType startet mit `image/`)
- Pro Foto: Thumbnail mit `JournalEntryImage`
- Klick ruft `onViewPhoto` Callback auf
- Nur anzeigen wenn `mode !== 'compact'`

**Dateien**: `JournalEntryCard.tsx`

---

### Schritt 8 (LLM): PhotoLightbox Komponente erstellen

**Ziel**: Einfaches Modal für Foto-Vollbildansicht (Entscheidung F3: Option A)

**Anforderungen**:
- Neue Komponente `PhotoLightbox.tsx`
- Props: `isOpen`, `onClose`, `imageUrl`, `alt`
- Close-Button [✕] und Escape-Taste zum Schliessen
- Backdrop-Klick schliesst Modal
- Responsive: Foto skaliert auf max verfügbare Grösse

**Dateien**: `components/features/journal/PhotoLightbox.tsx` (neu)

---

### Schritt 9 (LLM): Journal-Seite Lightbox integrieren

**Ziel**: `/journal` Seite nutzt PhotoLightbox

**Anforderungen**:
- State für `selectedPhotoUrl` und `isLightboxOpen`
- `onViewPhoto` Callback implementieren: findet Asset-URL, öffnet Lightbox
- PhotoLightbox am Ende der Page rendern

**Dateien**: `app/journal/page.tsx`

---

### Schritt 10 (Mensch): Code-Review und Testing

**Ziel**: Qualitätssicherung

**Aufgaben**:
- Code-Review der Änderungen
- Manuelle Tests gemäss Kapitel 12
- Feedback für eventuelle Korrekturen

---

### Schritt 11 (LLM): Bugfixes und Polish

**Ziel**: Identifizierte Probleme beheben

**Anforderungen**:
- Bugs aus Schritt 10 beheben
- Edge Cases behandeln (leere Einträge, fehlende Attachments)
- Loading-States für Audio-Player
- Responsive Anpassungen

---

## 10. Testdaten-Anpassungen

Phase 1 erfordert **keine Testdaten-Anpassungen**, da:
- Alle benötigten Entitäten existieren bereits
- `testDataService.ts` erstellt bereits JournalEntries mit MediaAttachments
- Audio- und Foto-Attachments sind bereits im Seed enthalten

**Prüfung**: Sicherstellen dass Testdaten mindestens enthalten:
- 1 JournalEntry mit 2+ Audio-Attachments
- 1 JournalEntry mit 3+ Foto-Attachments
- 1 JournalEntry mit aiSummary und analysis

Falls fehlend, ergänzen in `prisma/seed.ts`.

---

## 11. Automatisiertes Testing

### 11.1 Unit Tests (LLM kann erstellen)

| Test | Datei | Beschreibung |
|------|-------|--------------|
| Compact-Mode Rendering | `JournalEntryCard.test.tsx` | Prüft dass im compact Mode nur Preview gezeigt wird |
| Expanded-Mode Rendering | `JournalEntryCard.test.tsx` | Prüft dass im expanded Mode alle Sektionen sichtbar sind |
| Mode-Toggle | `JournalEntryCard.test.tsx` | Prüft Wechsel zwischen compact/expanded |
| Audio-Liste | `JournalEntryCard.test.tsx` | Prüft dass alle Audio-Attachments gerendert werden |
| Transkript-Toggle | `JournalEntryCard.test.tsx` | Prüft expand/collapse von Transkripten |

### 11.2 Komponenten-Tests

| Test | Datei | Beschreibung |
|------|-------|--------------|
| PhotoLightbox öffnen | `PhotoLightbox.test.tsx` | Prüft dass Modal bei isOpen=true sichtbar ist |
| PhotoLightbox schliessen | `PhotoLightbox.test.tsx` | Prüft Close-Button und Escape-Taste |
| JournalEntrySection Typing | `JournalEntrySection.test.tsx` | Prüft dass beide Entry-Typen akzeptiert werden |

### 11.3 Automatische Verifizierung

```bash
# LLM führt aus:
npm run lint
npm run type-check
npm run test -- --grep "JournalEntryCard"
npm run test -- --grep "PhotoLightbox"
```

---

## 12. Manuelles Testing

### 12.1 Testszenarien

| ID | Szenario | Schritte | Erwartetes Ergebnis |
|----|----------|----------|---------------------|
| MT-01 | Compact-Mode | 1. Öffne /journal<br>2. Prüfe Entry in Liste | Nur Type-Badge, Titel, Preview sichtbar |
| MT-02 | Expand Entry | 1. Klick auf [▼] bei compact Entry | Entry expandiert, alle Sektionen sichtbar |
| MT-03 | Collapse Entry | 1. Klick auf [▲] bei expanded Entry | Entry kollabiert zu compact |
| MT-04 | AI Summary anzeigen | Entry mit Summary öffnen (expanded) | Blaue Summary-Sektion sichtbar, collapsible |
| MT-05 | AI Analysis anzeigen | Entry mit Analysis öffnen (expanded) | Gelbe Analysis-Sektion sichtbar, collapsible |
| MT-06 | Audio abspielen | 1. Expanded Entry mit Audio<br>2. Klick Play | Audio wird abgespielt |
| MT-07 | Transkript anzeigen | 1. Expanded Entry mit Audio<br>2. Klick "Transkript anzeigen" | Transkript-Panel expandiert |
| MT-08 | Transkript verbergen | 1. Transkript offen<br>2. Klick [▲] | Transkript-Panel kollabiert |
| MT-09 | Foto ansehen | 1. Klick auf Foto-Thumbnail | Lightbox öffnet sich mit Vollbild |
| MT-10 | Lightbox schliessen | 1. Lightbox offen<br>2. Klick [✕] oder Escape | Lightbox schliesst |
| MT-11 | Markdown-Rendering | Entry mit formatiertem Content öffnen | Links, Listen, Fett/Kursiv korrekt dargestellt |
| MT-12 | Media-Indikatoren | Entry mit 2 Audios und 3 Fotos in compact | "🎵2 📷3" im Header sichtbar |

### 12.2 Browser-Kompatibilität

Testen auf:
- Chrome (Desktop)
- Safari (iOS)
- Firefox (Desktop)

### 12.3 Responsive Testing

Testen auf:
- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

---

## 13. Entscheidungen

> Die folgenden Fragen wurden vom Auftraggeber beantwortet und sind nun verbindliche Entscheidungen.

### Funktionale Entscheidungen

**F1**: Soll der Edit-Mode automatisch enden wenn der User ausserhalb der Karte klickt?
- ~~Option A: Ja, mit Speichern-Prompt bei ungespeicherten Änderungen~~
- ✅ **Option B: Nein, nur explizit per Button**
- *Hinweis: Edit erfolgt via DynamicJournalForm inline, nicht in JournalEntryCard selbst*

**F2**: Sollen Audio-Transkripte im Read-Mode angezeigt werden oder nur im Edit-Mode?
- ✅ **Option A: Immer anzeigen (expandierbar)**
- ~~Option B: Nur in Edit-Mode~~
- *Implementiert in Schritt 6*

**F3**: Wie soll die Foto-Lightbox funktionieren?
- ✅ **Option A: Einfaches Modal mit Vollbild-Foto und Close-Button**
- ~~Option B: Galerie mit Navigation (Prev/Next)~~
- *Implementiert in Schritt 8*

### Technische Entscheidungen

**F4**: Soll `JournalEntrySection` refactored werden um `EntryWithRelations` direkt zu akzeptieren?
- ✅ **Option A: Ja, für saubere Integration**
- ~~Option B: Nein, Mapping im JournalEntryCard~~
- *Implementiert in Schritt 1*

**F5**: Soll der Delete-Button für Audios/Fotos einen Bestätigungsdialog zeigen?
- ✅ **Ja** - um versehentliches Löschen zu vermeiden
- *Relevant für Phase 4 (Edit via DynamicJournalForm)*

---

## 14. Implementierungs-Notizen

### Abweichungen vom Konzept

1. **JournalEntrySection Refactoring (Schritt 1)**: Die Komponente war bereits generisch implementiert und akzeptiert Props wie `title`, `content`, `icon` etc. Ein expliziter Refactor war nicht nötig - die Komponente funktioniert bereits mit beiden Entry-Typen.

2. **MediaAttachmentPreview entfernt**: Die nicht mehr benötigte Helper-Komponente wurde aus `JournalEntryCard.tsx` entfernt.

3. **AI Sections Styling**: Tailwind-Opacity-Modifier wie `bg-info/10` werden vom JIT-Compiler nicht zuverlässig erkannt. Lösung: Standard-Farbklassen ohne Opacity-Modifier: `bg-sky-100 dark:bg-sky-900/20` (blau für Summary) und `bg-amber-100 dark:bg-amber-900/20` (gelb für Analysis).

4. **AudioSection als eigene Komponente**: Statt einer einfachen Liste wurde eine collapsible `AudioSection` Komponente implementiert, die standardmässig zugeklappt ist.

5. **Bilder-URLs**: Die `filePath` aus der DB enthält bereits den vollständigen Pfad (z.B. `uploads/images/...`). Kein `/uploads/` Prefix nötig.

### Geänderte/Neue Dateien

| Datei | Änderung |
|-------|----------|
| `components/features/journal/JournalEntryCard.tsx` | Komplett erweitert mit AI-Sections (mit Wrapper-Div für Farben), Markdown-Content, AudioSection (collapsible), Foto-Galerie |
| `components/features/journal/PhotoLightbox.tsx` | **Neu** - Einfaches Modal für Foto-Vollbildansicht |
| `app/journal/page.tsx` | PhotoLightbox integriert, mode="compact", onViewPhoto Handler (URL-Fix) |

### Nächste Schritte (Phase 4)

- Edit-Button öffnet `DynamicJournalForm` inline (ersetzt Card)
- Audio/Foto Delete-Funktionen im Edit-Form
- Generate/Delete AI Sections Buttons

---

*Ende des Dokuments*
