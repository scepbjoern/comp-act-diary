# OCR-Feature: Bilder und PDFs in Tagebucheinträge umwandeln

Dieses Dokument beschreibt das Konzept für die Integration von OCR (Optical Character Recognition) in die Comp-ACT-Diary Applikation. Mit diesem Feature können Benutzer Bilder oder PDFs hochladen, deren Text mittels Mistral OCR extrahiert und als Tagebucheintrag verwendet wird.

*Erstellt: Januar 2025*

---

## Inhaltsverzeichnis

1. [Geplante Features](#1-geplante-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Komponenten-Erläuterung](#3-komponenten-erläuterung)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Neue Dependencies](#7-neue-dependencies)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)
12. [Offene Fragen](#12-offene-fragen)

---

## 1. Geplante Features

### 1.1 Kernfunktionalität

- **Einzelbild-Upload**: Benutzer kann ein einzelnes Bild (JPG, PNG, WEBP) hochladen und den Text via OCR extrahieren
- **Mehrfachbild-Upload**: Benutzer kann mehrere Bilder gleichzeitig hochladen; alle werden zu einem zusammenhängenden Text kombiniert
- **PDF-Upload**: Benutzer kann ein PDF (auch mehrseitig) hochladen; alle Seiten werden via OCR verarbeitet
- **Quellverknüpfung**: Die Original-Dateien bleiben als MediaAsset erhalten und sind mit dem JournalEntry verknüpft
- **AI-Pipeline-Integration**: Der extrahierte OCR-Text wird wie `originalTranscript` behandelt und kann durch die bestehende AI-Pipeline (Content-Verbesserung, Analyse, Zusammenfassung) verarbeitet werden

### 1.2 Unterstützte Formate

| Format | MIME-Type | Beschreibung |
|--------|-----------|--------------|
| JPEG | `image/jpeg` | Fotos, Scans |
| PNG | `image/png` | Screenshots, Dokumente |
| WEBP | `image/webp` | Moderne Bildformate |
| PDF | `application/pdf` | Dokumente, mehrseitige Scans |

### 1.3 Use Cases

1. **Handschriftliche Notizen digitalisieren**: Foto einer handschriftlichen Notiz hochladen → OCR → strukturierter Tagebucheintrag
2. **Briefe/Dokumente archivieren**: Gescanntes PDF eines Briefes → OCR → durchsuchbarer Tagebucheintrag mit Anhang
3. **Screenshots mit Text**: Screenshot einer wichtigen Nachricht → OCR → Tagebucheintrag
4. **Mehrseitige Dokumente**: Mehrseitiges PDF (z.B. Arztbericht) → OCR → strukturierte Zusammenfassung

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      FRONTEND                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐       │
│  │   OCRUploadButton    │    │  OCRUploadModal      │    │  OCRSourcePanel      │       │
│  │  ─────────────────   │    │  ─────────────────   │    │  ─────────────────   │       │
│  │  - Trigger für       │───▶│  - Dateiauswahl      │    │  - Zeigt Original-   │       │
│  │    Modal/Dropdown    │    │  - Vorschau          │    │    dateien an        │       │
│  │  - Icon + Label      │    │  - Fortschritts-     │    │  - Download/Preview  │       │
│  │                      │    │    anzeige           │    │  - Seitenzahlen      │       │
│  └──────────────────────┘    └──────────────────────┘    └──────────────────────┘       │
│                                        │                           ▲                     │
│                                        │ POST /api/ocr/extract     │                     │
│                                        ▼                           │                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                      BACKEND                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────┐       │
│  │                           API Routes (Next.js)                                │       │
│  │  ────────────────────────────────────────────────────────────────────────────│       │
│  │                                                                               │       │
│  │  POST /api/ocr/extract          POST /api/ocr/process-entry                  │       │
│  │  ─────────────────────          ────────────────────────                     │       │
│  │  - Empfängt Datei(en)           - Erstellt JournalEntry                      │       │
│  │  - Speichert als MediaAsset     - Verknüpft MediaAssets                      │       │
│  │  - Ruft OCR Service auf         - Setzt originalTranscript                   │       │
│  │  - Gibt extrahierten Text       - Optional: AI Pipeline                      │       │
│  │    zurück                                                                     │       │
│  │                                                                               │       │
│  └──────────────────────────────────────────────────────────────────────────────┘       │
│                                        │                                                 │
│                                        ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐       │
│  │                           OCR Service (lib/ocr.ts)                            │       │
│  │  ────────────────────────────────────────────────────────────────────────────│       │
│  │                                                                               │       │
│  │  extractTextFromImage()     extractTextFromPDF()     extractTextFromFiles()  │       │
│  │  ──────────────────────     ───────────────────      ────────────────────    │       │
│  │  - Base64 encoding          - Seiten-Handling        - Multi-File Support    │       │
│  │  - Mistral API Call         - Mistral API Call       - Kombiniert Ergebnis   │       │
│  │  - Markdown-Extraktion      - Markdown pro Seite     - Fehlerbehandlung      │       │
│  │                                                                               │       │
│  └──────────────────────────────────────────────────────────────────────────────┘       │
│                                        │                                                 │
│                                        ▼                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                 EXTERNE SERVICES                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────┐       │
│  │                           Mistral AI OCR API                                  │       │
│  │  ────────────────────────────────────────────────────────────────────────────│       │
│  │                                                                               │       │
│  │  Endpoint: POST /v1/ocr                                                       │       │
│  │  Model: mistral-ocr-latest (mistral-ocr-2512)                                │       │
│  │                                                                               │       │
│  │  Input:                           Output:                                     │       │
│  │  - document_url (URL)             - pages[].markdown (Hauptinhalt)           │       │
│  │  - image_url (URL/Base64)         - pages[].images (extrahierte Bilder)      │       │
│  │  - base64 PDF/Image               - pages[].tables (Tabellen)                │       │
│  │                                   - usage_info (Tokens/Kosten)               │       │
│  │                                                                               │       │
│  │  Preis: $2/1000 Seiten (Batch: $1/1000 Seiten)                              │       │
│  │                                                                               │       │
│  └──────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                    DATENBANK                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐                         │
│  │  JournalEntry  │    │  MediaAsset    │    │MediaAttachment │                         │
│  │  ────────────  │    │  ────────────  │    │  ────────────  │                         │
│  │  originalTrans │◄───│  filePath      │◄───│  assetId       │                         │
│  │  cript (OCR)   │    │  mimeType      │    │  entityId      │                         │
│  │  content       │    │  ocrText       │    │  role=SOURCE   │                         │
│  │  sourceType    │    │  ocrMetadata   │    │                │                         │
│  └────────────────┘    └────────────────┘    └────────────────┘                         │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Erläuterung

### 3.1 Frontend-Komponenten

| Komponente | Funktion | Datei |
|------------|----------|-------|
| **OCRUploadButton** | Trigger-Button für OCR-Upload, analog zu `AudioUploadButton`. Zeigt Icon und Label, öffnet Modal oder Dropdown. | `components/OCRUploadButton.tsx` |
| **OCRUploadModal** | Modal-Dialog für Dateiauswahl, Vorschau, Fortschrittsanzeige. Unterstützt Drag & Drop. | `components/OCRUploadModal.tsx` |
| **OCRSourcePanel** | Analog zu `OriginalTranscriptPanel`: Zeigt die Original-Quelldateien (Bilder/PDFs) an, ermöglicht Download und Vorschau. | `components/OCRSourcePanel.tsx` |

### 3.2 Backend-Services

| Service | Funktion | Datei |
|---------|----------|-------|
| **OCR Service** | Kernlogik für OCR-Verarbeitung. Kommuniziert mit Mistral API, verarbeitet Bilder und PDFs, extrahiert Markdown-Text. | `lib/ocr.ts` |
| **JournalAI Service** | Bestehender Service, wird um OCR-Text-Verarbeitung erweitert (keine Änderungen nötig, da `originalTranscript` bereits unterstützt). | `lib/services/journalAIService.ts` |

### 3.3 API-Routen

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/ocr/extract` | POST | Empfängt Dateien, führt OCR durch, speichert MediaAssets, gibt extrahierten Text zurück |
| `/api/ocr/process-entry` | POST | Erstellt JournalEntry mit OCR-Text als `originalTranscript`, verknüpft MediaAssets |

### 3.4 Externer Anbieter: Mistral AI

**Mistral OCR** ist das gewählte OCR-Modell:
- **Modell**: `mistral-ocr-latest` (aktuell `mistral-ocr-2512`)
- **Unterstützte Formate**: PDF, JPEG, PNG, WEBP, GIF
- **Ausgabe**: Strukturiertes Markdown mit Tabellen, Bildern, Hyperlinks
- **Preis**: $2 pro 1000 Seiten ($1 mit Batch-API)
- **SDK**: `@mistralai/mistralai`

---

## 4. Datenmodell

### 4.1 Betroffene Entitäten

#### JournalEntry (bestehend, keine Änderung nötig)

Das Feld `originalTranscript` existiert bereits und wird für Audio-Transkripte verwendet. OCR-Text wird analog gespeichert:

```prisma
model JournalEntry {
  // ... bestehende Felder
  originalTranscript String?  // ← Wird für OCR-Text verwendet
  // ...
}
```

**Vorteil**: Die bestehende AI-Pipeline (`generateContent`, `runPipeline`) funktioniert ohne Änderungen auch mit OCR-Text.

#### MediaAsset (Erweiterung)

Neue optionale Felder für OCR-Metadaten:

```prisma
model MediaAsset {
  // ... bestehende Felder
  
  /// OCR-extrahierter Text (cached, für Suche/Vorschau)
  ocrText       String?
  /// OCR-Metadaten als JSON (Seitenzahl, Konfidenz, etc.)
  ocrMetadata   Json?
  /// OCR-Verarbeitungsstatus
  ocrStatus     OcrStatus?  @default(PENDING)
  /// Zeitpunkt der OCR-Verarbeitung
  ocrProcessedAt DateTime?
  
  // ...
}

/// Status der OCR-Verarbeitung
enum OcrStatus {
  PENDING     /// Noch nicht verarbeitet
  PROCESSING  /// In Bearbeitung
  COMPLETED   /// Erfolgreich abgeschlossen
  FAILED      /// Fehlgeschlagen
  SKIPPED     /// Übersprungen (z.B. kein Text erkannt)
}
```

#### MediaAttachment (bestehend)

Eine neue `MediaRole` wird benötigt:

```prisma
enum MediaRole {
  COVER      /// Titelbild
  GALLERY    /// Galerie-Bild
  ATTACHMENT /// Allgemeiner Anhang
  THUMBNAIL  /// Vorschau
  SOURCE     /// ← NEU: OCR-Quelldatei
}
```

### 4.2 Schema-Änderungen Zusammenfassung

| Entität | Änderung | Migrationstyp |
|---------|----------|---------------|
| `MediaAsset` | +4 Felder (`ocrText`, `ocrMetadata`, `ocrStatus`, `ocrProcessedAt`) | `ALTER TABLE` |
| `MediaRole` enum | +1 Wert (`SOURCE`) | `ALTER TYPE` |
| `OcrStatus` enum | Neu | `CREATE TYPE` |
| `JournalEntry` | Keine Änderung | - |

### 4.3 Entity-Registry

`MediaAsset` ist bereits in der Entity-Registry registriert (`EntityType.MEDIA_ASSET`). Keine Änderungen nötig.

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue Library: `lib/ocr.ts`

```typescript
// Kernfunktionen (Signatur-Übersicht)

interface OcrOptions {
  includeImages?: boolean      // Bilder im Ergebnis extrahieren
  tableFormat?: 'markdown' | 'html' | null
}

interface OcrResult {
  text: string                 // Kombinierter Markdown-Text
  pages: OcrPage[]             // Einzelne Seiten
  usageInfo: OcrUsageInfo      // Token-Verbrauch
}

interface OcrPage {
  index: number
  markdown: string
  images?: OcrImage[]
  tables?: string[]
}

// Hauptfunktionen
export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  options?: OcrOptions
): Promise<OcrResult>

export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options?: OcrOptions
): Promise<OcrResult>

