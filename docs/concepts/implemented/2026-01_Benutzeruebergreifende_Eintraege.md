<!--
Datei: 2026-01_Benutzeruebergreifende_Eintraege.md
Zweck: Konzept fuer benutzeruebergreifende Journal-Eintraege mit Lese- oder Edit-Rechten.
-->

# Benutzeruebergreifende Eintraege - Konzept

## Inhaltsverzeichnis

1. [Beschreibung des geplanten Features](#beschreibung-des-geplanten-features)
2. [Architekturuebersicht (ASCII)](#architekturuebersicht-ascii)
3. [Komponentenbeschreibung](#komponentenbeschreibung)
4. [Datenmodell](#datenmodell)
5. [Services, Libraries und API-Routen](#services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#ux-komponenten-und-screens)
7. [Neue Dependencies](#neue-dependencies)
8. [Dateistruktur](#dateistruktur)
9. [Implementierungsplan](#implementierungsplan)
10. [Automatisiertes Testing](#automatisiertes-testing)
11. [Manuelles Testing](#manuelles-testing)
12. [Fragen an den Auftraggeber](#fragen-an-den-auftraggeber)

---

## Beschreibung des geplanten Features

Ziel ist, dass mehrere Benutzer denselben JournalEntry nutzen koennen. Ein Eintrag hat weiterhin genau einen Owner, kann aber mit anderen Benutzern geteilt werden. Es gibt zwei Freigabe-Typen:

- **Read-only**: Empfaenger kann den Eintrag ansehen, aber nicht bearbeiten.
- **Edit**: Empfaenger kann Inhalt, Medien und Metadaten bearbeiten und den Eintrag loeschen.

Annahmen (koennen spaeter angepasst werden):

- Teilen erfolgt nur an bestehende Benutzer (per E-Mail).
- Owner bleibt technisch `JournalEntry.userId`; die Freigaben liegen in einer separaten Access-Tabelle.
- Geteilte Eintraege werden im Tages-View der Empfaenger angezeigt, falls `occurredAt` in die aktuelle Tages-Range faellt.
- User Settings enthalten einen Default-Share-Partner plus Auto-Share-Regeln pro JournalEntryType.
- Beim Freigeben eines Entries mit benutzerspezifischem JournalEntryType wird beim Empfaenger ein Typ angelegt, falls keiner mit gleicher `code` existiert. Dieser umfasst dieselben Attribute wie der Original-Typ (name, description, icon, color).
- AI-Aktionen (z.B. Pipeline) nutzen die Settings des aktuell angemeldeten Users, der die Aktion ausloest.

---

## Architekturuebersicht (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                          │
│  ┌─────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐ │
│  │ DiaryEntriesView    │   │ ShareEntryModal      │   │ SharedBadge     │ │
│  │ (DayView)           │   │ (neu)                │   │ (neu)           │ │
│  └──────────┬──────────┘   └──────────┬───────────┘   └────────┬────────┘ │
│             │                         │                        │          │
│             └──────────────┬──────────┴─────────────┬─────────┘          │
│                            ▼                        ▼                    │
│                     useEntryAccess hook       useSharedEntries hook       │
└────────────────────────────┬────────────────────────┬─────────────────────┘
                             ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              API ROUTES                                  │
│  /api/notes/* (erweitert)  /api/day (erweitert)  /api/journal-entries/*   │
│  /api/journal-entries/[id]/access (neu)                                   │
└────────────────────────────┬────────────────────────┬─────────────────────┘
                             ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              SERVICES                                    │
│  JournalEntryAccessService (neu)  EntryAccessValidator (neu)             │
└────────────────────────────┬────────────────────────┬─────────────────────┘
                             ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            DATABASE (PostgreSQL)                         │
│  JournalEntry  JournalEntryAccess (neu)  User                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Komponentenbeschreibung

- **Frontend**
  - DiaryEntriesView / DiaryEntriesAccordion: zeigt Eintraege des Owners und geteilt erhaltene Eintraege an, inkl. Read-only-Zustand.
  - ShareEntryModal (neu): Verwaltung der Freigaben (Benutzer suchen, Rolle setzen, Freigabe entfernen).
  - SharedBadge (neu): Kennzeichnung eines geteilten Eintrags inkl. Rolle (Viewer/Editor).
  - Hooks: `useEntryAccess`, `useSharedEntries` fuer Daten und Rechte.

- **Backend**
  - API erweitert bestehende Endpunkte um Access-Checks.
  - Neue Access-API fuer CRUD der Freigaben.
  - Validierung mit Zod.

- **Datenbank**
  - Neues Modell `JournalEntryAccess` fuer Freigaben.
  - `JournalEntry.userId` bleibt Owner-Quelle.

- **Externe Anbieter**
  - Keine zusaetzlichen externen Anbieter notwendig.

---

## Datenmodell

<!-- Annahme: Owner bleibt ueber JournalEntry.userId definiert. -->

Neue Elemente:

1. **Enum `JournalEntryAccessRole`**
   - `VIEWER` (read-only)
   - `EDITOR` (read/update/delete)

2. **Model `JournalEntryAccess`**
   - `id`
   - `journalEntryId` (FK -> JournalEntry)
   - `userId` (FK -> User)
   - `role`
   - `grantedByUserId` (FK -> User, optional, Owner oder Editor)
   - `createdAt`, `updatedAt`

Indizes:

- `@@unique([journalEntryId, userId])`
- `@@index([userId])` fuer Liste "Shared with me"
- `@@index([journalEntryId, role])`

Betroffene Entitaeten:

- **JournalEntry** bleibt Owner-basiert, keine Felder entfernt.
- **User** bekommt neue Relation `journalEntryAccess`.
- **Entity** bleibt unveraendert.

Zusatz: User Settings (Sharing Defaults)

```
User.settings.sharingDefaults = {
  defaultShareUserId: string | null,
  defaultShareRole: 'VIEWER' | 'EDITOR',
  autoShareByType: Array<{
    journalEntryTypeId: string,
    shareWithUserId: string,
    role: 'VIEWER' | 'EDITOR'
  }>
}
```

- `defaultShareUserId` wird im UI ueber E-Mail ausgewaehlt und als User-ID gespeichert.
- `autoShareByType` referenziert `JournalEntryType.id` (funktioniert fuer System- und Custom-Typen).
- Beim Freigeben eines Entries mit benutzerspezifischem Typ wird ein passender Typ beim Empfaenger erstellt (ohne `defaultTemplateId`).

---

## Services, Libraries und API-Routen

### Services

- `JournalEntryAccessService`
  - `getAccessRole(entryId, userId)`
  - `canRead/canEdit/canDelete`
  - `listSharedEntries(userId, dateRange?)`
  - `grantAccess(entryId, targetUserId, role)`
  - `revokeAccess(entryId, targetUserId)`
  - `resolveShareDefaults(userId, entryTypeId)`
  - `applyDefaultSharingOnCreate(entryId, creatorUserId, entryTypeId)`
  - `ensureRecipientEntryTypeExists(entryTypeId, recipientUserId)`

### Libraries

- **Prisma** (Schema + Query)
- **Zod** (API Validierung)

### API-Routen (geplant)

Neu:

- `GET /api/journal-entries/[id]/access` (Liste freigegebener User)
- `POST /api/journal-entries/[id]/access` (Freigabe erteilen)
- `PATCH /api/journal-entries/[id]/access/[userId]` (Rolle anpassen)
- `DELETE /api/journal-entries/[id]/access/[userId]` (Freigabe entfernen)
- `GET /api/journal-entries/shared` (Eintraege, die mir freigegeben sind)

Erweitert:

- `GET /api/day` (zusaetzliche Eintraege via Access + occurredAt Range)
- `POST /api/day/[id]/notes` (Owner setzt Access nur fuer eigenes UserId, Auto-Share anwenden)
- `PATCH /api/notes/[noteId]` (Access-Check)
- `DELETE /api/notes/[noteId]` (Access-Check)
- `PUT/DELETE /api/notes/[noteId]/analysis` (Access-Check)
- `POST /api/notes/[noteId]/photos` etc. (Access-Check)
- `POST /api/journal-ai/*` (Access-Check, Settings des ausfuehrenden Users)
- `GET/PATCH /api/user/settings` (Sharing Defaults laden/speichern)

---

## UX (Komponenten und Screens)

### 1. Day View (bestehend, erweitert)

- Eintraege erhalten `sharedStatus`: `owned | shared-view | shared-edit`.
- Shared-Entries erhalten Badge und Tooltip.
- Read-only: Edit-Buttons, Uploads, AI-Buttons deaktiviert.

### 2. Share Entry Modal (neu)

- Aufruf per Icon (z.B. "teilen") im Entry-Header.
- Eingabe: Username oder E-Mail.
- Rollenwahl: Viewer / Editor.
- Liste aktueller Freigaben mit Rollen-Dropdown + Entfernen.

### 3. Shared Entries Liste (optional, neuer Tab)

- Schnelle Liste aller Eintraege, die mir freigegeben sind.
- Filter nach Datum / Owner.

### 4. User Settings: Sharing Defaults (neu)

- Default-Share-Partner per E-Mail auswaehlen.
- Default-Rolle (Viewer/Editor).
- Auto-Share-Regeln pro JournalEntryType (Toggle + Rolle + Zieluser).

---

## Neue Dependencies

- Keine neuen Dependencies erforderlich.

---

## Dateistruktur

Neue/veraenderte Dateien (Auszug):

- `prisma/schema.prisma` -> Neues Enum + `JournalEntryAccess` Model
- `lib/services/journalEntryAccessService.ts` -> Access-Logik
- `lib/validators/journalEntryAccess.ts` -> Zod Schema
- `app/api/journal-entries/[id]/access/route.ts` -> CRUD Freigaben
- `app/api/journal-entries/shared/route.ts` -> Shared-Entries Liste
- `app/api/day/route.ts` -> Shared-Entries in Day Response
- `app/api/notes/[noteId]/route.ts` -> Access-Check
- `components/features/diary/DiaryEntriesAccordion.tsx` -> Badge + Read-only State
- `components/features/diary/ShareEntryModal.tsx` -> neues UI
- `components/features/settings/SharingDefaultsSection.tsx` -> Settings UI
- `lib/validators/userSettings.ts` -> Sharing Defaults Schema
- `hooks/useEntryAccess.ts` -> Access API Hook
- `hooks/useSharedEntries.ts` -> Shared-Entries Hook
- `types/day.ts` -> DayNote erweitert um `sharedStatus`, `ownerUserId`, `accessRole`

---

## Implementierungsplan

**Schritt 1 (LLM): Datenmodell erweitern**
- Prisma Enum + Model hinzufuegen.
- Indizes und Relationen definieren.
- User Settings Struktur fuer Sharing Defaults spezifizieren.
- `prisma db push` und `prisma generate` (lokal, nicht im Plan ausfuehren).

**Schritt 2 (LLM): Access-Service und Validatoren**
- `JournalEntryAccessService` erstellen.
- Zod Schemas fuer Access-CRUD + Sharing Defaults.
- Helpers fuer `canRead/canEdit/canDelete`, Auto-Share und Typ-Replication.

**Schritt 3 (LLM): API Access-CRUD + Settings**
- Neue Routes fuer Freigaben implementieren (E-Mail Lookup serverseitig).
- `GET/PATCH /api/user/settings` erweitert (Sharing Defaults persistieren).
- Auto-Share beim Entry-Create im API anwenden.

**Schritt 4 (LLM): Bestehende API-Routen absichern**
- Zugriffspruefung in `notes`, `analysis`, `photos`, `journal-ai`.
- `GET /api/day` um shared Entries erweitern (occurredAt Range).

**Schritt 5 (LLM): Frontend-Integration**
- `DayNote` Typ erweitern.
- UI: SharedBadge, Read-only Locking, ShareEntryModal.
- Settings UI fuer Default-Share + Auto-Share pro Typ.

**Schritt 6 (Mensch): Daten und Rollen pruefen**
- Testbenutzer anlegen, Freigaben erteilen.
- Review ob Edit/Delete korrekt greift.

---

## Automatisiertes Testing

- Vitest: Service-Tests fuer `canRead/canEdit/canDelete`.
- API Tests fuer Freigaben (Viewer vs Editor).
- Regressionstest fuer `GET /api/day` (shared Eintrag wird angezeigt).

---

## Manuelles Testing

1. Owner erstellt JournalEntry und teilt als Viewer.
2. Viewer sieht Eintrag im Day View, kann nicht editieren.
3. Owner teilt als Editor.
4. Editor kann Content, Summary, Media bearbeiten und loeschen.
5. Freigabe entfernen -> Eintrag verschwindet.
