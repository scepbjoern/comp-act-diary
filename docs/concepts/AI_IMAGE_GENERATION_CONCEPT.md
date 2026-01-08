# AI Image Generation - Konzeptdokument

Dieses Dokument beschreibt das Feature zur automatischen Bildgenerierung basierend auf Tageszusammenfassungen und Reflexionen.

*Erstellt: Januar 2025*

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

- **Bildgenerierung pro Tag**: Basierend auf der Day Summary (`DayEntry.aiSummary`) wird ein KI-generiertes Bild erstellt
- **Bildgenerierung für Reflexionen**: Auch für Wochen-, Monats- und Jahresreflexionen (TimeBox) können Bilder generiert werden
- **Galerie-Unterstützung**: Mehrere Bilder pro Tag/Reflexion möglich
- **Modellauswahl**: Unterstützung für mehrere together.ai Image-Modelle:
  - `google/flash-image-2.5` (Gemini Flash Image) - **Default**
  - `ByteDance-Seed/Seedream-4.0`
- **Konfigurierbarer Prompt**: User kann in den Settings einen Template-Prompt hinterlegen, der mit der Summary interpoliert wird
- **Einstellbare Auflösung**: Wählbares Seitenverhältnis (16:9, 4:3, 1:1, 9:16) und Grösse
- **AI Pipeline Integration**: Bildgenerierung kann optional in die automatische AI-Pipeline aufgenommen werden (User-Einstellung)
- **Persistente Speicherung**: Bilder werden lokal via MediaAsset gespeichert (URLs von Anbietern sind nicht persistent)

### 1.2 Anzeige

- **Tagesview**: Bild in voller Breite unterhalb des Kalender-Widgets
- **Metadaten**: Modell, Regenerate-Button etc. nur klein rechts unten
- **Reflexionen**: Bild prominent in der Reflexionsansicht

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND (Next.js)                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────┐   ┌────────────────────────────┐   ┌────────────────────────────┐ │
│  │   Calendar       │   │   GeneratedImageGallery    │   │   Settings Page            │ │
│  │   Widget         │   │   ────────────────────────  │   │   ──────────────────────   │ │
│  │                  │   │   - Volle Breite Anzeige   │   │   - Image Model Selection  │ │
│  └────────┬─────────┘   │   - Galerie (mehrere)      │   │   - Prompt Template        │ │
│           │             │   - Metadaten rechts klein │   │   - Aspect Ratio           │ │
│           ▼             │   - Generate/Delete        │   │   - Auto-Generate Toggle   │ │
│  ┌──────────────────┐   └────────────┬───────────────┘   └────────────────────────────┘ │
│  │   DaySummary     │                │                                                  │
│  └──────────────────┘                │                                                  │
│                                      │                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │   Reflexionen (Woche/Monat/Jahr) - Gleiche GeneratedImageGallery-Komponente      │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                                  │
└──────────────────────────────────────┼──────────────────────────────────────────────────┘
                                       │ HTTP API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND (API Routes)                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │   /api/generated-images                                                           │   │
