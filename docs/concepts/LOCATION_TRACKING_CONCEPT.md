# Location Tracking & Google Maps Timeline Integration

Konzept für die Integration von Standortdaten in die Comp-ACT-Diary App.

*Erstellt: Januar 2025*
*Aktualisiert: Januar 2025 (v3 - On-Demand Geocoding)*

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
12. [Entscheidungen](#12-entscheidungen)

---

## 1. Geplante Features

### 1.1 Kernfunktionen

| Feature | Priorität | Beschreibung |
|---------|-----------|--------------|
| **OwnTracks Echtzeit-Webhook** | Hoch | HTTP-Endpoint für Live-Standortdaten via OwnTracks App (bewegungsbasiert) |
| **Google Timeline JSON Import** | Hoch | Inkrementeller Import von exportierten Timeline-Daten (JSON) - nur neue Daten seit letztem Import |
| **Location-Matching** | Hoch | GPS-Koordinaten bekannten Locations zuordnen |
| **LocationVisit-Tracking** | Hoch | Besuchte Orte pro Tag mit Ankunfts-/Abfahrtszeit erfassen |
| **On-Demand Reverse Geocoding** | Hoch | User wählt GPS-Punkte aus und löst Geocoding manuell aus (Kostenkontrolle!) |
| **Batch-Geocoding** | Mittel | Mehrere Punkte auf einmal geocoden: nach Zeitraum oder via Polygon-Selektion auf Karte |
| **Tages-Karte** | Mittel | Mapbox GL JS Kartenansicht mit rohen GPS-Punkten und bekannten Locations |
| **Bewegungsprofil** | Niedrig | Visualisierung von Routen zwischen Orten |

### 1.2 Kernprinzip: On-Demand Geocoding (Kostenkontrolle)

**Wichtig:** GPS-Punkte werden beim Import/Webhook **NICHT automatisch** reverse geocoded!

**Warum?**
- **Kosten**: Mapbox Permanent Geocoding kostet pro Request - bei 15 Jahren Timeline-History würde automatisches Geocoding teuer
- **Relevanz**: Nicht alle historischen Punkte sind für den User relevant
- **Kontrolle**: User entscheidet selbst, welche Orte er benennen möchte

**Stattdessen:**
1. GPS-Punkte werden als `RawGpsPoint` mit `lat/lng` gespeichert (kein API-Call)
2. In der UI werden diese als Koordinaten angezeigt (Liste + Karte)
3. User wählt Punkte aus → klickt "Geocoden" → erst dann API-Call
4. Für Bulk-Operationen: Mapbox Batch API (bis zu 1000 Queries pro Request)

### 1.3 Abgrenzung: Was wird NICHT implementiert

- Keine bidirektionale Sync mit Google Maps (nur Import)
- **Kein automatisches Reverse Geocoding** (nur on-demand durch User)
- Kein Indoor-Tracking
- Keine Echtzeit-Karte im Browser (nur historische Daten)
- Keine Tasker/GPSLogger-Unterstützung (nur OwnTracks)
- Keine sensitiven/verschlüsselten Standortdaten

---

## 2. Architekturübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        ANDROID DEVICE                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌────────────────────────────────────┐    ┌────────────────────────────────────┐                   │
│  │        Google Maps Timeline        │    │           OwnTracks App            │                   │
│  │  ────────────────────────────────  │    │  ────────────────────────────────  │                   │
│  │  Manueller JSON-Export             │    │  Bewegungsbasierte HTTP-Posts      │                   │
│  │  (Einstellungen > Standort >       │    │  (Significant Changes Mode)        │                   │
│  │   Zeitachse > Exportieren)         │    │                                    │                   │
│  └────────────────┬───────────────────┘    └────────────────┬───────────────────┘                   │
│                   │                                         │                                        │
│                   │ JSON-Datei (manuell)                    │ HTTP POST (automatisch)               │
│                   │                                         │ bei Bewegung > 25m                    │
└───────────────────┼─────────────────────────────────────────┼────────────────────────────────────────┘
                    │                                         │
                    ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      COMP-ACT-DIARY SERVER                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐              │
│  │          Frontend (Next.js)          │    │          API Routes (Next.js)        │              │
│  │  ────────────────────────────────    │    │  ────────────────────────────────    │              │
│  │                                      │    │                                      │              │
│  │  ┌────────────────┐                  │    │  POST /api/location/webhook          │◄─── OwnTracks│
│  │  │ Timeline       │                  │    │       └─ Speichert nur RawGpsPoint   │     Webhook  │
│  │  │ Import UI      │ ─────────────────┼───►│       └─ KEIN Geocoding!             │              │
│  │  └────────────────┘                  │    │                                      │              │
│  │                                      │    │  POST /api/location/import           │◄─── JSON     │
│  │  ┌────────────────┐                  │    │       └─ Speichert nur RawGpsPoints  │     Import   │
│  │  │ Location       │                  │    │       └─ KEIN Geocoding!             │              │
│  │  │ Settings       │                  │    │                                      │              │
│  │  └────────────────┘                  │    │  POST /api/location/geocode          │◄─── ON-DEMAND│
│  │                                      │    │       └─ Single: 1 Punkt geocoden    │     durch    │
│  │  ┌────────────────┐                  │    │       └─ Batch: bis 1000 Punkte      │     User!    │
│  │  │ Day Map        │                  │    │                                      │              │
│  │  │ (Mapbox GL JS) │                  │    │  GET  /api/location/raw-points       │              │
│  │  │ + Punkt-Auswahl│                  │    │       └─ Ungeokodierte Punkte        │              │
│  │  └────────────────┘                  │    │                                      │              │
│  │                                      │    │  GET  /api/location/visits           │              │
│  │  ┌────────────────┐                  │    │       └─ Tagesbasierte Abfrage       │              │
│  │  │ Batch Geocode  │                  │    │                                      │              │
│  │  │ (Zeitraum/     │                  │    │  GET  /api/location/[id]             │              │
│  │  │  Polygon)      │                  │    │       └─ Location Details            │              │
│  │  └────────────────┘                  │    │                                      │              │
│  │                                      │    └──────────────────────────────────────┘              │
│  └──────────────────────────────────────┘                    │                                      │
│                                                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    Services (lib/)                                            │  │
│  │  ──────────────────────────────────────────────────────────────────────────────────────────  │  │
│  │                                                                                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐                   │  │
│  │  │ locationService.ts  │  │ mapboxService.ts    │  │ timelineParser.ts   │                   │  │
│  │  │ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │                   │  │
│  │  │ - saveRawPoint()    │  │ - reverseGeocode()  │  │ - parseGoogleJSON() │                   │  │
│  │  │ - matchLocation()   │  │   (Single)          │  │ - filterSinceDate() │                   │  │
│  │  │ - createVisit()     │  │ - batchGeocode()    │  │ - validateFormat()  │                   │  │
│  │  │ - getUngeocoded()   │  │   (bis 1000/Req)    │  │ - getLatestDate()   │                   │  │
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘                   │  │
│  │                                                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                              │                                      │
│                                                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    PostgreSQL Database                                        │  │
│  │  ──────────────────────────────────────────────────────────────────────────────────────────  │  │
│  │                                                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │  Location   │  │LocationVisit│  │  TimeBox    │  │ SyncProvider│  │RawGpsPoint  │        │  │
│  │  │  (Orte)     │◄─┤  (Besuche)  │──┤   (Tage)    │  │  (Config)   │  │ (Rohdaten)  │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘        │  │
│  │        ▲                                             ▲                      │               │  │
│  │        │                                             │ lastImportAt         │ geocodedAt    │  │
│  │        │ locationId (nach Geocoding)                 │                      │ (null = noch  │  │
│  │        └─────────────────────────────────────────────┼──────────────────────┘  nicht)       │  │
│  │                                                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                              │
                                                              │ NUR bei User-Aktion!
                                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      EXTERNE DIENSTE                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              Mapbox Platform                                                  │    │
│  │  ────────────────────────────────────────────────────────────────────────────────────────    │    │
│  │                                                                                               │    │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐       │    │
│  │  │  Geocoding API v6       │  │  Maps (GL JS)           │  │  Batch Geocoding        │       │    │
│  │  │  (Permanent Mode)       │  │  (Kartenanzeige)        │  │  (POST /batch)          │       │    │
│  │  │  ─────────────────────  │  │  ─────────────────────  │  │  ─────────────────────  │       │    │
│  │  │  Single Reverse Geocode │  │  react-map-gl           │  │  Bis 1000 Queries/Req   │       │    │
│  │  │  Ergebnisse speicherbar │  │  Marker, Polygon-Draw   │  │  Effizienter für Bulk   │       │    │
│  │  │  ~$5/1000 Requests      │  │  $0 bis 50k loads/mo    │  │  Gleicher Preis/Query   │       │    │
│  │  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘       │    │
│  │                                                                                               │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Erläuterung

### 3.1 Externe Anbieter / Datenquellen

| Komponente | Beschreibung | Datenformat |
|------------|--------------|-------------|
| **Google Maps Timeline** | Lokale Standorthistorie auf Android. Seit 2024 nur noch On-Device gespeichert. Export via: Einstellungen > Standort > Standortdienste > Zeitachse > Zeitachsendaten exportieren | JSON mit `semanticSegments`, `rawSignals`, `timelinePath` |
| **OwnTracks** | Privacy-fokussierte Location-Tracking-App für Android/iOS. Sendet bei signifikanter Bewegung (>25m) automatisch HTTP-POST. Batterieschonend durch "Significant Changes Mode". | JSON: `{_type: "location", lat, lon, acc, alt, batt, vel, tst, tid, topic, ...}` |
| **Mapbox Geocoding API v6** | Reverse Geocoding mit **Permanent Mode** + **Batch Endpoint**. Bis zu 1000 Queries pro Batch-Request. | JSON mit `features[].place_name`, `features[].place_type`, `features[].properties.match_code` |
| **Mapbox GL JS** | WebGL-basierte Kartenanzeige. Schnell, interaktiv, anpassbar. Via `react-map-gl` in React. Unterstützt Polygon-Zeichnen für Batch-Selektion. | Mapbox Vector Tiles |

### 3.2 Backend-Services

| Service | Verantwortung |
|---------|---------------|
| **locationService.ts** | RawGpsPoint speichern, Location-Matching (Haversine), Visit-Erstellung, **KEIN automatisches Geocoding** |
| **mapboxService.ts** | **On-Demand Geocoding**: Single + Batch (v6 API), Permanent Mode, Confidence-Score auswerten |
| **timelineParser.ts** | Google Timeline JSON parsen, **inkrementeller Import** (nur Daten neuer als letzter Import) |

### 3.3 API-Routen

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/location/webhook` | POST | OwnTracks-Endpoint - speichert nur `RawGpsPoint`, **KEIN Geocoding** |
| `/api/location/import` | POST | Google Timeline Import - speichert nur `RawGpsPoints`, **KEIN Geocoding** |
| `/api/location/raw-points` | GET | Ungeokodierte Punkte abfragen (für UI-Anzeige) |
| `/api/location/geocode` | POST | **On-Demand Geocoding** - Single oder Batch (bis 1000 IDs) |
| `/api/location/visits` | GET | LocationVisits für einen Tag/Zeitraum abfragen |
| `/api/location/token` | GET/POST/DELETE | Webhook-Token-Verwaltung |
| `/api/location/[id]` | GET/PUT | Location-Details abrufen/bearbeiten |

### 3.4 Frontend-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **LocationImportDialog** | Modal für Timeline-JSON-Upload mit Vorschau, zeigt "X neue Einträge seit letztem Import" |
| **LocationSettingsPanel** | OwnTracks-Webhook-URL, Token-Verwaltung, Import-Einstellungen |
| **DayMapView** | Mapbox GL JS Karte - zeigt **rohe GPS-Punkte (lat/lng)** UND bekannte Locations |
| **RawPointsList** | Liste der GPS-Punkte eines Tages mit lat/lng, Checkbox-Auswahl für Geocoding |
| **GeocodeSelectionPanel** | UI für manuelle Geocoding-Auslösung: ausgewählte Punkte geocoden |
| **BatchGeocodeDialog** | Modal für Batch-Geocoding: Zeitraum ODER Polygon-Selektion auf Karte |
| **GeocodeResultEditor** | Nach Geocoding: Ergebnis prüfen, Name/Typ anpassen, bei niedriger Confidence überschreiben |

---

## 4. Datenmodell

### 4.1 Betroffene existierende Entitäten

| Entität | Status | Änderungen |
|---------|--------|------------|
| **Location** | ✅ Existiert | Keine Schema-Änderungen nötig. Felder `lat`, `lng`, `address`, `poiType` bereits vorhanden. |
| **LocationVisit** | ✅ Existiert | Keine Schema-Änderungen nötig. Felder `arrivedAt`, `departedAt`, `locationId`, `timeBoxId` vorhanden. |
| **SyncProvider** | ✅ Existiert | Neuer Enum-Wert `LOCATION_WEBHOOK` hinzufügen. |
| **TimeBox** | ✅ Existiert | Keine Änderungen. Wird für Tages-Zuordnung genutzt. |

### 4.2 Neue Entitäten

#### RawGpsPoint (Neu)

Speichert GPS-Punkte. Geocoding erfolgt **nur on-demand** durch User-Aktion.

```prisma
/// Roher GPS-Punkt. Geocoding erfolgt NICHT automatisch!
/// User muss explizit Geocoding auslösen (Kostenkontrolle).
model RawGpsPoint {
  /// Eindeutige ID
  id           String    @id @default(uuid())
  /// Besitzer-User
  userId       String
  /// Breitengrad
  lat          Float
  /// Längengrad
  lng          Float
  /// Genauigkeit in Metern (optional)
  accuracy     Float?
  /// Höhe in Metern (optional)
  altitude     Float?
  /// Geschwindigkeit in km/h (optional)
  velocity     Float?
  /// Batteriestatus in Prozent (optional)
  battery      Int?
  /// Batteriezustand (0=unknown, 1=unplugged, 2=charging, 3=full)
  batteryState Int?
  /// OwnTracks Tracker ID (z.B. "ab")
  trackerId    String?
  /// OwnTracks Topic (z.B. "owntracks/user/device")
  topic        String?
  /// Quelle (OWNTRACKS, GOOGLE_IMPORT, MANUAL)
  source       GpsSource
  /// Original-Payload als JSON (für Debugging)
  rawPayload   Json?
  /// Zeitstempel der Erfassung
  capturedAt   DateTime
  
  // ─── GEOCODING STATUS (On-Demand) ───
  /// Wann wurde dieser Punkt geocoded? NULL = noch nicht geocoded
  geocodedAt   DateTime?
  /// Geocoding-Ergebnis: Place Name von Mapbox
  geocodedName String?
  /// Geocoding-Ergebnis: Adresse
  geocodedAddress String?
  /// Geocoding-Ergebnis: Confidence Score (0.0-1.0)
  geocodedConfidence Float?
  /// Geocoding-Ergebnis: Mapbox Place ID
  mapboxPlaceId String?
  /// User hat Geocoding-Ergebnis manuell überschrieben?
  geocodeOverridden Boolean @default(false)
  
  // ─── LOCATION ZUORDNUNG ───
  /// Zugeordnete Location (nach Geocoding + User-Bestätigung)
  locationId   String?
  /// LocationVisit erstellt?
  visitCreated Boolean   @default(false)
  
  /// Erstellungszeitpunkt
  createdAt    DateTime  @default(now())

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  location Location? @relation(fields: [locationId], references: [id])

  @@index([userId, capturedAt])
  @@index([userId, geocodedAt])  // NULL = ungeocoded
  @@index([userId, locationId])
  @@index([lat, lng])            // Für Polygon-Queries
}
```

**Wichtig:** Kein `PendingLocation` Modell! Stattdessen:
- `geocodedAt = NULL` → Punkt noch nicht geocoded (wird als lat/lng in UI angezeigt)
- `geocodedAt != NULL` → Punkt wurde geocoded, Ergebnis in `geocodedName`, `geocodedAddress`
- `locationId != NULL` → Punkt wurde einer Location zugeordnet

#### LocationWebhookToken (Neu)

Authentifizierungs-Token für OwnTracks Webhook-Zugriff ohne Session.

```prisma
/// Webhook-Token für OwnTracks Location-Tracking ohne Session-Auth.
model LocationWebhookToken {
  /// Eindeutige ID
  id          String    @id @default(uuid())
  /// Besitzer-User
  userId      String
  /// Token-Hash (bcrypt)
  tokenHash   String
  /// Anzeigename (z.B. "Pixel 7 Pro", "iPhone")
  deviceName  String?
  /// Letzter Zugriff
  lastUsedAt  DateTime?
  /// Aktiv?
  isActive    Boolean   @default(true)
  /// Erstellungszeitpunkt
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 4.3 Schema-Erweiterungen (Enums)

```prisma
/// Quelle eines GPS-Punkts
enum GpsSource {
  OWNTRACKS      /// OwnTracks App (HTTP Mode)
  GOOGLE_IMPORT  /// Google Timeline JSON Import
  MANUAL         /// Manuell eingegeben
}

/// Erweiterung SyncProviderType
enum SyncProviderType {
  // ... existierende Werte ...
  GOOGLE_TIMELINE   /// Google Maps Timeline Import (Neu)
}
```

### 4.4 Änderungen an bestehenden Entitäten

**SyncProvider erweitern für Import-Tracking:**
```prisma
model SyncProvider {
  // ... existierende Felder ...
  /// Zeitstempel des neuesten importierten Datensatzes (für inkrementellen Import)
  lastImportedDataAt DateTime?
}
```

**User-Relationen hinzufügen:**
```prisma
model User {
  // ... existierende Felder ...
  rawGpsPoints          RawGpsPoint[]
  locationWebhookTokens LocationWebhookToken[]
}
```

**Location-Relation für RawGpsPoint:**
```prisma
model Location {
  // ... existierende Felder ...
  rawGpsPoints RawGpsPoint[]
}
```

### 4.5 ER-Diagramm (Ausschnitt)

```
┌─────────────────────┐
│       User          │
├─────────────────────┤
│ id                  │
│ username            │
│ ...                 │
└──────────┬──────────┘
           │ 1:N
           │
           ▼
┌─────────────────────┐      ┌───────────────────────────────────────────────┐
│  LocationWebhook-   │      │              RawGpsPoint                      │
│      Token          │      ├───────────────────────────────────────────────┤
├─────────────────────┤      │ id, userId, lat, lng                          │
│ id                  │      │ accuracy, velocity, battery                   │
│ userId              │      │ source (OWNTRACKS / GOOGLE_IMPORT)            │
│ tokenHash           │      │ capturedAt                                    │
│ deviceName          │      │ ─────────────────────────────────────────     │
│ isActive            │      │ geocodedAt (NULL = noch nicht geocoded!)      │
│ lastUsedAt          │      │ geocodedName, geocodedAddress                 │
└─────────────────────┘      │ geocodedConfidence (0.0-1.0)                  │
                             │ geocodeOverridden (User hat überschrieben)    │
                             │ ─────────────────────────────────────────     │
                             │ locationId ──────────────────────────────┐    │
                             │ visitCreated                             │    │
                             └─────────────────────────────────────────┼────┘
                                                                       │
┌─────────────────────┐      ┌─────────────────────┐                   │
│     TimeBox         │      │     Location        │◄──────────────────┘
├─────────────────────┤      ├─────────────────────┤
│ id                  │      │ id                  │
│ kind: DAY           │      │ name                │
│ localDate           │      │ lat, lng            │
└──────────┬──────────┘      │ address             │
           │                 │ poiType             │
           │ 1:N             └──────────┬──────────┘
           ▼                            │
┌─────────────────────┐                 │ 1:N
│   LocationVisit     │◄────────────────┘
├─────────────────────┤
│ id                  │      ┌─────────────────────┐
│ locationId          │      │   SyncProvider      │
│ timeBoxId           │      ├─────────────────────┤
│ arrivedAt           │      │ provider:           │
│ departedAt          │      │   GOOGLE_TIMELINE   │
└─────────────────────┘      │ lastImportedDataAt  │ ◄── Für inkrementellen Import
                             │ lastSyncAt          │
                             └─────────────────────┘

GEOCODING-FLOW (On-Demand):
═══════════════════════════
1. Import/Webhook → RawGpsPoint (geocodedAt = NULL)
2. User wählt Punkte aus → POST /api/location/geocode
3. Mapbox API Call → geocodedAt, geocodedName, geocodedAddress gesetzt
4. User prüft Ergebnis → ggf. überschreiben (geocodeOverridden = true)
5. User bestätigt → Location erstellt/verknüpft, locationId gesetzt
```

---

## 5. Services, Libraries und API-Routen

### 5.1 Neue Services

#### `lib/services/locationService.ts`

```typescript
// Hauptfunktionen (KEIN automatisches Geocoding!):
export async function saveRawGpsPoint(payload: OwnTracksPayload | GoogleTimelineVisit, userId: string): Promise<RawGpsPoint>
export async function matchLocationByCoords(lat: number, lng: number, userId: string, radiusMeters?: number): Promise<Location | null>
export async function getUngeocodedPoints(userId: string, options?: { date?: string, bbox?: BBox }): Promise<RawGpsPoint[]>
export async function getGeocodedPoints(userId: string, options?: { date?: string, unassigned?: boolean }): Promise<RawGpsPoint[]>
export async function assignPointsToLocation(pointIds: string[], locationId: string): Promise<void>
export async function createLocationFromGeocode(point: RawGpsPoint, name: string, poiType?: PoiType): Promise<Location>
export async function createVisitsFromPoints(pointIds: string[]): Promise<LocationVisit[]>
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number // Haversine
```

**Kernlogik (On-Demand):**
- GPS-Punkt empfangen → `RawGpsPoint` speichern (geocodedAt = NULL)
- **KEIN automatisches Geocoding!**
- Ungeokodierte Punkte via `getUngeocodedPoints()` abrufen für UI-Anzeige
- User wählt Punkte → ruft Geocoding-Service auf → Ergebnis speichern
- User bestätigt/überschreibt → Location erstellen/zuordnen

#### `lib/services/mapboxService.ts`

```typescript
// Mapbox Geocoding API v6 (Permanent Mode) - On-Demand!
export async function reverseGeocodeSingle(lat: number, lng: number): Promise<GeocodeResult>
export async function reverseGeocodeBatch(points: Array<{id: string, lat: number, lng: number}>): Promise<BatchGeocodeResult>
export function extractPoiType(mapboxResult: MapboxFeature): PoiType
export function formatAddress(mapboxResult: MapboxFeature): string
export function getConfidenceScore(mapboxResult: MapboxFeature): number
```

**Single Reverse Geocoding (v6 Permanent):**
```typescript
// Für einzelne Punkte - z.B. wenn User 1 Punkt auswählt
const url = `https://api.mapbox.com/search/geocode/v6/reverse?` +
  `longitude=${lng}&latitude=${lat}&` +
  `access_token=${MAPBOX_ACCESS_TOKEN}&` +
  `permanent=true&` +  // Erlaubt dauerhafte Speicherung!
  `types=poi,address&` +
  `language=de`
```

**Batch Reverse Geocoding (v6 - bis zu 1000 Queries!):**
```typescript
// Für Bulk-Operationen - z.B. Zeitraum oder Polygon-Selektion
const url = `https://api.mapbox.com/search/geocode/v6/batch?` +
  `access_token=${MAPBOX_ACCESS_TOKEN}&` +
  `permanent=true`

// POST Body (JSON Array):
const body = points.map(p => ({
  types: ["poi", "address"],
  longitude: p.lng,
  latitude: p.lat,
  language: "de"
}))

// Response: { batch: [GeocodeResult, GeocodeResult, ...] }
// Jeder Query zählt einzeln für Billing, aber effizienter (1 HTTP Request)
```

**Response-Struktur (v6):**
```typescript
interface GeocodeResult {
  features: Array<{
    id: string
    properties: {
      full_address: string     // "Bahnhofstrasse 12, 8001 Zürich, Switzerland"
      name: string             // "Restaurant Krone"
      place_formatted: string  // "8001 Zürich, Switzerland"
      match_code: {            // NEU in v6: Confidence-Details
        confidence: string     // "exact", "high", "medium", "low"
        address_number: string // "matched", "unmatched", "inferred"
        street: string
        // ...
      }
    }
    geometry: { coordinates: [number, number] }
  }>
}
```

#### `lib/services/timelineParser.ts`

```typescript
// Google Timeline JSON Parser mit inkrementellem Import
export function parseGoogleTimelineJson(json: unknown): ParsedTimeline
export function extractPlaceVisits(timeline: ParsedTimeline): PlaceVisit[]
export function filterVisitsSince(visits: PlaceVisit[], since: Date): PlaceVisit[]
export function getLatestTimestamp(visits: PlaceVisit[]): Date | null
export function parseGoogleLatLng(latLngString: string): { lat: number, lng: number }
export function normalizeTimestamp(googleTimestamp: string): Date
```

**Inkrementeller Import:**
```typescript
// Ablauf beim Import:
// 1. SyncProvider für GOOGLE_TIMELINE laden
// 2. lastImportedDataAt auslesen (kann null sein beim ersten Import)
// 3. Nur Visits mit startTime > lastImportedDataAt verarbeiten
// 4. Nach erfolgreichem Import: lastImportedDataAt auf neuesten Zeitstempel setzen
```

**Google Timeline JSON-Struktur (2024+):**
```json
{
  "semanticSegments": [
    {
      "startTime": "2024-01-15T08:30:00.000Z",
      "endTime": "2024-01-15T09:15:00.000Z",
      "visit": {
        "topCandidate": {
          "placeId": "ChIJ...",
          "semanticType": "TYPE_HOME",
          "placeLocation": {
            "latLng": "47.3769° N, 8.5417° E"
          }
        }
      }
    }
  ],
  "rawSignals": [...],
  "timelinePath": [...]
}
```

### 5.2 Validators

#### `lib/validators/location.ts`

```typescript
import { z } from 'zod'

// OwnTracks Payload Schema (einziges unterstütztes Format)
export const owntracksPayloadSchema = z.object({
  _type: z.literal('location'),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  acc: z.number().optional(),           // Accuracy in meters
  alt: z.number().optional(),           // Altitude in meters
  batt: z.number().optional(),          // Battery percentage
  bs: z.number().optional(),            // Battery status (0-3)
  vel: z.number().optional(),           // Velocity in km/h
  tst: z.number(),                      // Unix timestamp (seconds)
  tid: z.string().optional(),           // Tracker ID (2 chars)
  topic: z.string().optional(),         // MQTT topic (in HTTP mode)
  conn: z.string().optional(),          // Connection type (w/o/m)
  inregions: z.array(z.string()).optional(), // Current regions
  t: z.string().optional(),             // Trigger type (p/c/b/r/u/t/v)
})

// Unified internal format
export const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  velocity: z.number().optional(),
  battery: z.number().optional(),
  batteryState: z.number().optional(),
  trackerId: z.string().optional(),
  topic: z.string().optional(),
  capturedAt: z.date(),
  source: z.enum(['OWNTRACKS', 'GOOGLE_IMPORT', 'MANUAL']),
})

