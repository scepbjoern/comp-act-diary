# Locations Management Concept

## Übersicht

Eine neue Seite `/locations` zur Verwaltung aller gespeicherten Orte (Location-Entities).

## Ziele

1. **Übersicht** aller Locations mit Filtermöglichkeit
2. **Bearbeitung** von Location-Namen und Adressen
3. **Visualisierung** auf einer interaktiven Karte
4. **Bidirektionale Selektion** zwischen Tabelle und Karte

## Datenmodell

Basiert auf dem bestehenden `Location`-Model:

```prisma
model Location {
  id         String   @id @default(uuid())
  userId     String
  slug       String
  name       String
  lat        Float?
  lng        Float?
  address    String?
  country    String?
  city       String?
  poiType    PoiType?
  isFavorite Boolean  @default(false)
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## UI-Komponenten

### 1. Seiten-Layout (`/locations`)

```
┌─────────────────────────────────────────────────────────────┐
│ Orte verwalten                                    [Filter]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────┐  ┌───────────────────────┐ │
│  │                             │  │                       │ │
│  │     LocationsMap            │  │   LocationsTable      │ │
│  │     (Mapbox)                │  │   (filterbar)         │ │
│  │                             │  │                       │ │
│  │  • Alle Orte als Marker     │  │  • Name (editierbar)  │ │
│  │  • Klick → Tabelle highlight│  │  • Adresse            │ │
│  │  • Zoom auf Selection       │  │  • POI-Typ            │ │
│  │                             │  │  • Aktionen           │ │
│  │                             │  │                       │ │
│  └─────────────────────────────┘  └───────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. LocationsTable

- **Spalten**: Name, Adresse, Stadt, POI-Typ, Favorit, Aktionen
- **Filter**: Freitext-Suche über Name/Adresse
- **Inline-Edit**: Name direkt in der Tabelle bearbeitbar
- **Aktionen**:
  - ✏️ Bearbeiten (Modal)
  - 🔄 Adresse neu ermitteln (Reverse Geocoding)
  - 🗑️ Löschen

### 3. LocationsMap

- Mapbox GL JS Karte
- Initial: fitBounds auf alle Locations
- Marker für jeden Ort (farbcodiert nach POI-Typ)
- Klick auf Marker → Location in Tabelle highlighten
- Selektierter Marker wird hervorgehoben

### 4. Bidirektionale Selektion

```typescript
// Shared State
const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

// Tabelle → Karte: Klick auf Zeile
onRowClick={(location) => {
  setSelectedLocationId(location.id)
  mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 16 })
}}

// Karte → Tabelle: Klick auf Marker
onMarkerClick={(location) => {
  setSelectedLocationId(location.id)
  // Scroll to row in table
}}
```

## API-Endpunkte

### GET /api/locations

Alle Locations des Users abrufen.

```typescript
// Response
{
  locations: Location[]
  total: number
}
```

### PATCH /api/locations/[id]

Location aktualisieren.

```typescript
// Request Body
{
  name?: string
  address?: string
  city?: string
  country?: string
  poiType?: PoiType
  isFavorite?: boolean
}
```

### POST /api/locations/[id]/geocode

Reverse Geocoding für eine Location durchführen.

```typescript
// Response
{
  success: boolean
  address?: string
  city?: string
  country?: string
}
```

### DELETE /api/locations/[id]

Location löschen (mit Cascade auf LocationVisits).

## Implementierungsschritte

1. **Navbar**: Link "Orte" hinzufügen (Desktop + Mobile)
2. **API**: `/api/locations` Route erstellen
3. **API**: `/api/locations/[id]` Route erstellen (PATCH, DELETE)
4. **API**: `/api/locations/[id]/geocode` Route erstellen
5. **Komponente**: `LocationsTable.tsx` erstellen
6. **Komponente**: `LocationsMap.tsx` erstellen
7. **Seite**: `/locations/page.tsx` erstellen
8. **Integration**: Bidirektionale Selektion implementieren

## Technische Details

### Mapbox Integration

Wiederverwendung des bestehenden Mapbox-Tokens (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`).

### Reverse Geocoding

Nutzung der bestehenden `reverseGeocodeSingle`-Funktion aus `lib/services/locationService.ts`.

### Styling

- DaisyUI-Komponenten für Tabelle und Modal
- Konsistent mit bestehendem Design
