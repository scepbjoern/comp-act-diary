# PRM & Kontakte - Konzeptdokument

Dieses Dokument beschreibt die Architektur und Implementation des Personal Relationship Manager (PRM) mit Google Contacts Synchronisation.

*Erstellt: Dezember 2024*

---

## Inhaltsverzeichnis

1. [Geplante Features](#1-geplante-features)
2. [Architekturübersicht](#2-architekturübersicht)
3. [Komponenten-Erläuterung](#3-komponenten-erläuterung)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX - Komponenten und Screens](#6-ux---komponenten-und-screens)
7. [Neue Dependencies](#7-neue-dependencies)
8. [Dateistruktur](#8-dateistruktur)
9. [Implementierungsplan](#9-implementierungsplan)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)

---

## 1. Geplante Features

### 1.1 Kernfunktionen

| Feature | Beschreibung |
|---------|--------------|
| **Kontaktliste** | Liste aller Kontakte mit Suche, Filter und Sortierung |
| **Kontaktdetails** | Detailansicht mit Feldern, Bildergalerie, Beziehungen, Interaktionen, Journal-Erwähnungen |
| **Kontakt CRUD** | Erstellen, Bearbeiten, Löschen von Kontakten |
| **Google Sync** | Bidirektionale Synchronisation mit Google Contacts |
| **Bildergalerie** | Mehrere Profilbilder pro Kontakt mit primärem Bild (via MediaAttachment) |
| **Personal Relations** | Verwaltung von Beziehungen zwischen Kontakten |
| **Interaktionen** | Erfassung von Interaktionen (Anrufe, Treffen, E-Mails, Erwähnungen) |
| **Beziehungsnetzwerk** | Social Network Graph zur Visualisierung der Kontaktbeziehungen |
| **Kontakt-Aktivitäten** | Todos/Aufgaben für Kontakte mit Fälligkeitsdatum |
| **Journal-Erwähnungen** | Personen in Journal-Einträgen per @slug erwähnen |
| **Benachrichtigungen** | Notification-System für Sync-Konflikte und andere Ereignisse |
| **Kontakt-Labels** | Google Contact Groups als Tags synchronisieren |

### 1.2 Google Contacts Synchronisation

- **Nur "Contacts"**: Synchronisation beschränkt sich auf echte Kontakte (nicht "Other Contacts")
- **Bidirektional**: Änderungen in der App werden zu Google synchronisiert und umgekehrt
- **Inkrementell**: Nutzung von Sync-Tokens für effiziente Delta-Syncs
- **Automatisch**: Tägliche automatische Synchronisation (kein Webhook verfügbar)
- **Manuell**: Benutzer kann jederzeit manuell synchronisieren
- **Konfliktauflösung**: Last-Write-Wins mit Benachrichtigung an den Benutzer
- **Löschverhalten**: Bei Löschung in Google verbleibt Kontakt in der App (für Archivierungszwecke)

### 1.3 Synchronisierte Felder (vereinfacht)

| Google Feld | Lokales Feld | Anmerkung |
|-------------|--------------|-----------|
| `names` | `name`, `givenName`, `familyName` | |
| `nicknames` | `nickname` | Erstes Element |
| `emailAddresses` | `emailPrivate`, `emailWork` | Max. 2 |
| `phoneNumbers` | `phonePrivate`, `phoneWork` | Max. 2 |
| `addresses` | `addressHome`, `addressWork` | Max. 2, formatiert |
| `birthdays` | `birthday` | |
| `photos` | via `MediaAttachment` | Siehe 1.4 |
| `organizations` | `company`, `jobTitle` | Aktueller Arbeitgeber |
| `biographies` | `notes` | |
| `memberships` | via `Tagging` | Als CONTACT_GROUP Tags |
| `urls` | `websiteUrl`, `socialUrls` | Website + Social Media |

**Nicht synchronisiert**: `relations`, `events` - bei Bedarf in `notes` erfassen.

### 1.4 Profilbild-Synchronisation

- **Von Google**: Nur wenn kein lokales Bild existiert (kein Überschreiben)
- **Zu Google**: Falls API es erlaubt, primäres Bild hochladen
- **Galerie**: Mehrere Bilder pro Kontakt möglich (via `MediaAttachment.role = COVER/GALLERY`)

### 1.5 Initiales Matching

Falls lokale Kontakte vor Google-Verbindung existieren:
1. **Automatisch**: Match via Name + Vorname + Geburtsdatum (eindeutig)
2. **Manuell**: Bei Mehrdeutigkeiten fragt die App nach Zuordnung
3. **Neu**: Google-Kontakte ohne Match werden neu angelegt

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  FRONTEND                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ /prm        │ │ /prm/[id]   │ │ /prm/[id]/  │ │ /prm/network│            │
│  │ Übersicht   │ │ Details     │ │ edit        │ │ Graph       │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ 🔔 Notification Banner / Bell                                │           │
│  └──────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API ROUTES                                      │
│  /api/contacts/* | /api/tasks/* | /api/notifications/* | /api/sync/google/* │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               SERVICES                                       │
│  ContactService | GooglePeopleService | SyncService | NotificationService   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATENBANK (PostgreSQL)                              │
│  Contact | PersonRelation | Interaction | Task | Notification | SyncProvider │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Google People API                                     │
│  OAuth 2.0 | Sync Token | Rate Limit: 60/min | ⚠️ Kein Webhook              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Erläuterung

### 3.1 Frontend

| Komponente | Beschreibung |
|------------|--------------|
| **PRM-Übersicht** | Kontaktliste, Suche, Filter, offene Tasks |
| **Kontaktdetails** | Alle Infos inkl. **Journal-Einträge in denen Person erwähnt wird** |
| **Social Network Graph** | Interaktiver Graph - Kontakt auswählen → zentrieren → Beziehungen sehen |
| **Notification Banner** | Ungelesene Benachrichtigungen (oder via Glockensymbol) |

### 3.2 Journal-Erwähnungen

Da viele Journal-Einträge gesprochen und transkribiert werden, ist eine spezielle @-Syntax nicht praktikabel. Stattdessen ein hybrider Ansatz:

**Erfassung:**
1. **Schriftlich**: Beim Schreiben kann `@` getippt werden → Autocomplete mit Kontaktvorschlägen
2. **Gesprochen**: Der Name wird einfach ausgesprochen (z.B. "Gespräch mit Max Mustermann")
3. **Beim Speichern**: Eine `Interaction` mit `kind=MENTION` wird erstellt und mit dem `JournalEntry` verknüpft
4. **Manuell**: Benutzer kann auch nachträglich Erwähnungen hinzufügen

**Anzeige:**
- Im Content wird der Name als normaler Text gespeichert (kein spezielles Format nötig)
- Beim Rendern des Eintrags werden die verknüpften `Interaction`-Einträge (kind=MENTION) abgerufen
- Für jeden verknüpften Kontakt wird im Text nach dessen Namen gesucht
- Gefundene Namen werden als klickbare Links gerendert → Navigation zu `/prm/[slug]`

**Vorteile:**
- Keine spezielle Syntax im transkribierten Text nötig
- Klickbare Links beim Anzeigen
- Kontaktdetails zeigen alle Erwähnungen

### 3.3 Services

| Service | Verantwortlichkeiten |
|---------|---------------------|
| **ContactService** | CRUD, Suche, Beziehungen, Tasks |
| **GooglePeopleService** | OAuth2, Token-Management, API-Calls |
| **SyncService** | Full/Incremental Sync, Konfliktauflösung, Notifications |
| **NotificationService** | CRUD für Benachrichtigungen |

---

## 4. Datenmodell

### 4.1 Betroffene Entitäten

| Entität | Status | Änderungen |
|---------|--------|------------|
| `Contact` | Erweitern | Vereinfachte Felder, Google-Sync-Felder |
| `Interaction` | Erweitern | `MENTION` Kind, `journalEntryId` |
| `Task` | **NEU** | Aufgaben für Kontakte |
| `Notification` | **NEU** | Benachrichtigungen |
| `SyncProviderType` | Erweitern | `GOOGLE_CONTACTS` |
| `TaxonomyKind` | Erweitern | `CONTACT_GROUP` |
| `InteractionKind` | Erweitern | `MENTION` |

### 4.2 Schema-Änderungen (Prisma)

```prisma
// ENUMS
enum SyncProviderType {
  // ... bestehende ...
  GOOGLE_CONTACTS
}

enum TaxonomyKind {
  // ... bestehende ...
  CONTACT_GROUP
}

enum InteractionKind {
  // ... bestehende ...
  MENTION
}

enum TaskStatus { PENDING, COMPLETED, CANCELLED }

enum NotificationType {
  GENERAL              /// Allgemeine Benachrichtigung
  BIRTHDAY_REMINDER    /// Geburtstagserinnerung
  SYNC_CONFLICT        /// Konflikt bei Synchronisation
  SYNC_ERROR           /// Fehler bei Synchronisation
  CONTACT_MATCH_REQUIRED /// Manuelle Zuordnung erforderlich
}

// CONTACT (vereinfacht)
model Contact {
  id                String    @id @default(uuid())
  userId            String
  slug              String
  name              String
  givenName         String?
  familyName        String?
  nickname          String?
  emailPrivate      String?
  emailWork         String?
  phonePrivate      String?
  phoneWork         String?
  addressHome       String?   // Formatierte Adresse
  addressWork       String?
  company           String?
  jobTitle          String?
  notes             String?
  birthday          DateTime?
  firstMetAt        DateTime?
  relationshipLevel Int?
  isArchived        Boolean   @default(false)
  isFavorite        Boolean   @default(false)
  websiteUrl         String?   // Primäre Website
  socialUrls         Json?     // Array von Social Media URLs [{type, url}]
  googleResourceName String?
  googleEtag         String?
  locationId        String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // ... relations ...
  tasks             Task[]    @relation("ContactTasks")

  @@unique([userId, slug])
  @@unique([userId, googleResourceName])
}

// INTERACTION (erweitert)
model Interaction {
  // ... bestehende Felder ...
  journalEntryId String?
  journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id])
  @@index([journalEntryId])
}

// TASK (neu)
model Task {
  id          String     @id @default(uuid())
  userId      String
  entityId    String?
  contactId   String?
  title       String
  description String?
  dueDate     DateTime?
  status      TaskStatus @default(PENDING)
  completedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user    User     @relation(...)
  entity  Entity?  @relation(...)
  contact Contact? @relation("ContactTasks", ...)

  @@index([userId, status])
  @@index([contactId])
  @@index([dueDate])
}

// NOTIFICATION (neu)
model Notification {
  id         String           @id @default(uuid())
  userId     String
  type       NotificationType @default(GENERAL)
  title      String
  message    String?
  data       Json?
  isRead     Boolean          @default(false)
  archivedAt DateTime?
  createdAt  DateTime         @default(now())

  user User @relation(...)

  @@index([userId, archivedAt])
}

// SYNCPROVIDER (erweitert)
model SyncProvider {
  // ... bestehende Felder ...
  syncToken String?
}
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue Libraries

```json
{
  "googleapis": "^140.0.0",
  "react-force-graph-2d": "^1.25.0"
}
```

### 5.2 API-Routen

| Route | Beschreibung |
|-------|--------------|
| `/api/contacts` | Liste, Erstellen |
| `/api/contacts/[id]` | CRUD |
| `/api/contacts/[id]/tasks` | Tasks für Kontakt |
| `/api/contacts/[id]/journal-entries` | Erwähnungen |
| `/api/tasks/[id]` | Task CRUD |
| `/api/notifications` | Ungelesene |
| `/api/notifications/[id]/archive` | Archivieren |
| `/api/sync/google-contacts/auth` | OAuth starten |
| `/api/sync/google-contacts/callback` | OAuth Callback |
| `/api/sync/google-contacts/sync` | Sync ausführen |

---

## 6. UX - Komponenten und Screens

### 6.1 Social Network Graph (`/prm/network`)

- **Interaktiv**: Force-Graph mit Zoom/Pan
- **Zentrierung**: Dropdown um Kontakt auszuwählen und zu zentrieren
- **Beziehungen**: Linien zwischen verbundenen Kontakten (Farbe/Stil nach Beziehungstyp)
- **Klick**: Auf Node klicken → Details anzeigen
- **Typische Social Network Analysis Darstellung**

### 6.2 Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| `ContactList`, `ContactCard`, `ContactDetails`, `ContactForm` | Kontakt-UI |
| `ImageGallery` | Bildergalerie mit primärem Bild |
| `TaskList`, `TaskForm` | Aufgaben-UI |
| `NotificationBanner`, `NotificationBell` | Benachrichtigungen |
| `SocialNetworkGraph` | Force-Graph |
| `MentionInput` | @-Autocomplete für Journal |

---

## 7. Neue Dependencies

```json
{
  "dependencies": {
    "googleapis": "^140.0.0",
    "react-force-graph-2d": "^1.25.0"
  }
}
```

---

## 8. Dateistruktur

```
app/
├── prm/
│   ├── page.tsx                    # Kontaktliste
│   ├── new/page.tsx                # Neuer Kontakt
│   ├── [id]/page.tsx               # Details
│   ├── [id]/edit/page.tsx          # Bearbeiten
│   └── network/page.tsx            # Social Graph
├── api/
│   ├── contacts/...
│   ├── tasks/...
│   ├── notifications/...
│   └── sync/google-contacts/...
components/
├── prm/
│   ├── ContactList.tsx, ContactCard.tsx, ContactDetails.tsx, ContactForm.tsx
│   ├── ImageGallery.tsx, TaskList.tsx, TaskForm.tsx
│   ├── SocialNetworkGraph.tsx, GoogleSyncStatus.tsx
├── notifications/
│   ├── NotificationBanner.tsx, NotificationBell.tsx
├── shared/
│   └── MentionInput.tsx
lib/
├── services/
│   ├── contact.ts, google-auth.ts, google-people.ts
│   ├── contact-sync.ts, notification.ts
├── validators/
│   └── contact.ts, task.ts
```

---

## 9. Implementierungsplan

### Schritt 1 (LLM): Prisma Schema erweitern

**Ziele:**
- `SyncProviderType` um `GOOGLE_CONTACTS` erweitern
- `TaxonomyKind` um `CONTACT_GROUP` erweitern (für Google Contact Groups)
- `InteractionKind` um `MENTION` erweitern (für Journal-Erwähnungen)
- `Contact` Model um neue Felder erweitern:
  - Basisfelder: `givenName`, `familyName`, `isFavorite`
  - E-Mail/Telefon vereinfacht: `emailPrivate`, `emailWork`, `phonePrivate`, `phoneWork`
  - Adressen vereinfacht: `addressHome`, `addressWork` (formatierte Strings)
  - Arbeitgeber vereinfacht: `company`, `jobTitle`
  - URLs: `websiteUrl`, `socialUrls` (Json Array)
  - Google-Sync: `googleResourceName`, `googleEtag`
- `Interaction` Model erweitern:
  - Neues Feld `journalEntryId` für Verknüpfung mit Journal-Einträgen (MENTION)
- Neue Enums erstellen:
  - `TaskStatus`: `PENDING`, `COMPLETED`, `CANCELLED`
  - `NotificationType`: `GENERAL`, `BIRTHDAY_REMINDER`, `SYNC_CONFLICT`, `SYNC_ERROR`, `CONTACT_MATCH_REQUIRED`
- Neue Models erstellen:
  - `Task`: Aufgaben für Kontakte mit Fälligkeitsdatum
  - `Notification`: Benachrichtigungen für Benutzer
- `SyncProvider` um `syncToken` Feld erweitern

**Tipps:**
- Bestehende Felder `email` und `phone` in Contact löschen
- Unique Constraint auf `[userId, googleResourceName]` für Sync-Deduplication
- Cascade Delete für Task und Notification
- Index auf `Task.dueDate` für Fälligkeitsabfragen
- Index auf `Notification.archivedAt` für ungelesene Abfragen
- Index auf `Interaction.journalEntryId` für Erwähnungssuche

---

### Schritt 2 (LLM): Seed-Datei anpassen

**Ziele:**
- Testdaten für Kontakte mit allen Feldern erstellen (E-Mail, Telefon, Adressen, URLs, etc.)
- Beispiel-Beziehungen zwischen Kontakten anlegen
- Beispiel-Interaktionen erstellen (inkl. MENTION-Typ mit journalEntryId)
- Beispiel-Tasks für Kontakte erstellen (verschiedene Status, Fälligkeiten)
- Beispiel-Notifications erstellen (verschiedene Typen)

**Tipps:**
- Realistische Schweizer Testdaten verwenden
- Mindestens 5-10 Kontakte mit unterschiedlichen Datenkonstellationen
- Tasks mit verschiedenen Status: PENDING, COMPLETED, CANCELLED
- Notifications mit verschiedenen Typen: BIRTHDAY_REMINDER, SYNC_CONFLICT, etc.

---

### Schritt 3 (LLM): Environment-Variablen und Konfiguration

**Ziele:**
- Neue Umgebungsvariablen dokumentieren
- TypeScript Types für Google OAuth Config erstellen
- Beispiel `.env.example` aktualisieren

**Neue Variablen:**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/sync/google-contacts/callback
```

---

### Schritt 4 (Mensch): Google Cloud Console Setup & Environment-Variablen vervollständigen

**Ziele:**
- Neues Projekt in Google Cloud Console erstellen (oder bestehendes verwenden)
- People API aktivieren
- OAuth 2.0 Client-ID erstellen (Web-Anwendung)
- Authorized redirect URIs konfigurieren:
  - Development: `http://localhost:3000/api/sync/google-contacts/callback`
  - Production: `https://your-domain.com/api/sync/google-contacts/callback`
- OAuth Consent Screen konfigurieren

**Tipps:**
- Scope `https://www.googleapis.com/auth/contacts` hinzufügen
- Client ID und Secret sicher in `.env` speichern

---

### Schritt 5 (LLM): Zod Validators erstellen

**Ziele:**
- Validation Schemas für alle Kontakt-Formulare
- ContactCreateSchema, ContactUpdateSchema
- Email/Phone/Address Nested Schemas
- InteractionSchema
- RelationSchema

**Tipps:**
- Wiederverwendbare Basis-Schemas für Mehrfachwerte
- Deutsche Fehlermeldungen

---

### Schritt 6 (LLM): Google Auth Service implementieren

**Ziele:**
- OAuth2 Authorization URL generieren
- Authorization Code gegen Tokens tauschen
- Tokens verschlüsselt in SyncProvider speichern
- Token Refresh implementieren
- Token-Validierung

**Tipps:**
- `googleapis` Library verwenden
- Refresh Token Flow korrekt implementieren
- Error Handling für Token-Ablauf

---

### Schritt 7 (LLM): Google People Service implementieren

**Ziele:**
- Kontakte abrufen mit Pagination
- Sync Token Support für inkrementelle Updates
- Kontakt erstellen/aktualisieren/löschen bei Google
- Field Mapping Google ↔ Lokal

**Tipps:**
- `personFields` Parameter korrekt setzen
- Pagination mit `nextPageToken` handhaben
- `etag` für Konflikt-Erkennung nutzen

---

### Schritt 8 (LLM): Contact Sync Service implementieren

**Ziele:**
- Full Sync: Alle Kontakte synchronisieren
- Incremental Sync: Nur Änderungen seit letztem Sync
- Konfliktauflösung: Last-Write-Wins basierend auf `etag`
- Gelöschte Kontakte behandeln (`metadata.deleted`)
- SyncRun Logging

**Tipps:**
- Bei abgelaufenem Sync Token (HTTP 410) → Full Sync
- Transaktion für atomare Updates
- Detailliertes Error Logging

---

### Schritt 9 (LLM): Contact Service implementieren

**Ziele:**
- CRUD für Kontakte mit allen Relationen
- Suche (Volltext über Name, E-Mail, etc.)
- Filterung (Favoriten, Labels, etc.)
- Sortierung (Name, letzte Interaktion)
- Beziehungsverwaltung
- Task-Verwaltung für Kontakte
- Journal-Erwähnungen finden (via Interaction.kind = MENTION)

**Tipps:**
- Prisma Include für eager loading
- Performante Queries mit Indizes

---

### Schritt 10 (LLM): Task Service implementieren

**Ziele:**
- CRUD für Tasks
- Tasks nach Kontakt abrufen
- Tasks nach Status filtern (PENDING, COMPLETED, CANCELLED)
- Tasks nach Fälligkeit sortieren
- Task-Status ändern (complete, cancel)

**Tipps:**
- `completedAt` automatisch setzen bei Status-Änderung
- Überfällige Tasks hervorheben können

---

### Schritt 11 (LLM): Notification Service implementieren

**Ziele:**
- Notification erstellen (für verschiedene Typen)
- Ungelesene Notifications abrufen (archivedAt IS NULL)
- Notification archivieren
- Notification als gelesen markieren
- Notifications nach Typ filtern

**Tipps:**
- Batch-Archivierung ermöglichen
- `data` Feld für typ-spezifische Zusatzinfos nutzen

---

### Schritt 12 (LLM): API Routes für Kontakte

**Ziele:**
- `/api/contacts` - Liste und Erstellen
- `/api/contacts/[id]` - CRUD
- `/api/contacts/[id]/relations` - Beziehungen
- `/api/contacts/[id]/interactions` - Interaktionen
- `/api/contacts/[id]/tasks` - Tasks für Kontakt
- `/api/contacts/[id]/journal-entries` - Journal-Erwähnungen
- `/api/contacts/search` - Suche

**Tipps:**
- User-Authentifizierung prüfen
- Pagination implementieren
- Input Validation mit Zod

---

### Schritt 13 (LLM): API Routes für Tasks und Notifications

**Ziele:**
- `/api/tasks` - Liste aller Tasks (mit Filter)
- `/api/tasks/[id]` - Task CRUD
- `/api/tasks/[id]/complete` - Task abschliessen
- `/api/notifications` - Ungelesene Notifications
- `/api/notifications/[id]/archive` - Notification archivieren
- `/api/notifications/archive-all` - Alle archivieren

**Tipps:**
- Tasks können auch ohne Kontakt existieren (allgemeine Todos)
- Notifications sollten effizient abfragbar sein (Badge-Counter)

---

### Schritt 14 (LLM): API Routes für Google Sync

**Ziele:**
- `/api/sync/google-contacts/auth` - OAuth starten
- `/api/sync/google-contacts/callback` - OAuth Callback
- `/api/sync/google-contacts/sync` - Sync ausführen
- `/api/sync/google-contacts/status` - Status abfragen
- `/api/sync/google-contacts/disconnect` - Trennen

**Tipps:**
- State Parameter für CSRF-Schutz
- Fehlerbehandlung bei OAuth-Fehlern
- Sync als Background-Task (nicht blockierend)

---

### Schritt 15 (LLM): PRM UI Komponenten

**Ziele:**
- `ContactList` mit virtueller Scrolling
- `ContactCard` für Listenansicht
- `ContactDetails` für Detailansicht
- `GoogleSyncStatus` für Sync-Anzeige

**Tipps:**
- daisyUI Komponenten verwenden
- Tabler Icons
- Responsive Design

---

### Schritt 16 (LLM): Kontakt-Formular

**Ziele:**
- `ContactForm` mit React Hook Form
- `MultiValueField` für E-Mails/Telefone/Adressen
- Dynamisches Hinzufügen/Entfernen von Feldern
- Validation mit Zod

**Tipps:**
- `useFieldArray` für dynamische Felder
- Benutzerfreundliche Fehlermeldungen

---

### Schritt 17 (LLM): Beziehungs- und Interaktions-Editor

**Ziele:**
- `RelationEditor` Modal
- `InteractionForm` für neue Interaktionen
- Autocomplete für Kontaktauswahl

**Tipps:**
- Beziehung in beide Richtungen verstehen (A ist Bruder von B → B ist Bruder von A)
- Interaktionstypen als Dropdown

---

### Schritt 18 (LLM): PRM Pages

**Ziele:**
- `/prm` - Kontaktliste Page
- `/prm/new` - Neuer Kontakt
- `/prm/[id]` - Kontaktdetails
- `/prm/[id]/edit` - Kontakt bearbeiten

**Tipps:**
- Server Components wo möglich
- Loading States
- Error Boundaries

---

### Schritt 19 (LLM): Navigation erweitern

**Ziele:**
- PRM-Link in Hauptnavigation
- Settings-Seite um Google-Verbindung erweitern

**Tipps:**
- Konsistentes Design mit Rest der App

---

### Schritt 20 (LLM): Beziehungsnetzwerk

**Ziele:**
- `/prm/network` Page
- `RelationshipGraph` Komponente mit react-force-graph

**Tipps:**
- Nodes = Kontakte, Edges = Beziehungen
- Interaktives Zoomen/Panning
- Klick auf Node → Details anzeigen

---

### Schritt 21 (LLM): Journal-Erwähnungen implementieren

**Ziele:**
- `MentionInput` Komponente mit @-Autocomplete für schriftliche Eingabe
- Beim Speichern eines Journal-Eintrags: Interactions mit kind=MENTION erstellen
- Beim Rendern: Verknüpfte Kontaktnamen im Text als Links darstellen
- Manuelles Hinzufügen von Erwähnungen ermöglichen

**Tipps:**
- Namenssuche im Text case-insensitive
- Auch Nickname und Spitznamen berücksichtigen
- Performance: Nur bei verknüpften Contacts suchen, nicht alle

---

### Schritt 22 (LLM): Task- und Notification-UI

**Ziele:**
- `TaskList` und `TaskForm` Komponenten
- `NotificationBanner` unterhalb Navigation
- `NotificationBell` mit Badge in Navigation
- Task-Status Toggle (Checkbox)
- Archivieren-Button pro Notification

**Tipps:**
- Überfällige Tasks visuell hervorheben (rot)
- Badge-Counter für ungelesene Notifications

---

### Schritt 23 (LLM): Interaktionen im Tagebuch

**Ziele:**
- Interaktionen als Eintragstyp im Tagebuch
- Verknüpfung Tagebuch ↔ Interaktion

**Tipps:**
- Bestehende JournalEntryType Logik nutzen

---

## 10. Automatisiertes Testing

### 10.1 LLM-autonome Tests

| Test | Beschreibung |
|------|--------------|
| `npm run build` | Kompiliert ohne Fehler |
| `npm run lint` | Keine Lint-Fehler |
| `npx prisma db push` | Schema valide |
| `npx prisma db seed` | Seed-Daten korrekt |

### 10.2 Unit Tests (LLM implementiert)

```typescript
// __tests__/lib/services/contact.test.ts
// - CRUD Operationen
// - Suche funktioniert
// - Task-Verwaltung

// __tests__/lib/services/contact-sync.test.ts
// - Field Mapping Google → Lokal
// - Field Mapping Lokal → Google
// - Konfliktauflösung

// __tests__/lib/validators/*.test.ts
// - Schema Validation
```

### 10.3 API Tests (LLM implementiert)

```typescript
// __tests__/api/contacts.test.ts
// - GET /api/contacts returns 200
// - POST /api/contacts creates contact
// - GET /api/contacts/[id] returns contact
// - PUT /api/contacts/[id] updates contact
// - DELETE /api/contacts/[id] deletes contact

// __tests__/api/tasks.test.ts
// __tests__/api/notifications.test.ts
```

### 10.4 Kollaboratives Testing (LLM + Mensch)

Für Google-API-abhängige Tests:

1. **Mensch**: Google OAuth durchführen, Tokens erhalten
2. **Mensch**: Test-Tokens in `.env.test` oder als Fixture bereitstellen
3. **LLM**: Automatisierte Tests gegen echte API mit Test-Tokens:
   - Kontakte abrufen
   - Kontakt erstellen/aktualisieren
   - Sync durchführen
4. **Mensch**: Bei Token-Ablauf erneuern

**Mock-basierte Tests** (LLM autonom):
- Google API Responses mocken
- Sync-Logik testen ohne echte API-Calls

---

## 11. Manuelles Testing

Detaillierte Testfälle sind im separaten Dokument beschrieben:

**→ [prm-contacts-testing.md](./prm-contacts-testing.md)**

Das Dokument enthält:
- Google OAuth Flow Tests
- Kontakt-Synchronisation Tests
- UI/UX Tests
- Edge Cases
- Performance Tests

---

*Dieses Dokument wird im Laufe der Implementation aktualisiert.*