// On-Demand Geocoding Request
export const geocodeRequestSchema = z.object({
  pointIds: z.array(z.string().uuid()).min(1).max(1000), // Bis 1000 für Batch
})

// Geocoding-Ergebnis überschreiben/bestätigen
export const confirmGeocodeSchema = z.object({
  pointId: z.string().uuid(),
  action: z.enum(['confirm', 'override', 'assign']),
  name: z.string().min(1).max(100).optional(),           // Bei override
  address: z.string().optional(),                        // Bei override
  poiType: z.string().optional(),                        // Bei override/confirm
  existingLocationId: z.string().uuid().optional(),      // Bei assign (zu bestehender Location)
  createNewLocation: z.boolean().optional(),             // Bei confirm: neue Location erstellen
})

// Batch-Geocoding Optionen
export const batchGeocodeOptionsSchema = z.object({
  mode: z.enum(['timeRange', 'polygon']),
  // Für timeRange:
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Für polygon (GeoJSON):
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }).optional(),
})
```

### 5.3 API-Routen

#### `app/api/location/webhook/route.ts`

```typescript
// POST /api/location/webhook
// Headers: Authorization: Bearer <token>
// Body: OwnTracks JSON Format

// Ablauf (KEIN Geocoding!):
// 1. Token validieren (LocationWebhookToken)
// 2. OwnTracks-Payload parsen und validieren
// 3. saveRawGpsPoint() - speichert nur, KEIN Geocoding
// 4. Optional: matchLocationByCoords() für bekannte Locations
// 5. Response: [] (OwnTracks erwartet leeres Array bei Erfolg)
```

#### `app/api/location/import/route.ts`

```typescript
// POST /api/location/import
// Body: { file: base64-encoded JSON }