│  │   GET  → List images for entity (entityId query param)                            │   │
│  │   POST → Generate new image for entity                                            │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │   /api/generated-images/[id]                                                      │   │
│  │   GET    → Single image details                                                   │   │
│  │   DELETE → Remove image (+ MediaAsset cleanup)                                    │   │
│  └─────────────────────────────────────────────────────┬────────────────────────────┘   │
│                                                         │                                │
│  ┌──────────────────────────────────────────────────────┼────────────────────────────┐  │
│  │   ImageGenerationService (lib/services/)             │                            │  │
│  │   - buildPrompt(summary, userSettings)               │                            │  │
│  │   - generateImage(prompt, model, dimensions)  ───────┼───► together.ai API        │  │
│  │   - saveImageToMediaAsset(base64) → MediaAsset       │      (response_format:     │  │
│  │   - createGeneratedImage(entityId, assetId, meta)    │       base64)              │  │
│  └──────────────────────────────────────────────────────┴────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │ Prisma ORM
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATABASE (PostgreSQL)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │   GeneratedImage (NEU)                                                              │ │
│  │   + id: String (UUID)                                                               │ │
│  │   + userId: String              → User                                              │ │
│  │   + entityId: String            → Entity (polymorph: DayEntry, TimeBox, etc.)       │ │
│  │   + assetId: String             → MediaAsset (lokale Bilddatei)                     │ │
│  │   + model: String               (z.B. "google/flash-image-2.5")                     │ │
│  │   + prompt: String              (verwendeter Prompt)                                │ │
│  │   + aspectRatio: String         ("16:9", "4:3", etc.)                               │ │
│  │   + steps: Int                  (Generierungsschritte)                              │ │
│  │   + displayOrder: Int           (Reihenfolge in Galerie)                            │ │
│  │   + createdAt: DateTime                                                             │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │   MediaAsset (existiert)                                                            │ │
│  │   + filePath: String            (z.B. "ai-images/2025/01/xyz.png")                  │ │
│  │   + mimeType: String            ("image/png")                                       │ │
│  │   + width/height: Int                                                               │ │
│  │   + thumbnailData: Bytes?       (Base64-Thumbnail)                                  │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │   User.settings (JSON) - imageGenerationSettings                                    │ │
│  │   + modelId: string             // Default: "google/flash-image-2.5"                │ │
│  │   + promptTemplate: string      // Template mit {{summary}} Platzhalter             │ │
│  │   + aspectRatio: string         // "16:9" | "4:3" | "1:1" | "9:16"                  │ │
│  │   + steps: number               // 4-50, Default: 4                                 │ │
│  │   + autoGenerate: boolean       // In AI Pipeline aufnehmen                         │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  EXTERNAL: together.ai                                   │
│   Endpoint: POST https://api.together.xyz/v1/images/generations                          │
│   Request: { model, prompt, width, height, steps, n: 1, response_format: "base64" }      │
│   Response: { data: [{ b64_json: "..." }] }                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponentenbeschreibung

### 3.1 Frontend-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **GeneratedImageGallery** | Zeigt alle generierten Bilder für eine Entity (DayEntry/TimeBox). Volle Breite, Galerie-Modus bei mehreren Bildern. |
| **GeneratedImageCard** | Einzelnes Bild mit Metadaten (klein rechts unten): Modell, Datum, Delete-Button |
| **ImageGenerationSettings** | Settings-Sektion: Model, Prompt, Aspect Ratio, Steps, Auto-Generate Toggle |
| **useGeneratedImages** (Hook) | React Hook für Bild-Logik: fetch, generate, delete |

### 3.2 Backend-Services

| Service | Beschreibung |
|---------|--------------|
| **ImageGenerationService** | Kernlogik: Prompt-Building, together.ai API, MediaAsset-Erstellung, GeneratedImage-Persistenz |
| **lib/imageModels.ts** | Modell-Definitionen und Konstanten |

### 3.3 API-Routen

| Route | Methoden | Beschreibung |
|-------|----------|--------------|
| `/api/generated-images` | GET, POST | Liste für Entity, Neues Bild generieren |
| `/api/generated-images/[id]` | GET, DELETE | Einzelbild, Löschen |

---

## 4. Datenmodell

### 4.1 Neue Tabelle: GeneratedImage

```prisma
/// KI-generiertes Bild für eine Entität (Tag, Reflexion, etc.)
model GeneratedImage {
  /// Eindeutige ID
  id           String   @id @default(uuid())
  /// Besitzer-User
  userId       String
  /// Referenz auf die Entität (via Entity-Registry, polymorph)
  entityId     String
  /// Referenz auf das MediaAsset (lokale Bilddatei)
  assetId      String   @unique
  /// Verwendetes Modell (z.B. "google/flash-image-2.5")
  model        String
  /// Verwendeter Prompt (für Reproduzierbarkeit)
  prompt       String
  /// Seitenverhältnis ("16:9", "4:3", "1:1", "9:16")
  aspectRatio  String
  /// Anzahl Generierungsschritte
  steps        Int
  /// Anzeigereihenfolge in der Galerie
  displayOrder Int      @default(0)
  /// Erstellungszeitpunkt
  createdAt    DateTime @default(now())

  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  entity Entity     @relation(fields: [entityId], references: [id], onDelete: Cascade)
  asset  MediaAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([userId, entityId])
  @@index([entityId, displayOrder])
}
```