export async function extractTextFromFiles(
  files: Array<{ buffer: Buffer; mimeType: string; filename: string }>,
  options?: OcrOptions
): Promise<OcrResult>
```

### 5.2 API-Routen

#### POST `/api/ocr/extract`

**Request** (FormData):
```
file: File | File[]        // Eine oder mehrere Dateien
options: {                  // Optional, als JSON-String
  includeImages?: boolean
  tableFormat?: string
}
```

**Response**:
```json
{
  "text": "# Extrahierter Text\n\nInhalt...",
  "pages": [
    { "index": 0, "markdown": "..." }
  ],
  "mediaAssetIds": ["uuid-1", "uuid-2"],
  "usageInfo": {
    "pagesProcessed": 2,
    "tokensUsed": 1500
  }
}
```

#### POST `/api/ocr/process-entry`

**Request** (JSON):
```json
{
  "text": "# Extrahierter Text...",
  "mediaAssetIds": ["uuid-1"],
  "date": "2025-01-06",
  "time": "14:30",
  "typeCode": "daily_note",
  "runPipeline": true,
  "pipelineSteps": ["content", "analysis", "summary"]
}
```

**Response**:
```json
{
  "journalEntryId": "uuid-entry",
  "content": "Verbesserter Text...",
  "pipelineResult": { ... }
}
```

### 5.3 Bestehende Services (keine Änderungen)

- `lib/services/journalAIService.ts`: `generateContent()` verwendet bereits `originalTranscript`
- `lib/ai.ts`: LLM-Aufrufe bleiben unverändert

---

## 6. UX (Komponenten und Screens)

### 6.1 Integration in bestehende UI

Der OCR-Upload wird in die bestehende Tagebuch-Eingabe-UI integriert, analog zum Audio-Upload:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tagebucheintrag erstellen                                    [×]      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  [Textfeld für Eintrag]                                         │  │
│  │                                                                  │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────┐  ┌────────┐  ┌────────────┐  ┌────────────────┐          │
│  │  🎤    │  │  📎    │  │  📷 OCR    │  │  ✨ Verbessern │          │
│  │ Audio  │  │ Upload │  │  Scan      │  │                │          │
│  └────────┘  └────────┘  └────────────┘  └────────────────┘          │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  OCR Upload Modal                                               │  │
│  │  ─────────────────                                              │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │                                                          │   │  │
│  │  │     📄  Dateien hierher ziehen                          │   │  │
│  │  │         oder klicken zum Auswählen                       │   │  │
│  │  │                                                          │   │  │
│  │  │     Unterstützt: JPG, PNG, WEBP, PDF                    │   │  │
│  │  │                                                          │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  Ausgewählte Dateien:                                           │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ 📄 scan_001.pdf (3 Seiten)                          [×] │  │  │
│  │  │ 🖼️ foto_notiz.jpg                                    [×] │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  [ ] Text automatisch verbessern (AI Pipeline)                  │  │
│  │                                                                  │  │
│  │  ┌────────────────┐  ┌────────────────┐                        │  │
│  │  │   Abbrechen    │  │  📷 Extrahieren │                        │  │
│  │  └────────────────┘  └────────────────┘                        │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 OCRSourcePanel (bei bestehendem Eintrag)

```
┌────────────────────────────────────────────────────────────────────────┐
│  📷 OCR-Quellen (2 Dateien)                                    [▼]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ ┌────────┐  scan_001.pdf                                        │  │
│  │ │ 📄     │  3 Seiten • 1.2 MB • 06.01.2025                     │  │
│  │ │        │  [Vorschau] [Download]                               │  │
│  │ └────────┘                                                       │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ ┌────────┐  foto_notiz.jpg                                      │  │
│  │ │ 🖼️     │  1920×1080 • 340 KB • 06.01.2025                    │  │
│  │ │        │  [Vorschau] [Download]                               │  │
│  │ └────────┘                                                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Extrahierter Text (Original):                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ # Einkaufsliste                                                  │  │
│  │                                                                  │  │
│  │ - Milch                                                          │  │
│  │ - Brot                                                           │  │
│  │ - Käse                                                           │  │
│  │ ...                                                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Als Inhalt übernehmen] [Kopieren]                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Fortschrittsanzeige