// Ablauf (INKREMENTELL, KEIN Geocoding!):
// 1. SyncProvider für GOOGLE_TIMELINE laden/erstellen
// 2. lastImportedDataAt auslesen
// 3. JSON parsen, PlaceVisits extrahieren
// 4. Visits filtern: nur startTime > lastImportedDataAt
// 5. Für jeden neuen Visit:
//    - saveRawGpsPoint() - KEIN Geocoding!
//    - matchLocationByCoords() für bekannte Locations
// 6. lastImportedDataAt auf neuesten Zeitstempel setzen
// 7. Response: { 
//      total: number,           // Gesamt im File
//      new: number,             // Neu seit letztem Import
//      matched: number,         // Bekannte Locations (kein Geocoding nötig)
//      ungeocoded: number,      // Neue Punkte ohne Location (müssen geocoded werden)
//      skipped: number,         // Bereits importiert
//    }
```

#### `app/api/location/raw-points/route.ts`

```typescript
// GET /api/location/raw-points?date=2024-01-15
// GET /api/location/raw-points?ungeocoded=true
// GET /api/location/raw-points?bbox=minLng,minLat,maxLng,maxLat

// Response: Array von RawGpsPoint (mit geocodedAt, geocodedName, etc.)
// Für UI-Anzeige als lat/lng Koordinaten
```

#### `app/api/location/geocode/route.ts` ⭐ NEU

```typescript
// POST /api/location/geocode
// Body: { pointIds: string[] }  // 1-1000 IDs

