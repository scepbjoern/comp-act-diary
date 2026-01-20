# Kalender-Synchronisation via Tasker

Konzept für die Integration von Android-Systemkalender-Daten in die Comp-ACT-Diary App via Tasker HTTP-Webhook.

*Erstellt: Januar 2026 | Überarbeitet: 20. Januar 2026*

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

---

## 1. Geplante Features

### 1.1 Kernfunktionen

| Feature | Priorität | Beschreibung |
|---------|-----------|--------------|
| **Tasker Webhook-Endpoint** | Hoch | REST-API-Endpoint für Kalender-Events von Tasker |
| **Generisches Webhook-Token-System** | Hoch | Refactoring von `LocationWebhookToken` zu `WebhookToken` für alle Tasker-Webhooks |
| **HTML-zu-Markdown-Konvertierung** | Hoch | Exchange/Outlook HTML-Descriptions in Markdown umwandeln (analog JournalEntry.notes) |
| **Duplikat-Erkennung via ExternalSync** | Hoch | Nutzung des bestehenden `ExternalSync`-Patterns für Deduplizierung |
| **Lösch-Synchronisation (Hard-Delete)** | Hoch | Events entfernen, die im Kalender nicht mehr vorhanden sind |
| **All-Day-Event-Korrektur** | Hoch | UTC-Datum auf lokales Datum korrigieren |
| **Kalender-NavBar-Eintrag** | Mittel | Neuer Navigationsbereich für Kalender-Übersicht |
| **Kalender-Übersichtsseite** | Mittel | Einfache Listenansicht der synchronisierten Events |
| **TimeBox-Verknüpfung** | Mittel | Automatische Verknüpfung mit/Erstellung von TimeBox (DAY) |
| **Generisches Pattern-Matching** | Mittel | Regex-basiertes Matching für verschiedene Anwendungsfälle (Orte, Kontakte, Tags) |
| **Re-Matching-Funktion** | Mittel | API + GUI zum erneuten Anwenden von Patterns auf ungematchte Einträge |
| **Pattern-Verwaltungs-UI** | Mittel | GUI zum Anlegen/Bearbeiten von MatchPatterns |

### 1.2 Abgrenzung: Was wird NICHT implementiert (Phase 1)

- Keine bidirektionale Synchronisation (nur Import von Tasker)
- Keine Google Calendar API-Integration (nur lokaler Kalender via Tasker)
- Keine Echtzeit-Push-Notifications
- Keine Kalender-Erstellung in der App
- Keine direkte Verknüpfung mit JournalEntries (Events erscheinen aber in Tages-Summary)
- Kein aktiver Sync-Trigger aus der App heraus
- Keine Wochen-/Monatsübersicht (nur Tagesliste)

### 1.3 Entscheidungen basierend auf Auftraggeber-Feedback