```
┌────────────────────────────────────────────────────────────────────────┐
│  OCR-Verarbeitung läuft...                                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  35%                   │
│                                                                        │
│  ✓ Dateien hochgeladen (2/2)                                          │
│  ◐ OCR-Extraktion läuft... (Seite 1/3)                                │
│  ○ Text zusammenführen                                                 │
│  ○ AI-Verbesserung (optional)                                         │
│                                                                        │
│  Geschätzte Restzeit: ~15 Sekunden                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Neue Dependencies

### 7.1 package.json Ergänzungen

```json
{
  "dependencies": {
    "@mistralai/mistralai": "^1.3.0"
  }
}
```

### 7.2 Umgebungsvariablen

```env
# .env.example - Neue Variablen
MISTRAL_API_KEY=your_mistral_api_key
```

---

## 8. Dateistruktur

### 8.1 Neue Dateien

| Pfad | Funktion |
|------|----------|
| `lib/ocr.ts` | OCR-Service mit Mistral-API-Integration |
| `app/api/ocr/extract/route.ts` | API-Route für OCR-Extraktion |
| `app/api/ocr/process-entry/route.ts` | API-Route für JournalEntry-Erstellung |
| `components/OCRUploadButton.tsx` | Trigger-Button für OCR-Upload |
| `components/OCRUploadModal.tsx` | Modal für Dateiauswahl und Upload |
| `components/OCRSourcePanel.tsx` | Panel zur Anzeige der OCR-Quellen |
| `lib/validators/ocr.ts` | Zod-Schemas für OCR-Requests |
| `__tests__/lib/ocr.test.ts` | Unit-Tests für OCR-Service |

### 8.2 Zu ändernde Dateien

| Pfad | Änderung |
|------|----------|
| `prisma/schema.prisma` | +4 Felder auf MediaAsset, +1 Enum OcrStatus, +1 MediaRole |
| `components/DiaryEntryForm.tsx` (o.ä.) | Integration des OCRUploadButton |
| `.env.example` | +MISTRAL_API_KEY |
| `package.json` | +@mistralai/mistralai Dependency |

---

## 9. Implementierungsplan

### Schritt 1 (Mensch): Mistral API-Key einrichten ✅

**Ziel**: API-Zugang konfigurieren

**Status**: Bereits erledigt

**Durchgeführte Schritte**:
- Mistral AI Account erstellt
- API-Key generiert unter https://console.mistral.ai/
- Key in `.env` als `MISTRAL_API_KEY` eingetragen
- `.env.example` aktualisiert

---

### Schritt 2 (LLM): Prisma-Schema erweitern

**Ziel**: Datenmodell für OCR-Metadaten vorbereiten

**Anforderungen**:
- `OcrStatus` Enum erstellen mit Werten: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `SKIPPED`
- `MediaRole` Enum um `SOURCE` erweitern
- `MediaAsset` Model erweitern um:
  - `ocrText String?` - Extrahierter Text (cached)
  - `ocrMetadata Json?` - Metadaten (Seitenzahl, Konfidenz, etc.)
  - `ocrStatus OcrStatus? @default(PENDING)`
  - `ocrProcessedAt DateTime?`
- Migration erstellen und anwenden

**Tipps**:
- Alle neuen Felder als optional (`?`) definieren für Rückwärtskompatibilität
- Index auf `ocrStatus` für effiziente Abfragen bei Batch-Verarbeitung
- Am Ende mit `npx prisma db push` das neue Schema in die Datenbank bringen und den Prisma Client generieren

---

### Schritt 3 (LLM): OCR-Service implementieren (`lib/ocr.ts`)

**Ziel**: Kernlogik für Mistral OCR API Integration

**Anforderungen**:
- TypeScript-Interfaces für OCR-Input/Output definieren:
  - `OcrOptions`, `OcrResult`, `OcrPage`, `OcrUsageInfo`
- Funktion `extractTextFromImage(buffer, mimeType, options)`:
  - Buffer zu Base64 konvertieren
  - Mistral SDK Client initialisieren
  - `ocr.process()` mit `image_url` Typ aufrufen
  - Markdown aus Response extrahieren
- Funktion `extractTextFromPDF(buffer, options)`:
  - Buffer zu Base64 konvertieren
  - Mistral SDK mit `document` Typ aufrufen
  - Alle Seiten-Markdown zusammenführen
- Funktion `extractTextFromFiles(files, options)`:
  - Mehrere Dateien verarbeiten
  - Ergebnisse kombinieren (Trennzeichen zwischen Dokumenten)
  - Fehlerbehandlung pro Datei
- Konstante `OCR_MODEL = 'mistral-ocr-latest'` exportieren
- Fehlerbehandlung für fehlenden API-Key, Rate-Limits, etc.

**Tipps**:
- Mistral SDK: `import { Mistral } from '@mistralai/mistralai'`
- Base64 für Bilder: `data:${mimeType};base64,${buffer.toString('base64')}`
- Logging mit `console.log` für Debug-Zwecke

---

### Schritt 4 (LLM): Zod-Validierungsschemas (`lib/validators/ocr.ts`)

**Ziel**: Typsichere Validierung für API-Requests

**Anforderungen**:
- Schema `OcrExtractRequestSchema` für `/api/ocr/extract`:
  - Validierung von `options` (optional)
- Schema `OcrProcessEntryRequestSchema` für `/api/ocr/process-entry`:
  - `text: z.string().min(1)`
  - `mediaAssetIds: z.array(z.string().uuid())`
  - `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
  - `time: z.string().regex(/^\d{2}:\d{2}$/).optional()`
  - `typeCode: z.string().default('daily_note')`
  - `runPipeline: z.boolean().default(false)`
  - `pipelineSteps: z.array(z.enum(['content', 'analysis', 'summary'])).optional()`