// Ablauf (ON-DEMAND!):
// 1. RawGpsPoints laden
// 2. Wenn 1 Punkt: reverseGeocodeSingle()
// 3. Wenn >1 Punkt: reverseGeocodeBatch() (effizienter!)
// 4. Ergebnisse in RawGpsPoint speichern:
//    - geocodedAt = now()
//    - geocodedName, geocodedAddress, geocodedConfidence
// 5. Response: Array mit Geocoding-Ergebnissen inkl. Confidence
```

#### `app/api/location/geocode/confirm/route.ts` ⭐ NEU

```typescript
// POST /api/location/geocode/confirm
// Body: { pointId, action, name?, address?, poiType?, existingLocationId?, createNewLocation? }

// Aktionen:
// - 'confirm': Geocoding-Ergebnis akzeptieren, neue Location erstellen
// - 'override': Name/Adresse überschreiben, dann Location erstellen
// - 'assign': Mit bestehender Location verknüpfen (kein neue Location)
```

#### `app/api/location/visits/route.ts`

```typescript
// GET /api/location/visits?date=2024-01-15
// Response: Array von LocationVisit mit Location-Details
```

#### `app/api/location/token/route.ts`

```typescript
// POST /api/location/token - Neuen Webhook-Token erstellen
// GET /api/location/token - Alle Tokens des Users
// DELETE /api/location/token/[id] - Token deaktivieren
```

---

## 6. UX (Komponenten und Screens)

### 6.1 Neue Seiten

#### `/settings/location` - Location-Einstellungen

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Einstellungen                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 Standort-Tracking (OwnTracks)                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Webhook-URL für OwnTracks                               │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  https://deine-app.de/api/location/webhook               │   │
│  │                                              [Kopieren]  │   │
│  │                                                          │   │
│  │  💡 Tipp: In OwnTracks > Einstellungen > Verbindung:    │   │
│  │     Modus: HTTP, URL: obige URL eingeben                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API-Tokens                                              │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │  📱 Pixel 7 Pro          Zuletzt: vor 2 Std    [🗑️]     │   │
│  │  📱 iPhone               Zuletzt: nie          [🗑️]     │   │
│  │                                                          │   │
│  │  [+ Neuen Token erstellen]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Einstellungen                                           │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │  Matching-Radius          [====●=====] 100m              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Google Timeline Import                                  │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │  Letzter Import: 15.01.2025 (1'234 Einträge)            │   │
│  │                                                          │   │
│  │  [📁 Neue JSON-Datei importieren]                        │   │
│  │                                                          │   │
│  │  ℹ️ Es werden nur Daten importiert, die neuer sind      │   │
│  │    als der letzte Import.                                │   │
│  │                                                          │   │
│  │  Anleitung: Auf deinem Android-Gerät:                   │   │
│  │  Einstellungen > Standort > Zeitachse >                 │   │
│  │  Zeitachsendaten exportieren                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ungeokodierte Punkte (47)                    [Alle →]   │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │  ⚠️ 47 GPS-Punkte ohne Adresse                          │   │
│  │  Diese müssen manuell geocoded werden (Kosten!)         │   │
│  │                                                          │   │
│  │  [�️ Batch-Geocoding starten]                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### `/batch/geocode` - Batch-Geocoding (On-Demand)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Batch-Verarbeitung                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  �️ GPS-Punkte geocoden                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Modus wählen:                                           │   │
│  │                                                          │   │
│  │  ○ Nach Zeitraum                                         │   │
│  │    Von: [15.01.2025] Bis: [20.01.2025]                  │   │
│  │    → 23 ungeokodierte Punkte gefunden                   │   │
│  │                                                          │   │
│  │  ● Nach Kartenbereich (Polygon)                         │   │
│  │    [Polygon auf Karte zeichnen]                         │   │
│  │    → 8 ungeokodierte Punkte ausgewählt                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Mapbox-Karte]                                          │   │
│  │                                                          │   │
│  │     •  •        ← Ungeokodierte Punkte (grau)           │   │
│  │   •      📍     ← Bekannte Locations (farbig)           │   │
│  │      •  •                                                │   │
│  │  ╔══════════╗   ← Polygon-Selektion                     │   │
│  │  ║  •    • ║                                            │   │
│  │  ╚══════════╝                                            │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💰 Kosten-Vorschau: 8 Punkte × ~$0.005 = ~$0.04              │
│                                                                 │
│  [Abbrechen]                    [🚀 8 Punkte geocoden]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Geocoding-Ergebnis prüfen (nach Batch)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Batch-Geocoding Ergebnisse                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 8 Punkte geocoded                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Mapbox-Karte mit Marker]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  □ "Bahnhofstrasse 12, Zürich"   Confidence: 🟢 high    │   │
│  │    15.01.2025 12:30                          [Bearbeiten]│   │
│  │                                                          │   │
│  │  □ "Seestrasse 45, Zürich"       Confidence: 🟡 medium  │   │
│  │    15.01.2025 14:00                          [Bearbeiten]│   │
│  │                                                          │   │
│  │  ☑ "Hauptstrasse 1, Bern"        Confidence: 🔴 low     │   │
│  │    → Name überschreiben empfohlen!           [Bearbeiten]│   │
│  │    ...                                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Ausgewählt: 1 Punkt                                           │
│                                                                 │
│  [Alle bestätigen]  [Ausgewählte bearbeiten]  [Als Location]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Erweiterungen bestehender Screens

#### Tagesansicht - Location-Panel

Neues Panel in der Tagesansicht (unterhalb der Journal-Einträge):

```
┌─────────────────────────────────────────────────────────────────┐
│  📍 Standorte                                           [Karte] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BEKANNTE ORTE:                                                 │
│  08:00 - 09:15   � Zuhause                                     │
│  09:30 - 12:00   🏢 Büro                                        │
│  18:00 - 22:00   🏠 Zuhause                                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  UNGEOKODIERT (3 Punkte):                      [Geocoden →]     │
│  • 12:15  47.3769, 8.5417                                       │
│  • 13:15  47.3801, 8.5302                                       │
│  • 14:30  47.3756, 8.5489                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Neue Komponenten