### 4.2 Erweiterungen bestehender Modelle

#### User (Relation hinzufügen)
```prisma
model User {
  // ... existing fields ...
  generatedImages GeneratedImage[]
}
```

#### Entity (Relation hinzufügen)
```prisma
model Entity {
  // ... existing fields ...
  generatedImages GeneratedImage[]
}
```

#### MediaAsset (Relation hinzufügen)
```prisma
model MediaAsset {
  // ... existing fields ...
  generatedImage GeneratedImage?
}
```

### 4.3 User.settings Erweiterung (JSON)

```typescript
interface ImageGenerationSettings {
  /** Modell-ID für Bildgenerierung */
  modelId: string  // Default: "google/flash-image-2.5"
  /** Prompt-Template mit {{summary}} Platzhalter */
  promptTemplate: string
  /** Seitenverhältnis */
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16'  // Default: "16:9"
  /** Anzahl Generierungsschritte (4-50) */
  steps: number  // Default: 4
  /** Automatisch in AI Pipeline generieren */
  autoGenerate: boolean  // Default: false
}

interface UserSettings {
  // ... existing fields ...
  imageGenerationSettings?: ImageGenerationSettings
}
```

### 4.4 Design-Entscheidungen

| Entscheidung | Begründung |
|--------------|------------|
| **Separate GeneratedImage-Tabelle** | Ermöglicht Galerie (mehrere Bilder pro Entity), funktioniert für DayEntry UND TimeBox |
| **MediaAsset-Integration** | URLs von together.ai sind nicht persistent; lokale Speicherung erforderlich |
| **Polymorph via Entity** | Einheitliche Lösung für Tage, Reflexionen und zukünftige Erweiterungen |
| **1:1 mit MediaAsset** | Jedes GeneratedImage hat genau ein Asset; Asset-Löschung kaskadiert |

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue Dateien

#### `lib/imageModels.ts`

```typescript
export const IMAGE_MODELS = [
  {
    id: 'google/flash-image-2.5',
    name: 'Gemini Flash Image 2.5',
    provider: 'togetherai',
    defaultSteps: 4,
  },
  {
    id: 'ByteDance-Seed/Seedream-4.0',
    name: 'Seedream 4.0',
    provider: 'togetherai',
    defaultSteps: 4,
  },
] as const

export const ASPECT_RATIOS = {
  '16:9': { width: 1344, height: 768 },
  '4:3':  { width: 1024, height: 768 },
  '1:1':  { width: 1024, height: 1024 },
  '9:16': { width: 768, height: 1344 },
} as const

export const DEFAULT_IMAGE_SETTINGS: ImageGenerationSettings = {
  modelId: 'google/flash-image-2.5',
  promptTemplate: DEFAULT_IMAGE_PROMPT,
  aspectRatio: '16:9',
  steps: 4,
  autoGenerate: false,
}
```

#### `lib/defaultImagePrompt.ts`

```typescript
export const DEFAULT_IMAGE_PROMPT = `Kunstvolles Stillleben, das den Tag symbolisiert. 
Die wichtigsten Elemente aus der folgenden Zusammenfassung als Objekte dargestellt.
Subtile Hinweise auf die Stimmung. Editorial-Illustration, ohne Text.

{{summary}}`

export const IMAGE_PROMPT_VARIABLES = {
  '{{summary}}': 'Die Zusammenfassung des Tages/der Reflexion',
} as const

export function interpolateImagePrompt(template: string, summary: string): string {
  return template.replace('{{summary}}', summary)
}
```

