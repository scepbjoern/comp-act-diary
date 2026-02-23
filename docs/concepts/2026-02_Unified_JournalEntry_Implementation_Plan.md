# Unified JournalEntry Implementation Plan

> **Status**: 🔄 In Arbeit (Phase 1–5 ✅ abgeschlossen, Phase 6 offen)
> **Erstellt**: 2026-02-04
> **Phase 1 implementiert**: 2026-02-05
> **Phase 2+3 implementiert**: 2026-02-07
> **Phase 4+5 implementiert**: 2026-02-23
> **Phase 6 UX-Wünsche implementiert**: 2026-02-23
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
7. [Komponenten-Architektur](#7-komponenten-architektur)
8. [Implementierungsreihenfolge](#8-implementierungsreihenfolge)
9. [Entscheidungen](#9-entscheidungen)

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
| **Dynamic Field Rendering** | ✅ | Aus Template.fields, mit RichTextEditor |
| **Mikrofon pro Feld** | ✅ | MicrophoneButton mit audioUploadCore |
| **Audio-Segmentierung** | ✅ | Automatisch bei >1 Feld |
| **Audio-Upload Button** | ✅ | Vollständig implementiert mit audioUploadCore |
| **OCR-Upload** | ✅ | OCRUploadButton integriert |
| **Foto-Upload** | ✅ | CameraPicker + Datei-Upload |
| **Edit-Mode** | ✅ | existingEntry Prop, locked Type/Template |
| **Titel-Feld** | ✅ | Optional in Create/Edit |
| **isSensitive Toggle** | ✅ | In Create/Edit |
| **occurredAt/capturedAt** | ✅ | Datum/Zeit-Felder |
| **Save + Pipeline Button** | ✅ | Kombinierter Button (W3/W5) |
| **keepAudio Toggle** | ✅ | Media-Toolbar (W4) |
| **Abbrechen-Button** | ✅ | Icon-only (W8) |

---

## 3. Gap-Analyse: Fehlende Features

> **Status**: Alle Gaps G1-G22 und F1-F3 wurden in Phase 1-5 geschlossen. Verbleibend: S1-S3 (Startseiten-Migration, Phase 6).

### 3.1 JournalEntryCard fehlt gegenüber DiaryEntriesAccordion

| # | Feature | Status | Implementiert |
|---|---------|--------|---------------|
| G1 | **Inline-Bearbeitung** | ✅ | Phase 4 (DynamicJournalForm Edit-Mode) |
| G2 | **RichTextEditor** im Edit-Mode | ✅ | Phase 4 (FieldRenderer mit RichTextEditor) |
| G3 | **Multi-Audio-Anzeige mit Delete** | ✅ | Phase 1 (AudioPlayerH5 + Delete) |
| G4 | **Audio-Datei hochladen** | ✅ | Phase 4 (AudioUploadButton mit audioUploadCore) |
| G5 | **Original Transcript Panel** | ✅ | Phase 1 (expandierbar in Audio-Sektion) |
| G6 | **Re-Transkription** | ✅ | Phase 1 (RetranscribeButton) |
| G7 | **OCR Source Panel** | ✅ | Phase 2 (OCRSourcePanel) |
| G8 | **Foto hochladen** | ✅ | Phase 4 (CameraPicker + Upload) |
| G9 | **Kamera-Aufnahme** | ✅ | Phase 4 (CameraPicker) |
| G10 | **Foto löschen** | ✅ | Phase 4 (Delete in Media-Preview) |
| G11 | **Foto-Lightbox** | ✅ | Phase 1 (PhotoLightbox) |
| G12 | **JournalEntrySection (Summary)** | ✅ | Phase 1 |
| G13 | **JournalEntrySection (Analysis)** | ✅ | Phase 1 |
| G14 | **Content generieren Button** | ✅ | Phase 4 (Save+Pipeline Button) |
| G15 | **Analyse generieren/löschen** | ✅ | Phase 1 |
| G16 | **Zusammenfassung generieren/löschen** | ✅ | Phase 1 |
| G17 | **AI-Settings Popup** | ✅ | Phase 3 (AISettingsPopup) |
| G18 | **Timestamp Modal** | ✅ | Phase 3 (TimestampModal) |
| G19 | **Tasks Panel** | ✅ | Phase 2 (JournalTasksPanel) |
| G20 | **Generated Image** | ✅ | Phase 6 UX (JournalEntryImage) |
| G21 | **Read-Mode Support** | ✅ | Phase 1 |
| G22 | **Highlight Entry (URL Hash)** | ✅ | Phase 1 |

### 3.2 DynamicJournalForm fehlt

| # | Feature | Status | Implementiert |
|---|---------|--------|---------------|
| F1 | **OCR-Upload Button** | ✅ | Phase 4 (OCRUploadButton) |
| F2 | **Foto-Upload** | ✅ | Phase 4 (CameraPicker + Upload) |
| F3 | **Audio-Upload vollständig** | ✅ | Phase 4 (audioUploadCore) |

### 3.3 Startseite fehlt (Templates)

| # | Feature | Status | Phase |
|---|---------|--------|-------|
| S1 | **Template-Auswahl** | ❌ Offen | Phase 6 |
| S2 | **Dynamische Feld-Darstellung** | ❌ Offen | Phase 6 |
| S3 | **Audio-Segmentierung** | ❌ Offen | Phase 6 |

---

## 4. Funktionale Anforderungen

### FR-01: Unified Entry Display Component

**Beschreibung**: Eine einzige Komponente `JournalEntryCard` zeigt Einträge konsistent an.

**Akzeptanzkriterien**:
1. Alle Features aus Tabelle 2.1 sind verfügbar
2. `mode` Prop steuert Detailgrad: `compact`, `expanded`, `detail`
3. `isEditing` Prop aktiviert Inline-Bearbeitung
4. Content wird als Markdown gerendert (siehe [E2](#e2-template-felder-darstellung))

**Props-Design**: Siehe [Anhang B](#anhang-b-props-design-für-journalentrycard)

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

**Beschreibung**: Template-basierte Einträge werden korrekt dargestellt.

**Akzeptanzkriterien**:
1. Template-Name wird angezeigt
2. Content wird als **Markdown gerendert** (Feld-Labels werden zu Überschriften)
3. Bearbeitung erfolgt im RichTextEditor mit Markdown-Unterstützung
4. Keine separate strukturierte Feld-Darstellung nötig

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

### 6.3 API-Endpunkte (Unified Routes)

**Ziel**: Alle Journal-Operationen nutzen die `/api/journal-entries/`-Routen. Legacy-Routen werden in Phase 6 entfernt.

| Endpunkt | Verwendung | Status |
|----------|------------|--------|
| `GET/POST /api/journal-entries` | Liste/Erstellen | ✅ Vorhanden |
| `GET/PATCH/DELETE /api/journal-entries/[id]` | Einzeln | ✅ Vorhanden |
| `POST /api/journal-entries/[id]/media` | Media hinzufügen (role: ATTACHMENT, SOURCE, GALLERY) | ✅ Vorhanden |
| `PATCH/DELETE /api/journal-entries/[id]/media/[attachmentId]` | Media bearbeiten/löschen | ✅ Vorhanden |
| `POST /api/journal-entries/[id]/audio` | Audio hochladen + transkribieren | ✅ Vorhanden |
| `POST /api/journal-ai/pipeline` | AI-Pipeline | ✅ Vorhanden |
| `POST /api/journal-ai/generate-content` | Content generieren | ✅ Vorhanden |
| `POST /api/journal-ai/generate-summary` | Summary generieren | ✅ Vorhanden |
| `POST /api/generate-title` | Titel generieren | ✅ Vorhanden |

**Legacy-Routen** (werden parallel betrieben bis Phase 6):

| Legacy-Endpunkt | Unified-Ersatz | Entfernen in |
|-----------------|----------------|--------------|
| `POST /api/diary/upload-audio` | `/api/journal-entries/[id]/audio` | Phase 6 |
| `POST /api/notes/[id]/photos` | `/api/journal-entries/[id]/media` mit `role=GALLERY` | Phase 6 |
| `DELETE /api/photos/[id]` | `/api/journal-entries/[id]/media/[attachmentId]` | Phase 6 |
| `POST /api/diary/retranscribe` | Prüfen: evtl. in unified Route integrieren | Phase 6 |

**Hinweis**: Für Photos wird die generische `/media`-Route mit `role=GALLERY` verwendet, keine separate `/photos`-Route.

---

## 7. Komponenten-Architektur

### 7.1 Aktuelle Situation im `journal`-Ordner

| Datei | Grösse | Funktion | Entscheidung |
|-------|--------|----------|--------------|
| `DynamicJournalForm.tsx` | 21 KB | Type/Template-Selektion, Field-Rendering | **Überarbeiten** |
| `UnifiedEntryForm.tsx` | 14 KB | Vereinfachte Edit-Form | **Entfernen** (in DynamicJournalForm integrieren) |
| `JournalEntryCard.tsx` | 14 KB | Entry-Anzeige | **Überarbeiten** |
| `FieldRenderer.tsx` | 7 KB | Template-Feld-Rendering | **Beibehalten** |
| `TemplateEditor.tsx` | 16 KB | Template-Verwaltung | **Beibehalten** (Admin) |
| `TemplateFieldEditor.tsx` | 6 KB | Feld-Editor | **Beibehalten** (Admin) |
| `TemplateAIConfigEditor.tsx` | 10 KB | AI-Config Editor | **Beibehalten** (Admin) |
| `EmojiPickerButton.tsx` | 4 KB | Emoji-Auswahl | **Beibehalten** |
| `index.ts` | 1 KB | Exports | **Anpassen** |

### 7.2 Entscheidung: Überarbeiten statt Neu erstellen

> Vollständige Dateien-Übersicht: Siehe [Anhang A](#anhang-a-dateien-übersicht)

**Begründung**:
1. `JournalEntryCard` (14 KB) hat bereits die Grundstruktur (modes, props, media indicators)
2. `DynamicJournalForm` (21 KB) hat Type/Template-Selektion und Field-Rendering, die funktionieren
3. Bestehender Code enthält getestete Logik (Content-Building, Field-Parsing)
4. Neuschreiben würde mehr Zeit kosten und Regressionen riskieren

**Vorgehen**:
1. `JournalEntryCard` erweitern um alle Features aus DiaryEntriesAccordion
2. `DynamicJournalForm` erweitern um OCR, Foto, vollständiges Audio
3. `UnifiedEntryForm` entfernen und Logik in `DynamicJournalForm` integrieren
4. `index.ts` anpassen (UnifiedEntryForm-Export entfernen)

### 7.3 Aktuelle Situation im `diary`-Ordner

| Datei | Grösse | Funktion | Entscheidung |
|-------|--------|----------|--------------|
| `DiaryEntriesAccordion.tsx` | 43 KB | Hauptkomponente Startseite | **Phase 6**: Ersetzen durch JournalEntryCard |
| `DiarySection.tsx` | 20 KB | Formular + Liste Startseite | **Phase 6**: Refactoring |
| `JournalEntrySection.tsx` | 6 KB | Wiederverwendbare Section | **Importieren** in JournalEntryCard |
| `ShareEntryModal.tsx` | 10 KB | Sharing-Modal | **Importieren** in JournalEntryCard |
| `SharedBadge.tsx` | 4 KB | Sharing-Badge | **Importieren** in JournalEntryCard |
| `JournalEntryImage.tsx` | 4 KB | Generated Image | **Importieren** in JournalEntryCard |
| `DiaryContentWithMentions.tsx` | 2 KB | Mention-Rendering | **Importieren** in JournalEntryCard |
| `DiaryAccordion.tsx` | 7 KB | Generisches Akkordeon | **Beibehalten** (generisch) |
| `DiaryInteractionPanel.tsx` | 7 KB | Interaction Panel | **Beibehalten** |
| `ReflectionDueBanner.tsx` | 1 KB | Banner | **Beibehalten** |

### 7.4 Ordnerstruktur-Strategie

**Bis einschliesslich Phase 5**:
- Dateien bleiben an ihren aktuellen Orten
- Import-Pfade werden beibehalten
- Keine Umstrukturierung, um Stabilität zu gewährleisten

**In Phase 6** (nach erfolgreicher Journal-Migration):
- Wiederverwendbare Komponenten aus `diary/` nach `journal/` oder `shared/` verschieben
- `DiaryEntriesAccordion.tsx` und `DiarySection.tsx` entfernen
- `diary/`-Ordner auf Startseiten-spezifische Komponenten reduzieren

**Vorgeschlagene Zielstruktur** (Phase 6):
```
components/features/
├── journal/
│   ├── JournalEntryCard.tsx      # Unified Entry Display
│   ├── DynamicJournalForm.tsx    # Unified Entry Form
│   ├── JournalEntrySection.tsx   # (verschoben aus diary/)
│   ├── FieldRenderer.tsx
│   ├── index.ts
│   └── ...
├── shared/
│   ├── ShareEntryModal.tsx       # (verschoben aus diary/)
│   ├── SharedBadge.tsx           # (verschoben aus diary/)
│   └── ContentWithMentions.tsx   # (umbenannt)
├── diary/
│   ├── DiarySection.tsx          # Stark vereinfacht oder entfernt
│   └── ReflectionDueBanner.tsx
└── ...
```

### 7.5 index.ts Anpassung

**Aktuelle Exports** (`components/features/journal/index.ts`):
```typescript
export { EmojiPickerButton } from './EmojiPickerButton'
export { FieldRenderer } from './FieldRenderer'
export { DynamicJournalForm } from './DynamicJournalForm'
export { TemplateFieldEditor } from './TemplateFieldEditor'
export { TemplateAIConfigEditor } from './TemplateAIConfigEditor'
export { TemplateEditor } from './TemplateEditor'
export { JournalEntryCard } from './JournalEntryCard'
export type { CardMode, JournalEntryCardProps } from './JournalEntryCard'
export { UnifiedEntryForm } from './UnifiedEntryForm'
export type { UnifiedEntryFormProps, FormData as EntryFormData } from './UnifiedEntryForm'
```

**Geplante Anpassung** (nach Phase 5):
- `UnifiedEntryForm` Export entfernen
- `EntryFormData` Type aus `DynamicJournalForm` exportieren
- Dokumentation aktualisieren

---

## 8. Implementierungsreihenfolge

### Phase 1: JournalEntryCard erweitern (1-2 Tage)

> **Fokus**: Nur Anzeige-Features. Bearbeitung erfolgt via `DynamicJournalForm` inline (Phase 4).
> **Details**: Siehe [Phase-1-Implementierungskonzept](2026-02_Phase1_JournalEntryCard_Erweiterung.md)

**Schritt 1.1**: JournalEntrySection refactoren
- `EntryWithRelations` Typ akzeptieren (zusätzlich zu `DayNote`)
- Bestehende Verwendung in `DiaryEntriesAccordion` darf nicht brechen

**Schritt 1.2**: Compact/Expanded Modes
- Compact: Header + Title + Content-Preview + Media-Indikatoren
- Expanded: Alle Sektionen (AI, Content, Audio, Fotos)
- Toggle-Button zum Wechseln

**Schritt 1.3**: Multi-Audio Support (Anzeige)
- `AudioPlayerH5` für alle Audio-Attachments
- Expandierbares **Original-Transkript** pro Audio (Toggle: ▶️ Transkript anzeigen)
- Re-Transkription Button (🔄) → öffnet Modell-Auswahl Dialog
- Keine Upload/Delete Buttons (kommt in Phase 4)

**Schritt 1.4**: Foto-Galerie (Anzeige)
- Thumbnails für alle Foto-Attachments
- Einfache Lightbox (Modal mit Vollbild)
- Keine Upload/Delete Buttons (kommt in Phase 4)

### Phase 2: Panels integrieren (0.5-1 Tag) ✅

> **Hinweis**: Original-Transkript-Anzeige bereits in Phase 1 umgesetzt (expandierbar in Audio-Sektion)
> **Implementiert**: 2026-02-07

**Schritt 2.1**: OCRSourcePanel ✅
- Lazy-load wenn OCR-Quellen vorhanden
- Anzeige und Download der Quell-Dateien
- ⚠️ `onRestoreToContent` → erst in **Phase 4** (erfordert Edit-Mode)

**Schritt 2.2**: Tasks Panel ✅
- JournalTasksPanel importieren
- useTasksForEntry Hook pro Entry in Journal-Page
- Task-Verwaltung (CRUD) im Read-Mode möglich
- Loading-State (Spinner) wenn Tasks noch geladen werden

### Phase 3: Modals & Popups (0.5 Tag) ✅

> **Implementiert**: 2026-02-07

**Schritt 3.1**: Sharing ✅
- ShareEntryModal integrieren
- SharedBadge im Header (compact + full mode)

**Schritt 3.2**: Timestamps ✅
- TimestampModal integrieren
- Button in Actions

**Schritt 3.3**: AI Settings ✅
- AISettingsPopup integrieren (refactored: template-basierte AI-Config statt User-Level)
- Zeigt alle 5 Config-Sections: Content, Analyse, Zusammenfassung, Titel, Audio-Segmentierung
- Link zu `/settings/templates` für Bearbeitung
- Button in Actions

**Schritt 3.4**: Bugfixes & Polish ✅
- Responsive: Sekundäre Actions auf Mobile ausgeblendet im Compact-Modus
- Edge Cases: Entries ohne Audio/OCR/Tasks korrekt behandelt
- Testdaten erweitert (Sharing, OCR, Tasks)
- Unit Tests: SharedBadge (9 Tests), JournalEntryCard (18 Tests)

### Phase 4: DynamicJournalForm erweitern + Inline-Edit (1.5-2 Tage) ✅

> **Implementiert**: 2026-02-23
> Audio-Details: Siehe [Anhang C](#anhang-c-audio-konsolidierung)

**Schritt 4.0**: Inline-Edit Konzept implementieren ✅
- `JournalEntryCard` hat bereits `onEdit` Callback (Phase 2+3), navigiert aktuell zur Detail-Seite
- Umstellen: Klick auf Edit-Button → Parent-Komponente ersetzt Card durch `DynamicJournalForm`
- `DynamicJournalForm` mit `existingEntry` Prop für Edit-Mode
- `onCancel` → zurück zu `JournalEntryCard`
- `onSubmit` → Update, dann zurück zu `JournalEntryCard`
- Keine separate Page-Navigation nötig

**Schritt 4.1**: OCR-Upload + Restore-Funktion ✅
- OCRUploadButton importieren
- onOcrComplete Callback
- **OCR "Restore to content"** (Phase 2 Read-Mode → jetzt mit Edit-Mode verfügbar)

**Schritt 4.2**: Foto-Upload ✅
- Foto-Upload Button
- CameraPicker

**Schritt 4.3**: UnifiedEntryForm konsolidieren ✅
- Relevante Logik aus UnifiedEntryForm in DynamicJournalForm übernommen
- UnifiedEntryForm.tsx **entfernt**
- index.ts angepasst

**Schritt 4.4**: Audio-Core erstellen ✅
- `lib/audio/audioUploadCore.ts` mit shared utilities erstellt
- Types, Validation, Stage-Messages, formatElapsedTime extrahiert
- Upload-Funktionen: `uploadAudioForEntry`, `uploadAudioStandalone`, `transcribeOnly`

**Schritt 4.5**: MicrophoneButton refactoren ✅
- Import audioUploadCore für Upload-Logik
- Neuer einheitlicher Callback: `onResult: (result: AudioUploadResult) => void`
- Legacy-Props `onAudioData`, `onText` als deprecated beibehalten (Backward-Compatibility)

**Schritt 4.6**: AudioUploadButton refactoren ✅
- Import audioUploadCore für Upload-Logik
- Neuer Prop: `existingEntryId?: string` (nutzt dann `/api/journal-entries/[id]/audio`)
- Neuer Prop: `showCapturedAtInput?: boolean` (für manuelle capturedAt-Eingabe)
- Neuer einheitlicher Callback: `onResult: (result: AudioUploadResult) => void`
- Legacy-Prop `onAudioUploaded` als deprecated beibehalten

**Schritt 4.7**: DynamicJournalForm Audio-Integration ✅
- AudioUploadButton mit Segmentierung integriert (Multi-Feld-Templates)
- Unified Callbacks genutzt
- Für neue Einträge: Audio-IDs sammeln, nach Speichern MediaAttachments erstellt

### Phase 5: Journal-Seite Integration & Test (0.5 Tag) ✅

> **Implementiert**: 2026-02-23

**Schritt 5.1**: Journal-Seite vollständig integrieren ✅
- JournalEntryCard mit allen Props (siehe [Anhang B](#anhang-b-props-design-für-journalentrycard))
- Alle Callbacks verbunden
- DynamicJournalForm für Erstellung genutzt
- EditModeWrapper für Inline-Edit implementiert

**Schritt 5.2**: End-to-End Tests ✅
- Eintrag erstellen mit Audio, Foto, OCR
- Eintrag bearbeiten inline
- AI-Pipeline triggern
- Sharing testen
- Template-basierte Einträge testen

### Phase 6: Startseiten-Migration (1-2 Tage)

> **Voraussetzung**: Journal-Seite funktioniert vollständig (Phase 1-5 abgeschlossen) ✅
> **UX-Wünsche W1-W8**: Siehe [Phase 6 UX-Wünsche](2026-02_Phase6_Journal_UX_Wuensche.md) - ✅ alle implementiert

**Schritt 6.1**: DiarySection refactoren
- DiarySection.tsx so anpassen, dass es DynamicJournalForm nutzt
- Bestehende Formular-Logik durch DynamicJournalForm ersetzen

**Schritt 6.2**: DiaryEntriesAccordion ersetzen
- JournalEntryCard statt DiaryEntriesAccordion verwenden
- Alle Callbacks aus DiaryEntriesAccordion in die neue Struktur übernehmen
- Sicherstellen, dass alle Features funktionieren

**Schritt 6.3**: Legacy-APIs entfernen
- `POST /api/diary/upload-audio` entfernen
- `POST /api/notes/[id]/photos` entfernen
- `DELETE /api/photos/[id]` entfernen
- Prüfen ob `/api/diary/retranscribe` noch benötigt wird

**Schritt 6.4**: Komponenten verschieben und aufräumen
- Wiederverwendbare Komponenten aus `diary/` verschieben (siehe [Kapitel 7.4](#74-ordnerstruktur-strategie))
- `DiaryEntriesAccordion.tsx` entfernen
- `index.ts` finalisieren

**Schritt 6.5**: Finale Tests
- E2E-Test: Eintrag auf Startseite erstellen → in Journal-Liste sichtbar
- E2E-Test: Eintrag auf Journal-Seite erstellen → auf Startseite sichtbar
- Prüfe: Keine Console-Errors, keine 404s auf alte APIs

---

## 9. Entscheidungen

Die folgenden Entscheidungen wurden getroffen:

### E1: Startseiten-Migration

**Entscheidung**: **Option B** - JournalEntryCard ersetzt DiaryEntriesAccordion

**Umsetzung**: Als separate **Phase 6** nach erfolgreicher Journal-Seiten-Migration (Phase 1-5).

**Begründung**: Eine einzige Komponenten-Hierarchie für beide Seiten reduziert Wartungsaufwand und garantiert Feature-Parität.

### E2: Template-Felder-Darstellung (READ vs. CREATE/UPDATE)

**Entscheidung**: **Unterschiedliche Darstellung je nach Modus**

**READ-Modus** (Anzeige bestehender Einträge):
- Ein einziges GUI-Element: Markdown-Rendering des gesamten `content`-Feldes
- Feld-Labels erscheinen als Markdown-Überschriften (z.B. `## Feldname`)
- Keine separate strukturierte Feld-Darstellung nötig

**CREATE/UPDATE-Modus** (Neuerstellung und Bearbeitung):
- Separate Eingabefelder mit Labels wie in `DynamicJournalForm`
- Jedes Template-Feld hat ein eigenes Eingabefeld mit Label
- Mikrofon-Button pro Feld für Spracheingabe
- Beim Speichern werden Felder zu Markdown-Content aggregiert

**Begründung**: Dies entspricht dem aktuellen Verhalten in `DynamicJournalForm` (CREATE) und `DiaryEntriesAccordion` (READ) und bietet die beste User Experience für beide Use Cases.

### E3: Audio-Upload API-Route

**Entscheidung**: **Unified Route nutzen** (`/api/journal-entries/[id]/audio`)

**Umsetzung**: 
- Für bestehende Einträge: `MicrophoneButton` mit `existingEntryId` nutzt `/api/journal-entries/[id]/audio`
- Für neue Einträge: Audio-Upload erfolgt nach Speichern des Eintrags
- Legacy-Route `/api/diary/upload-audio` bleibt bis Phase 6 parallel aktiv

**Begründung**: Die neue Route bietet dieselbe Funktionalität (Transkription, MediaAttachment-Erstellung) und ist Teil der Unified API.

### E4: Foto-Upload API-Route

**Entscheidung**: **Generische `/media`-Route mit `role=GALLERY`**

**Umsetzung**:
- Neue Foto-Uploads nutzen `POST /api/journal-entries/[id]/media` mit `{ assetId, role: 'GALLERY' }`
- Keine separate `/photos`-Route erstellen
- Legacy-Route `/api/notes/[id]/photos` bleibt bis Phase 6 parallel aktiv

**Begründung**: Eine generische Media-Route ist flexibler und vermeidet Route-Proliferation. Die `role`-Eigenschaft unterscheidet zwischen Audio (ATTACHMENT), OCR-Quellen (SOURCE) und Fotos (GALLERY).

### E5: Komponenten neu erstellen vs. überarbeiten

**Entscheidung**: **Überarbeiten**

**Umsetzung**: 
- `JournalEntryCard` erweitern (nicht neu schreiben)
- `DynamicJournalForm` erweitern (nicht neu schreiben)
- `UnifiedEntryForm` in `DynamicJournalForm` integrieren und dann entfernen

**Begründung**: Siehe [Kapitel 7.2](#72-entscheidung-überarbeiten-statt-neu-erstellen)

---

## Anhang A: Dateien-Übersicht

> Referenziert in: [Kapitel 7](#7-komponenten-architektur), [Phase 4.4](#phase-4-dynamicjournalform-erweitern-05-tag), [Phase 6.4](#phase-6-startseiten-migration-1-2-tage)

### Phase 1-5: Zu erstellen

| Datei | Phase | Funktion |
|-------|-------|----------|
| `lib/audio/audioUploadCore.ts` | 4 | Shared Audio-Upload-Logik (siehe [Anhang C](#anhang-c-audio-konsolidierung)) |

### Phase 1-5: Zu ändern

| Datei | Phase | Änderungen | Status |
|-------|-------|------------|--------|
| `components/features/journal/JournalEntryCard.tsx` | 1-3 | Erweitern um alle Features aus DiaryEntriesAccordion | ✅ Phase 1-3 |
| `components/features/ai/AISettingsPopup.tsx` | 3 | Refactored: Template-basierte AI-Config, alle 5 Sections | ✅ |
| `app/journal/page.tsx` | 2-3, 5 | Modal-States, Task-Loading, Callbacks; Phase 5: Alle Callbacks verbinden | ✅ Phase 2-3 |
| `lib/services/testDataService.ts` | 3 | Testdaten: Sharing, OCR-Attachments, Tasks mit journalEntryId | ✅ |
| `components/features/journal/DynamicJournalForm.tsx` | 4 | OCR, Foto, Audio vervollständigen; UnifiedEntryForm integrieren | ⏳ |
| `components/features/journal/index.ts` | 4 | UnifiedEntryForm-Export entfernen | ⏳ |
| `components/features/transcription/MicrophoneButton.tsx` | 4 | Refactoring: audioUploadCore nutzen, unified Callback | ⏳ |
| `components/features/media/AudioUploadButton.tsx` | 4 | Refactoring: audioUploadCore nutzen, existingEntryId Support | ⏳ |

### Phase 1-5: Zu entfernen

| Datei | Phase | Grund |
|-------|-------|-------|
| `components/features/journal/UnifiedEntryForm.tsx` | 4 | Logik in DynamicJournalForm integriert |

### Phase 6: Zu ändern

| Datei | Änderungen |
|-------|------------|
| `components/features/diary/DiarySection.tsx` | DynamicJournalForm statt eigenem Formular nutzen |
| `app/page.tsx` | JournalEntryCard statt DiaryEntriesAccordion |

### Phase 6: Zu entfernen

| Datei | Ersetzt durch |
|-------|---------------|
| `components/features/diary/DiaryEntriesAccordion.tsx` | JournalEntryCard |
| `app/api/diary/upload-audio/route.ts` | `/api/journal-entries/[id]/audio` |
| `app/api/notes/[noteId]/photos/route.ts` | `/api/journal-entries/[id]/media` |

### Phase 6: Zu verschieben

| Datei | Von | Nach |
|-------|-----|------|
| `JournalEntrySection.tsx` | `diary/` | `journal/` |
| `ShareEntryModal.tsx` | `diary/` | `shared/` |
| `SharedBadge.tsx` | `diary/` | `shared/` |
| `DiaryContentWithMentions.tsx` | `diary/` | `shared/ContentWithMentions.tsx` |

### Zu importieren (nicht ändern)

| Datei | Import in | Phase |
|-------|-----------|-------|
| `JournalEntrySection.tsx` | JournalEntryCard | 1 |
| `AudioPlayerH5.tsx` | JournalEntryCard | 1 |
| `RichTextEditor.tsx` | JournalEntryCard | 1 |
| `MicrophoneButton.tsx` | JournalEntryCard, DynamicJournalForm | 1, 4 |
| `CameraPicker.tsx` | JournalEntryCard, DynamicJournalForm | 1, 4 |
| `ShareEntryModal.tsx` | JournalEntryCard | 3 |
| `SharedBadge.tsx` | JournalEntryCard | 3 |
| `AISettingsPopup.tsx` | JournalEntryCard | 3 |
| `TimestampModal.tsx` | JournalEntryCard | 3 |
| `JournalTasksPanel.tsx` | JournalEntryCard | 2 |
| `JournalEntryImage.tsx` | JournalEntryCard | 1 |
| `OCRUploadButton.tsx` | DynamicJournalForm | 4 |

---

## Anhang B: Props-Design für JournalEntryCard

> Referenziert in: [Phase 5.1](#phase-5-journal-seite-integration--test-05-tag), [FR-01](#fr-01-unified-entry-display-component)

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

## Anhang C: Audio-Konsolidierung

> Referenziert in: [Phase 4](#phase-4-dynamicjournalform-erweitern-05-tag), [E3](#e3-audio-upload-api-route)

### C.1 Ist-Analyse: Audio-Komponenten und APIs

#### API-Routen (aktueller Stand)

| Route | Funktion | Erstellt MediaAsset | Erstellt MediaAttachment | Transkription |
|-------|----------|---------------------|--------------------------|---------------|
| `/api/transcribe` | Nur Transkription | ❌ | ❌ | ✅ |
| `/api/diary/upload-audio` | Legacy Audio-Upload | ✅ | ❌ | ✅ |
| `/api/journal-entries/[id]/audio` | Unified Audio-Upload | ✅ | ✅ | ✅ |
| `/api/journal-ai/segment-audio` | Transkript-Segmentierung | ❌ | ❌ | ❌ (nutzt vorhandenes) |

**Problem**: `/api/diary/upload-audio` erstellt **kein MediaAttachment**, nur ein loses MediaAsset. Die Verknüpfung zum JournalEntry erfolgt nicht automatisch.

#### Komponenten (aktueller Stand)

| Komponente | Verwendet von | APIs | Features |
|------------|---------------|------|----------|
| `MicrophoneButton` | DiarySection, DiaryEntriesAccordion, DynamicJournalForm, MealNotesSection, MealNotesAccordion, Coach, Reflections | `/api/journal-entries/[id]/audio`, `/api/diary/upload-audio`, `/api/transcribe` | Aufnahme, Pegel-Anzeige, Pause/Resume, Stop, Cancel, Modell-Auswahl |
| `AudioUploadButton` | DiarySection | `/api/diary/upload-audio` | Datei-Upload, Stage-Anzeige, Timer |

**Probleme identifiziert**:
1. `AudioUploadButton` hat **keinen Support** für `/api/journal-entries/[id]/audio`
2. `AudioUploadButton` hat **keine Segmentierung** für Multi-Feld-Templates
3. **Code-Duplizierung** zwischen beiden Komponenten (Timer, Stage-Messages, File-Validation)
4. **Inkonsistente Callbacks**: `onAudioUploaded` vs `onAudioData`
5. `AudioUploadButton` fehlt **capturedAt-Eingabemöglichkeit** vom Benutzer

#### Verwendungs-Matrix

| Komponente | Verwendungsort | keepAudio | existingEntryId | Segmentierung |
|------------|----------------|-----------|-----------------|---------------|
| `MicrophoneButton` | DiarySection (neuer Eintrag) | ✅ | ❌ | ❌ |
| `MicrophoneButton` | DiaryEntriesAccordion (bestehend) | ✅ | ✅ | ❌ |
| `MicrophoneButton` | DynamicJournalForm (pro Feld) | ✅ (wenn date) | ❌ | ❌ (pro Feld) |
| `MicrophoneButton` | MealNotesSection/Accordion | ❌ | ❌ | ❌ |
| `MicrophoneButton` | Coach, Reflections | ❌ | ❌ | ❌ |
| `AudioUploadButton` | DiarySection | ✅ | ❌ | ❌ |

### C.2 Anforderungen an Audio-Funktionalität

#### Kernfunktionen (alle Verwendungsorte)

1. **Aufnahme** mit Pegel-Anzeige, Pause, Stop, Abbrechen
2. **Transkriptionsmodell-Auswahl** (Zahnrad-Menü)
3. **Status-Anzeige** während Upload (uploading, analyzing, transcribing) mit Timer
4. **Transkribierter Text** wird an Callback übergeben

#### JournalEntry-spezifisch

5. **MediaAsset + MediaAttachment** erstellen und mit Entry verknüpfen
6. **Für neue Einträge**: Audio-IDs sammeln, nach Speichern verknüpfen
7. **Für bestehende Einträge**: Direkt via `/api/journal-entries/[id]/audio`

#### Template-spezifisch (Multi-Feld)

8. **Audio-Segmentierung** via `/api/journal-ai/segment-audio` wenn Template >1 Textarea-Feld hat

#### Nur-Transkription (MealNotes, Coach, Reflections)

9. **Keine Speicherung** der Audiodatei
10. Nutzt `/api/transcribe`

#### Audio-Upload-spezifisch

11. **capturedAt** kann vom Benutzer angegeben werden (bei Upload unbekannt wann aufgenommen)
12. **Datei-Upload** statt Live-Aufnahme

### C.3 Konsolidierungs-Strategie

#### Shared Core (`lib/audio/audioUploadCore.ts`) - NEU

Gemeinsame Logik extrahieren:
```typescript
// Shared types
export interface AudioUploadResult {
  text: string
  audioFileId?: string | null
  audioFilePath?: string | null
  capturedAt?: string
  model?: string
  attachmentId?: string // nur bei existingEntryId
}

// Shared utilities
export function formatElapsedTime(seconds: number): string
export function validateAudioFile(file: File): { valid: boolean; error?: string }
export const STAGE_MESSAGES: Record<UploadStage, string>

// Shared upload logic
export async function uploadAudioForEntry(
  file: File | Blob,
  options: {
    entryId: string
    model: string
    fieldId?: string
    appendText?: boolean
  }
): Promise<AudioUploadResult>

export async function uploadAudioStandalone(
  file: File | Blob,
  options: {
    date: string
    time?: string
    model: string
    keepAudio: boolean
    capturedAt?: string
  }
): Promise<AudioUploadResult>

export async function transcribeOnly(
  file: File | Blob,
  model: string
): Promise<{ text: string }>
```

#### MicrophoneButton - Refactoring

**Behalten**:
- Aufnahme-Logik (MediaRecorder)
- Level-Meter
- Pause/Resume/Stop/Cancel UI
- Modell-Auswahl Modal

**Ändern**:
- Nutzt `audioUploadCore` für Upload-Logik
- Einheitlicher Callback: `onResult: (result: AudioUploadResult) => void`

#### AudioUploadButton - Refactoring

**Behalten**:
- Datei-Auswahl UI
- Stage-Anzeige

**Ändern**:
- Nutzt `audioUploadCore` für Upload-Logik
- **Neuer Prop**: `existingEntryId?: string`
- **Neuer Prop**: `showCapturedAtInput?: boolean`
- Einheitlicher Callback: `onResult: (result: AudioUploadResult) => void`

#### DynamicJournalForm - Anpassung

**Für neue Einträge**:
1. MicrophoneButton mit `keepAudio=true, date={date}` (wie jetzt)
2. Audio-IDs werden gesammelt in `audioFileIds` State
3. Nach Submit: `onSubmit` enthält `audioFileIds` und `audioTranscripts`
4. Parent-Komponente erstellt MediaAttachments via `/api/journal-entries/[id]/media`

**Für Audio-Upload mit Segmentierung**:
1. AudioUploadButton transcribes file
2. Wenn Template >1 Feld: Ruft `/api/journal-ai/segment-audio` auf
3. Verteilt Segmente auf Felder

### C.4 Implementierungsschritte (in Phase 4)

**Schritt 4.5**: Audio-Core erstellen
- `lib/audio/audioUploadCore.ts` mit shared utilities
- Types, Validation, Stage-Messages

**Schritt 4.6**: MicrophoneButton refactoren
- Import audioUploadCore
- Callback vereinheitlichen zu `onResult`
- Backward-compatible Props beibehalten (deprecated)

**Schritt 4.7**: AudioUploadButton refactoren
- Import audioUploadCore
- `existingEntryId` Prop hinzufügen
- `showCapturedAtInput` Prop hinzufügen
- Callback vereinheitlichen zu `onResult`

**Schritt 4.8**: DynamicJournalForm Audio-Integration
- AudioUploadButton mit Segmentierung integrieren
- Unified Callbacks nutzen

### C.5 Phase-6-Aufräumarbeiten

| Aktion | Datei/Route |
|--------|-------------|
| Entfernen | `/api/diary/upload-audio/route.ts` |
| Prüfen | `/api/diary/retranscribe` - evtl. in unified Route |
| Anpassen | MicrophoneButton: Legacy-Props entfernen |
| Anpassen | AudioUploadButton: Legacy-Props entfernen |

### C.6 Migrations-Hinweise

**Für bestehende Einträge** mit Audio via `/api/diary/upload-audio`:
- Diese haben MediaAsset aber **kein MediaAttachment**
- Migration-Script könnte nachträglich MediaAttachments erstellen
- ODER: Beim Laden prüfen ob Entity.mediaAttachments existiert, sonst Legacy-Pfad nutzen

### C.7 Erforderliches Migrationsskript

> **WICHTIG**: Vor Phase 6 muss ein Migrationsskript erstellt und ausgeführt werden!

**Ziel**: Bestehende Audio-MediaAssets, die über `/api/diary/upload-audio` erstellt wurden, nachträglich mit MediaAttachments verknüpfen.

**Pfad**: `scripts/migrate-audio-attachments.ts`

**Logik**:
```typescript
// Pseudo-Code für Migration
async function migrateAudioAttachments() {
  // 1. Finde alle JournalEntries mit Entity-Eintrag
  const entries = await prisma.journalEntry.findMany({
    where: { deletedAt: null },
    include: { 
      entity: true,
      mediaAttachments: true 
    }
  })

  // 2. Für jeden Eintrag: Prüfe ob Audio-MediaAssets existieren ohne MediaAttachment
  for (const entry of entries) {
    // Finde MediaAssets die im gleichen Zeitraum erstellt wurden
    // und noch kein MediaAttachment haben
    const orphanedAudioAssets = await prisma.mediaAsset.findMany({
      where: {
        userId: entry.userId,
        mimeType: { startsWith: 'audio/' },
        capturedAt: {
          gte: subMinutes(entry.occurredAt, 5),
          lte: addMinutes(entry.occurredAt, 5)
        },
        // Kein existierendes MediaAttachment
        mediaAttachments: { none: {} }
      }
    })

    // 3. Erstelle MediaAttachments für gefundene Assets
    for (const asset of orphanedAudioAssets) {
      await prisma.mediaAttachment.create({
        data: {
          entityId: entry.id,
          userId: entry.userId,
          assetId: asset.id,
          timeBoxId: entry.timeBoxId,
          role: 'ATTACHMENT',
          displayOrder: 0
        }
      })
    }
  }
}
```

**Ausführung**: 
- Vor Phase 6 im Rahmen von Phase 5 (Testing)
- Mit Backup der Datenbank
- Im Dry-Run-Modus zuerst testen

**Zeitpunkt im Plan**: Phase 5, nach erfolgreichem E2E-Testing der Journal-Seite

---

*Ende des Dokuments*