| Komponente | Datei | Beschreibung |
|------------|-------|--------------|
| **LocationSettingsPanel** | `components/LocationSettingsPanel.tsx` | OwnTracks-Webhook-Config und Token-Verwaltung |
| **LocationImportDialog** | `components/LocationImportDialog.tsx` | Modal für Google Timeline Import (zeigt inkrementelle Stats) |
| **DayLocationPanel** | `components/DayLocationPanel.tsx` | Tages-Location-Übersicht mit bekannten + ungeokodierten Punkten |
| **RawPointItem** | `components/RawPointItem.tsx` | Einzelner GPS-Punkt mit lat/lng (ungeokodiert) |
| **LocationVisitItem** | `components/LocationVisitItem.tsx` | Einzelner Ortsbesuch (bekannte Location) |
| **DayMapView** | `components/DayMapView.tsx` | **Mapbox GL JS** Karte mit Locations + rohen Punkten |
| **BatchGeocodePanel** | `components/BatchGeocodePanel.tsx` | UI für Batch-Geocoding (Zeitraum/Polygon) |
| **PolygonDrawTool** | `components/PolygonDrawTool.tsx` | Mapbox Draw für Polygon-Selektion |
| **GeocodeResultList** | `components/GeocodeResultList.tsx` | Liste mit Geocoding-Ergebnissen + Confidence |
| **GeocodeConfirmDialog** | `components/GeocodeConfirmDialog.tsx` | Dialog zum Bestätigen/Überschreiben von Ergebnissen |
| **TokenCreateDialog** | `components/TokenCreateDialog.tsx` | Dialog für neue API-Token |

---

## 7. Neue Dependencies

