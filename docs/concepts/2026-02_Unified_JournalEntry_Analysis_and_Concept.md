# Unified JournalEntry Analysis and Concept

> **Status**: ✅ Teilweise implementiert  
> **Erstellt**: 2026-02-02  
> **Letzte Aktualisierung**: 2026-02-04  
> **Ziel**: Dokumentation der aktuellen Unterschiede zwischen Day-Ansicht (Startseite) und Journal-Seite, sowie Vorschläge zur Vereinheitlichung.

---

## Implementierungsstatus

### ✅ Abgeschlossen

| Phase | Beschreibung | Dateien |
|-------|--------------|---------|
| 1.1 | JournalService Types | `lib/services/journal/types.ts` |
| 1.2 | JournalService Implementation | `lib/services/journal/journalService.ts` |
| 1.3 | API GET/POST `/api/journal-entries` | `app/api/journal-entries/route.ts` |
| 1.4 | API GET/PATCH/DELETE `/api/journal-entries/[id]` | `app/api/journal-entries/[id]/route.ts` |
| 1.5 | Media API Routes | `app/api/journal-entries/[id]/media/route.ts`, `[attachmentId]/route.ts` |
| 1.6 | Migrationsskript | `scripts/migrate-journal-entries.ts` |
| 2.1 | useJournalEntries Hook | `hooks/useJournalEntries.ts` |
| 2.2 | JournalEntryCard Component | `components/features/journal/JournalEntryCard.tsx` |
| 2.3 | UnifiedEntryForm Component | `components/features/journal/UnifiedEntryForm.tsx` |
| 3.1 | Journal-Seite umgestellt | `app/journal/page.tsx` |
| 3.2 | Detail-Seite umgestellt | `app/journal/[id]/page.tsx` |

### ⏸️ Ausstehend / Später

| Phase | Beschreibung | Grund |
|-------|--------------|-------|
| 3.3 | Startseite Migration | Stark mit Day-System verknüpft, separates Projekt |
| 4.1-4.2 | Legacy-APIs entfernen | Startseite nutzt sie noch |

### Hinweise zur Nutzung

- **Journal-Seite** (`/journal`): Nutzt neue unified API `/api/journal-entries`
- **Detail-Seite** (`/journal/[id]`): Nutzt neue unified API
- **Startseite** (`/`): Nutzt weiterhin Legacy `/api/day` System

---

## Inhaltsverzeichnis

