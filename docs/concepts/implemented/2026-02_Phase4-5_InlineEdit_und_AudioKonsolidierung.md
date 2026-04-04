# Phase 4 & 5: Inline-Edit, Media-Uploads & Audio-Konsolidierung

> **Status**: ✅ Implementiert (2026-02-23)
> **Erstellt**: 2026-02-07
> **Bezug**: [Unified JournalEntry Implementation Plan](2026-02_Unified_JournalEntry_Implementation_Plan.md)
> **Vorgänger**: [Phase 2-3: Panels und Modals](2026-02_Phase2-3_Panels_und_Modals.md) ✅
> **Ziel**: Inline-Editing via DynamicJournalForm, vollständige Media-Uploads (Audio, Foto, OCR), Audio-Konsolidierung und Journal-Seite finalisieren

---

## Inhaltsverzeichnis

1. [Ausgangslage](#1-ausgangslage)
2. [Anforderungen](#2-anforderungen)
3. [Architekturübersicht](#3-architekturübersicht)
4. [Komponenten-Analyse (Ist-Zustand)](#4-komponenten-analyse-ist-zustand)
5. [Datenmodell & APIs](#5-datenmodell--apis)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Dateistruktur](#7-dateistruktur)
8. [Implementierungsplan](#8-implementierungsplan)
9. [Testdaten-Anpassungen](#9-testdaten-anpassungen)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)
12. [Entscheidungen](#12-entscheidungen)
13. [Fragen an den Auftraggeber](#13-fragen-an-den-auftraggeber)

---

## 1. Ausgangslage

### 1.1 Status nach Phase 1-3

**JournalEntryCard** (Read-Mode) ist vollständig:
- ✅ Compact/Expanded Modes
- ✅ AI Summary/Analysis Sections
- ✅ Multi-Audio mit Transkripten und Re-Transkription
- ✅ Foto-Galerie mit Lightbox
- ✅ OCRSourcePanel (Anzeige)
- ✅ JournalTasksPanel (CRUD)
- ✅ SharedBadge + ShareEntryModal
- ✅ TimestampModal
- ✅ AISettingsPopup (template-basiert)

**DynamicJournalForm** (Create-Mode) existiert mit:
- ✅ Typ/Template-Auswahl
- ✅ Dynamische Felder (FieldRenderer)
- ✅ MicrophoneButton pro Textarea-Feld (mit Audio-Persistierung)
- ✅ Audio-Upload (einfache Transkription via `/api/transcribe`)
- ✅ Audio-Segmentierung für Multi-Feld-Templates
- ⚠️ Bild-Upload Button vorhanden, aber nur Platzhalter (`alert()`)
- ❌ Kein Edit-Mode (nur Create)
- ❌ Kein OCR-Upload
- ❌ Kein Foto-Upload

**Journal-Page** (`app/journal/page.tsx`):
- ✅ DynamicJournalForm für Erstellung
- ✅ JournalEntryCard für Anzeige (mit allen Phase 2-3 Features)
- ✅ Modal-States und Callbacks
- ✅ Tasks laden/refetch
- ⚠️ Edit navigiert zu `/journal/[id]` statt inline

### 1.2 Bestehende Probleme

| Problem | Auswirkung | Lösung in Phase |
|---------|------------|-----------------|
| `UnifiedEntryForm` existiert, wird aber nirgends importiert | Toter Code | 4 (entfernen) |
| `AudioUploadButton` nutzt nur Legacy-API | Kein MediaAttachment | 4 (refactoren) |
| MicrophoneButton/AudioUploadButton: Code-Duplizierung | Wartungsaufwand | 4 (Audio-Core) |
| Edit-Mode erfordert Page-Navigation | Schlechte UX | 4 (Inline-Edit) |
| DynamicJournalForm hat keinen `existingEntry` Prop | Kein Edit | 4 (erweitern) |

---

## 2. Anforderungen

### 2.1 Funktionale Anforderungen (Phase 4)

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| FR-01 | Inline-Edit: Card wird durch DynamicJournalForm ersetzt bei Edit | Hoch |
| FR-02 | DynamicJournalForm: Edit-Mode mit `existingEntry` Prop | Hoch |
| FR-03 | OCR-Upload in DynamicJournalForm integrieren | Mittel |
| FR-04 | Foto-Upload in DynamicJournalForm integrieren | Mittel |
| FR-05 | Audio-Core: Shared Utilities extrahieren | Mittel |
| FR-06 | MicrophoneButton: Unified `onResult` Callback | Mittel |
| FR-07 | AudioUploadButton: `existingEntryId` Support | Mittel |
| FR-08 | AudioUploadButton: `capturedAt` Eingabe | Niedrig |
| FR-09 | Audio-Segmentierung in AudioUploadButton | Mittel |
| FR-10 | UnifiedEntryForm entfernen, Logik konsolidieren | Niedrig |
| FR-11 | OCR "Restore to Content" im Edit-Mode | Niedrig |

### 2.2 Funktionale Anforderungen (Phase 5)

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| FR-12 | Journal-Page: Inline-Edit statt Navigation | Hoch |
| FR-13 | Journal-Page: Alle Edit-Callbacks verbinden | Hoch |
| FR-14 | Journal-Page: DynamicJournalForm für bestehende Entries | Hoch |
| FR-15 | E2E-Test: Entry erstellen mit Audio, Foto, OCR | Hoch |
| FR-16 | E2E-Test: Entry inline bearbeiten | Hoch |

### 2.3 Nicht-funktionale Anforderungen

| ID | Anforderung |
|----|-------------|
| NFR-01 | Backward-Compatibility: Legacy-Props an MicrophoneButton/AudioUploadButton beibehalten |
| NFR-02 | Kein Breaking Change an bestehenden APIs |
| NFR-03 | DiarySection/DiaryEntriesAccordion (Startseite) dürfen nicht brechen |
| NFR-04 | Audio-Core muss von allen Verwendungsorten nutzbar sein |

---

## 3. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           app/journal/page.tsx                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  State: editingEntryId, lightboxPhoto, shareModal, timestampModal,    │  │
│  │         aiSettingsEntry, tasksMap                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                                           ▼                  │
│  ┌──────────────────────┐               ┌──────────────────────────────┐    │
│  │  JournalEntryCard    │ ──onEdit──▶  │  DynamicJournalForm          │    │
│  │  (Read-Mode)         │               │  (Create + Edit-Mode)        │    │
│  │  - Compact/Expanded  │ ◀──onCancel── │  - existingEntry Prop (NEU)  │    │
│  │  - All Phase 1-3     │ ◀──onSubmit── │  - OCR-Upload (NEU)          │    │
│  └──────────────────────┘               │  - Foto-Upload (NEU)         │    │
│                                         │  - Audio (refactored)         │    │
│                                         └──────────────────────────────┘    │
│                                                      │                      │
│                          ┌───────────────────────────┼──────────┐           │
│                          ▼                           ▼          ▼           │
│               ┌────────────────────┐    ┌──────────────┐  ┌──────────┐     │
│               │  MicrophoneButton  │    │ AudioUpload  │  │ OCRUpload│     │
│               │  (refactored)      │    │ Button (ref.)│  │ Button   │     │
│               └────────┬───────────┘    └──────┬───────┘  └──────────┘     │
│                        │                       │                            │
│                        ▼                       ▼                            │
│               ┌────────────────────────────────────────┐                    │
│               │       lib/audio/audioUploadCore.ts     │                    │
│               │  - uploadAudioForEntry()               │                    │
│               │  - uploadAudioStandalone()              │                    │
│               │  - transcribeOnly()                     │                    │
│               │  - validateAudioFile()                  │                    │
│               │  - formatElapsedTime()                  │                    │
│               └────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Inline-Edit Ablauf

```
┌─────────────┐    onEdit     ┌──────────────────┐
│ JournalEntry │ ──────────▶ │ DynamicJournal   │
│ Card         │              │ Form (Edit-Mode) │
│ (Read-Mode)  │              │ - prefilled       │
│              │              │ - onCancel        │
│              │ ◀─onCancel── │ - onSubmit        │
│              │ ◀─onSubmit── │                   │
└─────────────┘    + refetch  └──────────────────┘

Ablauf:
1. User klickt ✏️ Edit auf JournalEntryCard
2. Parent setzt editingEntryId = entry.id
3. Statt JournalEntryCard wird DynamicJournalForm gerendert
4. DynamicJournalForm erhält existingEntry mit vorbefüllten Werten
5. User bearbeitet → Submit → PATCH /api/journal-entries/[id]
6. Parent setzt editingEntryId = null, refetcht Entry
7. JournalEntryCard wird wieder angezeigt mit aktualisierten Daten
```

---

## 4. Komponenten-Analyse (Ist-Zustand)

### 4.1 DynamicJournalForm

**Pfad**: `components/features/journal/DynamicJournalForm.tsx` (619 Zeilen)

**Aktuelle Props**:
```typescript
interface DynamicJournalFormProps {
  types: JournalEntryTypeOption[]
  templates: JournalTemplateOption[]
  initialTypeId?: string
  initialTemplateId?: string
  initialContent?: string
  onSubmit: (data: { typeId, templateId, content, fieldValues, audioFileIds?, audioTranscripts? }) => void
  isSubmitting?: boolean
  onAudioUpload?: (file: File) => void
  onImageUpload?: (file: File) => void
  showMediaButtons?: boolean
  className?: string
  date?: string
}
```

**Fehlend für Edit-Mode**:
- `existingEntry?: EntryWithRelations` (für Vorbefüllung inkl. Titel)
- `onCancel?: () => void` (zum Abbrechen des Edit-Modes)
- Titel-Feld (aktuell nicht vorhanden)
- `isSensitive` Toggle
- Kein `existingEntryId` an MicrophoneButton (Audio geht an Standalone-API)

**Audio-Handling aktuell**:
- MicrophoneButton pro Textarea-Feld mit `keepAudio={!!date}` und `date={date}`
- Audio-Upload Button nutzt `/api/transcribe` (nur Transkription, kein MediaAsset)
- Audio-IDs werden gesammelt und bei Submit übergeben
- Parent (`journal/page.tsx`) erstellt MediaAttachments nach Entry-Erstellung

### 4.2 UnifiedEntryForm

**Pfad**: `components/features/journal/UnifiedEntryForm.tsx` (408 Zeilen)

**Verwendung**: Nirgends importiert! Nur in `index.ts` exportiert.

**Nützliche Features die DynamicJournalForm fehlen**:
- `entry?: EntryWithRelations` Prop für Edit-Mode
- Titel-Eingabefeld
- `isSensitive` Toggle
- `onCancel` Callback
- `onRunPipeline` Callback
- RichTextEditor (statt einfacher Textarea) für Nicht-Template-Einträge
- Media-Handler-Skeletons (`_handleAudioFileAdded`, `_handleOcrResult`)

**Fazit**: Features von UnifiedEntryForm in DynamicJournalForm übernehmen, dann löschen.

### 4.3 MicrophoneButton

**Pfad**: `components/features/transcription/MicrophoneButton.tsx` (552 Zeilen)

**Aktuelle Props**:
```typescript
{
  onAudioData?: (result: { text, audioFileId?, audioFilePath?, capturedAt?, model? }) => void
  onText?: (text: string) => void  // Legacy
  keepAudio?: boolean
  date?: string
  time?: string
  existingEntryId?: string  // Bereits vorhanden!
  initialModel?: string
  modelOptions?: string[]
  compact?: boolean
}
```

**Wichtige Beobachtung**: `existingEntryId` Prop ist bereits implementiert! Die Komponente nutzt bereits `/api/journal-entries/[id]/audio` wenn `existingEntryId` gesetzt ist.

**Refactoring-Scope (E4: Option A)**: Die vollständige Upload-/Transkriptions-Logik (ca. 150 Zeilen `fetch()`-Aufrufe) wird in `audioUploadCore.ts` extrahiert. Recording-Logik (MediaRecorder, Level-Meter, Pause/Resume) bleibt in der Komponente.

### 4.4 AudioUploadButton

**Pfad**: `components/features/media/AudioUploadButton.tsx`

**Aktuell**: Nutzt nur `/api/diary/upload-audio` (Legacy-API), hat keinen Support für Unified-API.

**Nötige Änderungen**:
- `existingEntryId` Prop → nutzt `/api/journal-entries/[id]/audio`
- `showCapturedAtInput` Prop → Benutzer kann capturedAt angeben
- Unified `onResult` Callback
- Nutzung von `audioUploadCore.ts` für Shared Logic

### 4.5 OCRUploadButton

**Pfad**: `components/features/ocr/OCRUploadButton.tsx` (75 Zeilen)

**Aktuelle Props**:
```typescript
{
  onOcrComplete: (result: { text: string; mediaAssetIds: string[]; capturedAt?: string }) => void
  date: string     // YYYY-MM-DD
  time: string     // HH:MM
  compact?: boolean
  disabled?: boolean
}
```

**Funktionsweise**: Öffnet `OCRUploadModal` → Bild/PDF auswählen → OCR-Extraktion → Callback mit Text und Asset-IDs.

**Integration in DynamicJournalForm**:
- Im Media-Buttons-Bereich platzieren
- `onOcrComplete`: Text in Content/erstes Textarea-Feld einfügen, Asset-IDs sammeln
- Im Edit-Mode: OCR-Assets direkt als MediaAttachment verknüpfen
- Im Edit-Mode: "Restore to Content" Button auf OCRSourcePanel (Entscheidung E5)

### 4.6 CameraPicker

**Pfad**: `components/features/media/CameraPicker.tsx` (134 Zeilen)

**Aktuelle Props**:
```typescript
{
  label?: string           // Default: 'Kamera'
  buttonClassName?: string // Default: 'pill'
  onCapture: (files: File[]) => void
}
```

**Funktionsweise**:
- Desktop: Öffnet Kamera-Stream via `getUserMedia`, Capture-Button nimmt Foto auf
- Mobile: Fallback auf `<input type="file" capture="environment">` (native Kamera-App)
- Gibt `File[]` zurück (JPEG)

**Integration in DynamicJournalForm**:
- Neben dem Foto-Upload-Button (Datei wählen) als separater Kamera-Button
- `onCapture`: Wie Foto-Upload, Asset hochladen und verknüpfen

---

## 5. Datenmodell & APIs

### 5.1 Bestehende APIs (unverändert nutzen)

| Endpoint | Methode | Zweck | Phase |
|----------|---------|-------|-------|
| `/api/journal-entries` | POST | Entry erstellen | ✅ |
| `/api/journal-entries/[id]` | PATCH | Entry bearbeiten | 4 |
| `/api/journal-entries/[id]` | DELETE | Entry löschen | ✅ |
| `/api/journal-entries/[id]/audio` | POST | Audio hochladen + verknüpfen | 4 |
| `/api/journal-entries/[id]/media` | POST | Media (Foto/OCR) verknüpfen | 4 |
| `/api/journal-entries/[id]/media/[attachmentId]` | DELETE | Media-Attachment löschen | 4 |
| `/api/transcribe` | POST | Transkription; bei `keepAudio=true` Draft-`MediaAsset` für neue Einträge | ✅ |
| `/api/journal-ai/segment-audio` | POST | Transkript auf Template-Felder verteilen | ✅ |

### 5.2 Zu prüfende APIs

| Endpoint | Prüfung |
|----------|---------|
| `PATCH /api/journal-entries/[id]` | Unterstützt content, title, fieldValues, isSensitive Update? |
| `POST /api/journal-entries/[id]/media` | Unterstützt role: 'GALLERY' für Fotos? |
| OCR-Upload Endpoint | Welche Route für OCR-Asset-Erstellung? |

### 5.3 Datenfluss: Inline-Edit

```
User klickt ✏️
    │
    ▼
Parent setzt editingEntryId = entry.id
    │
    ▼
DynamicJournalForm rendert mit existingEntry
    │
    ├── Entry-Felder vorbefüllt (Titel, Content, FieldValues)
    ├── Typ/Template locked (nicht änderbar im Edit-Mode)
    │
    ▼
User bearbeitet und klickt "Speichern"
    │
    ▼
PATCH /api/journal-entries/[id]
    ├── body: { content, title, fieldValues, isSensitive }
    │
    ▼
Parent setzt editingEntryId = null
    │
    ▼
refetch() → aktualisierte JournalEntryCard
```

### 5.4 Datenfluss: Audio-Upload für bestehenden Entry

```
DynamicJournalForm (Edit-Mode) mit existingEntryId
    │
    ▼
MicrophoneButton(existingEntryId=entry.id, keepAudio=true)
    │
    ▼
POST /api/journal-entries/[id]/audio
    ├── Erstellt MediaAsset
    ├── Erstellt MediaAttachment
    ├── Transkribiert Audio
    │
    ▼
onAudioData({ text, audioFileId, attachmentId })
    │
    ▼
Transkript in Feld einfügen, Entry wird refetcht
```

### 5.5 Datenfluss: Audio-Upload für neuen Entry

```
DynamicJournalForm (Create-Mode, noch ohne existingEntryId)
    │
    ▼
MicrophoneButton / AudioUploadButton mit keepAudio=true
    │
    ▼
POST /api/transcribe
    ├── transkribiert Audio
    ├── erstellt optional ein Draft-MediaAsset
    └── gibt { text, assetId, model } zurück
    │
    ▼
DynamicJournalForm
    ├── fügt Transkript sofort ins passende Feld ein
    └── sammelt audioFileIds + audioTranscripts
    │
    ▼
POST /api/journal-entries
    ├── body enthält audioFileIds + audioTranscripts
    └── createEntry erstellt die MediaAttachments mit role=ATTACHMENT
```

---

## 6. UX (Komponenten und Screens)

### 6.1 Inline-Edit Modus

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─ Eintrag bearbeiten ──────────────────────── [Abbrechen] ─┐  │
│ │                                                             │  │
│ │ Titel:  [Mein Tagebucheintrag________________]             │  │
│ │                                                             │  │
│ │ Typ:    [📓 Diary          ▼]  (disabled im Edit-Mode)     │  │
│ │ Template: [Standard ▼]         (disabled im Edit-Mode)     │  │
│ │                                                             │  │
│ │ ┌─ Notizen ─────────────────────── [🎤] [✨ Verbessern] ─┐│  │
│ │ │ Heute war ein guter Tag. Ich habe...                    ││  │
│ │ │                                                         ││  │
│ │ └─────────────────────────────────────────────────────────┘│  │
│ │                                                             │  │
│ │ ☐ Sensibel                                                  │  │
│ │                                                             │  │
│ │ ─── Media ──────────────────────────────────────────────── │  │
│ │ [🎵 Audio hochladen] [📷 Bild hinzufügen] [📄 OCR-Upload] │  │
│ │                                                             │  │
│ │                                    [Abbrechen] [Speichern] │  │
│ └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 DynamicJournalForm: Neue Features

| Feature | Create-Mode | Edit-Mode |
|---------|-------------|-----------|
| Titel-Feld | Optional | Vorbefüllt |
| Typ-Auswahl | Wählbar | Disabled (locked) |
| Template-Auswahl | Wählbar | Disabled (locked) |
| Content/Felder | Leer | Vorbefüllt |
| isSensitive Toggle | ✅ | ✅ |
| MicrophoneButton | `keepAudio={!!date}` | `existingEntryId={entry.id}` |
| Audio-Upload | `keepAudio={!!date}` | `existingEntryId={entry.id}` |
| OCR-Upload | ✅ (NEU) | ✅ (NEU) + Restore to Content |
| Foto-Upload | ✅ (NEU) | ✅ (NEU) |
| Kamera (CameraPicker) | ✅ (NEU) | ✅ (NEU) |
| Abbrechen-Button | ❌ (Schliessen) | ✅ |
| Speichern | POST createEntry | PATCH updateEntry |

#### Platzierung von Audio-Eingabe-Elementen

- **MicrophoneButton**: Pro Feld (🎤-Icon im Feld-Header). Bei nur einem Feld (= `content`) erscheint er neben dem Content-Feld. Bei Templates mit mehreren Feldern erscheint er pro Textarea-Feld.
- **Audio-Upload (Datei)**: Einmal pro Entry im Media-Bereich unten. Wenn das gewählte Template mehr als ein Textarea-Feld hat, wird die Audio-Segmentierung (`/api/journal-ai/segment-audio`) aufgerufen, um das Transkript auf die Felder zu verteilen.
- **OCR-Upload**: Einmal pro Entry im Media-Bereich unten.
- **Foto-Upload + Kamera**: Einmal pro Entry im Media-Bereich unten.

#### Wireframe: Multi-Feld Template (z.B. 3 Felder)

```
┌─ Neuer Eintrag ──────────────────────────────────────────┐
│                                                              │
│ Titel:  [____________________________________]              │
│ Typ:    [📓 Diary ▼]   Template: [Tagebuch 3-Felder ▼]      │
│                                                              │
│ ┌─ 😊 Stimmung ─────────────────────── [🎤] [✨] ─┐          │
│ │ Heute fühle ich mich...                           │          │
│ └──────────────────────────────────────────────┘          │
│ ┌─ 📝 Erlebnisse ───────────────────── [🎤] [✨] ─┐          │
│ │ Heute habe ich...                                │          │
│ └──────────────────────────────────────────────┘          │
│ ┌─ 🙏 Dankbarkeit ───────────────────── [🎤] [✨] ─┐          │
│ │ Ich bin dankbar für...                           │          │
│ └──────────────────────────────────────────────┘          │
│                                                              │
│ ☐ Sensibel                                                   │
│                                                              │
│ ─── Media (1× pro Entry) ────────────────────────────── │
│ [🎵 Audio hochladen] [📷 Foto] [📹 Kamera] [📄 OCR]       │
│                                                              │
│                                    [Abbrechen] [Speichern]   │
└──────────────────────────────────────────────────────────────┘
```

> **Wichtig**: 🎤 MicrophoneButton pro Feld (nimmt Audio auf und transkribiert direkt in dieses Feld). 🎵 Audio-Upload pro Entry (lädt Datei hoch, segmentiert bei Multi-Feld).

### 6.3 AudioUploadButton mit capturedAt

```
┌───────────────────────────────────────────────────────┐
│ [📁 Audio-Datei wählen]                               │
│                                                       │
│ Aufgenommen am: [2026-02-07] um [14:30]  (optional)  │
│                                                       │
│ ⏳ Hochladen... (Stage 2 von 3)         0:04         │
└───────────────────────────────────────────────────────┘
```

---

## 7. Dateistruktur

### 7.1 Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `lib/audio/audioUploadCore.ts` | Shared Audio-Upload-Utilities (Types, Validation, Stage-Messages, Upload-Funktionen) |

### 7.2 Zu ändernde Dateien

| Datei | Phase | Änderungen |
|-------|-------|------------|
| `components/features/journal/DynamicJournalForm.tsx` | 4 | Edit-Mode, Titel, isSensitive, onCancel, OCR-Upload, Foto-Upload |
| `components/features/media/AudioUploadButton.tsx` | 4 | existingEntryId, capturedAt, audioUploadCore |
| `components/features/transcription/MicrophoneButton.tsx` | 4 | audioUploadCore für Shared Logic (minimal) |
| `components/features/journal/index.ts` | 4 | UnifiedEntryForm Export entfernen |
| `app/journal/page.tsx` | 5 | Inline-Edit State, Edit-Callbacks, Update-Handler |

### 7.3 Zu entfernende Dateien

| Datei | Grund |
|-------|-------|
| `components/features/journal/UnifiedEntryForm.tsx` | Nicht verwendet, Logik in DynamicJournalForm integriert |

### 7.4 Import-Struktur nach Phase 4 & 5

```typescript
// DynamicJournalForm.tsx - Neue Imports
import { OCRUploadButton } from '@/components/features/ocr/OCRUploadButton'
import { CameraPicker } from '@/components/features/media/CameraPicker'
import type { EntryWithRelations } from '@/lib/services/journal/types'
```

```typescript
// AudioUploadButton.tsx - Neue Imports
import { 
  uploadAudioForEntry, 
  uploadAudioStandalone, 
  validateAudioFile, 
  formatElapsedTime, 
  STAGE_MESSAGES,
  type AudioUploadResult 
} from '@/lib/audio/audioUploadCore'
```

---

## 8. Implementierungsplan

### Phase 4: DynamicJournalForm erweitern + Audio-Konsolidierung

#### Schritt 4.1 (LLM): Audio-Core erstellen

**Ziel**: Vollständige Upload-Logik aus MicrophoneButton und AudioUploadButton in `lib/audio/audioUploadCore.ts` extrahieren (Entscheidung E4: Option A)

**Anforderungen**:
- Types: `AudioUploadResult`, `UploadStage`, `AudioUploadOptions`
- Validation: `validateAudioFile(file)` - Dateigrösse, MIME-Type prüfen
- Utilities: `formatElapsedTime(seconds)`, `STAGE_MESSAGES`
- **Vollständige Upload-Logik** (nicht nur Utilities):
  - `uploadAudioForEntry(file, { entryId, model, fieldId? })` → POST `/api/journal-entries/[id]/audio`
  - `uploadAudioStandalone(file, { date, time?, model, keepAudio, capturedAt? })` → POST `/api/diary/upload-audio`
  - `transcribeOnly(file, model)` → POST `/api/transcribe`
- Stage-Callback: `onStageChange?: (stage: UploadStage, message: string) => void` für UI-Updates
- Fehlerbehandlung und Retry-Logik
- Extrahiere die gesamte Upload-/Transkriptions-Logik aus MicrophoneButton (Zeilen ~200-350) und AudioUploadButton
- Export als reine Funktionen (kein React)

**Wichtig**: MicrophoneButton und AudioUploadButton werden nach diesem Schritt die Upload-Funktionen aus `audioUploadCore` aufrufen statt eigene `fetch()`-Calls zu machen. Die Recording-Logik (MediaRecorder, Level-Meter) bleibt in MicrophoneButton.

**Dateien**: `lib/audio/audioUploadCore.ts` (NEU)

---

#### Schritt 4.2 (LLM): AudioUploadButton refactoren

**Ziel**: AudioUploadButton mit Unified-API und audioUploadCore

**Anforderungen**:
- Import `audioUploadCore` für Upload-Logik
- Neuer Prop: `existingEntryId?: string` → nutzt `uploadAudioForEntry()`
- Neuer Prop: `showCapturedAtInput?: boolean` → Datum/Uhrzeit-Eingabe
- Neuer Prop: `onResult?: (result: AudioUploadResult) => void` (unified Callback)
- Legacy-Prop `onAudioUploaded` beibehalten (deprecated, mapped auf `onResult`)
- Stage-Messages und Timer aus audioUploadCore nutzen
- Backward-Compatibility: Bestehende Verwendung in DiarySection darf nicht brechen

**Dateien**: `components/features/media/AudioUploadButton.tsx`

---

#### Schritt 4.3 (LLM): MicrophoneButton refactoren

**Ziel**: Upload-Logik durch `audioUploadCore` ersetzen (Entscheidung E4: Option A)

**Anforderungen**:
- Import `uploadAudioForEntry`, `uploadAudioStandalone`, `transcribeOnly`, `formatElapsedTime`, `validateAudioFile` aus audioUploadCore
- **Gesamte `fetch()`-Aufrufe** für Upload/Transkription durch audioUploadCore-Funktionen ersetzen
- Recording-Logik (MediaRecorder, Level-Meter, Pause/Resume) **bleibt** in MicrophoneButton
- `existingEntryId` Prop ist bereits implementiert → nutzt jetzt `uploadAudioForEntry()`
- Bestehende `onAudioData` Callback beibehalten (kein Breaking Change)
- `onText` Legacy-Callback beibehalten (deprecated)
- Stage-Messages und Timer aus audioUploadCore nutzen (via `onStageChange` Callback)
- **Erwartetes Ergebnis**: MicrophoneButton wird ca. 100-150 Zeilen kürzer

**Dateien**: `components/features/transcription/MicrophoneButton.tsx`

---

#### Schritt 4.4 (LLM): DynamicJournalForm Edit-Mode

**Ziel**: DynamicJournalForm unterstützt Bearbeitung bestehender Entries

**Anforderungen**:
- Neuer Prop: `existingEntry?: EntryWithRelations`
- Neuer Prop: `onCancel?: () => void`
- Neuer Prop: `existingEntryId?: string` (für MicrophoneButton/AudioUploadButton)
- **Titel-Feld** hinzufügen (optional, über Content-Feldern)
- **isSensitive Toggle** hinzufügen
- Wenn `existingEntry` vorhanden:
  - Typ/Template-Dropdowns disabled (locked)
  - Content/FieldValues vorbefüllt aus `existingEntry.content`
  - Titel vorbefüllt aus `existingEntry.title`
  - MicrophoneButton erhält `existingEntryId={existingEntry.id}`
  - Submit ruft `onSubmit` mit gleicher Signatur (Parent entscheidet POST vs. PATCH)
- Abbrechen-Button rendert wenn `onCancel` vorhanden

**Tipp**: Wiederverwendbare Logik aus UnifiedEntryForm übernehmen:
- `parseFieldValuesFromContent()` für Edit-Mode
- RichTextEditor für Nicht-Template-Einträge (optional, prüfen ob nötig)

**Dateien**: `components/features/journal/DynamicJournalForm.tsx`

---

#### Schritt 4.5 (LLM): OCR-Upload in DynamicJournalForm

**Ziel**: OCR-Upload-Button im Media-Bereich

**Anforderungen**:
- Prüfen wo `OCRUploadButton` existiert und wie es funktioniert
- Import und Integration im Media-Buttons-Bereich
- `onOcrComplete` Callback: Text in Content/Felder einfügen
- Für bestehende Entries: OCR-Assets direkt als MediaAttachment verknüpfen
- Für neue Entries: OCR-Asset-IDs sammeln, nach Submit verknüpfen

**Dateien**: `components/features/journal/DynamicJournalForm.tsx`

---

#### Schritt 4.6 (LLM): Foto-Upload in DynamicJournalForm

**Ziel**: Foto-Upload ersetzen (aktuell nur `alert()` Platzhalter)

**Anforderungen**:
- Prüfen ob `CameraPicker` oder eigene Komponente nötig
- Foto-Upload nutzt:
  - Für bestehende Entries: Asset hochladen → `POST /api/journal-entries/[id]/media` mit `role: 'GALLERY'`
  - Für neue Entries: Asset hochladen → ID sammeln, nach Submit verknüpfen
- Vorschau der hochgeladenen Fotos im Form
- Delete-Möglichkeit für noch nicht gespeicherte Fotos

**Dateien**: `components/features/journal/DynamicJournalForm.tsx`

---

#### Schritt 4.7 (LLM): UnifiedEntryForm entfernen

**Ziel**: Toten Code aufräumen

**Anforderungen**:
- Prüfen ob noch irgendwo importiert (aktuell: nur `index.ts`)
- `UnifiedEntryForm.tsx` löschen
- Export aus `index.ts` entfernen
- Sicherstellen: Kein Build-Fehler

**Dateien**: 
- `components/features/journal/UnifiedEntryForm.tsx` (löschen)
- `components/features/journal/index.ts` (Export entfernen)

---

### Phase 5: Journal-Seite Integration & Finalisierung

#### Schritt 5.1 (LLM): Inline-Edit State in Journal-Page

**Ziel**: Edit-Mode State-Management implementieren

**Anforderungen**:
```typescript
// Neuer State
const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
```

- `onEdit` Callback ändert von `router.push(...)` zu `setEditingEntryId(entry.id)`
- Für jeden Entry in der Liste:
  - Wenn `editingEntryId === entry.id` → DynamicJournalForm rendern
  - Sonst → JournalEntryCard rendern

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 5.2 (LLM): Edit-Submit Handler

**Ziel**: PATCH-Logik für bestehende Entries

**Anforderungen**:
```typescript
const handleEditSubmit = useCallback(async (entryId: string, data: {
  typeId: string
  templateId: string | null
  content: string
  fieldValues: Record<string, string>
  title?: string
  isSensitive?: boolean
}) => {
  // PATCH /api/journal-entries/[id]
  const res = await fetch(`/api/journal-entries/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: data.content,
      title: data.title,
      fieldValues: data.fieldValues,
      isSensitive: data.isSensitive,
    }),
  })
  if (!res.ok) throw new Error('Update failed')
  setEditingEntryId(null)
  await refetch()
  push('Eintrag aktualisiert', 'success')
}, [refetch, push])
```

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 5.3 (LLM): Entry-Loop mit Inline-Edit

**Ziel**: Conditional Rendering von Card vs. Form

**Anforderungen**:
```tsx
{entries.map((entry) => (
  editingEntryId === entry.id ? (
    <div key={entry.id} className="rounded-lg border border-primary/30 bg-base-100 p-4">
      <DynamicJournalForm
        types={types}
        templates={templates}
        existingEntry={entry}
        existingEntryId={entry.id}
        initialTypeId={entry.typeId}
        initialTemplateId={entry.templateId || undefined}
        initialContent={entry.content}
        onSubmit={(data) => handleEditSubmit(entry.id, data)}
        onCancel={() => setEditingEntryId(null)}
        isSubmitting={isSubmitting}
        date={today}
      />
    </div>
  ) : (
    <JournalEntryCard
      key={entry.id}
      entry={entry}
      mode="compact"
      onEdit={() => setEditingEntryId(entry.id)}
      // ... alle bestehenden Props
    />
  )
))}
```

**Dateien**: `app/journal/page.tsx`

---

#### Schritt 5.4 (Mensch): Code-Review und Testing

**Ziel**: Qualitätssicherung

**Aufgaben**:
- Code-Review der Änderungen
- Manuelle Tests gemäss Kapitel 11
- Prüfen: DiarySection/DiaryEntriesAccordion auf Startseite funktioniert noch
- Feedback für eventuelle Korrekturen

---

#### Schritt 5.5 (LLM): Bugfixes und Polish

**Ziel**: Identifizierte Probleme beheben

**Anforderungen**:
- Bugs aus Review beheben
- Edge Cases: Edit abbrechen → State sauber, kein Data-Loss
- Loading States während PATCH
- Focus-Management: Beim Wechsel zu Edit-Mode, erstes Feld fokussieren
- Responsive: Form auch auf Mobile gut nutzbar

---

## 9. Testdaten-Anpassungen

Keine Datenmodell-Änderungen → keine Seed-Anpassungen nötig.

Bestehende Testdaten aus Phase 2-3 (Entries mit Audio, OCR, Tasks, Sharing) sind ausreichend für Phase 4-5 Tests.

---

## 10. Automatisiertes Testing

### 10.1 Unit Tests

| Test | Datei | Beschreibung |
|------|-------|--------------|
| audioUploadCore | `audioUploadCore.test.ts` | validateAudioFile, formatElapsedTime, STAGE_MESSAGES |
| DynamicJournalForm Edit | `DynamicJournalForm.test.tsx` | Vorbefüllung, disabled Dropdowns, onCancel |
| DynamicJournalForm Create | `DynamicJournalForm.test.tsx` | Bestehende Create-Funktionalität nicht gebrochen |

### 10.2 Automatische Verifizierung

```bash
npm run lint
npm run type-check
npm run test -- --grep "DynamicJournalForm"
npm run test -- --grep "audioUploadCore"
npm run test -- --grep "AudioUploadButton"
```

---

## 11. Manuelles Testing

### 11.1 Testszenarien

| ID | Szenario | Schritte | Erwartetes Ergebnis |
|----|----------|----------|---------------------|
| MT-01a | Entry erstellen (ohne Template) | Neuer Eintrag → Typ wählen (kein Template) → Text → Speichern | Entry erscheint in Liste mit einem Content-Feld |
| MT-01b | Entry erstellen (Multi-Feld Template) | Neuer Eintrag → Template mit 3+ Feldern wählen → Felder befüllen → Speichern | Entry mit strukturierten Feldern in Liste |
| MT-02 | Entry inline bearbeiten | ✏️ klicken → Text ändern → Speichern | Card zeigt aktualisierten Text |
| MT-03 | Edit abbrechen | ✏️ klicken → Text ändern → Abbrechen | Ursprünglicher Text wiederhergestellt |
| MT-04a | Audio aufnehmen (1 Feld, Create) | Neuer Eintrag ohne Template → 🎤 neben Content → Aufnehmen → Stopp | Transkript in Content-Feld, Audio gespeichert |
| MT-04b | Audio aufnehmen (Multi-Feld, Create) | Template mit 3 Feldern → 🎤 bei Feld 2 → Aufnehmen → Stopp | Transkript nur in Feld 2, Audio gespeichert |
| MT-05a | Audio aufnehmen (1 Feld, Edit) | ✏️ → 🎤 neben Content → Aufnehmen → Stopp | Transkript angehängt, MediaAttachment erstellt |
| MT-05b | Audio aufnehmen (Multi-Feld, Edit) | ✏️ bei Multi-Feld Entry → 🎤 bei Feld 1 → Aufnehmen → Stopp | Transkript in Feld 1 angehängt, MediaAttachment erstellt |
| MT-06a | Audio-Datei hochladen (1 Feld) | Audio-Upload → Datei wählen (Template ohne/1 Feld) | Transkript in Content-Feld |
| MT-06b | Audio-Datei hochladen (Multi-Feld) | Audio-Upload → Datei wählen (Template mit 3 Feldern) | Segmentierung aufgerufen, Transkript auf Felder verteilt |
| MT-07 | AudioUpload mit capturedAt | Audio-Upload → Datei + Datum eingeben | capturedAt korrekt gespeichert |
| MT-08 | OCR-Upload | OCR-Upload → Bild wählen | Text extrahiert, in Content eingefügt |
| MT-09a | Foto-Upload (Datei) | 📷 Foto → Bild-Datei wählen | Bild als MediaAttachment verknüpft |
| MT-09b | Foto-Aufnahme (Kamera) | 📹 Kamera → Foto aufnehmen (Desktop: Stream, Mobile: native App) | Foto als MediaAttachment verknüpft |
| MT-10 | OCR Restore to Content (Edit) | ✏️ → OCRSourcePanel → "In Content übernehmen" | OCR-Text in Content-Feld eingefügt |
| MT-11 | Startseite noch funktional | Startseite laden → Entry erstellen → Audio aufnehmen | Alles funktioniert wie zuvor |
| MT-12 | Build-Check | `npm run build` | Keine Build-Fehler |

### 11.2 Regressionstests

| Szenario | Prüfung |
|----------|---------|
| DiarySection (Startseite) | MicrophoneButton funktioniert noch mit Legacy-API |
| DiaryEntriesAccordion | Bearbeiten, Audio, Re-Transkription funktioniert |
| DynamicJournalForm (Create) | Erstellen mit Audio/Template funktioniert wie bisher |
| MealNotes, Coach, Reflections | MicrophoneButton (nur Transkription) funktioniert |

---

## 12. Entscheidungen

> Die folgenden Fragen wurden vom Auftraggeber beantwortet und sind verbindliche Entscheidungen.

### E1: Typ/Template im Edit-Mode

**Entscheidung**: **Option A** – Locked (disabled)

Typ und Template können im Edit-Mode nicht geändert werden. Dies verhindert Datenverlust bei Template-Wechsel und vereinfacht die Implementierung.

### E2: Titel-Feld im Create-Mode

**Entscheidung**: **Option A** – Immer anzeigen

Das Titel-Feld wird sowohl im Create- als auch im Edit-Mode angezeigt (optional befüllbar). Sorgt für konsistente UX.

### E3: Detail-Page (`/journal/[id]`)

**Entscheidung**: **Option C** – Beibehalten und konsistent machen

Die Detail-Page bleibt erhalten (nützlich für Direktlinks), wird aber ebenfalls auf DynamicJournalForm für den Edit-Mode umgestellt. Beide Views nutzen dann denselben Edit-Mechanismus.

### E4: Audio-Core Scope

**Entscheidung**: **Option A** – Vollständige Upload-Logik extrahieren

Die vollständige Upload-Logik wird aus MicrophoneButton und AudioUploadButton in `audioUploadCore.ts` extrahiert. Beide Komponenten werden dadurch deutlich kürzer. Langfristig die bessere Praxis für Wartbarkeit und Testbarkeit.

### E5: OCR "Restore to Content"

**Entscheidung**: **Option A** – Ja, im Edit-Mode implementieren

Im Edit-Mode soll der OCR-Text per Button in den Content übernommen werden können. Kleiner Zusatz, da der Edit-Mode ohnehin implementiert wird.

---

## 13. Fragen an den Auftraggeber

> Alle Fragen wurden beantwortet. Siehe [Kapitel 12 – Entscheidungen](#12-entscheidungen).

| Frage | Antwort |
|-------|---------|
| F1: Typ/Template im Edit-Mode locked oder änderbar? | **Option A**: Locked |
| F2: Titel im Create-Mode anzeigen? | **Option A**: Ja, immer |
| F3: Detail-Page (`/journal/[id]`)? | **Option C**: Beibehalten + DynamicJournalForm |
| F4: Audio-Core Scope? | **Option A**: Vollständige Upload-Logik extrahieren |
| F5: OCR "Restore to Content"? | **Option A**: Ja, im Edit-Mode |

---

## 14. Implementierungsstatus

> Stand: Februar 2026 – **Alle Schritte abgeschlossen**

| Schritt | Beschreibung | Status |
|---------|-------------|--------|
| 4.1 | Audio-Core erstellen (`lib/audio/audioUploadCore.ts`) | ✅ Erledigt |
| 4.2 | AudioUploadButton refactoren (nutzt audioUploadCore) | ✅ Erledigt |
| 4.3 | MicrophoneButton refactoren (nutzt audioUploadCore) | ✅ Erledigt |
| 4.4 | DynamicJournalForm Edit-Mode (existingEntry, onCancel, Titel, isSensitive) | ✅ Erledigt |
| 4.5 | OCR-Upload in DynamicJournalForm (OCRUploadButton integriert) | ✅ Erledigt |
| 4.6 | Foto-Upload in DynamicJournalForm (Datei + CameraPicker) | ✅ Erledigt |
| 4.7 | UnifiedEntryForm entfernen (Datei gelöscht, Export entfernt) | ✅ Erledigt |
| 5.1 | Inline-Edit State in Journal-Page (`editingEntryId`) | ✅ Erledigt |
| 5.2 | Edit-Submit Handler (PATCH `/api/journal-entries/[id]`) | ✅ Erledigt |
| 5.3 | Entry-Loop mit Inline-Edit (Card ↔ Form Toggle) | ✅ Erledigt |
| E3 | Detail-Page `/journal/[id]` auf DynamicJournalForm umgestellt | ✅ Erledigt |
| E5 | OCR "Restore to Content" Button in OCRSourcePanel | ✅ Erledigt |
| Tests | Unit-Tests für audioUploadCore (25 Tests) | ✅ Erledigt |
| Help | Hilfe-Seiten aktualisiert (journal-ansicht, spracheingabe, medien, texterkennung) | ✅ Erledigt |

---

*Ende des Dokuments*