### 7.1 package.json Ergänzungen

```json
{
  "dependencies": {
    "mapbox-gl": "^3.9.0",
    "react-map-gl": "^7.1.7",
    "@mapbox/mapbox-gl-draw": "^1.4.3"  // Für Polygon-Zeichnen
  }
}
```

### 7.2 Umgebungsvariablen

```env
# Mapbox API (https://account.mapbox.com/)
MAPBOX_ACCESS_TOKEN=pk.xxx...
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx...  # Für Client-Side Karten
```

**Warum Mapbox?**
- **Permanent Geocoding v6**: Ergebnisse dürfen dauerhaft gespeichert werden
- **Batch API**: Bis zu 1000 Queries pro Request (effizienter für Bulk)
- **Confidence Score**: Smart Address Match zeigt Zuverlässigkeit der Ergebnisse
- **react-map-gl**: Bewährte React-Komponenten (von Uber entwickelt)
- **Polygon Draw**: Für Batch-Selektion auf Karte
- **Free Tier**: 50'000 Map Loads/Monat kostenlos

**Kosten Geocoding (On-Demand):**
- ~$5 pro 1000 Requests (Permanent Mode)
- Batch-Request: Gleicher Preis pro Query, aber effizienter (1 HTTP Call)

### 7.3 Bereits im Projekt vorhanden

- **Zod:** Für Payload-Validierung
- **bcrypt:** Für Token-Hashing

---

## 8. Dateistruktur

### 8.1 Neue Dateien

```
comp-act-diary/
├── app/
│   ├── api/
│   │   └── location/
│   │       ├── webhook/
│   │       │   └── route.ts          # OwnTracks Webhook (KEIN Geocoding!)
│   │       ├── import/
│   │       │   └── route.ts          # Google Timeline Import (KEIN Geocoding!)
│   │       ├── raw-points/
│   │       │   └── route.ts          # Ungeokodierte Punkte abfragen
│   │       ├── geocode/
│   │       │   ├── route.ts          # On-Demand Geocoding (Single/Batch)
│   │       │   └── confirm/
│   │       │       └── route.ts      # Geocoding-Ergebnis bestätigen
│   │       ├── visits/
│   │       │   └── route.ts          # LocationVisits abfragen
│   │       ├── token/
│   │       │   ├── route.ts          # Token erstellen/auflisten
│   │       │   └── [id]/
│   │       │       └── route.ts      # Token löschen
│   │       └── [id]/
│   │           └── route.ts          # Einzelne Location CRUD
│   └── settings/
│       └── location/
│           └── page.tsx              # Location-Einstellungsseite
│   └── batch/
│       └── geocode/
│           └── page.tsx              # Batch-Geocoding (Zeitraum/Polygon)
│
├── components/
│   ├── LocationSettingsPanel.tsx     # OwnTracks-Webhook-Config UI
│   ├── LocationImportDialog.tsx      # Import-Modal (zeigt inkrementelle Stats)
│   ├── DayLocationPanel.tsx          # Tages-Orte mit bekannten + ungeokodierten
│   ├── RawPointItem.tsx              # Einzelner GPS-Punkt (lat/lng)
│   ├── LocationVisitItem.tsx         # Einzelner Besuch (bekannte Location)
│   ├── DayMapView.tsx                # Mapbox GL JS Karte
│   ├── BatchGeocodePanel.tsx         # Batch-Geocoding UI
│   ├── PolygonDrawTool.tsx           # Polygon-Selektion auf Karte
│   ├── GeocodeResultList.tsx         # Ergebnisse mit Confidence
│   ├── GeocodeConfirmDialog.tsx      # Bestätigen/Überschreiben
│   └── TokenCreateDialog.tsx         # Token-Erstellung
│
├── lib/
│   ├── services/
│   │   ├── locationService.ts        # GPS speichern, matchen (KEIN Auto-Geocoding)
│   │   ├── mapboxService.ts          # On-Demand: Single + Batch Geocoding v6
│   │   └── timelineParser.ts         # Google JSON Parser (inkrementell)
│   └── validators/
│       └── location.ts               # Zod-Schemas (OwnTracks, Geocode, Batch)
│
├── prisma/
│   └── schema.prisma                 # + RawGpsPoint (mit geocodedAt etc.), LocationWebhookToken
│
└── __tests__/
    ├── lib/
    │   ├── services/
    │   │   ├── locationService.test.ts
    │   │   ├── mapboxService.test.ts
    │   │   └── timelineParser.test.ts
    │   └── validators/
    │       └── location.test.ts
    └── api/
        └── location/
            ├── webhook.test.ts
            ├── geocode.test.ts
            └── import.test.ts
```

### 8.2 Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | + `RawGpsPoint` (mit geocodedAt, geocodedName, etc.), `LocationWebhookToken`, `GpsSource` enum, `SyncProvider.lastImportedDataAt` |
| `app/api/day/route.ts` | LocationVisits + ungeocodedCount in Response einbinden |
| `components/DayView.tsx` oder äquivalent | `DayLocationPanel` einbinden |
| `app/settings/page.tsx` | Link zu Location-Einstellungen |
| `app/batch/page.tsx` | Link zu Batch-Geocoding hinzufügen |
| `.env.example` | + `MAPBOX_ACCESS_TOKEN`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |

---

## 9. Implementierungsplan

### Schritt 0 (Mensch): Mapbox-Konto einrichten

**Ziel:** Mapbox Account erstellen und Access Token generieren.

**Schritte:**

1. **Account erstellen:** Gehe zu https://account.mapbox.com/auth/signup/ und registriere dich
   - E-Mail und Passwort eingeben
   - Ggf. Kreditkarte hinterlegen (für Geocoding über Free Tier hinaus)

2. **Access Token erstellen:**
   - Nach Login: https://account.mapbox.com/access-tokens/
   - Klicke auf "Create a token"
   - Name: z.B. "Comp-ACT-Diary Production"
   - Scopes: Standard-Auswahl belassen (public scopes)
   - Optional: URL-Restriction auf deine Domain setzen
   - "Create token" klicken
   - **Token kopieren** (wird nur einmal angezeigt!)

3. **Token in `.env` eintragen:**
   ```env
   MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
   ```

**Kosten-Übersicht:**
- **Maps**: 50'000 Loads/Monat kostenlos
- **Geocoding (Permanent)**: ~$5 pro 1000 Requests
- **Batch-Geocoding**: Gleicher Preis pro Query, aber effizienter (1 HTTP Call für bis zu 1000 Queries)

---

### Schritt 1 (LLM): Datenmodell erweitern

**Ziel:** Schema um `RawGpsPoint` (mit On-Demand Geocoding Feldern) und `LocationWebhookToken` erweitern.

**Anforderungen:**
- `RawGpsPoint` Modell mit:
  - GPS-Daten: `lat`, `lng`, `accuracy`, `altitude`, `velocity`, `battery`, `batteryState`
  - OwnTracks-Felder: `trackerId`, `topic`
  - **Geocoding-Status (On-Demand):** `geocodedAt`, `geocodedName`, `geocodedAddress`, `geocodedConfidence`, `mapboxPlaceId`, `geocodeOverridden`
  - Location-Zuordnung: `locationId`, `visitCreated`
- `LocationWebhookToken` Modell für OwnTracks-Authentifizierung
- `GpsSource` enum: `OWNTRACKS`, `GOOGLE_IMPORT`, `MANUAL`
- `SyncProviderType` um `GOOGLE_TIMELINE` erweitern
- `SyncProvider.lastImportedDataAt` für inkrementellen Import
- **Kein `PendingLocation` Modell!** (Geocoding-Status direkt in `RawGpsPoint`)

**Tipps:**
- Index auf `[lat, lng]` für Polygon-Queries
- Index auf `geocodedAt` (NULL = ungeokodiert)

