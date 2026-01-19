# Datenmodell-Architektur (Final)

Dieses Dokument beschreibt die finale Architektur des Datenmodells für die Comp-ACT-Diary Applikation. Es dient als Referenz für zukünftige Entwicklung und dokumentiert die getroffenen Architektur-Entscheidungen.

*Erstellt: Dezember 2024*
*Aktualisiert: Januar 2025*

---

## 1. Architektur-Übersicht (ASCII-Art)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                         USER                                            │
│                          id, email, name, settings, createdAt                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│      ENTITY REGISTRY    │   │      ZEITMODELL         │   │      TAXONOMIE          │
│  ─────────────────────  │   │  ─────────────────────  │   │  ─────────────────────  │
│  Entity                 │   │  TimeBox                │   │  Taxonomy               │
│  (id, userId, type,     │   │  (kind, localDate,      │   │  (kind, origin,         │
│   createdAt)            │   │   timezone, parentId)   │   │   parentId, slug)       │
│                         │   │         │               │   │         │               │
│  Alle Kern-Entitäten    │   │         ▼ 1:1 (DAY)    │   │         ▼               │
│  erben Entity.id        │   │  DayEntry               │   │  Tagging                │
│                         │   │  (rating, weather,      │   │  (taxonomyId,           │
│  → FK-Integrität für    │   │   aiSummary)            │   │   entityId, source)     │
│    alle polymorphen     │   │                         │   │                         │
│    Tabellen             │   │  EntryTimeBox (M:N)     │   │                         │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
              │                             │                             │
              └─────────────────────────────┼─────────────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        │                                   │                                   │
        ▼                                   ▼                                   ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│     JOURNAL       │             │       ACT         │             │    PERSONEN &     │
│  ───────────────  │             │  ───────────────  │             │      ORTE         │
│                   │             │                   │             │  ───────────────  │
│  JournalEntryType │             │  ActValue         │             │  Contact          │
│        │          │             │      │            │             │  (locationId)     │
│        ▼          │             │      ▼            │             │      │            │
│  JournalTemplate  │             │  ActGoal          │             │      ▼            │
│        │          │             │      │            │             │  PersonRelation   │
│        ▼          │             │      ├────────┐   │             │  Interaction      │
│  JournalEntry ────┼─────────────┼──────┼────────┼───┼─────────────┼► LocationVisit    │
│  (timeBoxId,      │             │      ▼        ▼   │             │  (timeBoxId,      │
│   content,        │             │   Habit    Reward │             │   journalEntryId?)│
│   isSensitive)    │             │      │            │             │      │            │
│                   │             │      ▼            │             │      ▼            │
│                   │             │  HabitCheckIn     │             │  Location         │
│                   │             │                   │             │  (lat, lng,       │
│                   │             │                   │             │   poiType)        │
└───────────────────┘             └───────────────────┘             └───────────────────┘
        │                                   │                                   │
        └───────────────────────────────────┼───────────────────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        │                                   │                                   │
        ▼                                   ▼                                   ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│      MEDIEN       │             │    MESSWERTE      │             │    EXTERNAL       │
│  ───────────────  │             │  ───────────────  │             │      SYNC         │
│                   │             │                   │             │  ───────────────  │
│  MediaAsset       │             │  MetricDefinition │             │  SyncProvider     │
│  (thumbnailData,  │             │  (code, unit,     │             │      │            │
│   capturedAt,     │             │   isSensitive)    │             │      ▼            │
│   externalUrl)    │             │        │          │             │  SyncRun          │
│        │          │             │        ▼          │             │      │            │
│        ▼          │             │  Measurement      │             │      ▼            │
│  MediaAttachment  │             │  (timeBoxId,      │             │  ExternalSync     │
│  (entityId, role) │             │   value,          │             │  (entityType,     │
│                   │             │   isSensitive)    │             │   externalId)     │
└───────────────────┘             └───────────────────┘             └───────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
          ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
          │    EXERCISES      │   │    SONSTIGES      │   │   QUERSCHNITT     │
          │  ───────────────  │   │  ───────────────  │   │  ───────────────  │
          │  ExerciseDefin.   │   │                   │   │                   │
          │      │            │   │  InventoryItem    │   │  EntityLink       │
          │      ▼            │   │  Bookmark         │   │  Embedding        │
          │  ExerciseSession  │   │  TimeTrackingEntry│   │  Trash            │
          │                   │   │  CalendarEvent    │   │  GeneratedImage   │
          │                   │   │  Consumption      │   │                   │
          │                   │   │  ChatMethod       │   │                   │
          │                   │   │  ImprovementPrompt│   │                   │
          │                   │   │  LlmModel         │   │                   │
          │                   │   │  Task             │   │                   │
          │                   │   │  Notification     │   │                   │
          └───────────────────┘   └───────────────────┘   └───────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               LOCATION TRACKING                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  RawGpsPoint (lat, lng, source, geocodedAt?, locationId?)                               │