| Thema | Entscheidung |
|-------|--------------|
| **Löschlogik** | Hard-Delete (kein Soft-Delete im Projekt vorhanden) |
| **sourceCalendar** | Neues Feld von Tasker im JSON (z.B. "ZHAW-Outlook") |
| **All-Day-Events** | UTC→Lokal korrigieren, im GUI als "Ganztägig" kennzeichnen |
| **visible=false** | Normal importieren (keine Filterung) |
| **UI-Ansicht** | Einfache Liste pro Tag |
| **Sync-Trigger** | Nur passiv (Tasker triggert, max. 3x täglich) |
| **Token-System** | Generisches `WebhookToken` pro SyncProvider |
| **Description-Format** | Markdown (konsistent mit JournalEntry.notes) |
| **Description-Länge** | Max. 5000 Zeichen nach Sanitization, dann "..." |
| **Deduplizierung** | Via bestehendes `ExternalSync`-Pattern |
| **Pattern-UI** | Ja, in Phase 1 (GUI zum Anlegen/Bearbeiten) |
| **Pattern-Syntax** | Echte Regex (siehe [regex101.com](https://regex101.com)) |
| **Token-Migration** | Ja, detailliertes Migrationsskript für bestehendes Token |
| **HTML→Markdown** | Library `turndown` verwenden |
| **Tages-Summary** | Später (via TimeBox=DAY bereits vorbereitet) |
| **Pattern-System** | Generisches `MatchPattern` statt nur LocationPattern |

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        ANDROID DEVICE                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌────────────────────────────────────┐    ┌────────────────────────────────────┐                   │
│  │      Android Systemkalender        │    │           Tasker App               │                   │
│  │  ────────────────────────────────  │    │  ────────────────────────────────  │                   │
│  │  Exchange, Google, lokale          │    │  Liest Kalender-Events aus         │                   │
│  │  Kalender synchronisiert           │    │  Erstellt JSON-Array inkl.         │                   │
│  │                                    │    │  sourceCalendar-Feld               │                   │
│  └────────────────┬───────────────────┘    └────────────────┬───────────────────┘                   │
│                   │                                         │                                        │
│                   │ Content Provider                        │ HTTP POST (max 3x/Tag)                │
│                   │ Zugriff                                 │                                        │
│                   └─────────────────────────────────────────┘                                        │
│                                                             │                                        │
└─────────────────────────────────────────────────────────────┼────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      COMP-ACT-DIARY SERVER                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐              │
│  │          Frontend (Next.js)          │    │          API Routes (Next.js)        │              │
│  │  ────────────────────────────────    │    │  ────────────────────────────────    │              │
│  │                                      │    │                                      │              │
│  │  ┌────────────────┐                  │    │  POST /api/calendar/webhook          │◄─── Tasker   │
│  │  │ Kalender-      │                  │    │       └─ JSON-Array empfangen        │     HTTP     │
│  │  │ Übersicht      │                  │    │       └─ HTML→Markdown konvertieren  │              │
│  │  │ /calendar      │                  │    │       └─ Upsert via ExternalSync     │              │
│  │  └────────────────┘                  │    │       └─ Gelöschte Events entfernen  │              │
│  │                                      │    │       └─ TimeBox erstellen/verknüpfen│              │
│  │  ┌────────────────┐                  │    │  GET  /api/calendar/events           │              │
│  │  │ NavBar-        │                  │    │       └─ Events für Zeitraum         │              │
│  │  │ Eintrag        │                  │    │                                      │              │
│  │  │ "Kalender"     │                  │    │  /api/webhook/token (REFACTORED)     │              │
│  │  └────────────────┘                  │    │       └─ Generische Token-Verwaltung │              │
│  │                                      │    │  POST /api/calendar/rematch          │              │
│  │                                      │    │       └─ Ungematchte Events erneut   │              │
│  │                                      │    │          gegen Patterns prüfen       │              │
│  └──────────────────────────────────────┘    └──────────────────────────────────────┘              │
│                                                              │                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    Services (lib/)                                            │  │
│  │  ──────────────────────────────────────────────────────────────────────────────────────────  │  │
│  │                                                                                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐                   │  │
│  │  │ calendarService.ts  │  │ htmlToMarkdown.ts   │  │ webhookTokenService │                   │  │
│  │  │ ─────────────────── │  │ ─────────────────── │  │ (REFACTORED)        │                   │  │
│  │  │ - syncCalendarEvents│  │ - convertToMarkdown │  │ - validateToken()   │                   │  │
│  │  │ - upsertEvent()     │  │ - truncateWithEllip │  │ - createToken()     │                   │  │
│  │  │ - deleteStaleEvents │  │ - isEmptyContent()  │  │                     │                   │  │
│  │  │ - matchPatterns()   │  │                     │  │                     │                   │  │
│  │  │ - rematchUnmatched()│  │                     │  │                     │                   │  │
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘                   │  │
│  │                                                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                              │                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    PostgreSQL Database                                        │  │
│  │  ──────────────────────────────────────────────────────────────────────────────────────────  │  │
│  │                                                                                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐                   │  │
│  │  │  CalendarEvent      │  │  WebhookToken       │  │  ExternalSync       │                   │  │
│  │  │  (erweitert)        │  │  (REFACTORED von    │  │  (bestehend)        │                   │  │
│  │  │  + sourceCalendar   │  │   LocationWebhook-  │  │  - providerId       │                   │  │
│  │  │  + timezone         │  │   Token)            │  │  - externalId       │                   │  │
│  │  │  + locationId       │  │  + providerType     │  │  - entityId         │                   │  │
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘                   │  │
│  │                                                                                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                                            │  │
│  │  │  MatchPattern       │  │  SyncProvider       │                                            │  │
│  │  │  (NEU, generisch)   │  │  (erweitert um      │                                            │  │
│  │  │  - pattern (regex)  │  │   TASKER_CALENDAR)  │                                            │  │
│  │  │  - targetType       │  │                     │                                            │  │
│  │  │  - targetId         │  │                     │                                            │  │
│  │  └─────────────────────┘  └─────────────────────┘                                            │  │
│  │                                                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Erläuterung

### 3.1 Externe Anbieter / Datenquellen

| Komponente | Beschreibung | Datenformat |
|------------|--------------|-------------|
| **Android Systemkalender** | Aggregiert Exchange, Google, lokale Kalender. Zugriff via Content Provider. | Android ContentProvider API |
| **Tasker** | Automatisierungs-App. Liest Kalender via Plugin, erstellt JSON, sendet HTTP POST. | JSON-Array (siehe unten) |

### 3.2 Tasker JSON-Format (Eingabe)

```json
[
  {
    "title": "Meeting",
    "start": "2026-01-20T08:00:00+01:00",
    "end": "2026-01-20T09:00:00+01:00",
    "allDay": false,
    "location": "SM O1.02",
    "description": "<html>...</html>",
    "visible": true,
    "eventId": "1836",
    "timezone": "Europe/Zurich",
    "sourceCalendar": "ZHAW-Outlook"
  }
]
```

**Neue Felder gegenüber ursprünglichem Format:**
- `sourceCalendar`: Name des Quellkalenders (z.B. "ZHAW-Outlook", "Privat-Google")

### 3.3 Backend-Services

| Service | Verantwortung |
|---------|---------------|
| **calendarService.ts** | Event-Synchronisation: Upsert, Löschlogik, TimeBox-Verknüpfung, Location-Matching |
| **htmlToMarkdown.ts** | HTML-zu-Markdown-Konvertierung für Descriptions |
| **webhookTokenService.ts** | Generische Token-Validierung (REFACTORED von locationService) |

### 3.4 API-Routen

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/calendar/webhook` | POST | Tasker-Endpoint - empfängt JSON-Array, führt Sync durch |
| `/api/calendar/events` | GET | Events für Zeitraum abfragen |
| `/api/webhook/token` | GET/POST/DELETE | **REFACTORED**: Generische Token-Verwaltung für alle Webhook-Typen |

### 3.5 Frontend-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **CalendarPage** | Übersichtsseite `/calendar` mit einfacher Event-Liste |
| **CalendarEventList** | Listenansicht der Events eines Tages |
| **CalendarEventCard** | Einzelne Event-Karte mit Ganztägig-Kennzeichnung |
| **SiteNav (erweitert)** | Neuer NavBar-Eintrag "Kalender" |

---

## 4. Datenmodell

### 4.1 Refactoring: LocationWebhookToken → WebhookToken

Das bestehende `LocationWebhookToken` wird zu einem generischen `WebhookToken` refactored, um für alle Tasker-Webhooks genutzt werden zu können.

#### WebhookToken (REFACTORED)

```prisma
/// Webhook-Token: Authentifizierungs-Token für Webhook-Zugriff ohne Session-Auth.
/// Ersetzt LocationWebhookToken und ist generisch für alle Webhook-Typen nutzbar.
model WebhookToken {
  /// Eindeutige ID
  id          String           @id @default(uuid())
  /// Besitzer-User
  userId      String
  /// bcrypt-Hash des Tokens (Plain-Token wird nur einmal bei Erstellung angezeigt)
  tokenHash   String
  /// Gerätename zur Identifikation (z.B. "Pixel 7 Pro")
  deviceName  String
  /// Provider-Typ (welcher Webhook darf dieses Token nutzen)
  providerType SyncProviderType
  /// Ist der Token aktiv?
  isActive    Boolean          @default(true)
  /// Letzter Zugriff
  lastUsedAt  DateTime?
  /// Erstellungszeitpunkt
  createdAt   DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive, providerType])
}
```

#### Migration von LocationWebhookToken

```sql
-- Migrationsskript für produktive Datenbank
-- 1. Neue Tabelle erstellen
-- 2. Daten migrieren mit providerType = 'OWNTRACKS' (neuer Enum-Wert)
-- 3. Alte Tabelle löschen
-- 4. API-Routen anpassen
```

### 4.2 SyncProviderType erweitern

```prisma
enum SyncProviderType {
  PHOTOPRISM       /// Photoprism Fotoverwaltung
  SAMSUNG_GALLERY  /// Samsung Gallery
  TOGGL            /// Toggl Zeiterfassung
  GOOGLE_CALENDAR  /// Google Kalender (API)
  APPLE_CALENDAR   /// Apple Kalender
  SPOTIFY          /// Spotify Musikstreaming
  LAST_FM          /// Last.fm Scrobbling
  GOOGLE_CONTACTS  /// Google Contacts
  GOOGLE_TIMELINE  /// Google Maps Timeline Import
  // ─── NEU ───
  OWNTRACKS        /// OwnTracks App (HTTP Mode) - für Location Tracking
  TASKER_CALENDAR  /// Tasker Kalender-Sync
}
```

### 4.3 CalendarEvent erweitern

Das bestehende `CalendarEvent`-Modell nutzt bereits `externalSyncId` für die Verknüpfung mit `ExternalSync`. Zusätzlich benötigen wir:

```prisma
model CalendarEvent {
  // ─── BESTEHENDE FELDER ───
  id             String    @id @default(uuid())
  userId         String
  externalSyncId String?   // Verknüpfung zu ExternalSync für Deduplizierung
  timeBoxId      String?   // Verknüpfung zum Tag (TimeBox mit kind=DAY)
  title          String
  description    String?   // Jetzt: Markdown-Format (nach Konvertierung)
  startedAt      DateTime
  endedAt        DateTime?
  isAllDay       Boolean   @default(false)
  location       String?   // Roher Orts-String aus Kalender
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // ─── NEUE FELDER ───
  /// Quellkalender-Kennung (z.B. "ZHAW-Outlook", "Privat-Google")
  sourceCalendar   String?
  /// Originale Timezone des Events (z.B. "Europe/Zurich")
  timezone         String?
  /// Verknüpfung zu gematchter Location (optional)
  locationId       String?

  // ─── RELATIONEN ───
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  externalSync    ExternalSync? @relation(fields: [externalSyncId], references: [id])
  timeBox         TimeBox?      @relation(fields: [timeBoxId], references: [id])
  matchedLocation Location?     @relation(fields: [locationId], references: [id])

  @@index([userId, startedAt])
  @@index([userId, timeBoxId])
  @@index([externalSyncId])
}
```

### 4.4 Generisches Pattern-Matching (NEU)

Ein **generisches `MatchPattern`-System** ermöglicht Regex-basiertes Matching für verschiedene Anwendungsfälle:

- **Kalender-Orte → Location**: z.B. "SM O1.02" → Location "SM-Gebäude"
- **Personennamen → Contact** (später): z.B. "Max Mustermann" → Contact-Entität
- **Tags-Transformation** (später): z.B. Import-Tags überschreiben mit internen Tags

```prisma
/// MatchPattern: Generisches Regex-Pattern für automatisches Matching.
/// Ermöglicht verschiedene Anwendungsfälle über sourceType und targetType.
model MatchPattern {
  /// Eindeutige ID
  id          String           @id @default(uuid())
  /// Besitzer-User
  userId      String
  /// Quelltyp: Welches Feld wird gematcht?
  sourceType  MatchSourceType
  /// Zieltyp: Was wird verknüpft?
  targetType  MatchTargetType
  /// ID der Ziel-Entität (z.B. Location-ID, Contact-ID)
  targetId    String
  /// Regex-Pattern (siehe https://regex101.com für Hilfe)
  pattern     String
  /// Beschreibung (z.B. "Alle SM-Räume")
  description String?
  /// Priorität (höher = wird zuerst geprüft)
  priority    Int              @default(0)
  /// Ist das Pattern aktiv?
  isActive    Boolean          @default(true)
  /// Erstellungszeitpunkt
  createdAt   DateTime         @default(now())
  /// Letztes Update
  updatedAt   DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive, sourceType, priority])
}

