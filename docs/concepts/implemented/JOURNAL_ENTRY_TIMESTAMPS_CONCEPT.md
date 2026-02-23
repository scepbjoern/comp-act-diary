<!-- Concept doc: Journal entry timestamps -->
# Journal Entry Timestamps Concept

## Uebersicht

Dieses Dokument beschreibt die drei Zeitpunkte rund um Tagebucheintraege und Medien-Uploads. Ziel ist eine klare Trennung zwischen **Bezugzeit**, **Erfassungszeit** und **Uploadzeit**, inkl. konsistenter Anzeige/Bedienung in der UI sowie sauberer Nutzung in der API. Es gilt fuer Texteingabe, MicrophoneButton, AudioUploadButton und OCR-Uploads.

## Ziele

1. **Klare Begriffe** (Deutsch/Englisch) fuer alle drei Zeitpunkte.
2. **Korrekte Sortierung** nach Bezugzeit, unabhaengig von Upload/Recording.
3. **Konsistente UI**: Bezugzeit und Erfassungszeit immer editierbar, Uploadzeit read-only.
4. **Best-effort Defaults** aus Dateimetadaten, aber immer **manuell uebersteuerbar**.

## Begriffe & Definitionen

| Deutscher Begriff | Englischer Begriff | Definition | UI-Kurzlabel |
|---|---|---|---|
| **Bezugzeit** | **Occurrence Time** | Der Zeitpunkt, auf den sich der Eintrag inhaltlich bezieht (Tag/Uhrzeit des Ereignisses). Wird fuer Sortierung und Tagesansicht verwendet. | Bezugzeit |
| **Erfassungszeit** | **Capture Time** | Zeitpunkt, an dem der Inhalt tatsaechlich erstellt wurde (Text verfasst, Audio aufgenommen, Bild erstellt). Kann aus Dateimetadaten kommen oder manuell gesetzt werden. | Erfassungszeit |
| **Uploadzeit** | **Upload Time** | Zeitpunkt, an dem die Datei in die App hochgeladen wurde. Immer systemseitig gesetzt, read-only. | Uploadzeit |

> Hinweis: `JournalEntry.createdAt` bleibt als **System-Create-Zeit** bestehen (Audit), wird aber **nicht** in der UI als eigener Zeitpunkt angezeigt.

## Datenmodell (Zielzustand)

| Zeitpunkt | Tabelle/Feld | Bemerkung |
|---|---|---|
| Bezugzeit | `JournalEntry.occurredAt` (neu) | Pro Eintrag ein Zeitpunkt (DateTime), fuer Sortierung/Anzeige. |
| Erfassungszeit | `JournalEntry.capturedAt` (neu) | Pro Eintrag ein Zeitpunkt (DateTime), v. a. fuer Texte ohne Media. |
| Erfassungszeit (Media) | `MediaAsset.capturedAt` (bestehend) | Pro MediaAsset; bei Audio/Bild gesetzt. |
| Uploadzeit | `MediaAsset.createdAt` (bestehend) | Systemzeitpunkt des Uploads. |
| Bezug-Tag | `TimeBox.localDate` | Tag der Tagesansicht (Kalender), bleibt unveraendert. |

Zusatz:

- `JournalEntry.createdAt` bleibt **System-Create-Zeit** fuer Audit/Debug (nicht als fachlicher Zeitpunkt angezeigt).

## Zeitpunkt-Details (DB / API / GUI)

### Bezugzeit (Occurrence Time)

- **DB:** `JournalEntry.occurredAt` (neu) + `TimeBox.localDate` fuer den Tag.
- **API (Schreiben):**
  - `POST /api/day/[id]/notes` nimmt `date` + `time` oder `occurredAt` und speichert `occurredAt`.
  - `PATCH /api/notes/[noteId]` erlaubt Updates von `occurredAt` (Zeit-Editor).
- **API (Lesen):** `occurredAtIso` aus `JournalEntry.occurredAt`.
- **GUI:**
  - **Header-Zeit** (neben dem Titel) zeigt die Bezugzeit.
  - **Editierbar** via Datum+Zeit-Inputs im Tagebuchformular und beim Editieren.

### Erfassungszeit (Capture Time)

- **DB:**
  - `JournalEntry.capturedAt` fuer Eintraege ohne Media.
  - `MediaAsset.capturedAt` fuer Audio/Bild (primaries).
- **API (Schreiben):**
  - `POST /api/day/[id]/notes` nimmt `capturedAt` fuer Texteingabe (optional).
  - `POST /api/diary/upload-audio` nimmt `capturedAt` (ISO) und speichert `MediaAsset.capturedAt`.
  - `POST /api/ocr/extract` nimmt `capturedAt` (ISO) und speichert `MediaAsset.capturedAt`.
  - **Override fuer bestehende Eintraege:** `PATCH /api/media-assets/[id]` fuer Audio/Bild sowie `PATCH /api/notes/[noteId]` fuer Texte.