│  LocationWebhookToken (tokenHash, deviceName, isActive)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                         BENUTZERUEBERGREIFENDE FREIGABE                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  JournalEntryAccess (journalEntryId, userId, role: VIEWER/EDITOR)                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity-Registry (Polymorphie-Lösung)

Die zentrale Architektur-Entscheidung ist die **Entity-Registry** für FK-basierte Polymorphie:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ENTITY REGISTRY                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Entity (id, userId, type, createdAt, updatedAt)                                       │
│     │                                                                                   │
│     ├── JournalEntry.id = Entity.id (1:1)                                              │
│     ├── Contact.id = Entity.id (1:1)                                                   │
│     ├── Location.id = Entity.id (1:1)                                                  │
│     ├── MediaAsset.id = Entity.id (1:1)                                                │
│     ├── Measurement.id = Entity.id (1:1)                                               │
│     ├── ActValue.id = Entity.id (1:1)                                                  │
│     ├── ActGoal.id = Entity.id (1:1)                                                   │
│     ├── Habit.id = Entity.id (1:1)                                                     │
│     ├── CalendarEvent.id = Entity.id (1:1)                                             │
│     ├── Consumption.id = Entity.id (1:1)                                               │
│     ├── InventoryItem.id = Entity.id (1:1)                                             │
│     ├── TimeTrackingEntry.id = Entity.id (1:1)                                         │
│     ├── Bookmark.id = Entity.id (1:1)                                                  │
│     └── TimeBox.id = Entity.id (1:1) [NEU: TIMEBOX EntityType]                         │
│                                                                                         │
│  Polymorphe Tabellen referenzieren Entity.id (echter FK):                              │
│     ├── Tagging.entityId → Entity.id                                                   │
│     ├── MediaAttachment.entityId → Entity.id                                           │
│     ├── EntityLink.sourceId/targetId → Entity.id                                       │
│     ├── ExternalSync.entityId → Entity.id                                              │
│     ├── Embedding.entityId → Entity.id                                                 │
│     ├── EntryTimeBox.entityId → Entity.id                                              │
│     └── GeneratedImage.entityId → Entity.id                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Entitätenliste nach Bereich

### 3.1 Kern-System

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **User** | id, email, name, settings (Json), createdAt | 1:N zu fast allen Entitäten |
| **Entity** | id, userId, type (Enum), createdAt, updatedAt | Basis für alle Kern-Entitäten |

### 3.2 Zeitmodell

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **TimeBox** | id, userId, kind (DAY/WEEK/MONTH/YEAR/CUSTOM), startAt, endAt, timezone, localDate, title, parentId | Hierarchisch (parent/children), 1:1 zu DayEntry für kind=DAY |
| **DayEntry** | id, userId, timeBoxId, dayRating (1-10), aiSummary, weather (Json) | 1:1 zu TimeBox (DAY), 1:N zu JournalEntry, Measurement, Interaction |
| **EntryTimeBox** | id, entityId, timeBoxId, isPrimary | M:N zwischen Entities und TimeBoxes |

### 3.3 Journal

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **JournalEntryType** | id, userId?, code, name, icon, defaultTemplateId, sortOrder | 1:N zu JournalEntry, N:1 zu JournalTemplate |
| **JournalTemplate** | id, userId?, name, prompts (Json), origin | 1:N zu JournalEntry, 1:N zu JournalEntryType |
| **JournalEntry** | id (=Entity.id), userId, typeId, templateId?, timeBoxId, **locationId?**, title?, content, **originalTranscript?**, aiSummary?, **analysis?**, **contentUpdatedAt?**, isSensitive, **deletedAt?**, **occurredAt?**, **capturedAt?** | N:1 zu TimeBox, Type, Template, **Location**, 1:N zu JournalEntryAccess |
| **JournalEntryAccess** | id, journalEntryId, userId, role (VIEWER/EDITOR), grantedByUserId? | N:1 zu JournalEntry, N:1 zu User |