---

### Schritt 5 (LLM): API-Route `/api/ocr/extract`

**Ziel**: Endpunkt für OCR-Extraktion

**Anforderungen**:
- POST-Handler mit FormData-Verarbeitung
- Dateien aus FormData extrahieren (single oder multiple)
- Validierung: Dateityp (image/*, application/pdf), Dateigrösse (max. 50MB)
- Für jede Datei:
  - `MediaAsset` erstellen mit `filePath`, `mimeType`
  - Datei im Filesystem speichern (analog zu upload-audio)
- OCR-Service aufrufen
- `ocrText` und `ocrStatus` auf MediaAssets aktualisieren
- Response mit extrahiertem Text und MediaAsset-IDs

**Tipps**:
- Ordnerstruktur: `uploads/ocr/{decade}/{year}/{month}/{day}/`
- Dateiname: `{date}_{time}_{uuid}.{ext}`
- Bei Fehlern: `ocrStatus = FAILED`, Fehlermeldung in `ocrMetadata`
- Maximale Dateigrösse: 50MB pro Datei
- Maximale Anzahl Dateien: 20 pro Upload

---

### Schritt 6 (LLM): API-Route `/api/ocr/process-entry`

**Ziel**: JournalEntry aus OCR-Text erstellen

**Anforderungen**:
- POST-Handler mit JSON-Body
- Request mit Zod validieren
- TimeBox für Datum holen/erstellen (bestehende Logik wiederverwenden)
- `JournalEntry` erstellen:
  - `originalTranscript` = OCR-Text
  - `content` = OCR-Text (initial, wird durch Pipeline überschrieben)
  - `typeId` aus `typeCode` ermitteln
- MediaAssets via `MediaAttachment` mit `role = SOURCE` verknüpfen
- Optional: AI-Pipeline ausführen (`journalAIService.runPipeline`)
- Response mit JournalEntry-ID und Pipeline-Ergebnis

---

### Schritt 7 (LLM): OCRUploadButton Komponente

**Ziel**: Trigger für OCR-Modal

**Anforderungen**:
- Props: `date`, `time`, `onOcrComplete(result)`, `disabled`
- Button mit Tabler-Icon (`IconScan` oder `IconFileText`)
- Tooltip mit Beschreibung
- Öffnet OCRUploadModal bei Klick
- Styling konsistent mit `AudioUploadButton`

---

### Schritt 8 (LLM): OCRUploadModal Komponente

**Ziel**: Vollständiger Upload-Dialog

**Anforderungen**:
- Props: `isOpen`, `onClose`, `date`, `time`, `onComplete`
- Drag & Drop Zone mit nativem HTML5 DnD (kein react-dropzone, analog zu Audio-Upload)
- Dateiliste mit:
  - Dateiname, Grösse, Typ-Icon
  - Entfernen-Button pro Datei
  - Vorschau für Bilder (Thumbnail)
- **Keine** Checkbox für AI-Pipeline (analog zu Audio-Upload: standardmässig deaktiviert)
- Fortschrittsanzeige während Upload/OCR
- Fehleranzeige bei Problemen
- Buttons: "Abbrechen", "Extrahieren"
- Nach Erfolg: `onComplete` mit extrahiertem Text aufrufen → Text ins Eingabefeld einfügen

**Tipps**:
- daisyUI Modal-Komponente verwenden
- Dateityp-Validierung client-seitig (accept="image/*,application/pdf")
- Maximale Dateigrösse: 50MB pro Datei
- Maximale Anzahl Dateien: 20

---

### Schritt 9 (LLM): OCRSourcePanel Komponente

**Ziel**: Anzeige der OCR-Quelldateien bei bestehendem Eintrag

**Anforderungen**:
- Props: `journalEntryId`, `onRestoreToContent`
- Lazy Loading der MediaAttachments mit `role = SOURCE`
- Für jede Quelldatei anzeigen:
  - Thumbnail/Icon
  - Dateiname, Grösse, Datum
  - Download-Link
  - Vorschau-Button (Modal mit Bild/PDF)
- Extrahierten OCR-Text anzeigen (aus `originalTranscript`)
- Button "Als Inhalt übernehmen" (analog zu OriginalTranscriptPanel)
- Collapsible Panel (analog zu OriginalTranscriptPanel)

---

### Schritt 10 (LLM): Integration in DiaryEntryForm

**Ziel**: OCR-Upload in bestehende Eingabe-UI einbinden

**Anforderungen**:
- OCRUploadButton neben AudioUploadButton platzieren (analog zu Audio-Upload)
- Bei `onOcrComplete`:
  - Text ins aktuelle Eingabefeld einfügen (Benutzer muss speichern)
- OCRSourcePanel bei bestehenden Einträgen anzeigen (wenn OCR-Quellen vorhanden)

---

### Schritt 11 (LLM): Unit-Tests für OCR-Service

**Ziel**: Automatisierte Tests für Kernlogik

**Anforderungen**:
- Test-Datei: `__tests__/lib/ocr.test.ts`
- Mock für Mistral SDK (keine echten API-Calls)
- Testfälle:
  - `extractTextFromImage` mit gültigem Bild
  - `extractTextFromPDF` mit mehrseitigem PDF
  - `extractTextFromFiles` mit gemischten Dateien
  - Fehlerbehandlung bei ungültigem Dateityp
  - Fehlerbehandlung bei fehlendem API-Key
- Vitest verwenden (bereits im Projekt)

---

### Schritt 12 (LLM): Integration-Tests für API-Routen (optional)

**Ziel**: End-to-End Tests für API

**Anforderungen**:
- Test-Datei: `__tests__/api/ocr.test.ts`
- Testfälle:
  - POST `/api/ocr/extract` mit Bild → MediaAsset erstellt, Text zurück
  - POST `/api/ocr/process-entry` → JournalEntry erstellt
  - Fehler bei ungültiger Eingabe (400)
  - Fehler bei nicht authentifiziert (401)

---

### Schritt 13 (Mensch): End-to-End Testing und Deployment

**Ziel**: Manueller Test des kompletten Flows

**Siehe**: [Abschnitt 11 - Manuelles Testing](#11-manuelles-testing)

---

## 10. Automatisiertes Testing

### 10.1 Unit-Tests (LLM kann selbstständig testen)

| Test | Beschreibung | Kommando |
|------|--------------|----------|
| OCR-Service | Mock-Tests für `extractTextFromImage`, `extractTextFromPDF` | `npm run test:run -- ocr` |
| Zod-Schemas | Validierung von gültigen/ungültigen Inputs | `npm run test:run -- validators` |
| API-Routen | Mock-Tests für Request/Response | `npm run test:run -- api/ocr` |

### 10.2 Testbefehle

```bash
# Alle OCR-Tests ausführen
npm run test:run -- --grep ocr

# Einzelne Test-Datei
npm run test:run -- __tests__/lib/ocr.test.ts

# Mit Coverage
npm run test:run -- --coverage
```

---

## 11. Manuelles Testing

### 11.1 Voraussetzungen

- [ ] `MISTRAL_API_KEY` in `.env` konfiguriert
- [ ] Datenbank-Migration ausgeführt (`npx prisma db push`)
- [ ] Dev-Server läuft (`npm run dev`)

### 11.2 Testszenarien

#### Szenario 1: Einzelbild-Upload

1. Tagebuch-Seite öffnen
2. "OCR Scan" Button klicken
3. Foto eines handschriftlichen Textes auswählen
4. "Extrahieren" klicken
5. **Erwartung**: Text wird extrahiert und im Eingabefeld angezeigt
6. **Prüfen**: MediaAsset in DB erstellt mit `ocrStatus = COMPLETED`

#### Szenario 2: PDF-Upload (mehrseitig)

1. "OCR Scan" Button klicken
2. Mehrseitiges PDF auswählen
3. "Extrahieren" klicken
4. **Erwartung**: Alle Seiten werden verarbeitet, Text zusammengeführt
5. **Prüfen**: Seitentrennung erkennbar im extrahierten Text

#### Szenario 3: Mehrfach-Upload

1. Mehrere Bilder gleichzeitig per Drag & Drop hinzufügen
2. "Extrahieren" klicken
3. **Erwartung**: Alle Bilder werden verarbeitet, Texte kombiniert
4. **Prüfen**: Mehrere MediaAssets erstellt und mit Entry verknüpft

#### Szenario 4: AI-Pipeline Integration

1. Bild mit handschriftlichem Text hochladen
2. Checkbox "Text automatisch verbessern" aktivieren
3. "Extrahieren" klicken
4. **Erwartung**: OCR-Text wird extrahiert, dann durch AI verbessert
5. **Prüfen**: `originalTranscript` ≠ `content`, `analysis` und `aiSummary` gefüllt

#### Szenario 5: OCR-Quellen bei bestehendem Eintrag

1. Eintrag mit OCR-Quellen öffnen
2. "OCR-Quellen" Panel expandieren
3. **Erwartung**: Original-Dateien werden angezeigt
4. Download-Link und Vorschau testen
5. "Als Inhalt übernehmen" testen

#### Szenario 6: Fehlerbehandlung

1. Ungültige Datei (z.B. .exe) hochladen
2. **Erwartung**: Fehlermeldung "Dateityp nicht unterstützt"
3. Sehr grosse Datei (>20MB) hochladen
4. **Erwartung**: Fehlermeldung "Datei zu gross"

### 11.3 Checkliste

| # | Test | Status |
|---|------|--------|
| 1 | Einzelbild JPG | ☐ |
| 2 | Einzelbild PNG | ☐ |
| 3 | PDF (1 Seite) | ☐ |
| 4 | PDF (mehrere Seiten) | ☐ |
| 5 | Mehrere Bilder gleichzeitig | ☐ |
| 6 | Drag & Drop | ☐ |
| 7 | AI-Pipeline Checkbox | ☐ |
| 8 | OCRSourcePanel Anzeige | ☐ |
| 9 | OCRSourcePanel Download | ☐ |
| 10 | OCRSourcePanel "Als Inhalt" | ☐ |
| 11 | Fehler: Ungültiger Dateityp | ☐ |
| 12 | Fehler: Datei zu gross | ☐ |
| 13 | Fehler: Kein API-Key | ☐ |

---

## 12. Entscheidungen (geklärt)

### 12.1 UX-Entscheidungen

| # | Frage | Entscheidung |
|---|-------|-------------|
| 1 | Button-Platzierung | **A**: Neben dem Audio-Upload-Button in der Toolbar |
| 2 | Workflow nach OCR | **A**: Text ins aktuelle Eingabefeld einfügen (analog zu Audio-Upload) |
| 3 | AI-Pipeline Standard | **Nein**: Standardmässig deaktiviert (analog zu Audio-Upload) |

### 12.2 Technische Limits

| # | Frage | Entscheidung |
|---|-------|-------------|
| 4 | Maximale Dateigrösse | **50MB** pro Datei |
| 5 | Maximale Dateianzahl | **20** Dateien pro Upload |
| 6 | OCR-Text cachen | **Nein**: Nur in `originalTranscript` speichern |

### 12.3 Kosten & Limits

| # | Frage | Entscheidung |
|---|-------|-------------|
| 7 | Budget-Limit | **Kein Limit** |
| 8 | Rate-Limiting | **Nein** |

---

*Dieses Dokument ist die Grundlage für die Implementierung des OCR-Features. Bei Änderungen bitte dieses Dokument aktualisieren.*