---

### Schritt 2 (LLM): Zod-Validators

**Ziel:** Type-safe Validierung für OwnTracks und On-Demand Geocoding.

**Anforderungen:**
- `owntracksPayloadSchema` mit allen OwnTracks-Feldern
- `gpsPointSchema` als internes Format
- `geocodeRequestSchema` für On-Demand Geocoding (pointIds Array, max 1000)
- `confirmGeocodeSchema` für Bestätigen/Überschreiben
- `batchGeocodeOptionsSchema` für Zeitraum/Polygon-Selektion

**Tipps:**
- OwnTracks `tst` ist Unix-Timestamp in Sekunden
- Polygon als GeoJSON-Format

---

### Schritt 3 (LLM): Mapbox-Service (On-Demand)

**Ziel:** Mapbox Geocoding API v6 mit Single + Batch Support.

**Anforderungen:**
- `reverseGeocodeSingle(lat, lng)`: Einzelner Punkt
- `reverseGeocodeBatch(points)`: Bis zu 1000 Punkte in einem Request
- **Permanent Mode**: `permanent=true` Parameter
- Confidence-Score aus `match_code` extrahieren
- PoiType-Mapping von Mapbox-Kategorien

**Tipps:**
- Single: `GET /search/geocode/v6/reverse?longitude=...&latitude=...&permanent=true`
- Batch: `POST /search/geocode/v6/batch?permanent=true` mit JSON-Body
- Batch ist effizienter (1 HTTP Call), aber gleiche Kosten pro Query

---

### Schritt 4 (LLM): Location-Service (KEIN Auto-Geocoding!)

**Ziel:** GPS-Punkte speichern und Location-Matching - **ohne automatisches Geocoding**.

**Anforderungen:**
- `saveRawGpsPoint()`: Speichert Punkt mit `geocodedAt = NULL`
- `matchLocationByCoords()`: Haversine-Distanz zu bekannten Locations
- `getUngeocodedPoints()`: Punkte mit `geocodedAt = NULL` abfragen
- `getPointsInPolygon()`: Punkte innerhalb eines Polygons (für Batch-Selektion)
- `updatePointWithGeocodeResult()`: Nach Geocoding Ergebnis speichern
- `assignPointToLocation()`: Punkt einer Location zuordnen
- `createLocationFromPoint()`: Neue Location aus geocodetem Punkt erstellen

**Wichtig:** Kein Mapbox-Call in diesem Service! Geocoding nur über API-Route.

---

### Schritt 5 (LLM): Timeline-Parser (inkrementell, KEIN Geocoding)

**Ziel:** Google Timeline JSON parsen - **speichert nur RawGpsPoints, kein Geocoding**.

**Anforderungen:**
- `parseGoogleTimelineJson()`: Validierung und Parsing
- `extractPlaceVisits()`: semanticSegments extrahieren
- `filterVisitsSince()`: Nur neue Daten seit letztem Import
- `getLatestTimestamp()`: Für SyncProvider-Update

**Wichtig:** Import speichert nur `RawGpsPoint` mit `geocodedAt = NULL`!

---

### Schritt 6 (LLM): OwnTracks Webhook-API-Route (KEIN Geocoding!)

**Ziel:** Endpoint für OwnTracks - speichert nur RawGpsPoint.

**Anforderungen:**
- POST `/api/location/webhook`
- Token-Auth via Header
- `saveRawGpsPoint()` aufrufen (geocodedAt = NULL)
- Optional: `matchLocationByCoords()` für bekannte Locations
- Response: `[]` (OwnTracks erwartet leeres Array)

**Wichtig:** Kein Mapbox-Call! Geocoding ist User-Entscheidung.

---

### Schritt 7 (LLM): Token-Management API-Routen

**Ziel:** CRUD für Webhook-Tokens.

**Anforderungen:**
- POST `/api/location/token` - Token erstellen
- GET `/api/location/token` - Alle Tokens
- DELETE `/api/location/token/[id]` - Token deaktivieren

---

### Schritt 8 (LLM): Import-API-Route (KEIN Geocoding!)

**Ziel:** Google Timeline Import - speichert nur RawGpsPoints.

**Anforderungen:**
- POST `/api/location/import`
- Inkrementell via `lastImportedDataAt`
- Für jeden Visit: `saveRawGpsPoint()` (geocodedAt = NULL)
- Optional: `matchLocationByCoords()` für bekannte Locations
- Response: `{ total, new, matched, ungeocoded, skipped }`

**Wichtig:** Kein Mapbox-Call! Alle neuen Punkte haben `geocodedAt = NULL`.

---

### Schritt 9 (LLM): On-Demand Geocoding API-Route ⭐

**Ziel:** API für manuelles Geocoding (User-Trigger).

**Anforderungen:**
- POST `/api/location/geocode` mit `{ pointIds: string[] }`
- Wenn 1 Punkt: `reverseGeocodeSingle()`
- Wenn >1 Punkt: `reverseGeocodeBatch()` (effizienter!)
- Ergebnis in `RawGpsPoint` speichern (geocodedAt, geocodedName, etc.)
- Response: Array mit Ergebnissen inkl. Confidence-Score

---

### Schritt 10 (LLM): Geocode-Confirm API-Route

**Ziel:** Geocoding-Ergebnis bestätigen/überschreiben.

**Anforderungen:**
- POST `/api/location/geocode/confirm`
- Aktionen: `confirm`, `override`, `assign`
- Bei `confirm`/`override`: Neue Location erstellen
- Bei `assign`: Mit bestehender Location verknüpfen

---

### Schritt 11 (LLM): Location-Einstellungsseite

**Ziel:** UI für OwnTracks-Config, Token, Import, ungeokodierte Punkte.

**Anforderungen:**
- Webhook-URL + OwnTracks-Anleitung
- Token-Verwaltung
- Import-Bereich mit letztem Import-Datum
- Badge: "X ungeokodierte Punkte" mit Link zu Batch-Geocoding

---

### Schritt 12 (LLM): Batch-Geocoding-Seite ⭐

**Ziel:** UI für Batch-Geocoding mit Zeitraum/Polygon.

**Anforderungen:**
- Radio: "Nach Zeitraum" / "Nach Kartenbereich"
- Zeitraum: Date-Picker für Start/Ende
- Polygon: Mapbox-Karte mit Draw-Tool
- Kosten-Vorschau: "X Punkte × ~$0.005 = ~$Y"
- Button: "X Punkte geocoden"

**Tipps:**
- `@mapbox/mapbox-gl-draw` für Polygon
- Punkte mit `geocodedAt = NULL` und innerhalb Selektion laden

---

### Schritt 13 (LLM): Geocoding-Ergebnis-Liste

**Ziel:** UI zum Prüfen/Bestätigen von Geocoding-Ergebnissen.

**Anforderungen:**
- Liste mit Ergebnissen, Confidence-Ampel (🟢🟡🔴)
- Checkbox-Selektion
- Bei niedrigem Confidence: Hinweis "Überschreiben empfohlen"
- Buttons: Alle bestätigen, Ausgewählte bearbeiten, Als Location speichern

---

### Schritt 14 (LLM): DayLocationPanel-Komponente

**Ziel:** Tages-Übersicht mit bekannten Locations + ungeokodierten Punkten.

**Anforderungen:**
- Bekannte Orte: Zeit + Name + Icon
- Ungeokodierte: Zeit + lat/lng + Button "Geocoden"
- Karte zeigt beides (unterschiedliche Marker-Farben)

---

### Schritt 15 (LLM): DayMapView mit Punkt-Auswahl

**Ziel:** Mapbox-Karte mit Selection-Möglichkeit.