### 3.4 ACT-Domäne

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **ActValue** | id (=Entity.id), userId, slug, title, description?, icon?, imageUrl?, lifeArea?, importanceRank?, validFrom, validTo? | 1:N zu ActGoal |
| **ActGoal** | id (=Entity.id), userId, valueId?, slug, title, description?, icon?, imageUrl?, targetDate?, progress, status, validFrom, validTo? | N:1 zu ActValue, 1:N zu Habit, 1:N zu Reward |
| **Habit** | id, userId, goalId?, slug, title, description?, icon?, frequency?, streakCount, lastCheckIn?, isActive | N:1 zu ActGoal, 1:N zu HabitCheckIn, 1:N zu Reward |
| **HabitCheckIn** | id, habitId, userId, timeBoxId, status (DONE/PARTIAL/SKIPPED), notes?, occurredAt | N:1 zu Habit, N:1 zu TimeBox |
| **Reward** | id, userId, goalId?, habitId?, title, description?, pointsRequired?, status (PENDING/EARNED/CLAIMED), earnedAt?, claimedAt? | N:1 zu ActGoal, N:1 zu Habit |

### 3.5 Exercises

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **ExerciseDefinition** | id, userId?, slug, name, description?, category?, skill?, prompts (Json), origin | 1:N zu ExerciseSession |
| **ExerciseSession** | id, definitionId, userId, timeBoxId?, journalEntryId?, notes?, results (Json), occurredAt | N:1 zu ExerciseDefinition, N:1 zu TimeBox |

