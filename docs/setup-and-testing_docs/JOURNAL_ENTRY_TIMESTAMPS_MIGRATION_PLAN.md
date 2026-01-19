<!-- Setup doc: Migration plan for journal entry timestamps -->
# Journal Entry Timestamps Migration Plan

## Ziel

Saubere Einfuehrung von **JournalEntry.occurredAt** (Bezugzeit) und **JournalEntry.capturedAt** (Erfassungszeit) ohne klassische Prisma-Migrationen, sondern via `npx prisma db push`, inklusive Backfill und schrittweiser App-Umstellung.

## Datenverlust-Risiko (db push)

- **Niedrig**, solange nur **neue Spalten** hinzugefuegt werden.
- **Hoeheres Risiko** nur bei Spalten-Entfernung oder Typ-Wechsel mit `--accept-data-loss`.
- Empfehlung: **Backup** vor Prod-Deploy (siehe Workflow unten).

## Vorbedingungen / Entscheidungen

1. **Soll `occurredAt` nullable bleiben?**
   - Empfehlung: **zuerst nullable**, nach Backfill optional auf `NOT NULL` ziehen.
2. **Default fuer `occurredAt`:**
   - `1970-01-01` als „Null-Jahr“ (DB Default + Backfill).
3. **Backfill fuer `MediaAsset.capturedAt`:**
   - Ja, auf `createdAt` setzen (Audio/Bild), falls Daten fehlen.
4. **Override-Endpoint fuer Erfassungszeit:**
   - `PATCH /api/media-assets/[id]` fuer Audio/Bild, `PATCH /api/notes/[noteId]` fuer Text.

## Schritt-fuer-Schritt Plan

### Phase 1: Vorbereitung (User)

1. Backup der DB (vor Prod-Deploy).
2. Entscheide ueber Optionalitaet von `occurredAt`.
3. Entscheide, ob `capturedAt` fuer bestehende Assets gebackfillt wird.

### Phase 2: Schema aendern (LLM)

1. `prisma/schema.prisma`: Felder ergaenzen:
   - `occurredAt DateTime?` in `JournalEntry` mit DB-Default `1970-01-01`.
   - `capturedAt DateTime?` in `JournalEntry`.
   - Optional: Index z. B. `@@index([timeBoxId, occurredAt])`.
2. Prisma Client Typen neu generieren (lokal).

### Phase 3: Schema sync (LLM)

1. `npx prisma db push`
2. `npx prisma generate`
3. App lokal testen.

### Phase 4: Backfill (LLM)

SQL Skript (Beispiel):

```sql
-- Bezugzeit direkt auf createdAt setzen (sinnvoller Default)
UPDATE "JournalEntry"
SET "occurredAt" = "createdAt"
WHERE "occurredAt" IS NULL;

-- Optional: Erfassungszeit fuer bestehende Assets setzen
UPDATE "MediaAsset"
SET "capturedAt" = "createdAt"
WHERE "capturedAt" IS NULL
  AND ("mimeType" LIKE 'audio/%' OR "mimeType" LIKE 'image/%');

-- Optional: Erfassungszeit fuer Text-Eintraege setzen
UPDATE "JournalEntry"
SET "capturedAt" = "createdAt"
WHERE "capturedAt" IS NULL;
```

### Phase 5: App-Umstellung (LLM)

1. **API Schreiben**
   - `POST /api/day/[id]/notes`: `occurredAt` + `capturedAt` setzen.
   - `PATCH /api/notes/[noteId]`: `occurredAt` + `capturedAt` editierbar.
   - `PATCH /api/media-assets/[id]`: `capturedAt` fuer Audio/Bild editierbar.
2. **API Lesen**
   - `occurredAtIso` aus `occurredAt` (bei 1970 optionaler Fallback auf `createdAt`).
   - `capturedAtIso` (Entry) aus `JournalEntry.capturedAt`.
   - `audioCapturedAtIso`/`audioUploadedAtIso` aus `MediaAsset`.
3. **GUI**
   - Bezugzeit als Zeit im Header.
   - Erfassungszeit unter Titel (immer sichtbar), Uploadzeit nahe Audio/OCR.
   - Erfassungszeit-Input sichtbar **nach Upload** (und vorbefuellt).
   - Zeit-Modal (Uhr-Icon) fuer bestehende Eintraege: Bezugzeit + Erfassungszeit editierbar.
4. **Uploads**
   - Audio/OCR Endpoints nehmen `capturedAt` an und speichern es.

### Phase 6: Prod-Deploy (User)

1. `SYNC_SCHEMA=true` setzen (temporar) und deployen.
2. Verifikation, dann `SYNC_SCHEMA` wieder entfernen und neu deployen.
3. Backfill-SQL in der Prod-DB ausfuehren.

### Phase 7 (optional): `occurredAt` verpflichtend machen

1. Nach stabiler Nutzung `occurredAt` auf `DateTime` (non-null) ziehen.
2. Erneut `db push` und Tests.

## Test-Checkliste (User)

- [ ] Tagebucheintrag (Text): Bezugzeit editierbar, Sortierung korrekt.
- [ ] MicrophoneButton: Erfassungszeit = Recording-Start, danach editierbar.
- [ ] AudioUpload: Default aus Datei (lastModified), danach editierbar.
- [ ] OCR Upload: Default aus Datei (lastModified), danach editierbar.
- [ ] Uploadzeit erscheint bei Audio und OCR.

## Aufgabenaufteilung

### LLM liefert

- Schema-Update (occurredAt + Indexe)
- API Anpassungen (read/write)
- UI Anpassungen (Anzeige + Inputs)
- Validierung/Mapping der Zeitfelder

### User macht manuell

- Backup vor Prod-Deploy
- Prod-Deploy mit `SYNC_SCHEMA=true` gem. Workflow
- Backfill SQL in Prod-DB ausfuehren
