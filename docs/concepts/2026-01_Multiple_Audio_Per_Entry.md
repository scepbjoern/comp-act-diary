# Konzept: Multiple Audio-Dateien pro JournalEntry

## Zielsetzung

Ermöglichen, dass ein JournalEntry mehrere Audio-Dateien haben kann, jeweils mit eigenem Original-Transkript. Dies ist nötig für:

1. **Nachträgliches Hinzufügen**: Weitere Audio-Aufnahme zu bestehendem Eintrag
2. **Feld-spezifische Aufnahmen**: Bei Templates mit mehreren Feldern je eine Aufnahme pro Feld
3. **Kombinieren statt Ersetzen**: Neuer Audio-Text wird angehängt, nicht überschrieben

---

## Aktueller Zustand

```prisma
model JournalEntry {
  // ...
  originalTranscript       String?   // Einzelnes Transkript
  originalTranscriptModel  String?   // Einzelnes Modell
  
  // Audio via MediaAttachment
  mediaAttachments  MediaAttachment[]
}

model MediaAttachment {
  id        String      @id @default(uuid())
  assetId   String
  entityId  String      // → JournalEntry.id
  role      AttachmentRole  // ATTACHMENT, GENERATED, etc.
  // ... keine Transkript-Felder
}

model MediaAsset {
  id        String   @id @default(uuid())
  filePath  String
  mimeType  String
  duration  Float?   // Audio-Dauer
  // ... keine Transkript-Felder
}
```

**Problem**: `originalTranscript` ist direkt am JournalEntry → nur ein Transkript möglich.

---

## Lösung (Implementiert)

### Option A: Transkript am MediaAsset speichern

```prisma
model MediaAsset {
  // ... bestehende Felder ...
  
  /// Original-Transkript (bei Audio-Dateien)
  transcript       String?
  /// Modell das für Transkription verwendet wurde
  transcriptModel  String?
}
```

**Vorteile**:
- Transkript gehört logisch zur Audio-Datei
- Wiederverwendbar wenn Asset mehrfach verlinkt
- Minimale Schema-Änderung

**Nachteile**:
- MediaAsset wird "fetter" (auch für Nicht-Audio)

### Option B: Transkript am MediaAttachment speichern

```prisma
model MediaAttachment {
  // ... bestehende Felder ...
  
  /// Original-Transkript (bei Audio-Attachments)
  transcript       String?
  /// Modell das für Transkription verwendet wurde
  transcriptModel  String?
  /// Optional: Feld-ID wenn Aufnahme zu spezifischem Template-Feld gehört
  fieldId          String?
}
```

**Vorteile**:
- Transkript ist Entry-spezifisch (falls Asset wiederverwendet würde)
- `fieldId` ermöglicht Zuordnung zu Template-Feld

**Nachteile**:
- Etwas mehr Redundanz

### Empfehlung: **Option B (umgesetzt)**

Begründung: `fieldId` ist wichtig für Template-Integration, und Transkript gehört zur Verknüpfung Entry↔Asset.

---

## Datenmodell-Änderung

```prisma
model MediaAttachment {
  id            String          @id @default(uuid())
  assetId       String
  entityId      String
  userId        String
  role          AttachmentRole  @default(ATTACHMENT)
  timeBoxId     String?
  sortOrder     Int?
  createdAt     DateTime        @default(now())
  
  // NEU: Audio-Transkript-Felder
  /// Original-Transkript (bei Audio-Attachments)
  transcript       String?
  /// Modell das für Transkription verwendet wurde
  transcriptModel  String?
  /// Feld-ID wenn Aufnahme zu spezifischem Template-Feld gehört
  fieldId          String?
  
  // Relationen
  asset     MediaAsset  @relation(fields: [assetId], references: [id], onDelete: Cascade)
  entity    Entity      @relation(fields: [entityId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  timeBox   TimeBox?    @relation(fields: [timeBoxId], references: [id])
}
```

---

## Migration (Ist-Zustand)

### Schritt 1: Schema erweitern

```sql
ALTER TABLE "MediaAttachment" 
  ADD COLUMN "transcript" TEXT,
  ADD COLUMN "transcriptModel" TEXT,
  ADD COLUMN "fieldId" TEXT;
```

### Schritt 2: Bestehende Daten migrieren