### 3.6 Taxonomie

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **Taxonomy** | id, userId, parentId?, slug, shortName, longName?, description?, icon?, imageUrl?, kind (CATEGORY/TAG/EMOTION/TOPIC/TRAIT/LIFE_AREA/**CONTACT_GROUP**), origin (SYSTEM/USER/IMPORT/AI), isArchived, sortOrder | Hierarchisch, 1:N zu Tagging |
| **Tagging** | id, taxonomyId, entityId (→Entity), userId, source (USER/AI/IMPORT), confidence? | N:1 zu Taxonomy, N:1 zu Entity |

### 3.7 Personen & Orte

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **Contact** | id (=Entity.id), userId, slug, name, **givenName?, familyName?**, nickname?, **emailPrivate?, emailWork?, phonePrivate?, phoneWork?, addressHome?, addressWork?, company?, jobTitle?**, notes?, birthday?, firstMetAt?, relationshipLevel?, isArchived, **isFavorite**, locationId?, **websiteUrl?, socialUrls (Json)?, googleResourceName?, googleEtag?, photoUrl?, namesToDetectAsMention[]** | 1:N zu PersonRelation, 1:N zu Interaction, 1:N zu Task, N:1 zu Location |
| **PersonRelation** | id, personAId, personBId, relationType, validFrom?, validTo? | N:1 zu Contact (beide Seiten) |
| **Interaction** | id, contactId, userId, timeBoxId?, **journalEntryId?**, kind (Enum: GENERAL/CALL/VIDEO/MEETING/MESSAGE/EMAIL/LETTER/SOCIAL/**MENTION**), notes?, occurredAt | N:1 zu Contact, N:1 zu TimeBox, **N:1 zu JournalEntry** |
| **Location** | id (=Entity.id), userId, slug, name, lat?, lng?, address?, country?, city?, poiType (Enum: HOME/WORK/RESTAURANT/...), isFavorite, notes? | 1:N zu Contact, 1:N zu LocationVisit, **1:N zu RawGpsPoint, 1:N zu JournalEntry** |
| **LocationVisit** | id, userId, locationId, timeBoxId, journalEntryId?, arrivedAt?, departedAt?, notes? | **N:1 zu Location, N:1 zu TimeBox, N:1 zu JournalEntry (optional)** |

### 3.8 Medien

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **MediaAsset** | id (=Entity.id), userId, **filePath?**, thumbnailData (Bytes)?, mimeType, width?, height?, duration?, externalProvider?, externalId?, externalUrl?, thumbnailUrl?, capturedAt?, **ocrText?, ocrMetadata (Json)?, ocrStatus (Enum)?, ocrProcessedAt?** | 1:N zu MediaAttachment, **1:1 zu GeneratedImage** |
| **MediaAttachment** | id, assetId, entityId (→Entity), userId, role (COVER/GALLERY/ATTACHMENT/**THUMBNAIL/SOURCE**), displayOrder, timeBoxId? | N:1 zu MediaAsset, N:1 zu Entity |
| **GeneratedImage** | id, userId, entityId (→Entity), assetId, model, prompt, aspectRatio, steps, displayOrder | N:1 zu Entity, N:1 zu MediaAsset |

### 3.9 Messwerte

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **MetricDefinition** | id, userId?, code, name, dataType (NUMERIC/TEXT/BOOLEAN/SCALE), unit?, minValue?, maxValue?, normalMin?, normalMax?, category?, isSensitive, origin | 1:N zu Measurement |
| **Measurement** | id (=Entity.id), metricId, userId, timeBoxId?, valueNum?, valueText?, valueBool?, valueEncrypted?, source, notes?, isSensitive, occurredAt | N:1 zu MetricDefinition, N:1 zu TimeBox |

### 3.10 Externe Integrationen

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **SyncProvider** | id, userId, provider (Enum: PHOTOPRISM/SAMSUNG_GALLERY/TOGGL/GOOGLE_CALENDAR/APPLE_CALENDAR/SPOTIFY/LAST_FM/GOOGLE_CONTACTS/GOOGLE_TIMELINE), credentialsEncrypted, settings (Json), **syncToken?**, isActive, lastSyncAt?, **lastImportedDataAt?** | 1:N zu SyncRun, 1:N zu ExternalSync |
| **SyncRun** | id, providerId, startedAt, finishedAt?, status, itemsProcessed, itemsCreated, itemsUpdated, itemsSkipped, errors (Json)? | N:1 zu SyncProvider |
| **ExternalSync** | id, providerId, entityId (→Entity), externalId, externalUrl?, syncPayload (Json)?, lastSyncedAt | N:1 zu SyncProvider, N:1 zu Entity |
| **TimeTrackingEntry** | id (=Entity.id), userId, externalSyncId?, timeBoxId?, project?, task?, description?, startedAt, endedAt?, duration | N:1 zu ExternalSync |
| **CalendarEvent** | id (=Entity.id), userId, externalSyncId?, title, description?, startedAt, endedAt?, isAllDay, location? | N:1 zu ExternalSync |
| **Consumption** | id (=Entity.id), userId, kind (MUSIC/MOVIE/BOOK/PODCAST/GAME/...), title, artist?, externalId?, timeBoxId?, occurredAt | N:1 zu TimeBox |

### 3.11 KI-Assistenten

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **ChatMethod** | id, userId, name, description?, systemPrompt, icon?, imageUrl?, createdAt, updatedAt | N:1 zu User |
| **ImprovementPrompt** | id, userId, name, prompt, isSystem, sortOrder | N:1 zu User |
| **LlmModel** | id, userId, modelId, name, provider, inputCost?, outputCost?, url?, bestFor?, supportsReasoningEffort, defaultReasoningEffort?, sortOrder | N:1 zu User |

### 3.12 Sonstiges

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **InventoryItem** | id (=Entity.id), userId, name, description?, category?, purchaseDate?, purchasePrice?, source?, status (IN_POSSESSION/SOLD/GIFTED), photoAssetId? | N:1 zu MediaAsset |
| **Bookmark** | id (=Entity.id), userId, url, title, description?, faviconUrl? | - |
| **EntityLink** | id, sourceId (→Entity), targetId (→Entity), userId, linkKind? | N:1 zu Entity (beide Seiten) |
| **Embedding** | id, entityId (→Entity), userId, modelId, chunkIndex, vector, contentHash | N:1 zu Entity |
| **Trash** | id, userId, entityType, entityId, entityTitle, entityData (Json), schemaVersion, deletedAt | - |

### 3.13 Location Tracking

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **RawGpsPoint** | id, userId, lat, lng, accuracy?, altitude?, velocity?, battery?, batteryState?, trackerId?, topic?, source (OWNTRACKS/GOOGLE_IMPORT/MANUAL), rawPayload (Json)?, capturedAt, geocodedAt?, geocodedName?, geocodedAddress?, geocodedConfidence?, mapboxPlaceId?, geocodeOverridden, geocodeError?, locationId?, visitCreated | N:1 zu User, N:1 zu Location |
| **LocationWebhookToken** | id, userId, tokenHash, deviceName, isActive, lastUsedAt? | N:1 zu User |

### 3.14 Aufgaben & Benachrichtigungen

| Entität | Wichtigste Attribute | Beziehungen |
|---------|---------------------|-------------|
| **Task** | id, userId, entityId?, contactId?, title, description?, dueDate?, status (PENDING/COMPLETED/CANCELLED), completedAt? | N:1 zu User, N:1 zu Contact |
| **Notification** | id, userId, type (GENERAL/BIRTHDAY_REMINDER/SYNC_CONFLICT/SYNC_ERROR/CONTACT_MATCH_REQUIRED), title, message?, data (Json)?, isRead, archivedAt? | N:1 zu User |

---

## 4. Architektur-Entscheidungen mit Begründungen

### 4.1 Entity-Registry für Polymorphie

**Entscheidung:** Zentrale `Entity`-Tabelle, alle Kern-Entitäten teilen sich die ID mit Entity (1:1). Polymorphe Tabellen referenzieren `Entity.id` als echten Foreign Key.

**Begründung:** 
- Garantiert referenzielle Integrität auf DB-Ebene
- Cascading Deletes funktionieren automatisch
- Keine Orphan-Records möglich
- Konsistente Multi-Tenant-Filterung über `Entity.userId`
- Performance-Einbusse minimal (ein zusätzlicher Join)

### 4.2 TimeBox-Hierarchie mit DayEntry

**Entscheidung:** `TimeBox` als generisches Periodenkonzept (DAY/WEEK/MONTH/YEAR/CUSTOM) mit optionaler Hierarchie. `DayEntry` als 1:1-Spezialisierung für kind=DAY.

**Begründung:**
- Tage sind der häufigste Use-Case und verdienen Spezialbehandlung
- Tagesspezifische Aggregat-Daten (Rating, Weather, AI-Summary) belasten nicht alle TimeBoxes
- Performance: Häufige Tages-Queries profitieren von dedizierter Tabelle
- Unique Constraint `(userId, kind, localDate)` verhindert doppelte Tage

### 4.3 JournalEntry referenziert nur TimeBox

**Entscheidung:** `JournalEntry.timeBoxId` ist die einzige Zeitreferenz. Kein `dayEntryId`.

**Begründung:**
- Vermeidet Inkonsistenzen (dayEntry zeigt auf TimeBox A, timeBoxId = B)
- Ein Tagebucheintrag → referenziert DAY-TimeBox
- Eine Wochenreflexion → referenziert WEEK-TimeBox
- Ein Reisejournal → referenziert CUSTOM-TimeBox
- DayEntry bleibt als Aggregat für Tages-Metadaten erhalten

### 4.4 JournalEntryType als Entity statt Enum

**Entscheidung:** `JournalEntryType` ist eine eigene Tabelle, nicht ein Prisma-Enum.

**Begründung:**
- Neue Journal-Typen ohne DB-Migration hinzufügbar
- Metadaten pro Typ (Icon, Default-Template, Sortierung)
- User-definierte Typen möglich
- Unique auf `(userId, code)` für User-spezifische Codes

### 4.5 Taxonomy statt Tag

**Entscheidung:** Eine selbstreferenzierende `Taxonomy`-Tabelle mit `kind`-Enum (CATEGORY/TAG/EMOTION/TOPIC/TRAIT/LIFE_AREA/CONTACT_GROUP) und `origin`-Enum (SYSTEM/USER/IMPORT/AI).

**Begründung:**
- Einheitliches System für alle Klassifikationen
- `kind` ermöglicht gefilterte Sichten (nur Emotionen, nur Kategorien)
- `origin` ermöglicht Erkennung von System-Defaults für UI/Reset
- Hierarchie über `parentId` für beliebige Verschachtelungstiefe
- `isArchived` statt Löschen für verwendete Taxonomien

### 4.6 Habit mit HabitCheckIn-Historie

**Entscheidung:** `Habit` speichert nur den aktuellen `streakCount` (Cache), aber jeder Check-In wird in `HabitCheckIn` persistiert.

**Begründung:**
- Retro-Ansichten möglich ("An welchen Tagen habe ich X gemacht?")
- Korrelations-Analysen möglich
- `streakCount` kann jederzeit aus CheckIns reberechnet werden
- Fehlerkorrektur bei Timezone-Problemen möglich

### 4.7 Reward verknüpft mit Goal ODER Habit

**Entscheidung:** `Reward` hat optionale FKs zu `goalId` und `habitId`. Mindestens eines sollte gesetzt sein.

**Begründung:**
- Belohnungen für Goal-Erreichung: `goalId` gesetzt
- Belohnungen für Streak-Meilensteine: `habitId` gesetzt
- Flexibel erweiterbar ohne Schema-Änderung

### 4.8 Exercise als Definition + Session

**Entscheidung:** `ExerciseDefinition` (Template) + `ExerciseSession` (Durchführung).

**Begründung:**
- Übungen sind oft einmalig/situativ, nicht wiederkehrend wie Habits
- Definitionen können System- oder User-definiert sein
- Sessions können optional mit JournalEntry verlinkt werden
- Wiederverwendbare Definitionen für ACT-Übungen, Mindfulness, etc.

### 4.9 MediaAsset ohne occurred_at

**Entscheidung:** `MediaAsset` hat nur `capturedAt` (EXIF). Zeit-Verankerung erfolgt über `MediaAttachment` oder die verknüpfte Entität.

**Begründung:**
- `capturedAt` = wann das Foto aufgenommen wurde (objektiv)
- Zeitliche Relevanz ist kontextabhängig (ein Foto kann zu mehreren Zeiträumen gehören)
- `MediaAttachment.timeBoxId` für explizite Zuordnung zu Zeiträumen

### 4.10 Trash mit JSON-Snapshot (ohne Sensitive)

**Entscheidung:** Gelöschte Entitäten werden als JSON-Snapshot in `Trash` gespeichert. Verschlüsselte/sensitive Daten werden sofort hart gelöscht.

**Begründung:**
- Wiederherstellung möglich ohne komplexe Soft-Delete-Queries
- `schemaVersion` für zukünftige Migrations-Kompatibilität
- Sensitive Daten dürfen nicht im Papierkorb landen (Sicherheit)
- 30-Tage-Retention, danach automatische Bereinigung

### 4.11 Sensitive Daten mit Application-Level-Encryption (ALE)

**Entscheidung:** `isSensitive`-Flag auf Measurement/JournalEntry. Verschlüsselung auf Application-Ebene, nicht DB-Ebene.

**Begründung:**
- Key liegt nie in der DB (sicherer bei Cloud-Hosting)
- Prisma-kompatibel via Middleware
- Verschiedene Keys pro Sensitivitätsstufe möglich
- Biometrischer Unlock gibt zweiten Key frei

### 4.12 LocationVisit als M:N-Brücke

**Entscheidung:** `LocationVisit` als Join-Tabelle zwischen Location, TimeBox und optional JournalEntry. Zusätzlich `Contact.locationId` für Wohnorte.

**Begründung:**
- M:N zwischen Location und TimeBox: Ein Tag kann mehrere Orte haben, ein Ort kann an mehreren Tagen besucht werden
- M:N zwischen Location und JournalEntry: Ein Eintrag kann mehrere Orte referenzieren
- `journalEntryId` optional: Ortsbesuche können auch ohne JournalEntry erfasst werden
- `arrivedAt`/`departedAt` für Zeitstempel des Besuchs
- Kartenansicht: Einfache Query `WHERE timeBoxId IN (...)` für beliebige Zeiträume
- `Contact.locationId` für Wohnort-Zuordnung (1:1)

### 4.13 Enums für begrenzte Wertebereiche

**Entscheidung:** Verwendung von Prisma-Enums für Felder mit begrenztem, stabilen Wertebereich.

**Begründung:**
- `InteractionKind`: GENERAL, CALL, VIDEO, MEETING, MESSAGE, EMAIL, LETTER, SOCIAL, MENTION
- `PoiType`: HOME, WORK, RESTAURANT, SHOP, LANDMARK, TRANSPORT, NATURE, SPORT, HEALTH, OTHER
- Type-Safety auf DB- und Application-Ebene
- Verhindert Tippfehler und inkonsistente Daten
- Migrationen nur bei echten Schema-Änderungen nötig

### 4.14 Location Tracking mit On-Demand Geocoding (NEU)

**Entscheidung:** `RawGpsPoint` speichert GPS-Daten vor Geocoding. Geocoding erfolgt nicht automatisch, sondern muss vom User explizit ausgelöst werden.

**Begründung:**
- Kostenkontrolle: Mapbox-Geocoding-API verursacht Kosten pro Request
- User-Kontrolle: Entscheidung, welche Punkte geocoded werden sollen
- Batch-Verarbeitung: Viele Punkte effizient auf einmal geocoden
- `geocodedAt`, `geocodedName`, `mapboxPlaceId` für Geocoding-Ergebnisse
- `locationId` für Zuordnung zu existierenden Locations

### 4.15 Benutzerübergreifende Freigabe (NEU)

**Entscheidung:** `JournalEntryAccess` ermöglicht Freigabe von Journal-Einträgen an andere User mit Rollen (VIEWER/EDITOR).

**Begründung:**
- Gemeinsame Einträge für Paare/Familien möglich
- VIEWER kann nur lesen, EDITOR kann bearbeiten
- `grantedByUserId` für Audit-Trail
- Soft-Delete via `deletedAt` auf JournalEntry verhindert Datenverlust bei geteilten Einträgen

### 4.16 OCR für Medien-Assets (NEU)

**Entscheidung:** `MediaAsset` hat optionale OCR-Felder (`ocrText`, `ocrStatus`, `ocrMetadata`). OCR-Verarbeitung erfolgt asynchron.

**Begründung:**
- Volltextsuche in Bildern und PDFs möglich
- `ocrStatus` für Verarbeitungsstatus (PENDING, PROCESSING, COMPLETED, FAILED, SKIPPED)
- `ocrMetadata` für strukturierte Daten (Seitenzahl, Konfidenz, etc.)
- `MediaRole.SOURCE` markiert OCR-Quelldateien

### 4.17 KI-Bildgenerierung (NEU)

**Entscheidung:** `GeneratedImage` verknüpft KI-generierte Bilder mit Entities und speichert Generierungsparameter.

**Begründung:**
- Reproduzierbarkeit: `model`, `prompt`, `aspectRatio`, `steps` gespeichert
- Persistenz: Verknüpfung mit `MediaAsset` für lokale Speicherung
- Polymorph: `entityId` ermöglicht Bilder für beliebige Entities (Tage, Reflexionen, etc.)
- Sortierung: `displayOrder` für Galerie-Ansicht

---

## 5. Index-Strategie

### Primäre Indizes

```sql
-- Zeitliche Queries (häufigste Dimension)
CREATE UNIQUE INDEX idx_timebox_day ON time_box(user_id, kind, local_date) 
  WHERE kind = 'DAY';
CREATE INDEX idx_timebox_range ON time_box(user_id, kind, start_at, end_at);

-- Entity-Registry
CREATE INDEX idx_entity_user_type ON entity(user_id, type);

-- Journal
CREATE INDEX idx_journal_timebox ON journal_entry(user_id, time_box_id);
CREATE INDEX idx_journal_type ON journal_entry(user_id, type_id);

-- Tagging
CREATE INDEX idx_tagging_entity ON tagging(entity_id);
CREATE INDEX idx_tagging_taxonomy ON tagging(taxonomy_id, user_id);

-- Media
CREATE INDEX idx_media_captured ON media_asset(user_id, captured_at);
CREATE INDEX idx_media_attachment ON media_attachment(entity_id);

-- Habits
CREATE INDEX idx_habit_checkin ON habit_check_in(habit_id, time_box_id);
CREATE INDEX idx_habit_user ON habit(user_id, is_active);

-- Taxonomy
CREATE INDEX idx_taxonomy_kind ON taxonomy(user_id, kind, is_archived);
```

---

## 6. Enums

```prisma
enum EntityType {
  JOURNAL_ENTRY
  CONTACT
  LOCATION
  MEDIA_ASSET
  MEASUREMENT
  ACT_VALUE
  ACT_GOAL
  HABIT
  CALENDAR_EVENT
  CONSUMPTION
  INVENTORY_ITEM
  TIME_TRACKING_ENTRY
  BOOKMARK
  TIMEBOX              // NEU: TimeBox als Entity
}

enum TimeBoxKind {
  DAY
  WEEK
  MONTH
  YEAR
  CUSTOM
}

enum TaxonomyKind {
  CATEGORY
  TAG
  EMOTION
  TOPIC
  TRAIT
  LIFE_AREA
  CONTACT_GROUP        // NEU: Google Contact Groups
}

enum TaxonomyOrigin {
  SYSTEM
  USER
  IMPORT
  AI
}

enum TaggingSource {
  USER
  AI
  IMPORT
}

enum GoalStatus {
  ACTIVE
  PAUSED
  ACHIEVED
  ABANDONED
}

enum CheckInStatus {
  DONE
  PARTIAL
  SKIPPED
}

enum RewardStatus {
  PENDING
  EARNED
  CLAIMED
}

enum InventoryStatus {
  IN_POSSESSION
  SOLD
  GIFTED
}

enum MediaRole {
  COVER
  GALLERY
  ATTACHMENT
  THUMBNAIL
  SOURCE               // NEU: OCR-Quelldatei
}

enum OcrStatus {       // NEU
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  SKIPPED
}

enum ConsumptionKind {
  MUSIC
  MOVIE
  BOOK
  PODCAST
  GAME
  ARTICLE
  VIDEO
}

enum MetricDataType {
  NUMERIC
  TEXT
  BOOLEAN
  SCALE
}

enum MeasurementSource {
  MANUAL
  IMPORT
  DEVICE
}

enum SyncStatus {      // NEU
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum SyncProviderType { // NEU
  PHOTOPRISM
  SAMSUNG_GALLERY
  TOGGL
  GOOGLE_CALENDAR
  APPLE_CALENDAR
  SPOTIFY
  LAST_FM
  GOOGLE_CONTACTS
  GOOGLE_TIMELINE
}

enum InteractionKind { // NEU (war nur Kommentar)
  GENERAL
  CALL
  VIDEO
  MEETING
  MESSAGE
  EMAIL
  LETTER
  SOCIAL
  MENTION              // NEU: Journal-Erwähnung
}

enum PoiType {         // NEU (war nur Kommentar)
  HOME
  WORK
  RESTAURANT
  SHOP
  LANDMARK
  TRANSPORT
  NATURE
  SPORT
  HEALTH
  OTHER
}

enum GpsSource {       // NEU
  OWNTRACKS
  GOOGLE_IMPORT
  MANUAL
}

enum TaskStatus {      // NEU
  PENDING
  COMPLETED
  CANCELLED
}

enum NotificationType { // NEU
  GENERAL
  BIRTHDAY_REMINDER
  SYNC_CONFLICT
  SYNC_ERROR
  CONTACT_MATCH_REQUIRED
}

enum JournalEntryAccessRole { // NEU
  VIEWER
  EDITOR
}
```

---

## 7. Nicht-funktionale Anforderungen

| Anforderung | Lösung |
|-------------|--------|
| **Multi-Tenant** | `userId` auf allen Tabellen, Entity-Registry für zentrale Filterung |
| **Offline** | Nicht unterstützt (Web-only) |
| **Verschlüsselung** | ALE für `isSensitive=true` Einträge |
| **Löschung** | JSON-Snapshot in Trash (30 Tage), sensitive sofort gelöscht |
| **Versionierung** | `validFrom/validTo` auf ActValue, ActGoal |
| **Audit** | `SyncRun` für Import-Audit, kein allgemeines Audit-Log |
| **Performance** | Indizes auf häufige Filter-Dimensionen (Zeit, User, Type) |

---

*Dieses Dokument ist die autoritative Referenz für das Datenmodell. Bei Fragen oder Änderungen bitte dieses Dokument aktualisieren.*