/// Quelltyp für MatchPattern: Welches Feld wird gematcht?
enum MatchSourceType {
  CALENDAR_LOCATION    /// CalendarEvent.location Feld
  JOURNAL_CONTENT      /// JournalEntry.notes Inhalt (für Personennamen etc.)
  IMPORT_TAG           /// Tags aus Synchronisationsquellen
}

/// Zieltyp für MatchPattern: Welche Entität wird verknüpft?
enum MatchTargetType {
  LOCATION    /// Verknüpfung zu Location-Entität
  CONTACT     /// Verknüpfung zu Contact-Entität (später)
  TAG         /// Überschreiben mit anderem Tag (später)
}
```

**Matching-Logik:**
1. Beim Import eines CalendarEvents wird das `location`-Feld gegen alle aktiven `MatchPattern` mit `sourceType = CALENDAR_LOCATION` geprüft
2. Patterns werden nach Priorität sortiert (höchste zuerst)
3. Erstes Match gewinnt → `locationId` wird gesetzt (bei `targetType = LOCATION`)
4. Kein Match → `locationId` bleibt NULL, `location`-String bleibt erhalten

**Re-Matching-Funktion:**
Über API und GUI können alle noch nicht gematchten CalendarEvents erneut gegen die (ggf. neuen/verbesserten) Patterns geprüft werden:
- API: `POST /api/calendar/rematch`
- GUI: Button "Ungematchte Events erneut prüfen" auf der Kalender-Seite

**Regex-Hilfe:** [regex101.com](https://regex101.com) – Online-Tool zum Testen von Regex-Patterns

### 4.5 User-Relationen erweitern

```prisma
model User {
  // ... existierende Felder ...
  webhookTokens   WebhookToken[]   // REFACTORED von locationWebhookTokens
  matchPatterns   MatchPattern[]   // NEU: Generische Matching-Patterns
}
```

### 4.6 Location-Relation erweitern

```prisma
model Location {
  // ... existierende Felder ...
  calendarEvents   CalendarEvent[]   // NEU: Events an diesem Ort
}
```

### 4.7 ER-Diagramm (Ausschnitt)

```
┌─────────────────────┐
│       User          │
├─────────────────────┤
│ id                  │
│ username            │
└──────────┬──────────┘
           │ 1:N
           │
     ┌─────┴──────────────────────────────────────────────────┐
     │                         │                              │
     ▼                         ▼                              ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│  WebhookToken   │    │    MatchPattern     │    │     CalendarEvent       │
