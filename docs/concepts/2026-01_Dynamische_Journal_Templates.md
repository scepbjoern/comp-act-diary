# Dynamische Journal-Templates

> Konzept für konfigurierbare Eingabefelder pro JournalEntryType/JournalTemplate

*Erstellt: Januar 2026*  
*Aktualisiert: 28. Januar 2026 (v2 nach Feedback)*

---

## Inhaltsverzeichnis

1. [Beschreibung des geplanten Features](#1-beschreibung-des-geplanten-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Erläuterung der Komponenten](#3-erläuterung-der-komponenten)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Neue Dependencies](#7-neue-dependencies)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Testdaten-Anpassungen](#10-testdaten-anpassungen)
11. [Automatisiertes Testing](#11-automatisiertes-testing)
12. [Manuelles Testing](#12-manuelles-testing)
13. [Offene Fragen](#13-offene-fragen)

---

## 1. Beschreibung des geplanten Features

### Ausgangslage

1. **Reflexionen** (`/reflections`) haben aktuell 4 hardcodierte Felder (changed, gratitude, vows, remarks), die beim Speichern zu einem Markdown-String im `content`-Feld zusammengeführt werden.

2. **Diary-Einträge** haben nur ein Freitext-Feld (`content`), aber zusätzliche DB-Felder wie `analysis`, `aiSummary`, `originalTranscript`.

3. **JournalTemplate** existiert im Datenmodell mit `prompts` (JSON), wird aber noch nicht verwendet.

4. **AI-Konfiguration** (Titel-Generierung, Summary, etc.) ist aktuell pro JournalEntryType in `/settings` konfigurierbar.

### Zielsetzung

1. **Dynamische Felder** pro Template, die im GUI automatisch generiert werden
2. **Mehrere Templates pro JournalEntryType**: Ein Typ hat ein Default-Template + Array auswählbarer Templates
3. **Template direkt im JournalEntry gespeichert**: `templateId` referenziert das verwendete Template
4. **Content-Aggregation**: Alle Feldwerte werden im `content`-Feld als Markdown (H1-Überschriften) gespeichert
5. **Kein fieldsSnapshot**: Bei Template-Änderungen wird Content direkt editierbar + Warnhinweis
6. **Audio-Segmentierung**: KI-basiert mit expliziten ("Nächstes Feld") und impliziten Trennhinweisen
7. **AI-Konfiguration pro Template**: Prompts für Titel, Summary etc. am Template (nicht am Type)
8. **Template-Duplizierung**: Templates inkl. AI-Konfiguration können dupliziert werden
9. **Template-Sharing**: Bei geteilten Einträgen wird Template bei Empfänger importiert
10. **Neue Journal-Seite** `/journal` ersetzt `/reflections` komplett
11. **Feldtypen**: `textarea`, `text`, `number`, `date`, `time` für verschiedene GUI-Elemente

### Beispiele

- **Wertschätzung**: Felder "Björn→AnnaLena", "AnnaLena→Björn", "Austausch"
- **Catch The Thought**: Felder mit Instruktionen und Icons (Emoticons)
- **Diary**: Nur 1 Feld (Freitext), ohne Label/Icon/Instruktion – minimales Template

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐   │
│  │ /settings/templates │     │    /journal         │     │ /day/[date] Panel   │   │
│  │ (Template-Editor)   │     │ (Ersetzt /reflect.) │     │ (Typ-spez. Anzeige) │   │
│  │ + AI-Konfiguration  │     │ + Infinite Scroll   │     │ + Hintergrundfarben │   │
│  └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘   │
│             │                           │                           │               │
│             ▼                           ▼                           ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                    DynamicJournalForm (Shared Component)                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ FieldRenderer│ │FieldRenderer│ │FieldRenderer│ │FieldRenderer│ ...      │   │
│  │  │ (textarea)  │  │ (text)      │  │ (date)      │  │ (time)      │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  │  + EmojiPicker (Frimousse) für Template-Editor                               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
└────────────────────────────────────────┼────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   API LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐             │
│  │ /api/templates     │  │ /api/journal       │  │ /api/journal-ai/   │             │
│  │ CRUD + duplicate   │  │ CRUD Entries       │  │ segment-audio      │             │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘             │
│                                        │                                            │
└────────────────────────────────────────┼────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICES (lib/services/journal/)                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐             │
│  │ templateService.ts │  │ contentService.ts  │  │ segmenterService.ts│             │
│  │ - validate()       │  │ - buildContent()   │  │ - segment()        │             │
│  │ - duplicate()      │  │ - parseContent()   │  │ - detectFields()   │             │
│  │ - importForShare() │  │ - matchFields()    │  │                    │             │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘             │
│                                        │                                            │
└────────────────────────────────────────┼────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATENBANK (PostgreSQL)                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐             │
│  │ JournalEntryType   │  │ JournalTemplate    │  │ JournalEntry       │             │
│  │ - code, name       │  │ - fields (JSON)    │  │ - content          │             │
│  │ - defaultTemplateId│◄─┤ - aiConfig (JSON)  │◄─┤ - templateId       │             │
│  │ - templates[] 1:n  │  │ - typeId (FK)      │  │                    │             │
│  │ - bgColorClass     │  │ - origin           │  │                    │             │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNE DIENSTE                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                                     │
│  │ OpenAI / Together  │  │ Transcription APIs │                                     │
│  │ (Audio-Segment.)   │  │ (Whisper, etc.)    │                                     │
│  └────────────────────┘  └────────────────────┘                                     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Erläuterung der Komponenten

### 3.1 Frontend

| Komponente | Zweck |
|------------|-------|
| **DynamicJournalForm** | Generische Form-Komponente, die basierend auf Template-Fields dynamisch Eingabefelder rendert |
| **FieldRenderer** | Rendert ein einzelnes Feld mit Label, Icon, Instruktion, Textarea, Mikrofon-Button |
| **TemplateEditor** | UI zum Erstellen/Bearbeiten von Templates in den Einstellungen |
| **JournalPage** | Neue Übersichtsseite für alle Journal-Einträge mit Filterung |
| **JournalEntryCard** | Karten-Komponente für einen Eintrag mit Typ-spezifischer Hintergrundfarbe |

### 3.2 Backend

| Komponente | Zweck |
|------------|-------|
| **templateService** | Validierung und Verwaltung von Template-Definitionen |
| **journalService** | Content-Aggregation (Felder → Markdown) und Parsing (Markdown → Felder) |
| **audioSegmenter** | KI-basierte Aufteilung eines Transkripts auf Template-Felder |

### 3.3 Externe Dienste

| Dienst | Zweck |
|--------|-------|
| **OpenAI GPT-4** | Audio-Segmentierung mittels Prompt-Engineering |
| **Transcription APIs** | Bestehende Whisper/Deepgram-Integration für Audio→Text |

---

## 4. Datenmodell

### 4.1 Betroffene Entitäten

#### JournalTemplate (erweitert)

Das bestehende `prompts`-Feld wird durch strukturierte Felder ersetzt:

```prisma
model JournalTemplate {
  id          String         @id @default(uuid())
  userId      String?
  name        String
  description String?
  
  /// Strukturierte Feld-Definitionen als JSON-Array
  /// Format: TemplateField[]
  fields      Json?
  
  /// AI-Konfiguration (Titel, Summary, Analysis Prompts + Modell)
  /// Format: TemplateAIConfig
  aiConfig    Json?
  
  /// Deprecated - Migration zu fields
  prompts     Json?
  
  origin      TaxonomyOrigin @default(USER)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  // Bestehende Relationen
  user            User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  journalEntries  JournalEntry[]
  
  // Relation zum Type: Ein Template gehört zu genau einem Type (one-to-many)
  typeId          String?
  type            JournalEntryType?  @relation("TemplatesForType", fields: [typeId], references: [id])
}
```

**TemplateField-Interface (TypeScript):**

```typescript
interface TemplateField {
  /** Unique ID for field (UUID or slug) */
  id: string
  /** Display label, e.g. "Was hat sich verändert?" - leer für Diary-Template */
  label?: string
  /** Optional icon (emoji), e.g. "🔄" */
  icon?: string
  /** Optional instruction/help text for user (ausgeklappt, klein, ausgegraut) */
  instruction?: string
  /** Field type for different GUI elements */
  type: 'textarea' | 'text' | 'number' | 'date' | 'time'
  /** Is this field required? */
  required?: boolean
  /** Sort order */
  order: number
}
// Hinweis: allowImages entfernt – Bilder werden am Entry angehängt, nicht am Feld
```

**TemplateAIConfig-Interface (TypeScript):**

```typescript
interface TemplateAIConfig {
  /** Model for content improvement (Transkript → verbesserter Text) */
  contentModel?: string
  /** Prompt for content improvement */
  contentPrompt?: string
  /** Model for title generation */
  titleModel?: string
  /** Prompt for title generation */
  titlePrompt?: string
  /** Model for summary generation */
  summaryModel?: string
  /** Prompt for summary generation */
  summaryPrompt?: string
  /** Model for analysis generation (psychologische Analyse) */
  analysisModel?: string
  /** Prompt for analysis generation */
  analysisPrompt?: string
  /** Model for audio segmentation (nur für Multi-Feld-Templates sinnvoll) */
  segmentationModel?: string
  /** Prompt for audio segmentation (kann Verbesserung inkludieren) */
  segmentationPrompt?: string
}
```

**Hinweise zu AI-Config-Feldern**:
- **contentModel/Prompt**: "Verbessern"-Button – korrigiert Transkript (Grammatik, Struktur, Füllwörter)
- **segmentationModel/Prompt**: Nur bei Templates mit >1 Feld sichtbar – kann Verbesserung inkludieren

#### JournalEntryType (erweitert)

```prisma
model JournalEntryType {
  // ... bestehende Felder ...
  
  /// Hintergrundfarbe für Anzeige im DiariesPanel (Tailwind-Klasse)
  bgColorClass    String?
  
  /// Default-Template für diesen Typ (optional)
  defaultTemplateId  String?
  defaultTemplate    JournalTemplate?  @relation("DefaultTemplate", fields: [defaultTemplateId], references: [id])
  
  /// Alle Templates für diesen Typ (one-to-many: Type hat viele Templates)
  templates          JournalTemplate[] @relation("TemplatesForType")
}
```

**Hinweise**:
- Ein Template gehört zu **genau einem** Type (`JournalTemplate.typeId`)
- Ein Type kann **mehrere** Templates haben (`JournalEntryType.templates[]`)
- `hasCustomPage` wird **nicht** benötigt, da `/reflections` durch `/journal` ersetzt wird (404 für alte URL)

#### JournalEntry (unverändert bezüglich neuer Felder)

```prisma
model JournalEntry {
  // ... bestehende Felder bleiben ...
  
  /// Template-Referenz (bereits vorhanden)
  templateId  String?
  template    JournalTemplate? @relation(fields: [templateId], references: [id])
  
  /// Content enthält das aggregierte Markdown (H1-Überschriften)
  content     String
}
```

**Kein `fieldsSnapshot` und kein `fieldValues`** – Begründung:
- Ressourcenschonend: Keine redundanten Daten
- Bei Template-Änderungen: Content wird direkt als Markdown editierbar + Warnhinweis
- Parsing: `parseContentToFields()` extrahiert Felder aus H1-Überschriften

### 4.2 Migrationsstrategie

1. **Neue Felder hinzufügen** via `prisma db push`:
   - `JournalTemplate.aiConfig`
   - `JournalEntryType.bgColorClass`
   - Many-to-many `JournalEntryType.templates`

2. **AI-Konfiguration migrieren**: Von `User.settings.journalAI[typeCode]` zu `JournalTemplate.aiConfig`

3. **System-Templates erstellen**:
   - `diary` (1 Feld ohne Label)
   - `reflection_week` (4 Felder)
   - `reflection_month` (4 Felder)

4. **Bestehende Einträge**: `templateId` setzen basierend auf `typeId`

### 4.3 Umgang mit Feldänderungen

**Problem**: User ändert Template-Felder, bestehende Einträge sehen anders aus.

**Lösung** (ohne Snapshot):

1. **Beim Öffnen eines Eintrags**: `parseContentToFields(content, template.fields)` versucht H1-Überschriften zu matchen
2. **Bei Mismatch** (Felder passen nicht zum Content):
   - Warnhinweis anzeigen: "Die Felder stimmen nicht mit dem Template überein"
   - **Beide anzeigen**: Template-Felder (leer) UND Content als Markdown-Editor
   - User kann Text manuell aus dem Markdown in die Felder verschieben
3. **Vor Template-Änderung/Löschung**: Warnhinweis "Diese Änderung kann bestehende Einträge beeinflussen"

```typescript
// Rendering-Logik
function renderEntry(entry: JournalEntry, template: JournalTemplate | null) {
  if (!template || !template.fields) {
    // Kein Template oder Diary-Template: Content direkt anzeigen
    return { mode: 'single', content: entry.content }
  }
  
  const parsed = parseContentToFields(entry.content, template.fields)
  
  if (!parsed.matched) {
    // Mismatch: Warnhinweis + BEIDE anzeigen (Felder + Fallback-Editor)
    return { 
      mode: 'mismatch',
      warning: 'Felder passen nicht zum Template – bitte Text manuell zuordnen',
      fields: template.fields.map(f => ({ ...f, value: '' })),
      fallbackContent: entry.content 
    }
  }
  
  return { mode: 'matched', fields: parsed.fields }
}
```

### 4.4 Template-Sharing bei geteilten Einträgen

**Problem**: Entry wird mit User B geteilt, aber User B hat das Template nicht.

**Lösung**:

1. Beim Teilen: Prüfen ob Template bei Empfänger existiert (by `name` + `fields` Hash)
2. Falls nicht vorhanden: Template importieren
3. Falls gleichnamiges Template mit anderen Feldern existiert: Import als "Templatename [Username]"

```typescript
async function importTemplateForShare(
  template: JournalTemplate, 
  targetUserId: string,
  sourceUsername: string
): Promise<string> {
  // Check if identical template exists
  const existing = await findMatchingTemplate(targetUserId, template.fields)
  if (existing) return existing.id
  
  // Check for name collision
  const nameExists = await templateNameExists(targetUserId, template.name)
  const newName = nameExists 
    ? `${template.name} [${sourceUsername}]` 
    : template.name
  
  // Create copy for target user
  return await createTemplateCopy(template, targetUserId, newName)
}
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue Services (in `lib/services/journal/`)

> **Hinweis**: Neue Unterordner-Struktur für bessere Organisation

#### `lib/services/journal/templateService.ts`

```typescript
// Template-Verwaltung
export function validateTemplateFields(fields: unknown): TemplateField[]
export function migratePromptsToFields(prompts: string[]): TemplateField[]
export async function duplicateTemplate(templateId: string, userId: string): Promise<JournalTemplate>
export async function importTemplateForShare(
  template: JournalTemplate, 
  targetUserId: string, 
  sourceUsername: string
): Promise<string>
```

#### `lib/services/journal/contentService.ts`

```typescript
// Content-Aggregation und -Parsing mit H1-Überschriften
export function buildContentFromFields(
  fields: TemplateField[], 
  values: Record<string, string>
): string

export function parseContentToFields(
  content: string, 
  fields: TemplateField[]
): { matched: boolean; fields: ParsedField[] }

// Beispiel-Output von buildContentFromFields:
// "# Was hat sich verändert?\n\nText für Feld 1\n\n# Wofür bin ich dankbar?\n\nText für Feld 2"

// Für Diary-Template (1 Feld ohne Label): Content wird direkt ohne H1 verwendet
```

#### `lib/services/journal/segmenterService.ts`

```typescript
// KI-basierte Audio-Segmentierung
export async function segmentTranscriptByFields(
  transcript: string,
  fields: TemplateField[],
  options: { 
    model?: string
    prompt?: string  // Custom Prompt aus Template.aiConfig
  }
): Promise<{
  segments: Record<string, string>
  warning?: string  // Falls unvollständige Segmentierung
}>

// Segmentierungs-Logik:
// 1. Explizite Marker erkennen: "Nächstes Feld", "Feld 1", Feld-Labels
// 2. Implizite Erkennung via KI-Prompt (Fallback)
// 3. Nicht zuordbarer Text → letztes Feld + Warnung
```

### 5.2 Audio-zu-Text Workflows

Je nach Template-Typ und Eingabemethode unterscheiden sich die Workflows:

#### Workflow A: Normale Diary-Einträge (1-Feld-Template)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Audio       │───►│ Transkript  │───►│ Verbessern  │───►│ Analyse/    │
│ (Mikrofon/  │    │ (Whisper    │    │ (content-   │    │ Summary     │
│ Upload)     │    │ etc.)       │    │ Prompt)     │    │ (optional)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                         │                   │
                         ▼                   ▼
                   Unverbesserter     Verbesserter Text
                   Text in Textarea   ersetzt Textarea
```

- **Transkription**: Automatisch nach Aufnahme/Upload
- **Verbessern**: Manuell via "✨ Verbessern"-Button oder Teil der AI-Pipeline
- **Content-Prompt**: Korrigiert Grammatik, Struktur, entfernt Füllwörter

#### Workflow B: Multi-Feld-Template + Mikrofon bei Feld

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐
│ 🎤 Mikrofon │───►│ Transkript  │───►│ Unverbesserter Text wird in    │
│ bei Feld X  │    │ (Whisper)   │    │ Feld X eingefügt               │
└─────────────┘    └─────────────┘    └─────────────────────────────────┘
                                                      │
                                                      ▼
                                      ┌─────────────────────────────────┐
                                      │ "Verbessern" betrifft gesamten  │
                                      │ Content (alle Felder)           │
                                      └─────────────────────────────────┘
```

- **Keine Segmentierung**: Text geht direkt ins angeklickte Feld
- **Verbessern**: Optional, betrifft gesamten aggregierten Content

#### Workflow C: Multi-Feld-Template + Audio-Upload

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 📁 Audio    │───►│ Transkript  │───►│ Segmentie-  │───►│ Analyse/    │
│ Upload      │    │ (Whisper)   │    │ rung + Ver- │    │ Summary     │
└─────────────┘    └─────────────┘    │ besserung   │    │ (optional)  │
                                      └─────────────┘    └─────────────┘
                                             │
                                             ▼
                                      Felder werden automatisch
                                      befüllt (verbessert)
```

- **Segmentierungs-Prompt**: Enthält Verbesserung, z.B.:
  ```
  Teile das folgende Transkript auf die Felder auf und verbessere dabei:
  - Korrigiere Grammatik (Schweizer Rechtschreibung)
  - Entferne Füllwörter
  - Strukturiere in Absätze
  
  Felder: {{fieldLabels}}
  Transkript: {{transcript}}
  ```

#### Standard-Content-Prompt

```
Du bist ein professioneller Texteditor. Verbessere das folgende Transkript:
- Korrigiere Grammatik und Rechtschreibung (Schweizer Rechtschreibung mit ss)
- Strukturiere den Text in sinnvolle Absätze
- Verwende Markdown für Formatierung (Überschriften, Listen wo sinnvoll)
- Behalte den persönlichen Stil und alle Inhalte bei
- Entferne Füllwörter und Wiederholungen

Datum des Eintrags: {{date}}
Eintragstyp: {{entryType}}

Gib nur den verbesserten Text zurück, ohne Erklärungen.
```

### 5.3 Neue API-Routen

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/templates` | GET | Liste aller Templates (System + User) |
| `/api/templates` | POST | Neues Template erstellen |
| `/api/templates/[id]` | GET | Einzelnes Template abrufen |
| `/api/templates/[id]` | PATCH | Template aktualisieren |
| `/api/templates/[id]` | DELETE | Template löschen (mit Warnung) |
| `/api/templates/[id]/duplicate` | POST | Template duplizieren inkl. AI-Config |
| `/api/journal` | GET | Journal-Einträge mit Filterung (Typ, Datum, Suche) |
| `/api/journal` | POST | Neuen Eintrag erstellen mit Template |
| `/api/journal/[id]` | GET | Einzelnen Eintrag abrufen |
| `/api/journal/[id]` | PATCH | Eintrag aktualisieren |
| `/api/journal/[id]` | DELETE | Eintrag löschen |
| `/api/journal-ai/segment-audio` | POST | Audio-Transkript auf Felder aufteilen |

### 5.3 Bestehende Routen anpassen/entfernen

| Route | Änderung |
|-------|----------|
| `/api/reflections` | **Entfernen** – durch `/api/journal` ersetzt |
| `/api/reflections/[id]` | **Entfernen** – durch `/api/journal/[id]` ersetzt |
| `/api/day/[id]/notes` | Unterstützung für `templateId` hinzufügen |
| `/api/admin/journal-ai` | **Entfernen** – AI-Config ist neu pro Template |

---

## 6. UX (Komponenten und Screens)

### 6.1 Neue Komponenten

#### DynamicJournalForm

```
┌─────────────────────────────────────────────────────────────────┐
│  Typ: [Reflexion ▼]  Template: [Wochenreflexion ▼]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔄 Was hat sich verändert?                           [🎤] [✨] │
│  Beschreibe die Veränderungen seit letzter Woche.               │
│  Was ist anders? Was hast du gelernt?        (klein, ausgegraut)│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │ (Textarea mit Cursor)                                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🙏 Wofür bin ich dankbar?                            [🎤] [✨] │
│  Nenne 3 Dinge, für die du diese Woche               (klein)   │
│  dankbar bist.                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │ (Textarea)                                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [🎵 Audio hochladen]  [📷 Bild hinzufügen]                    │
│  (Audio wird automatisch auf Felder aufgeteilt)                 │
│  (Bild wird an Cursor-Position als Markdown-Link eingefügt)    │
│                                                                 │
│  ⚠️ Segmentierung unvollständig. Bitte prüfen.     (bei Bedarf)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Hinweise**:
- Instruktionen sind **standardmässig ausgeklappt**, aber **kleiner und ausgegraut** (text-sm text-base-content/60)
- Instruktionen haben **keine Umrandung**
- **"Bild hinzufügen"** immer unten für den gesamten Entry (nicht feldbezogen)
- Bild wird an **Cursor-Position** als Markdown-Link eingefügt, aber mit Entry verlinkt (nicht Feld)
- Für Diary-Template (1 Feld ohne Label): Nur Textarea, kein Header
- Bei Template-Mismatch: Warnhinweis + beide anzeigen (Felder + Fallback-Editor)

#### TemplateEditor (Einstellungen)

```
┌─────────────────────────────────────────────────────────────────┐
│  Template bearbeiten: Wertschätzung        [Duplizieren] [🗑️]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name: [Wertschätzung                                       ]   │
│  Beschreibung: [Tägliche Wertschätzung zu zweit             ]   │
│  Für Typ: [Wertschätzung ▼]                                     │
│                                                                 │
│  ── Felder ──────────────────────────────────────────────────   │
│                                                                 │
│  [≡] Feld 1                                            [🗑️]    │
│      Typ:   [textarea ▼]                                       │
│      Label: [Wertschätzung Björn → AnnaLena             ]      │
│      Icon:  [💝] [😀 Emoji-Picker]                             │
│      Instruktion: [Was schätzt du heute an ihr?         ]      │
│      Pflichtfeld: [✓]                                          │
│                                                                 │
│  [≡] Feld 2                                            [🗑️]    │
│      Typ:   [textarea ▼]                                       │
│      Label: [Wertschätzung AnnaLena → Björn             ]      │
│      Icon:  [💝] [😀 Emoji-Picker]                             │
│      Instruktion: [Was schätzt sie heute an dir?        ]      │
│      Pflichtfeld: [✓]                                          │
│                                                                 │
│  [+ Feld hinzufügen]                                           │
│                                                                 │
│  ── AI-Konfiguration ────────────────────────────────────────   │
│                                                                 │
│  Content-Verbesserung (Transkript → Text):                      │
│    Modell: [gpt-4o-mini ▼]                                     │
│    Prompt: [Du bist ein professioneller Texteditor...  ]      │
│                                                                 │
│  Titel-Generierung:                                             │
│    Modell: [gpt-4o-mini ▼]                                     │
│    Prompt: [Generiere einen kurzen Titel...            ]      │
│                                                                 │
│  Zusammenfassung:                                               │
│    Modell: [gpt-4o-mini ▼]                                     │
│    Prompt: [Fasse den Inhalt zusammen...               ]      │
│                                                                 │
│  Analyse (psychologisch):                                       │
│    Modell: [gpt-4o ▼]                                          │
│    Prompt: [Analysiere den Eintrag psychologisch...    ]      │
│                                                                 │
│  Audio-Segmentierung: (nur bei >1 Feld sichtbar)               │
│    Modell: [gpt-4o ▼]                                          │
│    Prompt: [Teile das Transkript auf... (inkl. Verbesserung)]  │
│                                                                 │
│  ⚠️ Änderungen können bestehende Einträge beeinflussen.        │
│                                                                 │
│                                    [Abbrechen] [Speichern]      │
└─────────────────────────────────────────────────────────────────┘
```

**Hinweise**:
- **Emoji-Picker**: Frimousse-Integration für Icon-Auswahl
- **Feldtypen**: textarea, text, number, date, time
- **AI-Konfiguration**: Pro Template (Content, Titel, Summary, Analyse, Segmentierung)
- **Content-Verbesserung**: "Verbessern"-Button verwendet diesen Prompt
- **Audio-Segmentierung**: Nur sichtbar wenn Template >1 Feld hat, inkludiert Verbesserung
- **Duplizieren-Button**: Kopiert Template inkl. AI-Config

#### JournalPage (/journal) – ersetzt /reflections

```
┌─────────────────────────────────────────────────────────────────┐
│  Journal                                                   [?]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [Alle Typen ▼] [Jan 2026 ▼] - [Jan 2026 ▼]  [🔍    ] │
│                                                                 │
│  [+ Neuer Eintrag]                      [Alle zuklappen/öffnen] │
│                                                                 │
│  ── 15. Januar 2026 ─────────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Tagebuch                    14:30    [✏️][🤖][⋮][🗑️] │   │
│  │                                                         │   │
│  │ Heute war ein produktiver Tag. Ich habe viel            │   │
│  │ geschafft und fühle mich gut. Das Wetter war            │   │
│  │ sonnig und ich konnte einen Spaziergang machen...       │   │
│  │                                                 [mehr]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💝 Wertschätzung               21:00    [✏️][🤖][⋮][🗑️] │   │
│  │                                                         │   │
│  │ # Björn → AnnaLena                                      │   │
│  │ Danke für deine Geduld heute...                         │   │
│  │                                                         │   │
│  │ # AnnaLena → Björn                                      │   │
│  │ Ich schätze, dass du...                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── 14. Januar 2026 ─────────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📅 Wochenreflexion KW 2        09:00    [✏️][🤖][⋮][🗑️] │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  (Infinite Scroll - lädt automatisch beim Scrollen)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Schaltflächen pro Eintrag** (wie im DiariesPanel):
- **✏️ Editieren**: Öffnet DynamicJournalForm im Edit-Modus
- **🤖 AI-Pipeline**: Wendet AI-Pipeline an (Titel, Summary, Analyse)
- **⋮ Mehr**: Dropdown mit weiteren Aktionen (Teilen, Exportieren, etc.)
- **🗑️ Löschen**: Soft-Delete mit Bestätigung

**Hinweise**:
- **Infinite Scroll**: Automatisches Nachladen beim Scrollen (kein "Mehr laden"-Button)
- **Vollständig aufgeklappt**: Alle Einträge zeigen kompletten Inhalt
- **Toggle**: Button zum Zu-/Aufklappen aller Einträge
- **Sortierung**: Standardmässig nach Datum (neueste zuerst)
- **Gruppierung**: Nach Datum gruppiert
- **/reflections → 404**: Alte URL zeigt 404 (kein Redirect)

### 6.2 DiariesPanel-Erweiterung (Tagesansicht)

Einträge verschiedener Typen werden mit unterschiedlichen Hintergrundfarben angezeigt (via `JournalEntryType.bgColorClass`):

| Typ | Farbe | Tailwind-Klasse |
|-----|-------|-----------------|
| diary | Standard | `bg-base-200` |
| reflection_week | Grün | `bg-emerald-900/20` |
| reflection_month | Blau | `bg-blue-900/20` |
| Benutzerdefiniert | Konfigurierbar | `bg-{color}-900/20` |

### 6.3 Settings-Integration

In `/settings` wird ein neuer Link hinzugefügt:

```
┌─────────────────────────────────────────────────────────────────┐
│  Einstellungen                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▸ Profil                                                       │
│  ▸ Transkription                                                │
│  ▸ **Journal-Templates** ← NEU (Link zu /settings/templates)   │
│  ▸ Datenschutz                                                  │
│  ...                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Hilfeseiten-Anpassungen

Neue/aktualisierte Hilfeseiten unter `/help/...`:

| Seite | Inhalt |
|-------|--------|
| `/help/journal` | Übersicht Journal-Funktionen, ersetzt `/help/reflections` |
| `/help/templates` | Wie man Templates erstellt und bearbeitet |
| `/help/audio-segmentation` | Wie Audio-Dateien auf Felder aufgeteilt werden |

---

## 7. Neue Dependencies

### Erforderlich

| Package | Version | Zweck |
|---------|---------|-------|
| `frimousse` | `^0.1.x` | Emoji-Picker für Template-Editor (lightweight, unstyled, shadcn/ui-kompatibel) |

**Installation:**
```bash
npm install frimousse
```

### Bestehende Technologien (unverändert)

- React Hook Form für Formulare
- Zod für Validierung
- Vercel AI SDK für Audio-Segmentierung
- Bestehende Transcription-Infrastruktur
- `@tabler/icons-react` für Icons (neben Emojis)

### Warum Frimousse?

- **Lightweight**: Kleiner Bundle-Size (~15KB)
- **Unstyled**: Passt sich an bestehendes Design an
- **Composable**: Kann in Popover integriert werden
- **shadcn/ui-kompatibel**: Kann als shadcn-Komponente installiert werden

---

## 8. Dateistruktur

### Neue Dateien

```
lib/
  services/
    journal/                      # Neuer Unterordner für Journal-Services
      templateService.ts          # Template-Verwaltung, Validierung, Duplizierung
      contentService.ts           # Content-Aggregation (H1) und -Parsing
      segmenterService.ts         # KI-basierte Audio-Segmentierung

components/
  features/
    journal/
      DynamicJournalForm.tsx      # Generisches Formular für Templates
      FieldRenderer.tsx           # Einzelfeld-Renderer (textarea, text, date, time, number)
      JournalEntryCard.tsx        # Karten-Komponente für Übersicht
      TemplateEditor.tsx          # Template-Bearbeitungs-UI inkl. AI-Config
      TemplateFieldEditor.tsx     # Einzelfeld-Editor im Template
      EmojiPickerButton.tsx       # Frimousse-Integration für Icon-Auswahl
      TemplateAIConfigEditor.tsx  # AI-Konfiguration pro Template

app/
  journal/
    page.tsx                      # Neue Journal-Übersichtsseite (ersetzt /reflections)
    
  settings/
    templates/
      page.tsx                    # Template-Verwaltungsseite
      
  api/
    templates/
      route.ts                    # GET/POST Templates
      [id]/
        route.ts                  # GET/PATCH/DELETE einzelnes Template
        duplicate/
          route.ts                # POST Template duplizieren
    
    journal/
      route.ts                    # GET/POST Journal-Einträge
      [id]/
        route.ts                  # GET/PATCH/DELETE einzelner Eintrag
    
    journal-ai/
      segment-audio/
        route.ts                  # Audio-Transkript auf Felder aufteilen

types/
  journal.ts                      # TemplateField, TemplateAIConfig, ParsedField

lib/
  help/
    content/
      journal.md                  # Hilfe: Journal-Funktionen
      templates.md                # Hilfe: Template-Erstellung
      audio-segmentation.md       # Hilfe: Audio-Segmentierung
```

### Zu ändernde Dateien

```
prisma/
  schema.prisma                   # JournalTemplate: fields, aiConfig
                                  # JournalEntryType: bgColorClass, templates[]
                                  # Keine Änderungen an JournalEntry

lib/
  services/
    testDataService.ts            # Neue Template-Testdaten
    journalEntryAccessService.ts  # Template-Import bei Sharing
    
prisma/
  seed.ts                         # System-Templates: diary, reflection_week, reflection_month

components/
  features/
    diary/
      DiariesPanel.tsx            # Typ-spezifische Hintergrundfarben (bgColorClass)
      DiarySection.tsx            # Integration DynamicJournalForm
      
  layout/
    HeaderClient.tsx              # Navigation: /reflections → /journal

app/
  settings/
    page.tsx                      # Link zu /settings/templates hinzufügen

lib/
  help/
    helpStructure.ts              # Neue Hilfeseiten registrieren
```

### Zu entfernende Dateien/Routen

```
app/
  reflections/
    page.tsx                      # ENTFERNEN – durch /journal ersetzt
    
  api/
    reflections/
      route.ts                    # ENTFERNEN – durch /api/journal ersetzt
      [id]/
        route.ts                  # ENTFERNEN – durch /api/journal/[id] ersetzt
        
    admin/
      journal-ai/
        route.ts                  # ENTFERNEN – AI-Config ist neu pro Template
```

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Datenmodell erweitern

**Ziel**: Schema-Änderungen für Templates und Types

- `JournalTemplate.fields` (JSON) hinzufügen
- `JournalTemplate.aiConfig` (JSON) hinzufügen
- `JournalEntryType.bgColorClass` hinzufügen
- Many-to-many Relation `JournalEntryType.templates`
- `prisma db push` ausführen

### Schritt 2 (LLM): TypeScript-Interfaces und Zod-Schemas

**Ziel**: Typsichere Definitionen

- `types/journal.ts`:
  - `TemplateField` (id, label?, icon?, instruction?, type, required?, order, allowImages?)
  - `TemplateAIConfig` (titleModel, titlePrompt, summaryModel, etc.)
  - `ParsedField` (für Content-Parsing)
- Zod-Schemas für API-Validierung

### Schritt 3 (LLM): lib/services/journal/ Ordner erstellen

**Ziel**: Neue Service-Struktur

- `templateService.ts`: validateTemplateFields(), duplicateTemplate(), importTemplateForShare()
- `contentService.ts`: buildContentFromFields() mit H1, parseContentToFields()
- `segmenterService.ts`: segmentTranscriptByFields() mit expliziter/impliziter Erkennung
- Unit-Tests für contentService

### Schritt 4 (LLM): API-Routen für Templates

**Ziel**: CRUD + Duplizierung

- `/api/templates` GET (System + User), POST
- `/api/templates/[id]` GET, PATCH (nur eigene), DELETE (mit Warnung)
- `/api/templates/[id]/duplicate` POST
- Authentifizierung und Autorisierung

### Schritt 5 (LLM): EmojiPickerButton-Komponente

**Ziel**: Frimousse-Integration

- `npm install frimousse`
- Popover mit Emoji-Picker
- Callback für gewähltes Emoji

### Schritt 6 (LLM): FieldRenderer-Komponente

**Ziel**: Dynamisches Feld-Rendering

- Unterstützung für: textarea, text, number, date, time
- Instruktion standardmässig ausgeklappt
- Icon + Label-Anzeige
- MicrophoneButton + InlineImproveButton pro Feld
- Optional: Bild-Upload Button (allowImages)
- Accessibility (ARIA-Labels)

### Schritt 7 (LLM): DynamicJournalForm-Komponente

**Ziel**: Generisches Formular

- Props: template, values, onChange, onSubmit
- Typ-Auswahl → Template-Auswahl (Default zuerst)
- Audio-Upload für gesamten Eintrag → Segmentierung
- Warnung bei unvollständiger Segmentierung
- Warnung bei Template-Mismatch → Fallback Markdown-Editor

### Schritt 8 (LLM): TemplateFieldEditor-Komponente

**Ziel**: Einzelfeld-Editor für Template-Editor

- Feldtyp-Dropdown (textarea, text, number, date, time)
- Label, Icon (mit EmojiPicker), Instruktion
- Pflichtfeld-Toggle, Bilder-erlauben-Toggle
- Drag-Handle für Reihenfolge

### Schritt 9 (LLM): TemplateAIConfigEditor-Komponente

**Ziel**: AI-Konfiguration pro Template

- Titel-Generierung: Modell + Prompt
- Zusammenfassung: Modell + Prompt
- Analyse: Modell + Prompt
- Audio-Segmentierung: Modell + Prompt

### Schritt 10 (LLM): TemplateEditor-Komponente

**Ziel**: Komplett-UI für Template-Bearbeitung

- Name, Beschreibung, Typ-Zuordnung
- Liste der Felder (TemplateFieldEditor)
- Drag & Drop für Reihenfolge
- AI-Konfiguration (TemplateAIConfigEditor)
- Duplizieren-Button, Löschen-Button (mit Warnung)
- Speichern/Abbrechen

### Schritt 11 (LLM): Template-Verwaltungsseite

**Ziel**: `/settings/templates`

- Liste aller Templates (System read-only, User editierbar)
- "Neues Template"-Button
- Bearbeiten/Duplizieren/Löschen-Aktionen
- Link in `/settings` hinzufügen

### Schritt 12 (LLM): Journal-API

**Ziel**: `/api/journal` ersetzt `/api/reflections`

- GET: Filterung (typeCode, dateFrom, dateTo, search), Pagination (cursor-based)
- POST: Neuer Eintrag mit templateId, Content-Aggregation
- `/api/journal/[id]` GET, PATCH, DELETE

### Schritt 13 (LLM): Journal-Übersichtsseite

**Ziel**: `/journal` ersetzt `/reflections`

- Typ-Filter, Datumsbereich-Filter, Suche
- Infinite Scroll (automatisches Nachladen)
- Einträge vollständig aufgeklappt, Toggle zum Zu-/Aufklappen
- Gruppierung nach Datum
- "Neuer Eintrag"-Button → Typ/Template-Auswahl

### Schritt 14 (LLM): Audio-Segmentierung

**Ziel**: `/api/journal-ai/segment-audio`

- Transkript + Template-Felder als Input
- Explizite Marker erkennen ("Nächstes Feld", Feld-Labels)
- Implizite Erkennung via KI-Prompt (Fallback)
- Nicht zuordbarer Text → letztes Feld + Warnung
- Prompt aus Template.aiConfig.segmentationPrompt

### Schritt 15 (LLM): DiariesPanel-Erweiterung

**Ziel**: Typ-spezifische Anzeige

- Hintergrundfarbe aus `JournalEntryType.bgColorClass`
- Icon neben Eintrag
- Template-basierte Feld-Vorschau

### Schritt 16 (LLM): Template-Sharing

**Ziel**: journalEntryAccessService erweitern

- Beim Teilen: Template bei Empfänger prüfen
- Falls nicht vorhanden: importieren
- Falls Name-Kollision: "Templatename [Username]"

### Schritt 17 (LLM): System-Templates und Seed

**Ziel**: Initiale Templates

- `diary`: 1 Feld ohne Label (minimales Template)
- `reflection_week`: 4 Felder (changed, gratitude, vows, remarks)
- `reflection_month`: 4 Felder (gleich wie week)
- Migration bestehender Einträge: templateId setzen
- AI-Config von User.settings migrieren

### Schritt 18 (LLM): /reflections entfernen

**Ziel**: Cleanup

- `/app/reflections/page.tsx` entfernen
- `/api/reflections/` entfernen
- `/api/admin/journal-ai/` entfernen
- Navigation aktualisieren (HeaderClient.tsx)
- Redirects für alte URLs

### Schritt 19 (LLM): Hilfeseiten

**Ziel**: Dokumentation

- `/help/journal` – Übersicht Journal-Funktionen
- `/help/templates` – Template-Erstellung und -Bearbeitung
- `/help/audio-segmentation` – Audio-Aufteilen auf Felder
- helpStructure.ts aktualisieren

### Schritt 20 (Mensch): Manuelles Testing

**Ziel**: End-to-End-Tests

- Template erstellen, bearbeiten, duplizieren, löschen
- Journal-Eintrag mit Template erstellen
- Audio-Upload und Segmentierung testen
- Template ändern, bestehenden Eintrag prüfen (Warnung)
- Entry teilen, Template-Import prüfen

---

## 10. Testdaten-Anpassungen

### prisma/seed.ts

```typescript
// System-Templates (origin: SYSTEM, userId: null)
const SYSTEM_TEMPLATES = [
  {
    name: 'Tagebuch',
    forTypeCode: 'daily_note',  // diary
    fields: [
      // Nur 1 Feld ohne Label = minimales Template
      { id: 'content', type: 'textarea', order: 0, required: false }
    ],
    aiConfig: {
      titleModel: 'gpt-4o-mini',
      titlePrompt: 'Generiere einen kurzen, prägnanten Titel für diesen Tagebucheintrag...',
      summaryModel: 'gpt-4o-mini',
      summaryPrompt: 'Fasse diesen Tagebucheintrag in 2-3 Sätzen zusammen...',
    }
  },
  {
    name: 'Wochenreflexion',
    forTypeCode: 'reflection_week',
    fields: [
      { id: 'changed', label: 'Was hat sich verändert?', icon: '🔄', order: 0, type: 'textarea', required: true },
      { id: 'gratitude', label: 'Wofür bin ich dankbar?', icon: '🙏', order: 1, type: 'textarea', required: true },
      { id: 'vows', label: 'Meine Vorsätze', icon: '🎯', order: 2, type: 'textarea', required: false },
      { id: 'remarks', label: 'Sonstige Bemerkungen', icon: '💭', order: 3, type: 'textarea', required: false },
    ],
    aiConfig: {
      titleModel: 'gpt-4o-mini',
      titlePrompt: 'Generiere einen kurzen Titel für diese Wochenreflexion...',
    }
  },
  {
    name: 'Monatsreflexion',
    forTypeCode: 'reflection_month',
    fields: [
      { id: 'changed', label: 'Was hat sich verändert?', icon: '🔄', order: 0, type: 'textarea', required: true },
      { id: 'gratitude', label: 'Wofür bin ich dankbar?', icon: '🙏', order: 1, type: 'textarea', required: true },
      { id: 'vows', label: 'Meine Vorsätze', icon: '🎯', order: 2, type: 'textarea', required: false },
      { id: 'remarks', label: 'Sonstige Bemerkungen', icon: '💭', order: 3, type: 'textarea', required: false },
    ],
    aiConfig: {
      titleModel: 'gpt-4o-mini',
      titlePrompt: 'Generiere einen kurzen Titel für diese Monatsreflexion...',
    }
  }
]

// JournalEntryType bgColorClass Werte
const TYPE_COLORS = {
  'daily_note': null,  // Standard
  'reflection_week': 'bg-emerald-900/20',
  'reflection_month': 'bg-blue-900/20',
}
```

### lib/services/testDataService.ts

- Funktion `createSampleTemplates(userId)` hinzufügen
- Beispiel-Einträge mit verschiedenen Templates erstellen
- Bestehende Reflexions-Einträge: `templateId` setzen

---

## 11. Automatisiertes Testing

### Unit-Tests

| Test-Datei | Testet |
|------------|--------|
| `__tests__/lib/services/journal/templateService.test.ts` | Field-Validierung, Duplizierung, Import |
| `__tests__/lib/services/journal/contentService.test.ts` | Content-Aggregation (H1), Parsing, Mismatch-Erkennung |
| `__tests__/lib/services/journal/segmenterService.test.ts` | Mock-basierter Segmentierungs-Test |
| `__tests__/components/journal/DynamicJournalForm.test.tsx` | Form-Rendering, Feldtypen, State-Management |
| `__tests__/components/journal/FieldRenderer.test.tsx` | Verschiedene Feldtypen (textarea, text, date, time, number) |

### Integrations-Tests

```typescript
// __tests__/api/templates.test.ts
describe('/api/templates', () => {
  it('should create a new template', async () => { /* ... */ })
  it('should validate field schema', async () => { /* ... */ })
  it('should not allow editing system templates', async () => { /* ... */ })
  it('should duplicate template with AI config', async () => { /* ... */ })
  it('should show warning before delete if entries exist', async () => { /* ... */ })
})

// __tests__/api/journal.test.ts
describe('/api/journal', () => {
  it('should create entry with templateId', async () => { /* ... */ })
  it('should build content with H1 headers', async () => { /* ... */ })
  it('should filter by typeCode and dateRange', async () => { /* ... */ })
  it('should support cursor-based pagination', async () => { /* ... */ })
})

// __tests__/api/journal-ai/segment-audio.test.ts
describe('/api/journal-ai/segment-audio', () => {
  it('should segment transcript by explicit markers', async () => { /* ... */ })
  it('should segment implicitly via AI', async () => { /* ... */ })
  it('should put unmatched text in last field with warning', async () => { /* ... */ })
})
```

---

## 12. Manuelles Testing

### Test-Szenario 1: Template erstellen und duplizieren

1. Gehe zu `/settings/templates`
2. Klicke "Neues Template"
3. Füge 3 Felder hinzu mit verschiedenen Icons (via Emoji-Picker)
4. Konfiguriere AI-Einstellungen (Titel-Prompt etc.)
5. Speichere das Template
6. Klicke "Duplizieren"
7. **Erwartung**: Kopie erscheint mit Name "(Kopie)" und identischen Einstellungen

### Test-Szenario 2: Eintrag mit Template erstellen

1. Gehe zu `/journal`
2. Klicke "Neuer Eintrag"
3. Wähle Typ → dann Template aus Dropdown
4. Fülle alle Felder aus (beachte: Instruktionen sind ausgeklappt)
5. Speichere
6. **Erwartung**: Eintrag erscheint mit H1-Überschriften im Content

### Test-Szenario 3: Audio-Segmentierung

1. Erstelle ein Template mit 3 Feldern (z.B. "Morgen", "Mittag", "Abend")
2. Nimm Audio auf: "Am Morgen habe ich... Nächstes Feld. Am Mittag..."
3. Lade die Audio-Datei hoch
4. **Erwartung**: Felder werden basierend auf expliziten Markern befüllt

### Test-Szenario 4: Audio-Segmentierung ohne explizite Marker

1. Nimm Audio auf ohne "Nächstes Feld" zu sagen
2. Lade hoch
3. **Erwartung**: KI versucht implizite Segmentierung, ggf. Warnung + Rest in letztem Feld

### Test-Szenario 5: Template ändern, bestehende Einträge

1. Erstelle einen Eintrag mit Template A (3 Felder)
2. Ändere Template A (4. Feld hinzufügen, 1. Label ändern)
3. Öffne den bestehenden Eintrag
4. **Erwartung**: Warnhinweis "Felder passen nicht zum Template", Fallback auf Markdown-Editor

### Test-Szenario 6: Entry teilen mit Template

1. User A erstellt Template "Mein Template" und Eintrag damit
2. User A teilt Eintrag mit User B
3. **Erwartung**: Template wird bei User B importiert (falls nicht vorhanden)
4. Falls User B bereits "Mein Template" hat (andere Felder): Import als "Mein Template [UserA]"

### Test-Szenario 7: Verschiedene Feldtypen

1. Erstelle Template mit allen Feldtypen: textarea, text, number, date, time
2. Erstelle Eintrag damit
3. **Erwartung**: Jeder Feldtyp zeigt korrektes GUI-Element (Datepicker, Timepicker, etc.)Verbessern

---

*Konzept v2 – 28. Januar 2026*