#### `lib/services/imageGenerationService.ts`

Hauptmethoden:
- `generateForEntity(entityId, userId)`: Generiert Bild für Entity
- `buildPrompt(summary, settings)`: Erstellt finalen Prompt
- `callTogetherAI(prompt, model, dimensions)`: API-Aufruf
- `saveToMediaAsset(base64, userId)`: Speichert Bild lokal
- `getSettings(userId)`: Lädt User-Settings mit Defaults

### 5.2 API-Routen

#### `app/api/generated-images/route.ts`

```typescript
// GET: Liste aller Bilder für eine Entity
// Query: ?entityId=xxx
// Response: { images: GeneratedImage[] }

// POST: Neues Bild generieren
// Body: { entityId: string, summaryText?: string }
// Response: { image: GeneratedImage }
```

#### `app/api/generated-images/[id]/route.ts`

```typescript
// GET: Einzelnes Bild mit Details
// DELETE: Bild + MediaAsset löschen
```

### 5.3 Hook

#### `hooks/useGeneratedImages.ts`

```typescript
export function useGeneratedImages(entityId: string | null) {
  return {
    images: GeneratedImage[],
    loading: boolean,
    generating: boolean,
    generateImage: () => Promise<boolean>,
    deleteImage: (id: string) => Promise<boolean>,
    refetch: () => Promise<void>,
  }
}
```

---

## 6. UX (Komponenten und Screens)

### 6.1 Tagesansicht (page.tsx)

**Layout**: Bild in voller Breite, Metadaten minimal

```
┌──────────────────────────────────────────────────────────────────┐
│                        Calendar Widget                            │
└──────────────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                                                                   │
│                    [Generiertes Bild - Volle Breite]              │
│                         16:9 / 4:3 / etc.                         │
│                                                                   │
│                                                                   │
│                                    Gemini Flash · 07.01.25 [🔄][🗑]│
└──────────────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DaySummary                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Galerie-Modus** (bei mehreren Bildern):
- Horizontales Scrolling oder Carousel
- Aktives Bild gross, andere als Thumbnails

### 6.2 Kein Bild vorhanden

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │              [🖼️ Tagesbild generieren]                     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                         (nur wenn Summary da)    │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Settings-Sektion

```
┌──────────────────────────────────────────────────────────────────┐
│ 🖼️ Bildgenerierung                                         [▼]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Modell                                                            │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ▼ Gemini Flash Image 2.5                                   │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│ Prompt-Template                                                   │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Kunstvolles Stillleben, das den Tag symbolisiert...        │   │
│ │ {{summary}}                                                │   │
│ └────────────────────────────────────────────────────────────┘   │
│ ℹ️ Variable: {{summary}} = Zusammenfassung                        │
│                                                                   │
│ Seitenverhältnis              Schritte                           │
│ ○ 16:9  ○ 4:3                 [====●=====] 20                    │
│ ○ 1:1   ○ 9:16                                                   │
│                                                                   │
│ ☑️ Automatisch in AI Pipeline generieren                          │
│                                                                   │
│                                              [Speichern]          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Dependencies

Keine neuen npm-Pakete erforderlich. Das `together-ai` SDK ist bereits vorhanden und unterstützt Image Generation.

---

## 8. Dateistruktur

### 8.1 Neue Dateien

| Pfad | Beschreibung |
|------|--------------|
| `lib/imageModels.ts` | Image-Modell-Definitionen, Aspect Ratios, Defaults |
| `lib/defaultImagePrompt.ts` | Standard-Prompt, Variablen, Interpolation |
| `lib/services/imageGenerationService.ts` | Service-Klasse für Bildgenerierung |
| `hooks/useGeneratedImages.ts` | React Hook für Bild-Logik |
| `components/GeneratedImageGallery.tsx` | Galerie-Komponente |
| `components/GeneratedImageCard.tsx` | Einzelbild-Karte |
| `components/ImageGenerationSettings.tsx` | Settings-Komponente |
| `app/api/generated-images/route.ts` | API: Liste + Generierung |
| `app/api/generated-images/[id]/route.ts` | API: Einzelbild + Delete |