│  (REFACTORED)   │    │  (NEU, generisch)   │    │                         │
├─────────────────┤    ├─────────────────────┤    ├─────────────────────────┤
│ id              │    │ id                  │    │ id                      │
│ userId          │    │ userId              │    │ userId                  │
│ tokenHash       │    │ sourceType ─────────┼────┼─► (z.B. CALENDAR_LOC.)  │
│ deviceName      │    │ targetType          │    │ externalSyncId ─────────┼──┐
│ providerType    │    │ targetId ───────────┼────┼─► locationId (optional) │  │
│ isActive        │    │ pattern (regex)     │    │ timeBoxId ──────────────┼──┼──┐
└─────────────────┘    │ priority            │    │ title, description      │  │  │
                       └─────────────────────┘    │ startedAt, endedAt      │  │  │
                                                  │ isAllDay, location      │  │  │
                                                  │ sourceCalendar, timezone│  │  │
                                                  └─────────────────────────┘  │  │
                                                                           │  │
┌──────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
▼                                                                              │
┌─────────────────────┐    ┌─────────────────────┐                            │
│   ExternalSync      │    │    SyncProvider     │                            │
│   (bestehend)       │    │    (erweitert)      │                            │
├─────────────────────┤    ├─────────────────────┤                            │
│ id                  │    │ id                  │                            │
│ providerId ─────────┼───►│ provider: TASKER_   │                            │
│ externalId (eventId)│    │   CALENDAR          │                            │
│ entityId            │    └─────────────────────┘                            │
│ lastSyncedAt        │                                                        │
└─────────────────────┘                                                        │
                                                                               │
┌──────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────┐
│     TimeBox         │
├─────────────────────┤
│ id                  │
│ kind: DAY           │
│ localDate           │
└─────────────────────┘

SYNC-FLOW:
══════════
1. Tasker sendet JSON-Array → POST /api/calendar/webhook
2. WebhookToken validieren (providerType = TASKER_CALENDAR) → userId ermitteln
3. SyncProvider für TASKER_CALENDAR holen/erstellen
4. Für jedes Event:
   a. HTML→Markdown konvertieren, auf 5000 Zeichen kürzen
   b. All-Day-Event: UTC→Lokal korrigieren
   c. ExternalSync suchen/erstellen (via providerId + eventId)
   d. CalendarEvent upsert
   e. TimeBox (DAY) suchen/erstellen und verknüpfen
   f. MatchPattern matchen (sourceType=CALENDAR_LOCATION) → locationId setzen
5. Stale Events löschen (ExternalSync.lastSyncedAt < Batch-Start)
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue/Refactored Services

#### `lib/services/calendarService.ts`

