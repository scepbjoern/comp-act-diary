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

## Migration (Abgeschlossen)

### Schritt 1: Schema erweitern ✅

```sql
ALTER TABLE "MediaAttachment" 
  ADD COLUMN "transcript" TEXT,
  ADD COLUMN "transcriptModel" TEXT,
  ADD COLUMN "fieldId" TEXT;
```

### Schritt 2: Bestehende Daten migrieren ✅

**Status**: Migration auf Dev und Prod abgeschlossen (1. Februar 2026).
- 2 Einträge migriert (hatten Attachments ohne Transcript)
- 19 Einträge bereits migriert (Attachments hatten bereits Transcript durch neue Upload-Flows)
- Script wurde nach erfolgreicher Migration entfernt

### Schritt 3: APIs angepasst ✅

Alle schreibenden Operationen befüllen `originalTranscript`/`originalTranscriptModel` **nicht mehr aktiv**:
- `POST /api/day/[id]/notes`: Transcripts nur auf MediaAttachment
- `POST /api/ocr/process-entry`: OCR-Text als Attachment-Transcript gespeichert
- `POST /api/diary/upload-audio`: Transcript wird beim Entry-Save an Attachment gebunden

Lesende Operationen bevorzugen `MediaAttachment.transcript`, mit Fallback auf `JournalEntry.originalTranscript`:
- `GET /api/notes/[noteId]/original-transcript`
- `GET /api/day/[id]/notes`
- `JournalAIService.generateContent`

### Schritt 4: Legacy-Felder

```prisma
model JournalEntry {
  // ...
  /// Legacy-Feld: Wird nur noch als Fallback gelesen, nicht mehr geschrieben
  originalTranscript       String?
  /// Legacy-Feld: Wird nur noch als Fallback gelesen, nicht mehr geschrieben
  originalTranscriptModel  String?
}
```

**Entscheidung**: Felder bleiben im Schema für Backward Compatibility. Sie verursachen keine Probleme, wenn sie einfach nicht mehr befüllt werden. Alte Einträge funktionieren weiterhin.

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

✅ **Phase 1: Multi-Audio Infrastruktur (28. Januar 2026)**
- Schema erweitert: `MediaAttachment.transcript`, `transcriptModel`, `fieldId`
- API: `POST /api/journal-entries/[id]/audio` (Audio zu Entry hinzufügen)
- API: `PATCH /api/journal-entries/[id]/audio` (Attachment-Transcript aktualisieren)
- API: `DELETE /api/journal-entries/[id]/audio?attachmentId=...` (spezifisches Audio löschen)
- UI: Multi-Audio-Anzeige in `DiaryEntriesAccordion`
- UI: "Übernehmen"-Button nur bei genau einem Audio
- UI: "Re-Transkribieren" aktualisiert nur Attachment-Transcript, nicht Entry-Content
- New-Entry Flow: `audioFileIds` + `audioTranscripts` bei `POST /api/day/[id]/notes`

✅ **Phase 2: Legacy-Cleanup (1. Februar 2026)**
- Migration abgeschlossen: 21 Einträge (2 migriert, 19 bereits im neuen Format)
- Migrations-Script entfernt nach erfolgreicher Ausführung
- Alle schreibenden APIs angepasst: setzen `originalTranscript` nicht mehr aktiv
- Lesende APIs bevorzugen `MediaAttachment.transcript` mit Fallback auf `JournalEntry.originalTranscript`
- OCR-Flow nutzt jetzt `MediaAttachment.transcript` statt `JournalEntry.originalTranscript`
- Audio-Lösch-Funktion arbeitet auf Attachment-Ebene (UI + Hook + API)
- Legacy-Felder verbleiben im Schema für Backward Compatibility (nur noch Fallback-Lesezugriff)

---

*Konzept v1 – 28. Januar 2026*  
*Phase 1 implementiert: 28. Januar 2026*  
*Phase 2 abgeschlossen: 1. Februar 2026*
