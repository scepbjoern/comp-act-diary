# Audio Draft Upload Fix

> **Status**: ✅ Implementiert  
> **Datum**: 2026-04-04  
> **Bezug**: `2026-02_Unified_JournalEntry_Implementation_Plan.md`, `2026-02_Phase4-5_InlineEdit_und_AudioKonsolidierung.md`, `2026-02_Phase6_Startseite_Migration.md`

---

## Kurzbeschreibung

Nach der Phase-6-Migration war die Audio-Erfassung für **neue, noch nicht gespeicherte Journal-Einträge** defekt.

Betroffen waren:

- Mikrofon-Aufnahme via `MicrophoneButton`
- Audio-Datei-Upload via `AudioUploadButton`

Symptom:

- Klick auf Stop oder Upload führte zu:
  `Standalone audio upload is no longer supported. Please save the entry first and upload audio to the entry.`

---

## Ursache

Die Legacy-Route `/api/diary/upload-audio` war bereits entfernt, aber der Create-Mode von `DynamicJournalForm` nutzte implizit weiterhin denselben Standalone-Gedanken.

Dadurch entstand ein Migrationsbruch:

1. **Bestehende Einträge** funktionierten korrekt über `/api/journal-entries/[id]/audio`
2. **Neue Einträge** ohne `existingEntryId` landeten im deaktivierten Standalone-Pfad
3. Der UI-Flow war bereits darauf vorbereitet, `audioFileIds` und `audioTranscripts` zu sammeln
4. Der Create-Flow reichte diese Daten jedoch nicht überall konsistent an `createEntry` weiter

---

## Umgesetzte Lösung

### 1. Draft-Audio-Flow über `/api/transcribe`

Die Route `/api/transcribe` unterstützt jetzt zwei Modi:

- **Nur Transkription** wie bisher
- **Draft-Audio-Upload** bei `keepAudio=true`

Im Draft-Modus passiert Folgendes:

1. Audio wird transkribiert
2. Optional wird ein `MediaAsset` erzeugt
3. Die Route gibt `text`, `assetId`, `filePath`, `capturedAt` und `model` zurück
4. Es wird noch **kein** `MediaAttachment` erzeugt, weil der Journal-Eintrag noch nicht existiert

### 2. Create-Flow direkt an `createEntry`

Neue Einträge geben nun direkt an `createEntry` weiter:

- `audioFileIds`
- `audioTranscripts`
- `ocrAssetIds`
- `photoAssetIds`
- `capturedAt`
- `fieldValues`

Dadurch entsteht die Verknüpfung der Audio-Dateien direkt im Service `createEntry()` und nicht erst über fehleranfällige Nachverknüpfung im Frontend.

### 3. Audio-Rolle korrigiert

Audios für neue Einträge werden nun im Create-Flow korrekt als:

- `role = ATTACHMENT`

verknüpft.

Die vorherige fehlerhafte Nachverknüpfung mit `role = SOURCE` wurde entfernt.

---

## Betroffene Dateien

### Backend

- `app/api/transcribe/route.ts`
- `lib/audio/audioUploadCore.ts`

### Frontend

- `app/journal/page.tsx`
- `components/features/diary/DiarySection.tsx`
- `lib/services/journal/types.ts`

### Dokumentation

- `docs/concepts/implemented/2026-02_Unified_JournalEntry_Implementation_Plan.md`
- `docs/concepts/implemented/2026-02_Phase4-5_InlineEdit_und_AudioKonsolidierung.md`
- `lib/help/content/02-tagebuch.ts`

---

## Erwartetes Verhalten nach dem Fix

### Neue Einträge

- Mikrofon kann sofort bei leerem Eintrag gestartet werden
- Stop transkribiert die Aufnahme erfolgreich
- Das Transkript wird sofort ins passende Feld eingefügt
- Bei aktiviertem `keepAudio` wird das Audio nach dem Speichern korrekt mit dem neuen Eintrag verknüpft
- Dasselbe gilt für hochgeladene Audio-Dateien

### Bestehende Einträge

- Verhalten bleibt unverändert
- Upload läuft weiterhin direkt über `/api/journal-entries/[id]/audio`

---

## Manuell zu prüfende Szenarien

1. Neuer leerer Tagebucheintrag + Mikrofonaufnahme
2. Neuer leerer Tagebucheintrag + Audio-Datei-Upload
3. Neuer Eintrag + normales Speichern
4. Neuer Eintrag + Speichern und danach KI-Pipeline
5. Bestehender Eintrag + Mikrofonaufnahme
6. Bestehender Eintrag + Audio-Datei-Upload
7. Multi-Feld-Template mit Audio-Segmentierung

---

## Hinweise

- Es gab **keine Prisma-Schema-Änderung**.
- `prisma/schema.prisma` und `prisma/seed.ts` mussten daher nicht angepasst werden.