```typescript
// Hauptfunktionen:
export async function syncCalendarEvents(
  events: TaskerCalendarEvent[],
  userId: string,
  providerId: string
): Promise<SyncResult>

export async function upsertCalendarEvent(
  event: TaskerCalendarEvent,
  userId: string,
  providerId: string
): Promise<CalendarEvent>

export async function deleteStaleEvents(
  userId: string,
  providerId: string,
  syncStartTime: Date
): Promise<number>

export async function getEventsForDay(
  userId: string,
  date: string
): Promise<CalendarEvent[]>

export async function getOrCreateTimeBox(
  userId: string,
  date: Date
): Promise<TimeBox>

export async function matchPattern(
  userId: string,
  sourceType: MatchSourceType,
  inputString: string
): Promise<string | null> // Returns targetId or null

export async function rematchUnmatchedEvents(
  userId: string
): Promise<{ matched: number; total: number }>

export async function fixAllDayEventDate(
  event: TaskerCalendarEvent
): Promise<{ start: Date; end: Date | null }>
```

#### `lib/utils/htmlToMarkdown.ts`

```typescript
// HTML-zu-Markdown-Konvertierung für Exchange/Outlook-Descriptions:
export function htmlToMarkdown(html: string): string
export function truncateWithEllipsis(text: string, maxLength: number): string
export function isEmptyHtmlContent(html: string): boolean

// Beispiel-Transformation:
// <p>Meeting <b>wichtig</b></p> → "Meeting **wichtig**"
// <ul><li>Punkt 1</li></ul>    → "- Punkt 1"
// Max. 5000 Zeichen, dann "..."
```

#### `lib/services/webhookTokenService.ts` (REFACTORED)

```typescript
// Generische Token-Verwaltung (ersetzt location-spezifische Implementierung)
export async function validateWebhookToken(
  authHeader: string | null,
  providerType: SyncProviderType
): Promise<string | null> // Returns userId or null

export async function createWebhookToken(
  userId: string,
  deviceName: string,
  providerType: SyncProviderType
): Promise<{ token: string; id: string }>

export async function listWebhookTokens(
  userId: string,
  providerType?: SyncProviderType
): Promise<WebhookToken[]>

export async function deactivateWebhookToken(
  tokenId: string,
  userId: string
): Promise<void>
```

### 5.2 Zod-Validatoren

#### `lib/validators/calendar.ts`

```typescript
import { z } from 'zod'

export const taskerCalendarEventSchema = z.object({
  title: z.string().min(1),
  start: z.string(), // ISO 8601 DateTime
  end: z.string(),   // ISO 8601 DateTime
  allDay: z.boolean(),
  location: z.string().optional().default(''),
  description: z.string().optional().default(''),
  visible: z.boolean().optional().default(true),
  eventId: z.string().min(1),
  timezone: z.string().optional().default('Europe/Zurich'),
  sourceCalendar: z.string().optional().default('Unknown'),
})

export const taskerCalendarPayloadSchema = z.array(taskerCalendarEventSchema)

export type TaskerCalendarEvent = z.infer<typeof taskerCalendarEventSchema>
```

### 5.3 API-Routen

#### `app/api/calendar/webhook/route.ts`

- **POST**: Empfängt JSON-Array von Tasker
- Authentifizierung via generischem `WebhookToken` mit `providerType = TASKER_CALENDAR`
- Ruft `syncCalendarEvents()` auf
- Gibt Sync-Statistik zurück (created, updated, deleted)

#### `app/api/calendar/events/route.ts`

- **GET**: Events für Zeitraum abfragen
- Query-Parameter: `date` (einzelner Tag) oder `startDate` + `endDate`

#### `app/api/webhook/token/route.ts` (REFACTORED)

- **GET**: Alle Tokens des Users auflisten (optional gefiltert nach `providerType`)
- **POST**: Neues Token erstellen (mit `providerType`)
- **DELETE**: Token deaktivieren

#### `app/api/calendar/rematch/route.ts` (NEU)

- **POST**: Alle CalendarEvents ohne `locationId` erneut gegen aktive MatchPatterns prüfen
- Gibt Statistik zurück: `{ matched: number, total: number }`
- Nur für authentifizierte User

#### `app/api/match-patterns/route.ts` (NEU)

- **GET**: Alle MatchPatterns des Users auflisten (optional gefiltert nach `sourceType`)
- **POST**: Neues MatchPattern erstellen
- **PUT**: Bestehendes MatchPattern aktualisieren
- **DELETE**: MatchPattern löschen

---

## 6. UX (Komponenten und Screens)

### 6.1 Neue Seiten

| Seite | Pfad | Beschreibung |
|-------|------|--------------|
| **CalendarPage** | `/calendar` | Einfache Listenansicht der Events eines Tages |
| **MatchPatternsPage** | `/settings/match-patterns` | Verwaltung von MatchPatterns (CRUD) |

### 6.2 Neue Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| **CalendarEventList** | `components/features/calendar/CalendarEventList.tsx` | Listenansicht der Events |
| **CalendarEventCard** | `components/features/calendar/CalendarEventCard.tsx` | Einzelne Event-Karte |
| **RematchButton** | `components/features/calendar/RematchButton.tsx` | Button zum erneuten Matchen |
| **MatchPatternForm** | `components/features/settings/MatchPatternForm.tsx` | Formular für Pattern-Erstellung |
| **MatchPatternList** | `components/features/settings/MatchPatternList.tsx` | Liste der Patterns |

### 6.3 Änderungen an bestehenden Komponenten

| Komponente | Änderung |
|------------|----------|
| **SiteNav** | Neuer NavBar-Eintrag "Kalender" (Desktop + Mobile) |
| **Settings-Page** | Webhook-Token-Verwaltung anpassen für generisches System |
| **Settings-Page** | Link zu MatchPattern-Verwaltung hinzufügen |

### 6.4 UI-Mockup (Kalender-Übersicht)