- **API (Lesen):**
  - `capturedAtIso` (Entry) aus `JournalEntry.capturedAt`.
  - `audioCapturedAtIso` / `imageCapturedAtIso` aus `MediaAsset.capturedAt`.
- **GUI:**
  - **Unter dem Titel** als kleine Zeile: Erfassungszeit (immer sichtbar).
  - **Editierbar vor dem Speichern** (Formularfelder). Bei Uploads wird das Feld nach erfolgreichem Upload sichtbar.

### Uploadzeit (Upload Time)

- **DB:** `MediaAsset.createdAt`.
- **API (Lesen):** `audioUploadedAtIso` / `imageUploadedAtIso` aus `MediaAsset.createdAt`.
- **GUI:**
  - **Read-only**, angezeigt nahe Audio-Player bzw. OCR-Panel.

## GUI Nutzung & Verhalten (Zielzustand)

### Anzeige-Positionen

- **Unter dem Titel** (klein): *Erfassungszeit* (immer sichtbar, nach Aufloesungsregel).
- **Nahe Audio/OCR** (klein): *Uploadzeit* bei Audio **und** Bild-OCR.
- **Sortierung**: Immer nach Bezugzeit (`occurredAt`).

### Entstehungsarten (Matrix)

| Entstehung | Bezugzeit (occurrence) | Erfassungszeit (capture) | Uploadzeit | UI/Interaktion |
|---|---|---|---|---|
| Texteingabe | Default: jetzt; editierbar via Datum+Zeit | Default: jetzt; editierbar vor dem Speichern | n/a | Datum/Zeit-Inputs immer sichtbar. |
| MicrophoneButton | Default: jetzt; editierbar via Datum+Zeit | Default: Recording-Start; editierbar **nach Upload**, vor dem Speichern | gesetzt beim Upload | Unter Titel: Erfassungszeit. Uploadzeit beim Audio-Player. |
| AudioUploadButton | Default: ausgewaehlter Tag + Zeit; editierbar | Default: aus Datei (lastModified/Metadaten), editierbar **nach Upload**, vor dem Speichern | gesetzt beim Upload | Erfassungszeit-Eingabe wird nach Upload sichtbar. |
| OCR Bild-Upload | Default: ausgewaehlter Tag + Zeit; editierbar | Default: aus EXIF/lastModified, editierbar **nach Upload**, vor dem Speichern | gesetzt beim Upload | Uploadzeit nahe OCR-Panel. |

> Standard-Logik: Bezugzeit ist die Zeit, nach der sortiert wird. Erfassungszeit kann abweichen und wird separat angezeigt.

## Default-Logik fuer Erfassungszeit (Best Effort)

1. **Client-Default**: `File.lastModified` (Browser) direkt nach Upload.
2. **Optional**: Metadaten (EXIF/ID3) serverseitig waehrend der Verarbeitung.
3. **Fallback**: aktueller Zeitpunkt.
4. **Immer** manuell uebersteuerbar nach Upload.

**Hinweis zur Zuverlaessigkeit:** Wenn ein `File`-Objekt ohne `lastModified` erstellt wird, setzen Browser den Wert auf `Date.now()` beim Erstellen des File-Objekts. Darum ist `File.lastModified` ein Best-Effort-Default und muss uebersteuerbar bleiben.

**Aufloesungsregel (Erfassungszeit):**
- Wenn Audio/Bild vorhanden: `MediaAsset.capturedAt` anzeigen/verwenden.
- Sonst: `JournalEntry.capturedAt` anzeigen/verwenden.

## Zeit-Modal fuer bestehende Eintraege

- **Icon:** Uhr-Symbol pro Eintrag, **links neben dem AI-Einstellungen-Button**.
- **Modal-Inhalt:**
  - Bezugzeit (Datum + Zeit, editierbar)
  - Erfassungszeit (Datum + Zeit, editierbar)
  - Uploadzeit (read-only, bei Audio/OCR)
- **Speichern:** aktualisiert `JournalEntry.occurredAt`, `JournalEntry.capturedAt` bzw. `MediaAsset.capturedAt`.

## Entity-Registry Bezug

- `Entity.createdAt` ist **Systemzeit** fuer die polymorphe Entity-Registry.
- `JournalEntry.id` = `Entity.id`; die fachlichen Zeiten sind **nicht** in `Entity` gespeichert.
- UI/API nutzen ausschliesslich `JournalEntry.occurredAt`, `JournalEntry.capturedAt` und `MediaAsset.capturedAt`/`createdAt`.

## Entscheide

- **Override Endpoint:** `PATCH /api/media-assets/[id]` fuer Audio/Bild, `PATCH /api/notes/[noteId]` fuer Text.
- **Backfill:** `MediaAsset.capturedAt` wird bei bestehenden Assets auf `createdAt` gesetzt.

## Entschiedene Fragen

1. **EXIF/ID3 Parsing:** Nicht implementiert (wuerde zusaetzliche Dependency erfordern). `File.lastModified` reicht als Best-Effort-Default.