**Anforderungen:**
- Locations: Farbige Marker mit POI-Icons
- Ungeokodierte: Graue Punkte
- Klick auf Punkt: Auswahl für Geocoding
- Polygon-Draw für Batch-Selektion

---

### Schritt 16 (Mensch): OwnTracks einrichten

**Ziel:** OwnTracks auf Android/iOS konfigurieren.

> 📖 **Ausführliche Anleitung:** Siehe [LOCATION_TRACKING_SETUP-AND-TEST.md](../setup-and-testing_docs/LOCATION_TRACKING_SETUP-AND-TEST.md#owntracks-app-einrichten)

**Kurzübersicht:**
1. OwnTracks App installieren (Play Store / App Store)
2. Token in der App unter `/settings/location` erstellen
3. OwnTracks konfigurieren: HTTP-Mode, Webhook-URL, Bearer Token
4. Tracking-Modus: "Significant changes" für optimalen Batterieverbrauch

---

### Schritt 17 (Mensch): Timeline importieren + geocoden

**Ziel:** Historische Daten importieren und relevante Punkte geocoden.

> 📖 **Ausführliche Anleitung:** Siehe [LOCATION_TRACKING_SETUP-AND-TEST.md](../setup-and-testing_docs/LOCATION_TRACKING_SETUP-AND-TEST.md#google-timeline-import)

**Kurzübersicht:**
1. Google Timeline via Takeout oder direkt exportieren (JSON)
2. In App unter `/settings/location` importieren
3. Batch-Geocoding unter `/batch/geocode`: Zeitraum oder Polygon wählen
4. Ergebnisse prüfen, bei niedrigem Confidence manuell korrigieren
5. Als Locations bestätigen

---

### Schritt 18 (LLM): Tests schreiben

**Ziel:** Unit- und Integrationstests.

**Anforderungen:**
- `locationService`: saveRawGpsPoint, matchLocation, getUngeocoded
- `mapboxService`: Single + Batch Geocoding (Mock)
- `timelineParser`: Parsing, inkrementeller Filter
- API-Tests: Webhook, Import, Geocode (alle ohne echten Mapbox-Call)

---

## 10. Automatisiertes Testing

### 10.1 Unit-Tests (Vitest)

| Testdatei | Zu testende Funktionen |
|-----------|------------------------|
| `locationService.test.ts` | `saveRawGpsPoint()`, `matchLocationByCoords()`, `getUngeocodedPoints()`, `getPointsInPolygon()` |
| `mapboxService.test.ts` | `reverseGeocodeSingle()`, `reverseGeocodeBatch()`, `extractPoiType()`, `getConfidenceScore()` (Mock!) |
| `timelineParser.test.ts` | `parseGoogleTimelineJson()`, `extractPlaceVisits()`, `filterVisitsSince()` |
| `location.test.ts` (validators) | `owntracksPayloadSchema`, `geocodeRequestSchema`, `batchGeocodeOptionsSchema` |

### 10.2 Integrationstests

| Test | Beschreibung |
|------|--------------|
| Webhook-Route | Token-Auth, OwnTracks-Parsing, RawGpsPoint-Speicherung (**KEIN Geocoding!**) |
| Import-Route | JSON-Parsing, inkrementeller Import, **KEIN Geocoding** |
| Geocode-Route | On-Demand Geocoding, Single vs. Batch, Mapbox-Mock |
| Confirm-Route | Bestätigen, Überschreiben, Zuordnen, Location-Erstellung |
| Token-CRUD | Erstellen, Auflisten, Löschen |

### 10.3 Testdaten

- OwnTracks-Payloads (location, mit allen Feldern)
- Google Timeline JSON (anonymisiert)
- Mapbox-Mock-Responses (high/medium/low confidence)
- Polygon-GeoJSON für Batch-Selektion
- Edge Cases: Koordinaten an Datumsgrenzen, leere Payloads

---

## 11. Manuelles Testing

> 📖 **Ausführliche Test-Anleitungen:** Siehe [LOCATION_TRACKING_SETUP-AND-TEST.md](../setup-and-testing_docs/LOCATION_TRACKING_SETUP-AND-TEST.md#testen-der-features)

Das Setup- und Test-Dokument enthält:
- **OwnTracks-Setup und -Testing** inkl. cURL-Beispiele
- **Google Timeline Import** mit Schritt-für-Schritt-Anleitung
- **Batch-Geocoding** Durchführung und Kosten-Übersicht
- **Fehlerbehebung** für häufige Probleme

### Kurzübersicht der Testfälle

| Bereich | Testfälle |
|---------|-----------|
| **OwnTracks** | Token erstellen, Webhook-Verbindung, Bewegungs-Tracking |
| **Import** | Erster Import, Inkrementeller Import, Fehlerhafte JSON |
| **Geocoding** | Single, Batch (Zeitraum), Batch (Polygon), Override, Kosten |
| **Karte** | Tages-Karte, Polygon-Selektion, Marker-Klick |

---

## 12. Entscheidungen

Die folgenden Entscheidungen wurden getroffen:

### 12.1 Priorität der Datenquellen

**Entscheidung:** Option B - **OwnTracks als primäre Echtzeit-Quelle**, Google Timeline Import für historische Daten (Backfill).

**Begründung:** Google Timeline erlaubt nur manuellen Export, OwnTracks sendet automatisch bei Bewegung.

### 12.2 Tracking-Modus

**Entscheidung:** **Bewegungsbasiert** (OwnTracks "Significant Changes Mode")

**Begründung:** Batterieschonend, ausreichend genau für Tages-Übersichten. OwnTracks sendet bei Bewegung > 25m.

### 12.3 Geocoding-Strategie ⭐

**Entscheidung:** **On-Demand Geocoding** (nur wenn User explizit auslöst)

**Begründung:** 
- **Kostenkontrolle**: Mapbox Permanent Geocoding kostet ~$5/1000 Requests
- **Relevanz**: Nicht alle historischen Punkte sind für User relevant (15 Jahre Timeline!)
- **Kontrolle**: User entscheidet selbst, welche Orte er benennen möchte
- **Batch-Support**: Mapbox v6 erlaubt bis zu 1000 Queries pro Request (effizienter)

**Ablauf:**
1. Import/Webhook speichert nur `RawGpsPoint` (geocodedAt = NULL)
2. UI zeigt rohe Koordinaten (lat/lng)
3. User wählt Punkte aus → "Geocoden" → erst dann Mapbox-API-Call
4. User prüft Ergebnis, kann bei niedrigem Confidence überschreiben

### 12.4 Batch-Geocoding Modi

**Entscheidung:** **Zwei Modi** - Zeitraum ODER Polygon-Selektion

**Begründung:**
- **Zeitraum**: Gut für "geocode alles von letzter Woche"
- **Polygon**: Gut für "geocode alle Punkte in Zürich" - zeichne Polygon auf Karte
- Nutzt Mapbox Batch API (bis 1000 Queries/Request) - effizienter als Single-Calls

### 12.5 Karten-Provider

**Entscheidung:** **Mapbox** (GL JS + Geocoding API v6)

**Begründung:** 
- **Permanent Geocoding**: Ergebnisse dürfen dauerhaft gespeichert werden
- **Batch API**: Bis 1000 Queries pro Request
- **Smart Address Match**: Confidence-Score zeigt Zuverlässigkeit
- **Polygon Draw**: `@mapbox/mapbox-gl-draw` für Batch-Selektion
- **Free Tier**: 50k Map Loads/Monat kostenlos

### 12.6 Sensitive Locations

**Entscheidung:** **Nein** (vorerst nicht implementiert)

**Begründung:** Komplexität vermeiden, kann später hinzugefügt werden wenn nötig.

---

*Konzept v3 - Aktualisiert Januar 2025 (On-Demand Geocoding)*