```
┌─────────────────────────────────────────────────────────────────┐
│  CompACT Diary              Kalender              🔔  ☰  [Avatar]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 20. Januar 2026                                  ◄  ●  ►   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟢 Ganztägig                                            │   │
│  │ AL Arbeiten                                             │   │
│  │ 📍 —                          📁 ZHAW-Outlook           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟢 Ganztägig                                            │   │
│  │ Roter Turm                                              │   │
│  │ 📍 —                          📁 Privat-Google          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔵 07:30 – 08:00                                        │   │
│  │ Prüfungsoffice                                          │   │
│  │ 📍 —                          📁 ZHAW-Outlook           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔵 08:00 – 09:00                                        │   │
│  │ Prüfungsaufsicht                                        │   │
│  │ 📍 SM-Gebäude (SM O1.02)      📁 ZHAW-Outlook           │   │
│  │                                                         │   │
│  │ ▼ Beschreibung                                          │   │
│  │ Modul XY, Raum SM O1.02...                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Letzter Sync: 20.01.2026, 06:15                               │
│  3 Events synchronisiert (1 ohne Orts-Match)                    │
│                                                                 │
│  [🔄 Ungematchte Events erneut prüfen]  [⚙️ Patterns verwalten]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legende:
🟢 = Ganztägig
🔵 = Zeitgebunden
📍 = Ort (mit gematchter Location oder roher String)
📁 = Quellkalender (sourceCalendar)
```

---

## 7. Neue Dependencies

### 7.1 Für HTML-zu-Markdown-Konvertierung

```json
{
  "turndown": "^7.1.2"
}
```

**Entscheidung:** Library `turndown` verwenden (robuster bei unbekannten HTML-Strukturen).

### 7.2 Bestehende Dependencies (bereits vorhanden)

- **zod**: Validierung
- **bcryptjs**: Token-Hashing
- **date-fns** / **date-fns-tz**: Datums-/Timezone-Handling

---

## 8. Dateistruktur

### 8.1 Neue Dateien

```
prisma/
├── schema.prisma                          # Erweiterungen (siehe 4.x)
└── migrations/
    └── YYYYMMDD_calendar_sync/            # Migration inkl. WebhookToken-Refactoring

lib/
├── services/
│   ├── calendarService.ts                 # NEU: Sync-Logik
│   ├── matchPatternService.ts             # NEU: Generisches Pattern-Matching
│   └── webhookTokenService.ts             # REFACTORED: Generische Token-Verwaltung
├── utils/
│   └── htmlToMarkdown.ts                  # NEU: HTML→Markdown (via turndown)
└── validators/
    ├── calendar.ts                        # NEU: Zod-Schemas für Kalender
    └── matchPattern.ts                    # NEU: Zod-Schemas für MatchPattern

app/
├── api/
│   ├── calendar/
│   │   ├── webhook/
│   │   │   └── route.ts                   # NEU: Tasker-Webhook
│   │   ├── events/
│   │   │   └── route.ts                   # NEU: Event-Abfrage
│   │   └── rematch/
│   │       └── route.ts                   # NEU: Re-Matching-Endpoint
│   ├── match-patterns/
│   │   ├── route.ts                       # NEU: MatchPattern CRUD
│   │   └── [id]/
│   │       └── route.ts                   # NEU: MatchPattern bearbeiten/löschen
│   └── webhook/
│       └── token/
│           ├── route.ts                   # REFACTORED: Generische Token-API
│           └── [id]/
│               └── route.ts               # REFACTORED: Token löschen
├── calendar/
│   └── page.tsx                           # NEU: Kalender-Übersicht
└── settings/
    └── match-patterns/
        └── page.tsx                       # NEU: MatchPattern-Verwaltung

components/
└── features/
    ├── calendar/
    │   ├── CalendarEventList.tsx          # NEU
    │   ├── CalendarEventCard.tsx          # NEU
    │   └── RematchButton.tsx              # NEU: Button für Re-Matching
    └── settings/
        ├── MatchPatternForm.tsx           # NEU: Formular für Pattern-Erstellung
        └── MatchPatternList.tsx           # NEU: Liste der Patterns
```

### 8.2 Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | WebhookToken, CalendarEvent, MatchPattern, MatchSourceType, MatchTargetType, SyncProviderType |
| `components/layout/SiteNav.tsx` | NavBar-Eintrag "Kalender" hinzufügen |
| `app/api/location/webhook/route.ts` | Auf generisches WebhookToken umstellen |
| `app/settings/page.tsx` oder Unterseite | Token-Verwaltung für alle Webhook-Typen |

---

## 9. Implementierungsplan

### Phase 1: Infrastruktur (LLM)

#### Schritt 1: Prisma-Schema erweitern

**Ziel:** Datenbank für Kalender-Sync und generisches Token-System vorbereiten

- `SyncProviderType` um `OWNTRACKS` und `TASKER_CALENDAR` erweitern
- `LocationWebhookToken` zu `WebhookToken` refactoren (+ `providerType` Feld)
- `CalendarEvent` um `sourceCalendar`, `timezone`, `locationId` erweitern
- `MatchPattern` Model mit `MatchSourceType` und `MatchTargetType` Enums erstellen
- User- und Location-Relationen erweitern
- **Migration mit Datenübernahme** erstellen

#### Schritt 2: WebhookToken-Service refactoren

**Ziel:** Generische Token-Verwaltung implementieren

- `lib/services/webhookTokenService.ts` erstellen
- Bestehende Location-Token-Logik generalisieren
- `providerType`-Filter implementieren

#### Schritt 3: Location-Webhook anpassen

**Ziel:** OwnTracks-Webhook auf neues Token-System umstellen

- `app/api/location/webhook/route.ts` anpassen
- `providerType = OWNTRACKS` bei Token-Validierung

