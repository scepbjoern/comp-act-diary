# Unified JournalEntry Implementation Plan

> **Status**: 🔄 In Arbeit  
> **Erstellt**: 2026-02-04  
> **Basis**: [2026-02_Unified_JournalEntry_Analysis_and_Concept.md](./2026-02_Unified_JournalEntry_Analysis_and_Concept.md)  
> **Ziel**: Konkreter Implementierungsplan zur Feature-Parität zwischen DiaryEntriesAccordion und JournalEntryCard

---

## Inhaltsverzeichnis

1. [Zusammenfassung](#1-zusammenfassung)
2. [Feature-Inventar: Ist-Zustand](#2-feature-inventar-ist-zustand)
3. [Gap-Analyse: Fehlende Features](#3-gap-analyse-fehlende-features)
4. [Funktionale Anforderungen](#4-funktionale-anforderungen)
5. [Nicht-Funktionale Anforderungen](#5-nicht-funktionale-anforderungen)
6. [Code-Mapping: Wiederverwendung](#6-code-mapping-wiederverwendung)
7. [Implementierungsreihenfolge](#7-implementierungsreihenfolge)
8. [Offene Fragen](#8-offene-fragen)

---

## 1. Zusammenfassung

### Kernproblem

Die **DiaryEntriesAccordion** auf der Startseite (`/`) bietet ein reichhaltiges Feature-Set für Tagebucheinträge. Die **JournalEntryCard** auf der Journal-Seite (`/journal`) bietet Templates mit strukturierten Feldern, aber es fehlen viele Features der DiaryEntriesAccordion.

### Ziel

**Eine einzige Komponenten-Hierarchie**, die:
- Alle Features der DiaryEntriesAccordion unterstützt
- Templates mit strukturierten Feldern unterstützt
- Auf Startseite UND Journal-Seite identisch funktioniert

### Kernprinzip

> **Die gleiche Datenstruktur (JournalEntry + Entity + MediaAttachment) wird bereits überall verwendet. Die Unterschiede sind rein auf UI-Ebene.**

---

## 2. Feature-Inventar: Ist-Zustand

### 2.1 DiaryEntriesAccordion (Startseite) - Vollständige Feature-Liste

| Feature | Datei | Zeilen | API-Endpunkt |
|---------|-------|--------|--------------|
| **Akkordeon-Ansicht** | `DiaryEntriesAccordion.tsx` | 429-472 | - |
| **Titel anzeigen/bearbeiten** | `DiaryEntriesAccordion.tsx` | 618-629 | `PATCH /api/notes/[id]` |
| **RichTextEditor Bearbeitung** | `DiaryEntriesAccordion.tsx` | 646-652 | `PATCH /api/notes/[id]` |
| **Bezugzeit (occurredAt) bearbeiten** | `DiaryEntriesAccordion.tsx` | 630-637 | `PATCH /api/notes/[id]` |
| **Erfassungszeit (capturedAt) bearbeiten** | `DiaryEntriesAccordion.tsx` | 638-644 | `PATCH /api/notes/[id]` |
| **Mikrofon-Aufnahme** | `DiaryEntriesAccordion.tsx` | 654-667 | `POST /api/diary/upload-audio` |
| **Audio-Datei Upload** | `DiaryEntriesAccordion.tsx` | 668-686 | `POST /api/journal-entries/[id]/audio` |
| **Multi-Audio-Anzeige** | `DiaryEntriesAccordion.tsx` | 752-795 | - |
| **Audio löschen** | `DiaryEntriesAccordion.tsx` | 780-791 | `DELETE` via Callback |
| **Audio Player (H5)** | `DiaryEntriesAccordion.tsx` | 773-778 | - |
| **Original Transcript Panel** | `DiaryEntriesAccordion.tsx` | 844-864 | Lazy load |
| **Re-Transkription** | `OriginalTranscriptPanel.tsx` | - | `POST /api/diary/retranscribe` |
| **Transcript zu Content wiederherstellen** | `OriginalTranscriptPanel.tsx` | - | - |
| **OCR Source Panel** | `DiaryEntriesAccordion.tsx` | 866-879 | Lazy load |
| **Foto-Galerie** | `DiaryEntriesAccordion.tsx` | 881-944 | - |
| **Foto hochladen** | `DiaryEntriesAccordion.tsx` | 946-962 | `POST /api/notes/[id]/photos` |
| **Kamera-Aufnahme** | `DiaryEntriesAccordion.tsx` | 963-967 | `POST /api/notes/[id]/photos` |
| **Foto löschen** | `DiaryEntriesAccordion.tsx` | 920-924 | `DELETE /api/photos/[id]` |
| **Foto vergrössern (Lightbox)** | `DiaryEntriesAccordion.tsx` | 917-919 | - |
| **JournalEntrySection (Zusammenfassung)** | `DiaryEntriesAccordion.tsx` | 601-615 | - |
| **JournalEntrySection (Inhalt)** | `DiaryEntriesAccordion.tsx` | 709-724 | - |
| **JournalEntrySection (Analyse)** | `DiaryEntriesAccordion.tsx` | 726-741 | - |
| **AI-Pipeline Button** | `DiaryEntriesAccordion.tsx` | 546-558 | `POST /api/journal-ai/pipeline` |
| **Titel generieren** | `DiaryEntriesAccordion.tsx` | 559-590 | `POST /api/generate-title` |
| **Content generieren** | `DiaryEntriesAccordion.tsx` | 691-705 | `POST /api/journal-ai/generate-content` |
| **Analyse generieren/löschen** | `DiaryEntriesAccordion.tsx` | 727-741 | `POST/DELETE /api/notes/[id]/analysis` |
| **Zusammenfassung generieren/löschen** | `DiaryEntriesAccordion.tsx` | 601-615 | `PATCH /api/notes/[id]` |
| **AI-Settings Popup** | `DiaryEntriesAccordion.tsx` | 975-983 | - |
| **Timestamp Modal** | `DiaryEntriesAccordion.tsx` | 985-1001 | - |
| **Share Button/Modal** | `DiaryEntriesAccordion.tsx` | 521-523, 1003-1011 | - |
| **SharedBadge** | `DiaryEntriesAccordion.tsx` | 455-461 | - |
| **Read-Mode Support** | `DiaryEntriesAccordion.tsx` | 165, 502, 530 | - |
| **Tasks Panel** | `DiaryEntriesAccordion.tsx` | 743-749 | - |
| **Generated Image** | `DiaryEntriesAccordion.tsx` | 595-599 | - |
| **Highlight Entry (URL Hash)** | `DiaryEntriesAccordion.tsx` | 179-197 | - |

### 2.2 JournalEntryCard (Journal-Seite) - Aktuelle Features

| Feature | Status | Datei | Zeilen |
|---------|--------|-------|--------|
| **Type Badge mit Icon** | ✅ | `JournalEntryCard.tsx` | 64-73 |
| **Template Name** | ✅ | `JournalEntryCard.tsx` | 327-330 |
| **Titel anzeigen** | ✅ | `JournalEntryCard.tsx` | 249-250 |
| **Content Preview** | ✅ | `JournalEntryCard.tsx` | 334-338 |
| **Media Indicators** | ✅ | `JournalEntryCard.tsx` | 76-98 |
| **Audio Player (einfach)** | ✅ | `JournalEntryCard.tsx` | 101-154 |
| **Photo Gallery (einfach)** | ✅ | `JournalEntryCard.tsx` | 157-180 |
| **Datum anzeigen** | ✅ | `JournalEntryCard.tsx` | 265, 357-362 |
| **Sensitive Badge** | ✅ | `JournalEntryCard.tsx` | 254-256 |
| **Share Count Badge** | ✅ | `JournalEntryCard.tsx` | 257-259 |
| **Edit Button** | ✅ | `JournalEntryCard.tsx` | 281-289 |
| **Delete Button** | ✅ | `JournalEntryCard.tsx` | 299-307 |
| **Share Button** | ✅ | `JournalEntryCard.tsx` | 290-298 |
| **Pipeline Button** | ✅ | `JournalEntryCard.tsx` | 272-280 |
| **Expand/Collapse** | ✅ | `JournalEntryCard.tsx` | 308-320 |
| **Link zu Detail** | ✅ | `JournalEntryCard.tsx` | 365-374 |

### 2.3 DynamicJournalForm - Aktuelle Features

| Feature | Status | Notiz |
|---------|--------|-------|
| **Type Selection** | ✅ | Dropdown |
| **Template Selection** | ✅ | Gefiltert nach Type |
| **Dynamic Field Rendering** | ✅ | Aus Template.fields |
| **Mikrofon pro Feld** | ✅ | MicrophoneButton |
| **Audio-Segmentierung** | ✅ | Automatisch bei >1 Feld |
| **Audio-Upload Button** | ⚠️ | Button vorhanden, nicht vollständig implementiert |
| **OCR-Upload** | ❌ | Nicht vorhanden |
| **Foto-Upload** | ❌ | Nicht vorhanden |

---

## 3. Gap-Analyse: Fehlende Features

### 3.1 JournalEntryCard fehlt gegenüber DiaryEntriesAccordion

| # | Feature | Priorität | Komplexität |
|---|---------|-----------|-------------|
| G1 | **Inline-Bearbeitung** (nicht nur Link zu Detail) | Hoch | Mittel |
| G2 | **RichTextEditor** im Edit-Mode | Hoch | Gering |
| G3 | **Multi-Audio-Anzeige mit Delete** | Hoch | Gering |
| G4 | **Audio-Datei hochladen** (nicht nur aufnehmen) | Hoch | Gering |
| G5 | **Original Transcript Panel** (lazy loaded) | Mittel | Mittel |
| G6 | **Re-Transkription** | Mittel | Gering |
| G7 | **OCR Source Panel** | Mittel | Gering |
| G8 | **Foto hochladen** | Hoch | Gering |
| G9 | **Kamera-Aufnahme** | Mittel | Gering |
| G10 | **Foto löschen** | Hoch | Gering |
| G11 | **Foto-Lightbox** | Mittel | Gering |
| G12 | **JournalEntrySection (Summary)** | Mittel | Gering |
| G13 | **JournalEntrySection (Analysis)** | Mittel | Gering |
| G14 | **Content generieren Button** | Mittel | Gering |
| G15 | **Analyse generieren/löschen** | Mittel | Gering |
| G16 | **Zusammenfassung generieren/löschen** | Mittel | Gering |
| G17 | **AI-Settings Popup** | Niedrig | Gering |
| G18 | **Timestamp Modal** | Niedrig | Gering |
| G19 | **Tasks Panel** | Niedrig | Mittel |
| G20 | **Generated Image** | Niedrig | Gering |
| G21 | **Read-Mode Support** | Niedrig | Gering |
| G22 | **Highlight Entry (URL Hash)** | Niedrig | Gering |

### 3.2 DynamicJournalForm fehlt

| # | Feature | Priorität | Komplexität |
|---|---------|-----------|-------------|
| F1 | **OCR-Upload Button** | Hoch | Gering |
| F2 | **Foto-Upload** | Hoch | Gering |
| F3 | **Audio-Upload vollständig** | Hoch | Gering |

### 3.3 Startseite fehlt (Templates)

| # | Feature | Priorität | Komplexität |
|---|---------|-----------|-------------|
| S1 | **Template-Auswahl** | Mittel | Mittel |
| S2 | **Dynamische Feld-Darstellung** | Mittel | Mittel |
| S3 | **Audio-Segmentierung** | Niedrig | Mittel |

---

## 4. Funktionale Anforderungen

### FR-01: Unified Entry Display Component

**Beschreibung**: Eine einzige Komponente `JournalEntryCard` zeigt Einträge konsistent an.

**Akzeptanzkriterien**:
1. Alle Features aus Tabelle 2.1 sind verfügbar
2. `mode` Prop steuert Detailgrad: `compact`, `expanded`, `detail`
3. `isEditing` Prop aktiviert Inline-Bearbeitung
4. Template-Felder werden strukturiert angezeigt (nicht nur als Plaintext)

### FR-02: Inline-Bearbeitung

**Beschreibung**: Einträge können direkt in der Liste bearbeitet werden.

**Akzeptanzkriterien**:
1. Klick auf "Bearbeiten" aktiviert Edit-Mode in der Karte
2. RichTextEditor für Freitext-Felder
3. Input-Felder für Template-Felder
4. Speichern/Abbrechen Buttons
5. Optimistic Update beim Speichern

### FR-03: Multi-Audio Support

**Beschreibung**: Einträge können mehrere Audio-Attachments haben.

**Akzeptanzkriterien**:
1. Alle Audio-Attachments werden angezeigt mit Player
2. Jedes Audio hat: Datum, Dauer, Transcript-Preview
3. Audio kann gelöscht werden (mit Bestätigung)
4. Neue Audios können hinzugefügt werden (Mikrofon + Upload)

### FR-04: Original Transcript & Re-Transkription

**Beschreibung**: Original-Transkripte sind zugänglich und können re-transkribiert werden.

**Akzeptanzkriterien**:
1. Panel ist lazy-loaded (erst bei Expand laden)
2. Zeigt alle Transkripte gruppiert nach Audio
3. "Wiederherstellen zu Content" Button
4. Re-Transkriptions-Button mit Modell-Auswahl
5. Warnung vor Überschreibung

### FR-05: Foto-Management

**Beschreibung**: Fotos können hochgeladen, angezeigt und gelöscht werden.

**Akzeptanzkriterien**:
1. Foto-Upload Button (Datei-Auswahl)
2. Kamera-Aufnahme Button (CameraPicker)
3. Foto-Galerie mit Thumbnails
4. Lightbox bei Klick
5. Löschen-Button (mit Bestätigung)
6. Markdown-Bilder werden ebenfalls angezeigt

### FR-06: OCR Support

**Beschreibung**: OCR-Quellen können hochgeladen und angezeigt werden.

**Akzeptanzkriterien**:
1. OCR-Upload Button im Formular
2. OCR Source Panel für bestehende Einträge
3. Preview der OCR-Quell-Dateien

### FR-07: AI-Sections (Summary, Analysis, Content)

**Beschreibung**: AI-generierte Inhalte werden in eigenen Sections angezeigt.

**Akzeptanzkriterien**:
1. JournalEntrySection für Zusammenfassung (blau)
2. JournalEntrySection für Analyse (gelb)
3. Generieren/Regenerieren/Löschen Buttons
4. Inline-Bearbeitung möglich
5. "Veraltet"-Warnung wenn Content neuer als Analysis

### FR-08: Templates in Entry Display

**Beschreibung**: Template-basierte Einträge zeigen Felder strukturiert an.

**Akzeptanzkriterien**:
1. Template-Name wird angezeigt
2. Felder werden mit Labels angezeigt (nicht als Markdown)
3. Bearbeitung respektiert Template-Struktur

### FR-09: Sharing & Access Control

**Beschreibung**: Einträge können geteilt werden.

**Akzeptanzkriterien**:
1. Share Button öffnet ShareEntryModal
2. SharedBadge zeigt Status an (owned/shared-view/shared-edit)
3. Read-Mode für Viewer ohne Edit-Rechte

### FR-10: Timestamps & Metadata

**Beschreibung**: Zeitstempel können bearbeitet werden.

**Akzeptanzkriterien**:
1. Timestamp Modal für occurredAt, capturedAt
2. Audio-capturedAt wird ebenfalls angezeigt/editierbar

---

## 5. Nicht-Funktionale Anforderungen

### NFR-01: Performance

**Beschreibung**: Die Komponenten müssen performant bleiben.

**Akzeptanzkriterien**:
1. Lazy-Loading für Transcript Panel, OCR Panel
2. Audio/Foto-Daten nur laden wenn expanded
3. Memo-ization für teure Renders
4. Max 50ms TTI für Akkordeon-Toggle

### NFR-02: Code-Wiederverwendung

**Beschreibung**: Maximale Wiederverwendung bestehenden Codes.

**Akzeptanzkriterien**:
1. Bestehende Komponenten werden importiert, nicht kopiert
2. Keine Duplizierung von API-Aufrufen
3. Gemeinsame Types/Interfaces

### NFR-03: Konsistenz

**Beschreibung**: UI und UX sind überall konsistent.

**Akzeptanzkriterien**:
1. Gleiche Farben für Sections (blau=Summary, gelb=Analysis)
2. Gleiche Icons und Button-Stile
3. Gleiche Interaktionsmuster

### NFR-04: Mobile Support

**Beschreibung**: Funktioniert auf mobilen Geräten.

**Akzeptanzkriterien**:
1. Touch-freundliche Buttons (min 44px)
2. Responsive Layout
3. Kamera-Fallback auf Mobil

---

## 6. Code-Mapping: Wiederverwendung

### 6.1 Komponenten zum Importieren (nicht kopieren!)

| Komponente | Quell-Datei | Verwendung in JournalEntryCard |
|------------|-------------|--------------------------------|
| `JournalEntrySection` | `components/features/diary/JournalEntrySection.tsx` | Summary, Analysis, Content Sections |
| `OriginalTranscriptPanel` | `components/features/transcription/OriginalTranscriptPanel.tsx` | Transcript-Anzeige |
| `RetranscribeButton` | `components/features/transcription/RetranscribeButton.tsx` | Re-Transkription |
| `OCRSourcePanel` | `components/features/ocr/OCRSourcePanel.tsx` | OCR-Quellen |
| `AudioPlayerH5` | `components/features/media/AudioPlayerH5.tsx` | Audio-Wiedergabe |
| `CameraPicker` | `components/features/media/CameraPicker.tsx` | Kamera-Aufnahme |
| `MicrophoneButton` | `components/features/transcription/MicrophoneButton.tsx` | Audio-Aufnahme |
| `RichTextEditor` | `components/features/editor/RichTextEditor.tsx` | Text-Bearbeitung |
| `AISettingsPopup` | `components/features/ai/AISettingsPopup.tsx` | AI-Einstellungen |
| `TimestampModal` | `components/features/day/TimestampModal.tsx` | Zeitstempel bearbeiten |
| `ShareEntryModal` | `components/features/diary/ShareEntryModal.tsx` | Teilen |
| `SharedBadge` | `components/features/diary/SharedBadge.tsx` | Sharing-Status |
| `JournalTasksPanel` | `components/features/tasks/JournalTasksPanel.tsx` | Tasks |
| `JournalEntryImage` | `components/features/diary/JournalEntryImage.tsx` | Generated Image |
| `DiaryContentWithMentions` | `components/features/diary/DiaryContentWithMentions.tsx` | Mention-Rendering |

### 6.2 Hooks zum Verwenden

| Hook | Quell-Datei | Verwendung |
|------|-------------|------------|
| `useJournalEntries` | `hooks/useJournalEntries.ts` | CRUD, Media, AI-Pipeline |
| `useJournalAI` | `hooks/useJournalAI.ts` | AI-Generierung |
| `useTasksForEntry` | `hooks/useTasksForEntry.ts` | Tasks laden |
| `useReadMode` | `hooks/useReadMode.ts` | Read-Mode Status |

### 6.3 API-Endpunkte (bereits vorhanden)

| Endpunkt | Verwendung |
|----------|------------|
| `GET/POST /api/journal-entries` | Liste/Erstellen |
| `GET/PATCH/DELETE /api/journal-entries/[id]` | Einzeln |
| `POST /api/journal-entries/[id]/media` | Media hinzufügen |
| `PATCH/DELETE /api/journal-entries/[id]/media/[attachmentId]` | Media bearbeiten/löschen |
| `POST /api/journal-entries/[id]/audio` | Audio hochladen + transkribieren |
| `POST /api/notes/[id]/photos` | Fotos hochladen |
| `DELETE /api/photos/[id]` | Foto löschen |
| `POST /api/journal-ai/pipeline` | AI-Pipeline |
| `POST /api/journal-ai/generate-content` | Content generieren |
| `POST /api/journal-ai/generate-summary` | Summary generieren |
| `POST /api/generate-title` | Titel generieren |
| `POST /api/diary/retranscribe` | Re-Transkription |

---

## 7. Implementierungsreihenfolge

### Phase 1: JournalEntryCard erweitern (1-2 Tage)

**Schritt 1.1**: Inline-Edit Mode
- `isEditing` State hinzufügen
- RichTextEditor für Content
- Save/Cancel Buttons
- API-Call via `useJournalEntries.updateEntry`

**Schritt 1.2**: JournalEntrySection importieren
- Summary Section (blau)
- Analysis Section (gelb)
- Content Section
- Generieren/Löschen Callbacks

**Schritt 1.3**: Multi-Audio Support
- `AudioPlayerH5` statt eigenem Player
- Alle Audio-Attachments anzeigen
- Delete Button pro Audio
- Upload Button hinzufügen

**Schritt 1.4**: Foto-Management
- Foto-Galerie erweitern
- Upload Button + CameraPicker
- Delete Button
- Lightbox (einfaches Modal)

### Phase 2: Panels integrieren (0.5-1 Tag)

**Schritt 2.1**: OriginalTranscriptPanel
- Lazy-load wenn Audios vorhanden
- onRestoreToContent Callback
- onRetranscribe Callback

**Schritt 2.2**: OCRSourcePanel
- Lazy-load wenn OCR-Quellen vorhanden
- onRestoreToContent Callback

**Schritt 2.3**: Tasks Panel
- JournalTasksPanel importieren
- useTasksForEntry Hook

### Phase 3: Modals & Popups (0.5 Tag)

**Schritt 3.1**: Sharing
- ShareEntryModal integrieren
- SharedBadge im Header

**Schritt 3.2**: Timestamps
- TimestampModal integrieren
- Button in Actions

**Schritt 3.3**: AI Settings
- AISettingsPopup integrieren
- Button in Actions

### Phase 4: DynamicJournalForm erweitern (0.5 Tag)

**Schritt 4.1**: OCR-Upload
- OCRUploadButton importieren
- onOcrComplete Callback

**Schritt 4.2**: Foto-Upload
- Foto-Upload Button
- CameraPicker

**Schritt 4.3**: Audio-Upload vervollständigen
- AudioUploadButton prüfen
- Segmentierung sicherstellen

### Phase 5: Integration & Test (0.5 Tag)

**Schritt 5.1**: Journal-Seite
- JournalEntryCard mit allen Props
- Alle Callbacks verbinden

**Schritt 5.2**: Startseite (optional)
- DiaryEntriesAccordion durch JournalEntryCard ersetzen
- ODER: Template-Support zu DiaryEntriesAccordion

---

## 8. Offene Fragen

### Frage 1: Startseite migrieren oder nicht?

**Kontext**: Das Konzeptdokument sagt "Startseite Migration - separates Projekt".

**Optionen**:
- A) Startseite bleibt bei DiaryEntriesAccordion (keine Migration)
- B) JournalEntryCard ersetzt DiaryEntriesAccordion (volle Migration)
- C) DiaryEntriesAccordion bekommt Template-Support (invertierte Migration)

**Empfehlung**: Option A für jetzt, Option B später. Die Journal-Seite zuerst vollständig fertigstellen.

### Frage 2: Template-Felder in JournalEntryCard

**Kontext**: DiaryEntriesAccordion zeigt Content als Plaintext. Templates haben strukturierte Felder.

**Frage**: Wie sollen Template-Felder in der Ansicht dargestellt werden?
- A) Als Plaintext (wie jetzt)
- B) Als strukturierte Felder mit Labels
- C) Beides, je nach Template-Einstellung

**Empfehlung**: Option B - Strukturierte Darstellung, da Templates genau dafür gedacht sind.

### Frage 3: Audio-Upload API-Route

**Kontext**: `POST /api/journal-entries/[id]/audio` existiert bereits und funktioniert.

**Frage**: Soll MicrophoneButton diese Route nutzen statt `/api/diary/upload-audio`?

**Empfehlung**: Ja, für neue Einträge. MicrophoneButton hat bereits `existingEntryId` Prop.

### Frage 4: Foto-Upload API-Route

**Kontext**: `POST /api/notes/[id]/photos` existiert. Unified API wäre `/api/journal-entries/[id]/photos`.

**Frage**: Neue Route erstellen oder bestehende nutzen?

**Empfehlung**: Bestehende Route nutzen, später auf `/api/journal-entries/[id]/media` mit `role=GALLERY` migrieren.

---

## Anhang A: Dateien-Übersicht

### Zu ändern

| Datei | Änderungen |
|-------|------------|
| `components/features/journal/JournalEntryCard.tsx` | Erweitern um alle Features |
| `components/features/journal/DynamicJournalForm.tsx` | OCR, Foto, Audio vervollständigen |
| `app/journal/page.tsx` | Alle Callbacks verbinden |

### Zu importieren (nicht ändern)

| Datei | Import in |
|-------|-----------|
| `JournalEntrySection.tsx` | JournalEntryCard |
| `OriginalTranscriptPanel.tsx` | JournalEntryCard |
| `OCRSourcePanel.tsx` | JournalEntryCard |
| `AudioPlayerH5.tsx` | JournalEntryCard |
| `RichTextEditor.tsx` | JournalEntryCard |
| `MicrophoneButton.tsx` | JournalEntryCard, DynamicJournalForm |
| `CameraPicker.tsx` | JournalEntryCard, DynamicJournalForm |
| `ShareEntryModal.tsx` | JournalEntryCard |
| `SharedBadge.tsx` | JournalEntryCard |
| `AISettingsPopup.tsx` | JournalEntryCard |
| `TimestampModal.tsx` | JournalEntryCard |
| `JournalTasksPanel.tsx` | JournalEntryCard |
| `JournalEntryImage.tsx` | JournalEntryCard |
| `OCRUploadButton.tsx` | DynamicJournalForm |

---

## Anhang B: Props-Design für JournalEntryCard

```typescript
interface JournalEntryCardProps {
  // Core
  entry: EntryWithRelations
  mode: 'compact' | 'expanded' | 'detail'
  
  // Edit State
  isEditing?: boolean
  onEdit?: (entry: EntryWithRelations) => void
  onSave?: (id: string, data: UpdateEntryParams) => Promise<void>
  onCancel?: () => void
  
  // Delete
  onDelete?: (id: string) => void
  
  // Media Callbacks
  onAddAudio?: (id: string, file: File) => Promise<void>
  onDeleteAudio?: (id: string, attachmentId: string) => Promise<void>
  onRetranscribe?: (id: string, attachmentId: string, model: string) => Promise<void>
  onAddPhoto?: (id: string, files: File[]) => Promise<void>
  onDeletePhoto?: (id: string, photoId: string) => Promise<void>
  
  // AI Callbacks
  onRunPipeline?: (id: string) => Promise<void>
  onGenerateTitle?: (id: string) => Promise<void>
  onGenerateContent?: (id: string) => Promise<void>
  onGenerateAnalysis?: (id: string) => Promise<void>
  onGenerateSummary?: (id: string) => Promise<void>
  onDeleteAnalysis?: (id: string) => Promise<void>
  onDeleteSummary?: (id: string) => Promise<void>
  onUpdateAnalysis?: (id: string, text: string) => Promise<void>
  onUpdateSummary?: (id: string, text: string) => Promise<void>
  
  // Sharing
  onShare?: (id: string) => void
  
  // Misc
  onRefresh?: () => void
  readMode?: boolean
  className?: string
}
```

---

*Ende des Dokuments*