1. [Ausgangslage](#1-ausgangslage)
   - 1.1 Historischer Kontext
2. [GUI-Analyse](#2-gui-analyse)
   - 2.1 Startseite (Day-Ansicht)
   - 2.2 Journal-Seite (`/journal`)
   - 2.3 Detail-Seite (`/journal/[id]`)
3. [API-Analyse](#3-api-analyse)
   - 3.1 Startseite-APIs
   - 3.2 Journal-APIs
   - 3.3 Gemeinsame APIs
4. [Feature-Gap-Analyse](#4-feature-gap-analyse)
   - 4.1 GUI-Features
   - 4.2 API-Features
5. [Zielarchitektur](#5-zielarchitektur)
   - 5.1 Grundprinzipien
   - 5.2 Entscheidungen (basierend auf Rückfragen)
6. [Backend-Architektur](#6-backend-architektur)
   - 6.1 Unified Journal Service
   - 6.2 Empfohlene Dateistruktur
   - 6.3 Unified API Routes
   - 6.4 Zu entfernende Legacy-APIs
7. [Frontend-Architektur](#7-frontend-architektur)
   - 7.1 Unified Entry Form
   - 7.2 Unified Entry Card Component
   - 7.3 Unified Journal Hook
   - 7.4 Seitenstruktur nach Refactoring
8. [Datenmigration](#8-datenmigration)
   - 8.1 Analyse bestehender Daten
   - 8.2 Migrationsskript
   - 8.3 Migrationsablauf
   - 8.4 Vollständige Dateiübersicht
9. [Implementierungsplan](#9-implementierungsplan)
   - 9.1 Phase 1: Backend
   - 9.2 Phase 2: Frontend-Komponenten
   - 9.3 Phase 3: Seiten-Integration
   - 9.4 Phase 4: Cleanup & Tests
10. [Risiken und Mitigation](#10-risiken-und-mitigation)
11. [Erfolgsmetriken](#11-erfolgsmetriken)

---

## 1. Ausgangslage

Das System hat zwei primäre Wege, um JournalEntries zu erstellen und zu verwalten:

| Aspekt | Startseite (Day-Ansicht) | Journal-Seite (`/journal`) |
|--------|--------------------------|----------------------------|
| **URL** | `/` | `/journal` |
| **Fokus** | Tagesbasiert, ein spezifisches Datum | Listenansicht aller Einträge |
| **Primärer Use-Case** | Schnelle Tagebuchnotizen, Mahlzeiten | Strukturierte Einträge mit Templates |

### 1.1 Historischer Kontext

Die Startseite wurde ursprünglich mit dem Konzept von "DayNote" (DIARY, MEAL, REFLECTION) entwickelt. Diese wurden später auf das generische `JournalEntry`-Modell migriert, wobei die API-Schnittstelle (`/api/day/[id]/notes`) für Abwärtskompatibilität beibehalten wurde.

Die Journal-Seite wurde später hinzugefügt, um strukturierte Einträge mit Templates und verschiedenen JournalEntryTypes zu unterstützen.

---

## 2. GUI-Analyse

### 2.1 Startseite (Day-Ansicht)

**Komponenten-Stack:**
```
app/page.tsx (HeutePage)
  └── components/features/diary/DiarySection.tsx
        ├── RichTextEditor
        ├── MicrophoneButton
        ├── AudioUploadButton
        ├── OCRUploadButton
        └── DiaryEntriesAccordion
```

**Features:**
| Feature | Verfügbar | Details |
|---------|-----------|---------|
| Freitext-Editor | ✅ | RichTextEditor mit Markdown-Unterstützung |
| Mikrofon-Aufnahme | ✅ | Mit Audio-Persistierung |
| Audio-Upload | ✅ | Unterstützt mehrere Audios pro Eintrag |
| OCR-Upload | ✅ | Texterkennung aus Bildern |
| Foto-Upload | ✅ | Für bestehende Einträge |
| Titel-Generierung | ✅ | KI-generierter Titel |
| AI-Pipeline | ✅ | Tagging, Mentions, Zusammenfassung |
| Bearbeiten | ✅ | Inline-Bearbeitung |
| Löschen | ✅ | Mit Bestätigung |
| Re-Transkription | ✅ | Verschiedene Modelle wählbar |
| Original-Transkript anzeigen | ✅ | Wiederherstellen möglich |
| Template-Felder | ❌ | Nicht verfügbar |
| Typ-Auswahl | ❌ | Fest auf DIARY/MEAL/REFLECTION |
| Sensibilitäts-Flag | ❌ | Nicht verfügbar |
| Standort-Verknüpfung | ❌ | Nicht direkt (nur via TimeBox) |

### 2.2 Journal-Seite (`/journal`)

**Komponenten-Stack:**
```
app/journal/page.tsx (JournalPage)
  └── components/features/journal/DynamicJournalForm.tsx
        ├── FieldRenderer (pro Template-Feld)
        └── MicrophoneButton (pro Textarea-Feld)
```

**Features:**
| Feature | Verfügbar | Details |
|---------|-----------|---------|
| Freitext-Editor | ✅ | Nur Textarea (kein RichTextEditor) |
| Mikrofon-Aufnahme | ✅ | Mit Audio-Persistierung (neu hinzugefügt) |
| Audio-Upload | ❌ | Button vorhanden, aber nicht implementiert |
| OCR-Upload | ❌ | Nicht verfügbar |
| Foto-Upload | ❌ | Nicht verfügbar |
| Titel-Generierung | ❌ | Nicht verfügbar |
| AI-Pipeline | ❌ | Nicht automatisch ausgeführt |
| Bearbeiten | ✅ | Auf Detail-Seite (`/journal/[id]`) |
| Löschen | ✅ | Auf Detail-Seite |
| Re-Transkription | ❌ | Nicht verfügbar |
| Original-Transkript anzeigen | ❌ | Nicht verfügbar |
| Template-Felder | ✅ | Dynamische Feld-Generierung |
| Typ-Auswahl | ✅ | Alle JournalEntryTypes wählbar |
| Sensibilitäts-Flag | ✅ | In Schema vorhanden |
| Standort-Verknüpfung | ✅ | In Schema vorhanden |
| Audio-Segmentierung | ✅ | Transkript auf Felder verteilen |

### 2.3 Detail-Seite (`/journal/[id]`)

**Features:**
| Feature | Verfügbar | Details |
|---------|-----------|---------|
| Titel bearbeiten | ✅ | |
| Inhalt bearbeiten | ✅ | Template-Felder oder Freitext |
| Eintrag löschen | ✅ | |
| Audio anzeigen | ❌ | MediaAttachments nicht geladen |
| Fotos anzeigen | ❌ | MediaAttachments nicht geladen |
| AI-Zusammenfassung | ✅ | Badge angezeigt, aber nicht editierbar |

---

## 3. API-Analyse

### 3.1 Erstellen von Einträgen

| API-Endpunkt | Verwendet von | Features |
|--------------|---------------|----------|
| `POST /api/day/[id]/notes` | Startseite | ✅ Entity-Eintrag, ✅ MediaAttachments, ✅ Mentions, ✅ Default-Sharing |
| `POST /api/journal` | Journal-Seite | ✅ Entity-Eintrag (neu), ✅ MediaAttachments (neu), ❌ Mentions, ❌ Default-Sharing |

**Detailvergleich:**

```typescript
// /api/day/[id]/notes - POST
{
  type: 'DIARY' | 'MEAL' | 'REFLECTION',
  title?: string,
  text: string,
  audioFileIds?: string[],
  audioTranscripts?: { assetId, transcript, transcriptModel }[],
  ocrAssetIds?: string[],
  occurredAt?: string,
  capturedAt?: string,
  tzOffsetMinutes?: number,
}
// → Erstellt Entity-Eintrag ✅
// → Erstellt MediaAttachments für Audio ✅
// → Erstellt MediaAttachments für OCR ✅
// → Erkennt Mentions automatisch ✅
// → Wendet Default-Sharing an ✅

// /api/journal - POST
{
  typeId: string,           // Beliebiger JournalEntryType
  templateId?: string,      // Template-Referenz
  timeBoxId: string,
  locationId?: string,
  title?: string,
  content: string,
  fieldValues?: Record<string, string>,
  audioFileIds?: string[],
  audioTranscripts?: Record<string, string>,
  occurredAt?: string,
  capturedAt?: string,
  isSensitive?: boolean,
}
// → Erstellt Entity-Eintrag ✅ (neu hinzugefügt)
// → Erstellt MediaAttachments für Audio ✅ (neu hinzugefügt)
// → Erkennt Mentions NICHT ❌
// → Wendet Default-Sharing NICHT an ❌
```

### 3.2 Laden von Einträgen

| API-Endpunkt | Response-Format | Features |
|--------------|-----------------|----------|
| `GET /api/day?date=YYYY-MM-DD` | Legacy "DayNote" Format | ✅ Audio-Attachments, ✅ Fotos, ✅ Sharing-Status |
| `GET /api/journal` | JournalEntry mit Relations | ✅ Template, ✅ Type, ❌ MediaAttachments |
| `GET /api/journal/[id]` | JournalEntryDetail | ❌ MediaAttachments |

### 3.3 Bearbeiten von Einträgen

| API-Endpunkt | Verwendet von |
|--------------|---------------|
| `PATCH /api/notes/[id]` | Startseite |
| `PATCH /api/journal/[id]` | Journal-Detail |

**Unterschiede:**
- `/api/notes/[id]` aktualisiert `occurredAt`, `capturedAt`, Titel, Text
- `/api/journal/[id]` aktualisiert Titel, Content, fieldValues

### 3.4 Audio-Handling

| API-Endpunkt | Zweck |
|--------------|-------|
| `POST /api/diary/upload-audio` | Audio hochladen + transkribieren (von MicrophoneButton) |
| `GET/PATCH/DELETE /api/journal-entries/[id]/audio` | Audio-Attachments verwalten |
| `POST /api/journal-ai/segment-audio` | Audio-Segmentierung für Templates |

---

## 4. Fehlende Features (Gap-Analyse)

### 4.1 Journal-Seite fehlt gegenüber Startseite

| Feature |
|---------|
| Audio-Upload-Button (Datei wählen) |
| OCR-Upload |
| Foto-Upload für neue Einträge |
| Titel-Generierung |
| AI-Pipeline (Tagging, Mentions, Summary) |
| Mentions-Erkennung |
| Default-Sharing |
| RichTextEditor statt Textarea |
| Re-Transkription |

### 4.2 Startseite fehlt gegenüber Journal-Seite

| Feature |
|---------|
| Typ-Auswahl (nicht nur DIARY/MEAL/REFLECTION) |
| Template-Felder |
| Audio-Segmentierung |
| Sensibilitäts-Flag |
| Standort-Verknüpfung |

### 4.3 Detail-Seite (`/journal/[id]`) fehlt

| Feature |
|---------|
| MediaAttachments anzeigen (Audio, Fotos) |
| Audio abspielen |
| Fotos anzeigen |
| Re-Transkription |
| AI-Pipeline manuell triggern |

---

## 5. Zielarchitektur: Unified Journal System

### 5.1 Designprinzipien

1. **Single Source of Truth**: Jede Logik existiert nur einmal
2. **Keine Legacy-APIs**: Alte Endpunkte werden entfernt, nicht parallel betrieben
3. **Shared Components**: GUI-Komponenten werden von beiden Seiten genutzt
4. **Feature-Parität**: Jeder Eintrag hat Zugriff auf alle Features

### 5.2 Entscheidungen (basierend auf Rückfragen)

| Frage | Entscheidung |
|-------|--------------|
| Alle JournalEntryTypes auf Startseite? | ✅ Ja |
| Templates auf Startseite? | ✅ Ja |
| Audio-Segmentierung auf Startseite? | ✅ Ja, wenn Template mit >1 Feld gewählt |
| AI-Pipeline automatisch? | ❌ Nein, nur per Button-Klick |

---

## 6. Backend-Architektur

### 6.1 Unified Journal Service

**Pfad:** `lib/services/journal/journalService.ts`

Dieser Service ist der einzige Ort, an dem JournalEntries erstellt, bearbeitet und gelöscht werden.

```typescript
// lib/services/journal/journalService.ts

import { PrismaClient, JournalEntry } from '@prisma/client'
import { findMentionsInText, createMentionInteractions } from '@/lib/utils/mentions'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Empfehlung: Zod-Schema für Validierung definieren (z.B. CreateEntryParamsSchema)
export interface CreateEntryParams {
  userId: string
  // TimeBox: entweder timeBoxId ODER occurredAt+timezoneOffset angeben
  // Falls timeBoxId fehlt, wird die TimeBox automatisch aufgelöst
  timeBoxId?: string
  occurredAt?: Date
  timezoneOffset?: number // Minuten-Offset vom Client für korrekte TimeBox-Zuordnung
  
  typeId: string
  templateId?: string | null
  locationId?: string | null
  title?: string | null
  content: string
  fieldValues?: Record<string, string>
  capturedAt?: Date
  isSensitive?: boolean
  
  // Media
  audioFileIds?: string[]
  audioTranscripts?: Array<{ assetId: string; transcript: string; transcriptModel?: string | null }>
  ocrAssetIds?: string[]
  photoAssetIds?: string[]
}

export interface UpdateEntryParams {
  title?: string | null
  content?: string
  fieldValues?: Record<string, string>
  occurredAt?: Date
  capturedAt?: Date
  isSensitive?: boolean
  locationId?: string | null
}

export interface EntryWithRelations extends JournalEntry {
  type: { id: string; code: string; name: string; icon: string | null } | null
  template: { id: string; name: string; fields: unknown } | null
  location: { id: string; name: string } | null
  mediaAttachments: Array<{
    id: string
    role: string
    transcript: string | null
    transcriptModel: string | null
    displayOrder: number
    asset: {
      id: string
      filePath: string
      mimeType: string | null
      duration: number | null
      capturedAt: Date | null
    }
  }>
  accessCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

export class JournalService {
  constructor(private prisma: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async createEntry(params: CreateEntryParams): Promise<EntryWithRelations> {
    const {
      userId,
      typeId,
      templateId,
      locationId,
      title,
      content,
      fieldValues,
      occurredAt,
      capturedAt,
      timezoneOffset,
      isSensitive,
      audioFileIds,
      audioTranscripts,
      ocrAssetIds,
      photoAssetIds,
    } = params

    // TimeBox auflösen: entweder direkt übergeben oder automatisch ermitteln
    const resolvedTimeBoxId = params.timeBoxId 
      ?? await this.resolveTimeBox(userId, occurredAt || new Date(), timezoneOffset)

    // Alle Kern-Operationen in einer Transaktion für Konsistenz
    const entry = await this.prisma.$transaction(async (tx) => {
      // 1. Create JournalEntry
      const newEntry = await tx.journalEntry.create({
        data: {
          userId,
          timeBoxId: resolvedTimeBoxId,
          typeId,
          templateId: templateId || null,
          locationId: locationId || null,
          title: title || null,
          content,
          fieldValues: fieldValues ? JSON.stringify(fieldValues) : null,
          occurredAt: occurredAt || new Date(),
          capturedAt: capturedAt || new Date(),
          isSensitive: isSensitive || false,
        },
      })

      // 2. Create Entity registry entry (required for polymorphic relations)
      await tx.entity.create({
        data: {
          id: newEntry.id,
          userId,
          type: 'JOURNAL_ENTRY',
        },
      })

      // 3. Create MediaAttachments for audio files
      if (audioFileIds && audioFileIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: audioFileIds,
          role: 'ATTACHMENT',
          transcripts: audioTranscripts,
        })
      }

      // 4. Create MediaAttachments for OCR sources
      if (ocrAssetIds && ocrAssetIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: ocrAssetIds,
          role: 'SOURCE',
        })
      }

      // 5. Create MediaAttachments for photos
      if (photoAssetIds && photoAssetIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: photoAssetIds,
          role: 'GALLERY',
        })
      }

      return newEntry
    })

    // 6. Detect and create mentions (ausserhalb Transaktion - nicht kritisch)
    await this.processMentions(entry.id, userId, content, resolvedTimeBoxId)

    // 7. Apply default sharing rules (ausserhalb Transaktion - nicht kritisch)
    await this.applyDefaultSharing(entry.id, userId, typeId)

    // 8. Return full entry with relations
    return this.getEntry(entry.id, userId)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  async getEntry(id: string, userId: string): Promise<EntryWithRelations> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        type: { select: { id: true, code: true, name: true, icon: true } },
        template: { select: { id: true, name: true, fields: true } },
        location: { select: { id: true, name: true } },
        // Standard Prisma include für MediaAttachments (performant durch Dataloader)
        mediaAttachments: {
          where: { userId }, // WICHTIG: userId-Check gegen Cross-User-Leaks
          include: { asset: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    if (!entry) {
      throw new Error('Entry not found')
    }

    // Count access grants
    const accessCount = await this.prisma.journalEntryAccess.count({
      where: { journalEntryId: id },
    })

    return {
      ...entry,
      accessCount,
    } as EntryWithRelations
  }

  /**
   * Liste Einträge mit optionalem "lean" Modus für Performance.
   * - lean=true: Keine Media-Attachments, keine accessCount (für Listen-Ansichten)
   * - lean=false: Vollständige Daten inkl. Media (Standard)
   */
  async listEntries(params: {
    userId: string
    timeBoxId?: string
    typeId?: string
    templateId?: string
    limit?: number
    offset?: number
    lean?: boolean // NEU: Für Listen-Ansichten ohne Media/Transkripte
  }): Promise<{ entries: EntryWithRelations[]; total: number }> {
    const { userId, timeBoxId, typeId, templateId, limit = 50, offset = 0, lean = false } = params

    const where = {
      userId,
      deletedAt: null,
      ...(timeBoxId && { timeBoxId }),
      ...(typeId && { typeId }),
      ...(templateId && { templateId }),
    }

    // Standard Prisma include (performant durch Dataloader Pattern)
    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          type: { select: { id: true, code: true, name: true, icon: true } },
          template: { select: { id: true, name: true, fields: true } },
          location: { select: { id: true, name: true } },
          // Media nur laden wenn nicht lean
          ...(!lean && {
            mediaAttachments: {
              where: { userId }, // userId-Check gegen Cross-User-Leaks
              include: { 
                asset: { 
                  select: { id: true, filePath: true, mimeType: true, duration: true } 
                } 
              },
              orderBy: { displayOrder: 'asc' },
            },
          }),
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.journalEntry.count({ where }),
    ])

    // Im lean-Modus keine accessCounts laden
    if (lean) {
      return { 
        entries: entries.map(e => ({ ...e, mediaAttachments: [], accessCount: 0 })) as EntryWithRelations[], 
        total 
      }
    }

    // AccessCounts nur im vollen Modus
    const entryIds = entries.map((e) => e.id)
    const accessCounts = await this.prisma.journalEntryAccess.groupBy({
      by: ['journalEntryId'],
      where: { journalEntryId: { in: entryIds } },
      _count: { id: true },
    })
    const accessCountMap = new Map(accessCounts.map((ac) => [ac.journalEntryId, ac._count.id]))

    const enrichedEntries = entries.map((entry) => ({
      ...entry,
      accessCount: accessCountMap.get(entry.id) || 0,
    })) as EntryWithRelations[]

    return { entries: enrichedEntries, total }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateEntry(
    id: string,
    userId: string,
    params: UpdateEntryParams
  ): Promise<EntryWithRelations> {
    const { title, content, fieldValues, occurredAt, capturedAt, isSensitive, locationId } = params

    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(fieldValues !== undefined && { fieldValues: JSON.stringify(fieldValues) }),
        ...(occurredAt !== undefined && { occurredAt }),
        ...(capturedAt !== undefined && { capturedAt }),
        ...(isSensitive !== undefined && { isSensitive }),
        ...(locationId !== undefined && { locationId }),
        updatedAt: new Date(),
      },
    })

    // Re-process mentions if content changed
    if (content !== undefined) {
      const entry = await this.prisma.journalEntry.findUnique({
        where: { id },
        select: { timeBoxId: true },
      })
      if (entry?.timeBoxId) {
        await this.processMentions(id, userId, content, entry.timeBoxId)
      }
    }

    return this.getEntry(id, userId)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────

  async deleteEntry(id: string, userId: string): Promise<void> {
    // Soft delete
    await this.prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async hardDeleteEntry(id: string, userId: string): Promise<void> {
    // Delete media attachments first
    await this.prisma.mediaAttachment.deleteMany({ where: { entityId: id } })

    // Delete entity registry
    await this.prisma.entity.delete({ where: { id } }).catch(() => {})

    // Delete journal entry
    await this.prisma.journalEntry.delete({ where: { id } })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA ATTACHMENTS
  // ─────────────────────────────────────────────────────────────────────────

  async addMediaAttachment(params: {
    entryId: string
    userId: string
    assetId: string
    role: 'ATTACHMENT' | 'SOURCE' | 'GALLERY'
    transcript?: string | null
    transcriptModel?: string | null
  }): Promise<void> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: params.entryId, userId: params.userId },
    })
    if (!entry) throw new Error('Entry not found')

    const maxOrder = await this.prisma.mediaAttachment.aggregate({
      where: { entityId: params.entryId },
      _max: { displayOrder: true },
    })

    await this.prisma.mediaAttachment.create({
      data: {
        entityId: params.entryId,
        userId: params.userId,
        assetId: params.assetId,
        timeBoxId: entry.timeBoxId,
        role: params.role,
        transcript: params.transcript || null,
        transcriptModel: params.transcriptModel || null,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      },
    })
  }

  async removeMediaAttachment(attachmentId: string, userId: string): Promise<void> {
    await this.prisma.mediaAttachment.deleteMany({
      where: { id: attachmentId, userId },
    })
  }

  async updateMediaAttachment(
    attachmentId: string,
    userId: string,
    params: { transcript?: string; transcriptModel?: string }
  ): Promise<void> {
    // WICHTIG: Erst prüfen ob Attachment dem User gehört
    const existing = await this.prisma.mediaAttachment.findFirst({
      where: { id: attachmentId, userId },
    })
    if (!existing) {
      throw new Error('Attachment not found or access denied')
    }
    
    await this.prisma.mediaAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(params.transcript !== undefined && { transcript: params.transcript }),
        ...(params.transcriptModel !== undefined && { transcriptModel: params.transcriptModel }),
      },
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  // Für Verwendung innerhalb von Transaktionen
  private async createMediaAttachmentsInTx(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    params: {
      entityId: string
      userId: string
      timeBoxId: string
      assetIds: string[]
      role: 'ATTACHMENT' | 'SOURCE' | 'GALLERY'
      transcripts?: Array<{ assetId: string; transcript: string; transcriptModel?: string | null }>
    }
  ): Promise<void> {
    const { entityId, userId, timeBoxId, assetIds, role, transcripts } = params
    const transcriptMap = new Map(transcripts?.map((t) => [t.assetId, t]) || [])

    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i]
      const transcriptData = transcriptMap.get(assetId)

      const asset = await tx.mediaAsset.findFirst({
        where: { id: assetId, userId },
      })

      if (asset) {
        await tx.mediaAttachment.create({
          data: {
            entityId,
            userId,
            assetId,
            timeBoxId,
            role,
            displayOrder: i,
            transcript: transcriptData?.transcript || null,
            transcriptModel: transcriptData?.transcriptModel || null,
          },
        })
      }
    }
  }

  private async processMentions(
    entryId: string,
    userId: string,
    content: string,
    timeBoxId: string
  ): Promise<void> {
    const mentions = await findMentionsInText(userId, content)
    if (mentions.length > 0) {
      const timeBox = await this.prisma.timeBox.findUnique({ where: { id: timeBoxId } })
      if (timeBox) {
        await createMentionInteractions(
          userId,
          entryId,
          mentions.map((m) => m.contactId),
          timeBox.localDate || new Date().toISOString().slice(0, 10),
          timeBox.startAt || new Date()
        )
      }
    }
  }

  private async applyDefaultSharing(
    entryId: string,
    userId: string,
    typeId: string
  ): Promise<void> {
    const accessService = getJournalEntryAccessService()
    await accessService.applyDefaultSharingOnCreate(entryId, userId, typeId)
  }

  /**
   * Löst die TimeBox für ein Datum auf (find or create).
   * Nutzt timezoneOffset um das korrekte lokale Datum zu bestimmen.
   */
  private async resolveTimeBox(
    userId: string,
    occurredAt: Date,
    timezoneOffset?: number
  ): Promise<string> {
    // Berechne lokales Datum unter Berücksichtigung der Zeitzone
    const offsetMs = (timezoneOffset || 0) * 60 * 1000
    const localDate = new Date(occurredAt.getTime() - offsetMs)
    const localDateStr = localDate.toISOString().slice(0, 10) // YYYY-MM-DD

    // Suche existierende TimeBox
    let timeBox = await this.prisma.timeBox.findFirst({
      where: { userId, kind: 'DAY', localDate: localDateStr },
    })

    // Falls nicht vorhanden, erstelle neue TimeBox
    if (!timeBox) {
      const startAt = new Date(localDateStr + 'T00:00:00Z')
      const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
      timeBox = await this.prisma.timeBox.create({
        data: {
          userId,
          kind: 'DAY',
          localDate: localDateStr,
          startAt,
          endAt,
          timezone: 'Europe/Zurich', // Default, kann angepasst werden
        },
      })
    }

    return timeBox.id
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Factory (kein Singleton - jeder Request erhält neue Instanz)
// ───────────────────────────────────────────────────────────────────────────────

export function createJournalService(prisma: PrismaClient): JournalService {
  return new JournalService(prisma)
}
```

### 6.2 Empfohlene Dateistruktur

Der gezeigte Code kann wie folgt auf mehrere Dateien aufgeteilt werden:

```
lib/services/journal/
├── index.ts                    # Re-exports
├── types.ts                    # CreateEntryParams, UpdateEntryParams, EntryWithRelations
├── journalService.ts           # CRUD-Logik, Mentions, Sharing
└── mediaAttachmentService.ts   # Media Attachment Logik (optional)
```

**Empfehlung:**

| Auslagerung | Empfehlung | Begründung |
|-------------|------------|------------|
| **Types → `types.ts`** | ✅ Ja | Interfaces werden auch von API-Routen und Hooks importiert; vermeidet zirkuläre Abhängigkeiten |
| **Media → eigene Datei** | ⚠️ Optional | Nur wenn `journalService.ts` > 400 Zeilen wird; Media-Logik ist eng mit Entry-Logik gekoppelt |

Falls Media ausgelagert wird:

```typescript
// lib/services/journal/mediaAttachmentService.ts
export class MediaAttachmentService {
  constructor(private prisma: PrismaClient) {}
  
  async addToEntry(params: AddMediaParams): Promise<void> { ... }
  async removeFromEntry(attachmentId: string, userId: string): Promise<void> { ... }
  async updateTranscript(attachmentId: string, userId: string, params: UpdateTranscriptParams): Promise<void> { ... }
}
```

Der `JournalService` würde dann `MediaAttachmentService` intern nutzen, die öffentliche API bleibt unverändert.

### 6.3 Unified API Routes

Alle Journal-Operationen laufen über eine einheitliche API-Struktur:

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/journal-entries` | GET | Einträge auflisten (mit Filtern) |
| `/api/journal-entries` | POST | Neuen Eintrag erstellen |
| `/api/journal-entries/[id]` | GET | Einzelnen Eintrag laden |
| `/api/journal-entries/[id]` | PATCH | Eintrag aktualisieren |
| `/api/journal-entries/[id]` | DELETE | Eintrag löschen |
| `/api/journal-entries/[id]/media` | POST | Media hinzufügen |
| `/api/journal-entries/[id]/media/[attachmentId]` | DELETE | Media entfernen |

**Beispiel: `app/api/journal-entries/route.ts`**

```typescript
// app/api/journal-entries/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { createJournalService } from '@/lib/services/journal/journalService'
import { resolveUser } from '@/lib/auth/resolveUser'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const user = await resolveUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const service = createJournalService(prisma)

  const result = await service.listEntries({
    userId: user.id,
    timeBoxId: searchParams.get('timeBoxId') || undefined,
    typeId: searchParams.get('typeId') || undefined,
    templateId: searchParams.get('templateId') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma()
  const user = await resolveUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createJournalService(prisma)

  const entry = await service.createEntry({
    userId: user.id,
    timeBoxId: body.timeBoxId,
    typeId: body.typeId,
    templateId: body.templateId,
    locationId: body.locationId,
    title: body.title,
    content: body.content,
    fieldValues: body.fieldValues,
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    capturedAt: body.capturedAt ? new Date(body.capturedAt) : undefined,
    isSensitive: body.isSensitive,
    audioFileIds: body.audioFileIds,
    audioTranscripts: body.audioTranscripts,
    ocrAssetIds: body.ocrAssetIds,
    photoAssetIds: body.photoAssetIds,
  })

  return NextResponse.json({ entry })
}
```

### 6.4 Zu entfernende Legacy-APIs

Nach der Migration werden diese Endpunkte gelöscht:

| Zu entfernen | Ersetzt durch |
|--------------|---------------|
| `POST /api/day/[id]/notes` | `POST /api/journal-entries` |
| `PATCH /api/notes/[id]` | `PATCH /api/journal-entries/[id]` |
| `DELETE /api/notes/[id]` | `DELETE /api/journal-entries/[id]` |
| `GET /api/journal` | `GET /api/journal-entries` |
| `POST /api/journal` | `POST /api/journal-entries` |
| `GET /api/journal/[id]` | `GET /api/journal-entries/[id]` |
| `PATCH /api/journal/[id]` | `PATCH /api/journal-entries/[id]` |
| `DELETE /api/journal/[id]` | `DELETE /api/journal-entries/[id]` |

---

## 7. Frontend-Architektur

### 7.1 Unified Entry Form Component

**Pfad:** `components/features/journal/UnifiedEntryForm.tsx`

Diese Komponente ersetzt sowohl `DiarySection` (Formular-Teil) als auch `DynamicJournalForm`.

```typescript
// components/features/journal/UnifiedEntryForm.tsx

interface UnifiedEntryFormProps {
  // Required
  timeBoxId: string
  date: string  // YYYY-MM-DD for audio persistence
  onSubmit: (entry: JournalEntry) => void
  
  // Type & Template Selection
  types: JournalEntryType[]
  templates: JournalTemplate[]
  defaultTypeCode?: string  // e.g. 'diary' for homepage default
  
  // Edit mode
  existingEntry?: JournalEntry
  
  // UI options
  showTypeSelector?: boolean      // default: true
  showTemplateSelector?: boolean  // default: true
  
  // Callbacks
  onCancel?: () => void
  isSubmitting?: boolean
}

// Feature checklist (all available on both pages):
// ✅ Type selection dropdown
// ✅ Template selection dropdown (filtered by type)
// ✅ Dynamic field rendering (from template)
// ✅ RichTextEditor for textarea fields
// ✅ MicrophoneButton per field + per entry
// ✅ AudioUploadButton per entry (not per field)
// ✅ Audio segmentation for recordings AND uploads (when template has >1 field)
// ✅ OCRUploadButton
// ✅ Photo upload
// ✅ Title field
// ✅ Time/Date picker (occurredAt)
// ✅ Sensitivity toggle
// ✅ Location picker
```

### 7.2 Unified Entry Card Component

**Pfad:** `components/features/journal/JournalEntryCard.tsx`

Diese Komponente zeigt einen einzelnen Eintrag an, sowohl in Listen als auch im Detail.

**Architektur-Entscheidung:** Eine einzige Komponente mit `mode`-Prop statt separater Komponenten (`JournalEntryRow`, `JournalEntryCard`, `JournalEntryDetail`). Begründung:
- Die aktuelle `JournalEntryCard` im Projekt ist bereits **leichtgewichtig** (kein Audio-Player im compact-Mode, nur Text-Preview)
- Separate Komponenten würden beim Expand von compact → detail ein Nachladen erfordern
- Bei typisch <5 Einträgen pro Tag ist Performance kein Bottleneck
- Wartbarkeit: Eine Komponente mit klaren Mode-Unterscheidungen ist einfacher als drei zu synchronisieren

```typescript
// components/features/journal/JournalEntryCard.tsx

interface JournalEntryCardProps {
  entry: EntryWithRelations
  
  // Display modes
  mode: 'compact' | 'expanded' | 'detail'
  
  // Edit capabilities
  onEdit?: () => void
  onDelete?: () => void
  
  // Media actions
  onPlayAudio?: (attachmentId: string) => void
  onDeleteAudio?: (attachmentId: string) => void
  onRetranscribe?: (attachmentId: string, model: string) => void
  onViewPhoto?: (attachmentId: string) => void
  onDeletePhoto?: (attachmentId: string) => void
  
  // AI actions (button triggers, not automatic)
  onRunPipeline?: () => void
  onGenerateTitle?: () => void
  
  // Sharing
  onShare?: () => void
  showShareBadge?: boolean
}

// Feature checklist (all available on both pages):
// ✅ Type badge with icon
// ✅ Template name display
// ✅ Title (editable)
// ✅ Content/Fields display
// ✅ Audio player (multiple)
// ✅ Photo gallery
// ✅ Time display (occurredAt)
// ✅ Edit button
// ✅ Delete button
// ✅ AI Pipeline button
// ✅ Title generation button
// ✅ Share button/badge
// ✅ Original transcript restore
// ✅ Re-transcription
```

**Transkript-Datenquelle:**

Das Original-Transkript wird in `MediaAttachment.transcript` gespeichert:
- Bei Audio-Aufnahme/Upload wird das initiale Transkript in `MediaAttachment.transcript` geschrieben
- Bei Re-Transkription wird `transcript` überschrieben und `transcriptModel` aktualisiert
- **"Original transcript restore"** bedeutet: Das originale Transkript kann nicht wiederhergestellt werden, da es überschrieben wird. Die UI sollte vor Re-Transkription warnen.


### 7.3 Unified Journal Hook

**Pfad:** `hooks/useJournalEntries.ts`

Ersetzt `useDiaryManagement` für Journal-Operationen.

```typescript
// hooks/useJournalEntries.ts

interface UseJournalEntriesOptions {
  timeBoxId?: string
  typeId?: string
  templateId?: string
  autoFetch?: boolean
}

interface UseJournalEntriesReturn {
  // State
  entries: EntryWithRelations[]
  isLoading: boolean
  error: string | null
  
  // CRUD (mit Optimistic Updates für schnelles "Thought Capturing")
  createEntry: (params: CreateEntryParams) => Promise<EntryWithRelations>
  updateEntry: (id: string, params: UpdateEntryParams) => Promise<EntryWithRelations>
  deleteEntry: (id: string) => Promise<void>
  
  // Media
  addAudio: (entryId: string, assetId: string, transcript?: string) => Promise<void>
  removeAudio: (entryId: string, attachmentId: string) => Promise<void>
  updateTranscript: (attachmentId: string, transcript: string, model?: string) => Promise<void>
  addPhoto: (entryId: string, assetId: string) => Promise<void>
  removePhoto: (entryId: string, attachmentId: string) => Promise<void>
  
  // AI (user-triggered, not automatic)
  runPipeline: (entryId: string) => Promise<void>
  generateTitle: (entryId: string) => Promise<string>
  
  // Refresh
  refetch: () => Promise<void>
}

export function useJournalEntries(options: UseJournalEntriesOptions): UseJournalEntriesReturn {
  // Implementation uses /api/journal-entries exclusively
  
  // WICHTIG: Optimistic Updates implementieren
  // - Bei createEntry: Eintrag sofort in Liste einfügen (mit temporärer ID)
  // - Bei Server-Antwort: Temporäre ID durch echte ID ersetzen
  // - Bei Fehler: Eintrag aus Liste entfernen, Error anzeigen
  // 
  // Beispiel mit useOptimistic (React 19) oder lokalem State:
  // const [optimisticEntries, addOptimistic] = useOptimistic(entries)
}
```

### 7.4 Seitenstruktur nach Refactoring

**Startseite (`app/page.tsx`):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header + Datum-Navigation                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Kalender (Monatsübersicht, unverändert)                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Zusammenfassung (DaySummary, unverändert)                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Tagebuch (NEU: UnifiedEntryForm + JournalEntryCard)              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ UnifiedEntryForm                                            │ │
│ │ - defaultTypeCode="diary"                                   │ │
│ │ - showTypeSelector={true}                                   │ │
│ │ - showTemplateSelector={true}                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ JournalEntryCard (mode="compact") × N                       │ │
│ │ - Für jeden Eintrag des Tages                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Habits, Symptoms, etc. (Day-spezifisch, unverändert)             │
└─────────────────────────────────────────────────────────────────┘
```

**Journal-Seite (`app/journal/page.tsx`):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Filter (Typ, Template, Datum-Range)                     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ UnifiedEntryForm (collapsible)                              │ │
│ │ - showTypeSelector={true}                                   │ │
│ │ - showTemplateSelector={true}                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ JournalEntryCard (mode="compact") × N                       │ │
│ │ - Gefilterte Einträge mit Pagination                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Detail-Seite (`app/journal/[id]/page.tsx`):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Back-Button, Edit/Delete                                │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ JournalEntryCard (mode="detail")                            │ │
│ │ - Alle Features inkl. Audio, Fotos, AI-Buttons              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ UnifiedEntryForm (wenn isEditing=true)                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Datenmigration

### 8.1 Analyse bestehender Daten

Die Datenbankstruktur ist bereits einheitlich (`JournalEntry`). Es gibt **keine strukturellen Unterschiede** zwischen Einträgen, die über `/api/day/[id]/notes` vs. `/api/journal` erstellt wurden.

**Potenzielle Datenlücken:**

| Problem | Betroffen | Lösung |
|---------|-----------|--------|
| Fehlende `Entity`-Einträge | Ältere Einträge vor Entity-System | Migrationsskript |
| Fehlende Default-Sharing | Über `/api/journal` erstellte Einträge | Migrationsskript |
| Fehlende Mentions | Über `/api/journal` erstellte Einträge | Migrationsskript (optional) |

### 8.2 Migrationsskript

**Pfad:** `scripts/migrate-journal-entries.ts`

```typescript
// scripts/migrate-journal-entries.ts

/**
 * Migration script to ensure all JournalEntries have:
 * 1. A corresponding Entity registry entry
 * 2. Default sharing rules applied
 * 3. Mentions detected (optional)
 * 
 * Run with: npx tsx scripts/migrate-journal-entries.ts
 */

import { PrismaClient } from '@prisma/client'
import { findMentionsInText, createMentionInteractions } from '@/lib/utils/mentions'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

const prisma = new PrismaClient()

interface MigrationStats {
  totalEntries: number
  entitiesCreated: number
  sharingApplied: number
  mentionsDetected: number
  errors: string[]
}

async function migrate(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalEntries: 0,
    entitiesCreated: 0,
    sharingApplied: 0,
    mentionsDetected: 0,
    errors: [],
  }

  console.log('Starting JournalEntry migration...')

  // Get all journal entries
  const entries = await prisma.journalEntry.findMany({
    where: { deletedAt: null },
    include: {
      type: true,
      timeBox: true,
    },
  })

  stats.totalEntries = entries.length
  console.log(`Found ${entries.length} entries to process`)

  for (const entry of entries) {
    try {
      // 1. Ensure Entity exists
      const existingEntity = await prisma.entity.findUnique({
        where: { id: entry.id },
      })

      if (!existingEntity) {
        await prisma.entity.create({
          data: {
            id: entry.id,
            userId: entry.userId,
            type: 'JOURNAL_ENTRY',
          },
        })
        stats.entitiesCreated++
        console.log(`  Created Entity for ${entry.id}`)
      }

      // 2. Apply default sharing (if not already applied)
      const existingAccess = await prisma.journalEntryAccess.findFirst({
        where: { journalEntryId: entry.id },
      })

      if (!existingAccess && entry.typeId) {
        const accessService = getJournalEntryAccessService()
        await accessService.applyDefaultSharingOnCreate(entry.id, entry.userId, entry.typeId)
        stats.sharingApplied++
        console.log(`  Applied sharing for ${entry.id}`)
      }

      // 3. Detect mentions (optional - can be slow)
      // Uncomment if needed:
      /*
      if (entry.content && entry.timeBox) {
        const mentions = await findMentionsInText(entry.userId, entry.content)
        if (mentions.length > 0) {
          await createMentionInteractions(
            entry.userId,
            entry.id,
            mentions.map(m => m.contactId),
            entry.timeBox.localDate || entry.createdAt.toISOString().slice(0, 10),
            entry.timeBox.startAt || entry.createdAt
          )
          stats.mentionsDetected += mentions.length
          console.log(`  Detected ${mentions.length} mentions for ${entry.id}`)
        }
      }
      */

    } catch (error) {
      const msg = `Error processing ${entry.id}: ${error}`
      stats.errors.push(msg)
      console.error(msg)
    }
  }

  return stats
}

// Main execution
migrate()
  .then((stats) => {
    console.log('\n--- Migration Complete ---')
    console.log(`Total entries: ${stats.totalEntries}`)
    console.log(`Entities created: ${stats.entitiesCreated}`)
    console.log(`Sharing applied: ${stats.sharingApplied}`)
    console.log(`Mentions detected: ${stats.mentionsDetected}`)
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach((e) => console.log(`  - ${e}`))
    }
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 8.3 Migrationsablauf

```
1. Migrationsskript ausführen
   npx tsx scripts/migrate-journal-entries.ts
   
2. Neue API-Routen erstellen
   - app/api/journal-entries/route.ts
   - app/api/journal-entries/[id]/route.ts
   - app/api/journal-entries/[id]/media/route.ts
   
3. Frontend-Komponenten erstellen
   - components/features/journal/UnifiedEntryForm.tsx
   - components/features/journal/JournalEntryCard.tsx
   - hooks/useJournalEntries.ts
   
4. Seiten umstellen
   - app/page.tsx → useJournalEntries + UnifiedEntryForm + JournalEntryCard
   - app/journal/page.tsx → useJournalEntries + UnifiedEntryForm + JournalEntryCard
   - app/journal/[id]/page.tsx → JournalEntryCard
   
5. Legacy-APIs entfernen
   - app/api/day/[id]/notes/route.ts
   - app/api/notes/[id]/route.ts
   - app/api/journal/route.ts
   - app/api/journal/[id]/route.ts
   
6. Legacy-Hooks entfernen
   - hooks/useDiaryManagement.ts (nach vollständiger Migration)
   
7. Legacy-Komponenten entfernen
   - components/features/diary/DiarySection.tsx (nach vollständiger Migration)
   - components/features/journal/DynamicJournalForm.tsx (nach vollständiger Migration)
```

---

## 8.4 Vollständige Dateiübersicht

Diese Übersicht listet alle Dateien auf, die im Rahmen der Migration erstellt, überarbeitet oder gelöscht werden müssen.

### Neu zu erstellen

| Pfad | Beschreibung |
|------|--------------|
| `lib/services/journal/journalService.ts` | Unified Journal Service (CRUD, Media, Mentions, Sharing) |
| `lib/services/journal/types.ts` | Types für JournalService (CreateEntryParams, UpdateEntryParams, EntryWithRelations) |
| `lib/services/journal/mediaAttachmentService.ts` | Media Attachment Logik (optional, kann in journalService bleiben) |
| `app/api/journal-entries/route.ts` | GET (list) + POST (create) |
| `app/api/journal-entries/[id]/route.ts` | GET + PATCH + DELETE |
| `app/api/journal-entries/[id]/media/route.ts` | POST (add media) |
| `app/api/journal-entries/[id]/media/[attachmentId]/route.ts` | PATCH + DELETE |
| `components/features/journal/UnifiedEntryForm.tsx` | Unified Form für alle Seiten |
| `components/features/journal/JournalEntryCard.tsx` | Unified Card für Anzeige |
| `hooks/useJournalEntries.ts` | Unified Hook für CRUD + Media |
| `scripts/migrate-journal-entries.ts` | Migrationsskript für bestehende Daten |

### Zu überarbeiten

| Pfad | Änderung |
|------|----------|
| `app/page.tsx` | Tagebuch-Sektion: DiarySection → UnifiedEntryForm + JournalEntryCard |
| `app/journal/page.tsx` | DynamicJournalForm → UnifiedEntryForm + JournalEntryCard |
| `app/journal/[id]/page.tsx` | Bestehende Logik → JournalEntryCard (mode="detail") + MediaAttachments |
| `components/features/transcription/MicrophoneButton.tsx` | Ggf. Anpassungen für UnifiedEntryForm |
| `types/journal.ts` | Erweitern um neue Interfaces falls nötig |

### Nach Migration zu löschen

#### API-Routen

| Pfad | Ersetzt durch |
|------|---------------|
| `app/api/day/[id]/notes/route.ts` | `/api/journal-entries` |
| `app/api/notes/[id]/route.ts` | `/api/journal-entries/[id]` |
| `app/api/journal/route.ts` | `/api/journal-entries` |
| `app/api/journal/[id]/route.ts` | `/api/journal-entries/[id]` |

#### Komponenten

| Pfad | Ersetzt durch |
|------|---------------|
| `components/features/diary/DiarySection.tsx` | `UnifiedEntryForm` + `JournalEntryCard` |
| `components/features/diary/DiaryEntriesAccordion.tsx` | `JournalEntryCard` (mode="compact") |
| `components/features/journal/DynamicJournalForm.tsx` | `UnifiedEntryForm` |

#### Hooks

| Pfad | Ersetzt durch |
|------|---------------|
| `hooks/useDiaryManagement.ts` | `useJournalEntries` (Journal-Teil) |

**Hinweis:** `useDiaryManagement.ts` enthält auch Logik für Habits, Symptoms etc. Diese Teile müssen in separate Hooks extrahiert oder in `app/page.tsx` belassen werden, bevor die Datei gelöscht wird.

### Dateien die NICHT geändert werden

Diese Dateien bleiben unverändert:

| Pfad | Grund |
|------|-------|
| `app/api/diary/upload-audio/route.ts` | Weiterhin für Audio-Upload verwendet |
| `app/api/journal-ai/segment-audio/route.ts` | Weiterhin für Audio-Segmentierung verwendet |
| `app/api/journal-ai/pipeline/route.ts` | Weiterhin für AI-Pipeline verwendet |
| `app/api/generate-title/route.ts` | Weiterhin für Titel-Generierung verwendet |
| `components/features/diary/DarmkurSection.tsx` | Separate Funktionalität (Darmkur) |
| `components/features/habits/*` | Unabhängige Funktionalität |
| `components/features/symptoms/*` | Unabhängige Funktionalität |

---

## 9. Implementierungsplan

Dieser Plan beschreibt die schrittweise Umsetzung. **LLM** = Wird von der KI implementiert, **Mensch** = Erfordert manuelle Aktion.

### 9.1 Phase 1: Backend

#### 9.1.1 JournalService erstellen (LLM)

**Referenz:** Kapitel 6.1

**Aufgaben:**
- Erstelle `lib/services/journal/types.ts` mit `CreateEntryParams`, `UpdateEntryParams`, `EntryWithRelations`
- Erstelle `lib/services/journal/journalService.ts` mit allen CRUD-Methoden
- Implementiere `resolveTimeBox` für automatische TimeBox-Auflösung
- Implementiere `lean`-Modus in `listEntries`
- Stelle sicher, dass alle Media-Queries `userId`-Checks enthalten

**Validierung:** TypeScript kompiliert ohne Fehler

#### 9.1.2 API-Routen erstellen (LLM)

**Referenz:** Kapitel 6.3

**Aufgaben:**
- Erstelle `app/api/journal-entries/route.ts` (GET list, POST create)
- Erstelle `app/api/journal-entries/[id]/route.ts` (GET, PATCH, DELETE)
- Erstelle `app/api/journal-entries/[id]/media/route.ts` (POST add)
- Erstelle `app/api/journal-entries/[id]/media/[attachmentId]/route.ts` (PATCH, DELETE)
- Alle Routen nutzen `createJournalService(prisma)` (kein Singleton)
- Zod-Validierung für alle Request-Bodies

**Validierung:** API-Endpunkte mit curl/Postman testen

#### 9.1.3 Migrationsskript erstellen (LLM)

**Referenz:** Kapitel 8.2

**Aufgaben:**
- Erstelle `scripts/migrate-journal-entries.ts`
- Implementiere Entity-Erstellung für alle Einträge ohne Entity
- Implementiere Default-Sharing-Anwendung
- Optional: Mentions-Erkennung (regex-basiert, keine LLM-Calls)

**Validierung:** Trockenlauf mit `--dry-run` Flag

#### 9.1.4 Migrationsskript ausführen (Mensch)

**Voraussetzung:** Datenbank-Backup erstellen

**Befehl:**
```bash
# Backup erstellen
pg_dump -h localhost -U postgres comp_act_diary > backup_$(date +%Y%m%d).sql

# Migration ausführen
npx tsx scripts/migrate-journal-entries.ts
```

**Validierung:** Stats prüfen, keine Fehler

---

### 9.2 Phase 2: Frontend-Komponenten

#### 9.2.1 useJournalEntries Hook erstellen (LLM)

**Referenz:** Kapitel 7.3

**Aufgaben:**
- Erstelle `hooks/useJournalEntries.ts`
- Implementiere alle CRUD-Operationen gegen `/api/journal-entries`
- Implementiere Optimistic Updates für `createEntry`
- Implementiere Media-Operationen (addAudio, removeAudio, etc.)
- Implementiere AI-Trigger-Funktionen (runPipeline, generateTitle)

**Validierung:** Hook in isolierter Testseite testen

#### 9.2.2 JournalEntryCard Komponente erstellen (LLM)

**Referenz:** Kapitel 7.2

**Aufgaben:**
- Erstelle `components/features/journal/JournalEntryCard.tsx`
- Implementiere `mode`-Prop mit `compact`, `expanded`, `detail`
- `compact`: Nur Typ-Badge, Titel, Preview-Text, Datum
- `expanded`: + Audio-Player, Fotos
- `detail`: + Alle Buttons (Edit, Delete, AI, Share)
- Interne Sub-Komponenten für Wartbarkeit (EntryHeader, EntryContent, EntryMedia, EntryActions)

**Validierung:** Storybook oder isolierte Testseite

#### 9.2.3 UnifiedEntryForm Komponente erstellen (LLM)

**Referenz:** Kapitel 7.1

**Aufgaben:**
- Erstelle `components/features/journal/UnifiedEntryForm.tsx`
- Implementiere Type-Selector und Template-Selector
- Integriere RichTextEditor für Textarea-Felder
- Integriere MicrophoneButton (per Feld + per Entry)
- Integriere AudioUploadButton (per Entry, triggert Segmentierung wenn Template >1 Feld)
- Integriere OCRUploadButton und Photo-Upload
- Verwende `react-hook-form` mit `FormProvider`

**Validierung:** Formular auf Testseite mit allen Feldern testen

---

### 9.3 Phase 3: Seiten-Integration

#### 9.3.1 Journal-Seite umstellen (LLM)

**Datei:** `app/journal/page.tsx`

**Aufgaben:**
- Ersetze lokalen State durch `useJournalEntries` Hook
- Ersetze `DynamicJournalForm` durch `UnifiedEntryForm`
- Ersetze lokale `JournalEntryCard` durch neue Komponente
- Entferne direkte API-Aufrufe

**Validierung:** Alle Features auf `/journal` testen (Create, List, Click-to-Detail)

#### 9.3.2 Detail-Seite umstellen (LLM)

**Datei:** `app/journal/[id]/page.tsx`

**Aufgaben:**
- Lade Eintrag über `useJournalEntries` oder direkten API-Call
- Verwende `JournalEntryCard` mit `mode="detail"`
- Implementiere Edit-Mode mit `UnifiedEntryForm`
- Integriere Media-Attachments-Anzeige und -Aktionen

**Validierung:** Alle Features auf Detail-Seite testen (View, Edit, Delete, Audio, Fotos, AI)

#### 9.3.3 Startseite umstellen (LLM)

**Datei:** `app/page.tsx`

**Aufgaben:**
- Nur Tagebuch-Sektion ändern (Kalender, Summary bleiben unverändert)
- Ersetze `DiarySection` durch `UnifiedEntryForm` + `JournalEntryCard`-Liste
- Verwende `useJournalEntries` mit `timeBoxId`-Filter
- Behalte restliche Diary-Logik (Habits, Symptoms) in `useDiaryManagement`

**Validierung:** Alle Features auf Startseite testen

---

### 9.4 Phase 4: Cleanup & Tests

#### 9.4.1 Legacy-APIs entfernen (LLM)

**Referenz:** Kapitel 8.4 (Nach Migration zu löschen)

**Aufgaben:**
- Lösche `app/api/day/[id]/notes/route.ts`
- Lösche `app/api/notes/[noteId]/route.ts`
- Lösche `app/api/journal/route.ts`
- Lösche `app/api/journal/[id]/route.ts`

**Validierung:** `grep -r "/api/day/\|/api/notes/\|/api/journal/" app/` sollte keine Treffer zeigen

#### 9.4.2 Legacy-Komponenten entfernen (LLM)

**Aufgaben:**
- Lösche `components/features/diary/DiarySection.tsx`
- Lösche `components/features/diary/DiaryEntriesAccordion.tsx`
- Lösche `components/features/journal/DynamicJournalForm.tsx`
- Prüfe und entferne ungenutzte Imports

**Validierung:** Build ohne Fehler

#### 9.4.3 Legacy-Hooks bereinigen (LLM)

**Aufgaben:**
- Entferne Journal-bezogene Logik aus `hooks/useDiaryManagement.ts`
- Behalte Habits/Symptoms-Logik oder extrahiere in separate Hooks
- Falls `useDiaryManagement` leer ist, Datei löschen

**Validierung:** Startseite funktioniert weiterhin

#### 9.4.4 Finale Tests (Mensch)

**Aufgaben:**
- E2E-Test: Eintrag erstellen auf Startseite → in Journal-Liste sichtbar
- E2E-Test: Eintrag auf Journal-Seite erstellen → auf Startseite sichtbar
- E2E-Test: Audio-Aufnahme mit Template-Segmentierung
- E2E-Test: AI-Pipeline manuell triggern
- E2E-Test: Re-Transkription
- Prüfe: Keine Console-Errors, keine 404s auf alte APIs

**Validierung:** Alle Tests bestanden

---

## 10. Risiken und Mitigation

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Datenverlust bei Migration | Gering | Backup vor Migration, Migrationsskript ist idempotent |
| Breaking Changes in API | Mittel | Alle Frontends gleichzeitig umstellen |
| Performance-Regression | Gering | `listEntries` lädt Attachments effizient in Batch |
| Fehlende Features in neuen Komponenten | Mittel | Feature-Checklisten in Komponenten-Dokumentation |

---

## 11. Erfolgsmetriken

- [ ] Alle JournalEntries haben Entity-Einträge
- [ ] Alle CRUD-Operationen nutzen einheitliche API
- [ ] Keine Code-Duplizierung zwischen Startseite und Journal-Seite
- [ ] Alle Features auf beiden Seiten verfügbar
- [ ] Keine Legacy-API-Routen mehr vorhanden