### Phase 2: Kalender-Sync (LLM)

#### Schritt 4: Zod-Validatoren erstellen

**Ziel:** Eingabe-Validierung für Tasker-Payload

- `lib/validators/calendar.ts` erstellen
- Schema für einzelnes Event und Array
- Type-Export für TypeScript

#### Schritt 5: HTML-zu-Markdown-Konverter implementieren

**Ziel:** Exchange/Outlook HTML-Descriptions in Markdown umwandeln

- `lib/utils/htmlToMarkdown.ts` erstellen
- `htmlToMarkdown()`: Hauptfunktion
- `truncateWithEllipsis()`: Max. 5000 Zeichen
- `isEmptyHtmlContent()`: Leere HTML erkennen
- Unit-Tests schreiben

#### Schritt 6: Calendar-Service implementieren

**Ziel:** Sync-Logik implementieren

- `lib/services/calendarService.ts` erstellen
- `syncCalendarEvents()`: Haupt-Sync-Funktion
- `upsertCalendarEvent()`: Upsert via ExternalSync
- `deleteStaleEvents()`: Hard-Delete für nicht mehr vorhandene Events
- `fixAllDayEventDate()`: UTC→Lokal-Korrektur
- `getOrCreateTimeBox()`: TimeBox (DAY) erstellen/verknüpfen
- `matchPattern()`: Generisches Regex-Matching
- `rematchUnmatchedEvents()`: Re-Matching für Events ohne Location

#### Schritt 7: Webhook-Endpoint implementieren

**Ziel:** API für Tasker-Anfragen

- `app/api/calendar/webhook/route.ts` erstellen
- Token-Validierung mit `providerType = TASKER_CALENDAR`
- JSON-Array parsen und validieren
- `syncCalendarEvents()` aufrufen
- Sync-Statistik zurückgeben

#### Schritt 8: Events-API implementieren

**Ziel:** Events für Frontend abrufbar machen

- `app/api/calendar/events/route.ts`
- Query-Parameter für Datumsfilter

### Phase 3: Frontend (LLM)

#### Schritt 9: NavBar erweitern

**Ziel:** Kalender in Navigation einbinden

- `SiteNav.tsx` anpassen
- Neuer Link "Kalender" nach "Orte"
- Sowohl Desktop als auch Mobile

#### Schritt 10: Kalender-Übersichtsseite erstellen

**Ziel:** Einfache UI für synchronisierte Events

- `app/calendar/page.tsx` erstellen
- Events für aktuellen Tag laden
- Einfache Listenansicht
- Datumsnavigation (vor/zurück)
- Ganztägig-Events oben, dann nach Startzeit sortiert

#### Schritt 11: Kalender-Komponenten erstellen

**Ziel:** Wiederverwendbare UI-Komponenten

- `CalendarEventList.tsx`: Liste mit Gruppierung
- `CalendarEventCard.tsx`: Einzelkarte mit Ganztägig-Kennzeichnung

#### Schritt 12: Token-Verwaltung in Settings anpassen

**Ziel:** UI für generisches Token-System

- Bestehende Location-Token-UI generalisieren
- Dropdown/Tabs für verschiedene `providerType`s

#### Schritt 13: MatchPattern-Verwaltungs-UI erstellen

**Ziel:** GUI für Pattern-Erstellung und Re-Matching