### 8.2 Zu ändernde Dateien

| Pfad | Änderung |
|------|----------|
| `prisma/schema.prisma` | GeneratedImage-Tabelle + Relationen |
| `app/page.tsx` | GeneratedImageGallery einbinden |
| `app/settings/page.tsx` | ImageGenerationSettings-Sektion |
| `lib/services/journalAIService.ts` | AI Pipeline erweitern (optional autoGenerate) |

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Prisma-Schema erweitern

**Ziel**: GeneratedImage-Tabelle + Relationen hinzufügen

**Anforderungen**:
- Neue `GeneratedImage`-Tabelle gemäss Abschnitt 4.1
- Relation zu User, Entity, MediaAsset
- Relationen in User, Entity, MediaAsset ergänzen

---

### Schritt 2 (LLM): Schema auf DB anwenden

**Ziel**: Schema-Änderungen in die Datenbank pushen

**Befehl**: `npx prisma db push` (gemäss SCHEMA_WORKFLOW.md)

---

### Schritt 3 (LLM): Image-Modell-Definitionen erstellen

**Ziel**: `lib/imageModels.ts` + `lib/defaultImagePrompt.ts`

---

### Schritt 4 (LLM): ImageGenerationService erstellen

**Ziel**: `lib/services/imageGenerationService.ts`

**Anforderungen**:
- together.ai API mit `response_format: 'base64'`
- Base64 → lokale Datei speichern
- MediaAsset + GeneratedImage erstellen

---

### Schritt 5 (LLM): API-Routen erstellen

**Ziel**: `/api/generated-images` und `/api/generated-images/[id]`

---

### Schritt 6 (LLM): useGeneratedImages Hook

**Ziel**: `hooks/useGeneratedImages.ts`

---

### Schritt 7 (LLM): UI-Komponenten erstellen

**Ziel**: GeneratedImageGallery, GeneratedImageCard

---

### Schritt 8 (LLM): Hauptseite integrieren

**Ziel**: Komponente in `app/page.tsx` einbinden

---

### Schritt 9 (LLM): Settings-Komponente erstellen

**Ziel**: ImageGenerationSettings

---

### Schritt 10 (LLM): Settings-Seite erweitern

**Ziel**: Settings in `app/settings/page.tsx` einbinden

---

### Schritt 11 (LLM): AI Pipeline Integration

**Ziel**: JournalAIService erweitern für optionale Auto-Generierung

---

### Schritt 12 (Mensch): End-to-End Testing

---

## 10. Automatisiertes Testing

| Test-Datei | Zu testen |
|------------|-----------|
| `__tests__/lib/imageModels.test.ts` | Aspect Ratio Berechnungen |
| `__tests__/lib/defaultImagePrompt.test.ts` | Prompt-Interpolation |
| `__tests__/hooks/useGeneratedImages.test.ts` | Hook-Logik (Mock API) |
| `__tests__/components/GeneratedImageGallery.test.tsx` | Render-States |

---

## 11. Manuelles Testing

### 11.1 Voraussetzungen

- together.ai API-Key in `.env` (`TOGETHERAI_API_KEY`)
- Mindestens ein Tag mit generierter Summary

### 11.2 Test-Szenarien

| # | Szenario | Erwartetes Ergebnis |
|---|----------|---------------------|
| 1 | Bild generieren (Tag mit Summary) | Bild wird in voller Breite angezeigt |
| 2 | Zweites Bild generieren | Galerie-Modus aktiv |
| 3 | Bild löschen | Bild + MediaAsset entfernt |
| 4 | Settings ändern | Neue Settings bei nächster Generierung |
| 5 | Auto-Generate aktivieren | Bild wird bei Summary-Generierung erstellt |
| 6 | Reflexion (Woche) | Bild kann für TimeBox generiert werden |

---

*Dieses Konzeptdokument ist die Grundlage für die Implementierung des AI Image Generation Features.*