```typescript
// Migration: JournalEntry.originalTranscript → MediaAttachment.transcript
// Siehe: scripts/migrate-transcripts-to-attachments.ts
// - migriert nur, wenn das erste Audio-Attachment noch KEIN Transcript hat
// - lässt JournalEntry.originalTranscript für Legacy-Kompatibilität bestehen
```

### Schritt 3: Alte Felder deprecaten

```prisma
model JournalEntry {
  // ...
  /// @deprecated - Use MediaAttachment.transcript instead
  originalTranscript       String?
  /// @deprecated - Use MediaAttachment.transcriptModel instead
  originalTranscriptModel  String?
}
```

**Hinweis**: Felder vorerst behalten für Rückwärtskompatibilität, später entfernen.

---

## API-Anpassungen (Ist)

### Upload-Audio Endpoint (neue Einträge)

`POST /api/diary/upload-audio` → erstellt **MediaAsset**, noch **kein MediaAttachment**.
Die Attachments entstehen erst beim Speichern des Eintrags.

```typescript
return {
  text,         // Transkript
  audioFileId,  // MediaAsset.id (wird beim Speichern verknüpft)
  model,
  ...
}
```

### Endpoint: Audio zu bestehendem Entry hinzufügen

`POST /api/journal-entries/{id}/audio`

```typescript
// Response enthält attachmentId, transcript, model
// appendText steuert ob der Text am JournalEntry.content angehängt wird
```

### Endpoint: Transcript eines Attachments aktualisieren

`PATCH /api/journal-entries/{id}/audio`

```typescript
{ attachmentId, transcript, transcriptModel }
```

---

## UI-Anpassungen (Ist)

### DiarySection / DynamicJournalForm

```
┌─────────────────────────────────────────────────────────────────┐
│  (Textarea mit bestehendem Text)                                │
│                                                                 │
│  Angehängte Audios:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🎵 14:30 (2:15)  "Am Morgen habe ich..."    [▶️] [🗑️]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🎵 15:45 (1:30)  "Später dann..."           [▶️] [🗑️]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [🎤 Aufnehmen]  [📁 Audio hochladen]                          │
└─────────────────────────────────────────────────────────────────┘
```

- Neue Aufnahme → Text wird an Cursor/Ende angehängt
- Original-Transkripte bleiben pro Audio erhalten
- „Übernehmen“ wird nur angezeigt, wenn **genau ein** Audio vorhanden ist
- „Re-Transkribieren“ überschreibt **nur das zugehörige Original-Transkript**, nicht den Entry-Content
- "Verbessern" betrifft den kombinierten Text

---

## Implementierungsplan (erledigt)

| Schritt | Beschreibung | Aufwand |
|---------|--------------|---------|
| 1 | Prisma-Schema erweitern | 15 min |
| 2 | Migration schreiben | 30 min |
| 3 | Upload-Endpoint anpassen | 30 min |
| 4 | Neuen Add-Audio-Endpoint erstellen | 45 min |
| 5 | UI: Audio-Liste in DiarySection | 1h |
| 6 | UI: "Anhängen statt Ersetzen" Logik | 30 min |
| 7 | Tests | 1h |

**Geschätzter Gesamtaufwand**: ~4-5 Stunden

---

## Abhängigkeiten

- **Keine Abhängigkeit** zu JournalTemplates
- Kann **vor** oder **nach** Templates implementiert werden
- Templates profitieren von `fieldId` für Feld-spezifische Aufnahmen

---

*Konzept v1 – 28. Januar 2026*
*Implementiert: 28. Januar 2026*

---

## Implementierungsstatus

✅ **Vollständig implementiert:**
- Schema erweitert: `MediaAttachment.transcript`, `transcriptModel`, `fieldId`
- Migration-Script: `scripts/migrate-transcripts-to-attachments.ts` (migriert nur fehlende Attachment-Transkripte)
- API: `POST /api/journal-entries/[id]/audio` (Audio zu Entry hinzufügen)
- API: `GET /api/journal-entries/[id]/audio` (Audio-Attachments auflisten)
- API: `DELETE /api/journal-entries/[id]/audio?attachmentId=...` (Audio löschen)
- UI: Multi-Audio-Anzeige in DiaryEntriesAccordion
- Rückwärtskompatibilität: `JournalEntry.originalTranscript` bleibt erhalten (Legacy/Fallback, z. B. OCR)
- New-Entry Flow: `audioFileIds` + `audioTranscripts` werden bei `POST /api/day/[id]/notes` verwendet