- `app/settings/match-patterns/page.tsx` erstellen
- `MatchPatternForm.tsx`: Formular mit Regex-Eingabe, Ziel-Location-Auswahl, Priorität
- `MatchPatternList.tsx`: Liste mit Bearbeiten/Löschen
- Link zu [regex101.com](https://regex101.com) für Regex-Hilfe
- `RematchButton.tsx`: Button auf Kalender-Seite

### Phase 4: Integration (Mensch)

#### Schritt 14: Tasker-Konfiguration

**Ziel:** Tasker-Task mit App verbinden

- Webhook-Token in App erstellen (mit `providerType = TASKER_CALENDAR`)
- Token in Tasker hinterlegen
- HTTP-Request in Tasker konfigurieren (inkl. `sourceCalendar` Feld)
- Manuell testen

#### Schritt 15: MatchPatterns einrichten

**Ziel:** Automatisches Orts-Matching konfigurieren

- Patterns für häufige Orte anlegen (z.B. `^SM\s` → SM-Gebäude)
- Regex mit [regex101.com](https://regex101.com) testen
- Re-Matching für bestehende Events durchführen
- Patterns bei Bedarf verfeinern

---

## 10. Automatisiertes Testing

### 10.1 Unit-Tests

| Test-Datei | Inhalt |
|------------|--------|
| `__tests__/lib/htmlToMarkdown.test.ts` | HTML→Markdown, Truncation, Edge Cases |
| `__tests__/lib/calendarService.test.ts` | Sync-Logik, Upsert, Löschlogik, TimeBox |
| `__tests__/lib/webhookTokenService.test.ts` | Token-Validierung, providerType-Filter |
| `__tests__/api/calendar/webhook.test.ts` | Webhook-Endpoint, Auth, Validation |

### 10.2 Test-Szenarien

1. **HTML→Markdown**
   - Exchange-HTML → Markdown
   - Leere HTML-Descriptions → Leerer String
   - Langer Text → Truncation mit "..."
   - Bereits sauberer Text → Unverändert

2. **Sync-Logik**
   - Neues Event → Insert + ExternalSync erstellen
   - Bestehendes Event → Update
   - Event entfernt aus Kalender → Hard-Delete
   - All-Day-Event → Datum korrekt

3. **TimeBox-Verknüpfung**
   - TimeBox existiert → Verknüpfen
   - TimeBox existiert nicht → Erstellen und verknüpfen

4. **Location-Matching**
   - Pattern matched → locationId gesetzt
   - Kein Match → locationId NULL, location-String erhalten

5. **Webhook-Auth**
   - Gültiges Token mit korrektem providerType → 200
   - Gültiges Token mit falschem providerType → 401
   - Ungültiges Token → 401

---

## 11. Manuelles Testing

### 11.1 ngrok für lokales Testing

Da die App lokal auf `localhost:3000` läuft, muss für Tests mit Tasker ein öffentlicher Tunnel erstellt werden. **ngrok** (Free-Version) ermöglicht dies.

#### ngrok starten

```bash
# Terminal öffnen und ngrok starten
ngrok http 3000
```

#### ngrok Output (Beispiel)

```
Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.x.x
Region                        Europe (eu)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

#### Wichtige Informationen

| Info | Wert |
|------|------|
| **Öffentliche URL** | `https://abc123.ngrok-free.app` (ändert sich bei jedem Start) |
| **Webhook-URL für Tasker** | `https://abc123.ngrok-free.app/api/calendar/webhook` |
| **Request Inspector** | `http://127.0.0.1:4040` (zum Debuggen) |

**Hinweis:** Bei der Free-Version ändert sich die URL bei jedem ngrok-Neustart. Die URL muss dann in Tasker angepasst werden.

### 11.2 Tasker-Konfiguration (Schritt-für-Schritt)

#### Voraussetzungen

- Tasker App installiert (Play Store)
- AutoCalendar Plugin installiert (für Kalender-Zugriff)
- Webhook-Token in CompACT Diary erstellt

#### Schritt 1: Token in CompACT Diary erstellen

1. App öffnen → **Einstellungen** → **Webhook-Tokens**
2. **Neues Token** → Typ: **Tasker Kalender** auswählen
3. Gerätename eingeben (z.B. "Pixel 7 Pro")
4. **Token kopieren** (wird nur einmal angezeigt!)

#### Schritt 2: Tasker-Task erstellen

1. **Tasker öffnen** → **Tasks** → **+** (neuer Task)
2. Task benennen: z.B. "Kalender Sync"

#### Schritt 3: AutoCalendar Query Action hinzufügen

1. **+** → **Plugin** → **AutoCalendar** → **Calendar Query**
2. Konfiguration:
   - **Calendar**: Gewünschten Kalender auswählen (z.B. "ZHAW-Outlook")
   - **Start Date**: `%DATE` (heute)
   - **End Date**: z.B. `+30d` (nächsten 30 Tage)
   - **Output Format**: JSON
   - **Fields**: title, start, end, allDay, location, description, eventId, visible
3. **Output Variable**: `%calendar_json`

#### Schritt 4: Variable Set für sourceCalendar

1. **+** → **Variable** → **Variable Set**
2. Name: `%source_calendar`
3. Wert: `ZHAW-Outlook` (oder entsprechender Kalendername)

#### Schritt 5: JavaScriptlet für JSON-Aufbereitung

1. **+** → **Code** → **JavaScriptlet**
2. Code:

```javascript
// Kalender-Events parsen und sourceCalendar hinzufügen
var events = JSON.parse(calendar_json);
var sourceCalendar = source_calendar;

var enrichedEvents = events.map(function(event) {
  return {
    title: event.title || "",
    start: event.start,
    end: event.end,
    allDay: event.allDay === "true" || event.allDay === true,
    location: event.location || "",
    description: event.description || "",
    visible: event.visible !== "false" && event.visible !== false,
    eventId: String(event.eventId),
    timezone: "Europe/Zurich",
    sourceCalendar: sourceCalendar
  };
});

var payload = JSON.stringify(enrichedEvents);
```

3. **Auto Exit**: aktivieren

#### Schritt 6: HTTP Request Action hinzufügen

1. **+** → **Net** → **HTTP Request**
2. Konfiguration:

| Feld | Wert |
|------|------|
| **Method** | POST |
| **URL** | `https://abc123.ngrok-free.app/api/calendar/webhook` |
| **Headers** | `Authorization: Bearer <dein-token>` |
| **Content Type** | `application/json` |
| **Body** | `%payload` |
| **Timeout** | 30 Sekunden |

#### Schritt 7: Task testen

1. **Play-Button** drücken
2. Response prüfen (sollte `200 OK` mit Sync-Statistik sein)
3. App öffnen → **Kalender** → Events verifizieren

#### Schritt 8: Profil für automatischen Sync erstellen (optional)

1. **Profiles** → **+** → **Time**
2. Zeiten festlegen (z.B. 07:00, 12:00, 18:00)
3. Task "Kalender Sync" verknüpfen

### 11.3 Sync-Szenarien

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Erster Sync | Alle Events importiert, TimeBoxes erstellt |
| Wiederholter Sync | Nur geänderte Events aktualisiert |
| Event im Kalender gelöscht | Event wird in App entfernt (Hard-Delete) |
| Neues Event hinzugefügt | Event erscheint in App |
| HTML-Description | Wird als Markdown angezeigt |
| Description > 5000 Zeichen | Gekürzt mit "..." |
| Ganztages-Event | Korrektes Datum, als "Ganztägig" markiert |
| Location "SM O1.02" mit Pattern | Wird "SM-Gebäude" zugeordnet |
| Re-Match nach neuem Pattern | Zuvor ungematchte Events werden gematcht |

*Dokument erstellt gemäss Feature-Planungs-Prozess (__PROMPT_NEW_FEATURE_PLAN.md)*
