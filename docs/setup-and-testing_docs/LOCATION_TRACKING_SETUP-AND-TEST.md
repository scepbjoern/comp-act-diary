# Location Tracking - Setup & Test Guide

Dieses Dokument beschreibt die Einrichtung und den Test des Location Tracking Features.

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Voraussetzungen](#voraussetzungen)
3. [OwnTracks App einrichten](#owntracks-app-einrichten)
4. [Google Timeline Import](#google-timeline-import)
5. [Geocoding-Einstellungen](#geocoding-einstellungen)
6. [Batch-Geocoding durchführen](#batch-geocoding-durchführen)
7. [Mapbox APIs](#mapbox-apis)
8. [Testen der Features](#testen-der-features)
9. [Fehlerbehebung](#fehlerbehebung)

---

## Übersicht

Das Location Tracking Feature ermöglicht:
- **Echtzeit-Tracking** über die OwnTracks App
- **Import historischer Daten** aus Google Timeline
- **On-Demand Geocoding** für Kostenkontrolle (~$0.005/Punkt)
- **Automatisches Matching** mit bekannten Orten

### Architektur

```
OwnTracks App ──► Webhook API ──► RawGpsPoint (ohne Geocoding)
                                        │
Google Timeline JSON ──► Import API ────┘
                                        │
                                        ▼
                        Batch-Geocoding (User-Trigger)
                                        │
                                        ▼
                              Location zuordnen
                                        │
                                        ▼
                              LocationVisit erstellen
```

---

## Voraussetzungen

### 1. Mapbox Account & Token

1. Erstelle einen Account auf [mapbox.com](https://www.mapbox.com/)
2. Gehe zu **Account → Access tokens**
3. Erstelle zwei Tokens:

| Token | Scope | Verwendung |
|-------|-------|------------|
| `MAPBOX_ACCESS_TOKEN` | `styles:tiles`, `styles:read`, `fonts:read`, `datasets:read`, `vision:read` + **Permanent Geocoding** | Server-seitig |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `styles:tiles`, `styles:read` | Client-seitig (Karten) |

4. Trage die Tokens in `.env` ein:

```env
MAPBOX_ACCESS_TOKEN=sk.eyJ1Ijoi...
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
```

### 2. Datenbank-Schema aktualisieren

```bash
npx prisma db push
npx prisma generate
```

### 3. Dependencies installieren

```bash
npm install mapbox-gl react-map-gl @mapbox/mapbox-gl-draw
npm install -D @types/mapbox-gl @types/geojson
```

---

## OwnTracks App einrichten

### Schritt 1: App installieren

- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=org.owntracks.android)
- **iOS**: [App Store](https://apps.apple.com/app/owntracks/id692424691)

### Schritt 2: API-Token erstellen

1. Öffne die App unter `/settings/location`
2. Gib einen Gerätenamen ein (z.B. "Pixel 7 Pro")
3. Klicke auf **Token erstellen**
4. **WICHTIG**: Kopiere den Token sofort! Er wird nur einmal angezeigt.

### Schritt 3: OwnTracks konfigurieren

#### Android

1. Öffne OwnTracks App
2. Gehe zu **Einstellungen** (Hamburger-Menü → Preferences)
3. Konfiguriere:

| Einstellung | Wert |
|-------------|------|
| **Connection → Mode** | HTTP |
| **Connection → Host** | `https://deine-domain.ch/api/location/webhook` |
| **Connection → Identification → Username** | Beliebiger Name (z.B. `mein-handy`) |
| **Connection → Identification → Password** | Dein Token: `loc_xxxxxxxxxxxxx` |
| **Connection → Identification → Device ID** | z.B. `pixel` (Standard ist OK) |
| **Connection → Identification → Tracker ID** | z.B. `ab` (Standard ist OK) |
| **Überwachung → Modus** | **Signifikant** (spart Akku) |

> **Hinweis**: OwnTracks nutzt HTTP Basic Authentication. Der Benutzername dient nur zur Identifikation, das Passwort ist der eigentliche Token zur Authentifizierung.

#### iOS

1. Öffne OwnTracks App
2. Tippe auf **(i)** → **Settings**
3. Konfiguriere:

| Einstellung | Wert |
|-------------|------|
| **Mode** | HTTP |
| **URL** | `https://deine-domain.ch/api/location/webhook` |
| **Identification → Username** | Beliebiger Name (z.B. `mein-iphone`) |
| **Identification → Password** | Dein Token: `loc_xxxxxxxxxxxxx` |

### Schritt 4: Testen

1. In OwnTracks: Tippe auf das **Senden-Icon** (Pfeil nach oben)
2. Die App sollte "Location published" anzeigen
3. Überprüfe in der App unter `/settings/location`, ob "Zuletzt verwendet" aktualisiert wurde

### Tracking-Modi

| Modus | Beschreibung | Batterieverbrauch |
|-------|--------------|-------------------|
| **Significant changes** | Updates bei Standortwechsel | Niedrig ⭐ |
| **Move mode** | Regelmäßige Updates beim Bewegen | Mittel |
| **Manual** | Nur bei manueller Aktion | Minimal |

**Empfehlung**: Beginne mit "Significant changes" für den besten Kompromiss.

---

## Google Timeline Import

### Schritt 1: Timeline-Daten exportieren

#### Methode A: Google Takeout (empfohlen für große Datenmengen)

1. Gehe zu [takeout.google.com](https://takeout.google.com/)
2. Klicke auf **Auswahl aufheben**
3. Scrolle zu **Standortverlauf (Timeline)** und aktiviere es
4. Wähle als Format: **JSON**
5. Klicke auf **Nächster Schritt** → **Export erstellen**
6. Warte auf die E-Mail mit dem Download-Link
7. Lade das ZIP herunter und entpacke es
8. Suche die Datei `Semantic Location History/YYYY/YYYY_MONAT.json`

#### Methode B: Direkt vom Smartphone

1. Öffne die **Google Maps** App
2. Tippe auf dein **Profilbild** → **Meine Zeitachse**
3. Tippe auf das **Drei-Punkte-Menü** (⋮)
4. Wähle **Einstellungen und Datenschutz**
5. Scrolle zu **Daten herunterladen**
6. Wähle einen Zeitraum und exportiere als JSON

### Schritt 2: Import durchführen

1. Öffne `/settings/location` in der App
2. Scrolle zum Abschnitt **Google Timeline Import**
3. Klicke auf **Datei auswählen**
4. Wähle die exportierte JSON-Datei
5. Warte auf die Bestätigung

### Import-Ergebnis

Nach dem Import siehst du:

| Feld | Beschreibung |
|------|--------------|
| **Gesamt** | Alle Ortsbesuche in der Datei |
| **Neu** | Erfolgreich importierte Punkte |
| **Gematcht** | Zu bekannten Orten zugeordnet |
| **Ungeokodiert** | Benötigen noch Geocoding |
| **Übersprungen** | Bereits importiert (inkrementell) |

### Inkrementeller Import

Das System merkt sich den letzten Import-Zeitpunkt. Bei späteren Imports werden nur neue Daten importiert – du kannst dieselbe erweiterte Datei problemlos erneut hochladen.

---

## Geocoding-Einstellungen

Die Seite `/settings/location` bietet konfigurierbare Geocoding-Einstellungen:

### Cluster-Distanz (Meter)

- **Standard**: 50 Meter
- **Bereich**: 10-200 Meter
- **Funktion**: GPS-Punkte innerhalb dieser Distanz werden zusammengefasst und nur einmal geocodiert
- **Vorteil**: Spart API-Kosten, wenn viele nahe Punkte vorhanden sind

### Bekannte Orte Radius (Meter)

- **Standard**: 100 Meter
- **Bereich**: 25-500 Meter
- **Funktion**: Punkte innerhalb dieses Radius um bekannte Orte werden automatisch zugeordnet
- **Vorteil**: Keine API-Kosten für Punkte nahe bekannter Orte

### POI-Suche aktivieren

- **Standard**: Deaktiviert
- **Funktion**: Nutzt die Search Box API für POI-Daten (Restaurants, Shops, etc.)
- **Hinweis**: Search Box API erlaubt **keine permanente Speicherung** der Daten

### Beispiel Kostenersparnis

| Szenario | Ohne Optimierung | Mit Optimierung |
|----------|------------------|-----------------|
| 100 Punkte, 30 in Clustern | 100 API-Calls | 70 API-Calls |
| 50 Punkte nahe bekannter Orte | 50 API-Calls | 0 API-Calls |
| **Gesamt** | **$0.75** | **$0.35** |

---

## Mapbox APIs

Das System nutzt zwei verschiedene Mapbox APIs:

### 1. Geocoding API v6 (Standard)

- **Endpoint**: `https://api.mapbox.com/search/geocode/v6`
- **Funktion**: Reverse Geocoding für Adressen
- **Permanente Speicherung**: ✅ Ja (mit `permanent=true`)
- **POI-Daten**: ❌ Nein (seit v6 nicht mehr verfügbar)
- **Typen**: `address`, `place`, `locality`, `neighborhood`

### 2. Search Box API (Optional)

- **Endpoint**: `https://api.mapbox.com/search/searchbox/v1`
- **Funktion**: Reverse Lookup mit POI-Daten
- **Permanente Speicherung**: ❌ Nein (nicht erlaubt)
- **POI-Daten**: ✅ Ja (Restaurants, Shops, etc.)
- **Aktivierung**: In `/settings/location` → "POI-Suche aktivieren"

### Confidence-Level

| Level | Score | Bedeutung |
|-------|-------|-----------|
| **Exact** | 1.0 | Exakte Übereinstimmung (rooftop accuracy) |
| **High** | 0.8-0.9 | Hohe Genauigkeit (parcel, point) |
| **Medium** | 0.5-0.7 | Mittlere Genauigkeit (interpolated, street) |
| **Low** | 0.25-0.3 | Niedrige Genauigkeit (approximate) |

---

## Batch-Geocoding durchführen

### Auswahl-Methoden

#### Methode A: Nach Zeitraum

1. Öffne `/batch/geocode`
2. Wähle **Nach Zeitraum**
3. Setze Start- und Enddatum
4. Klicke auf **Punkte laden**
5. Überprüfe die Anzahl und geschätzte Kosten
6. Klicke auf **X Punkte geocoden**

#### Methode B: Nach Kartenbereich

1. Öffne `/batch/geocode`
2. Wähle **Nach Kartenbereich**
3. Zeichne ein Polygon auf der Karte (Punkte anklicken, zum Schließen ersten Punkt erneut klicken)
4. Die Punkte innerhalb des Polygons werden automatisch ausgewählt
5. Überprüfe die Anzahl und geschätzte Kosten
6. Klicke auf **X Punkte geocoden**

### Kosten verstehen

| Punkte | Geschätzte Kosten |
|--------|-------------------|
| 1-10 | <$0.01 |
| 100 | ~$0.50 |
| 1000 | ~$5.00 |

**Hinweis**: Die tatsächlichen Kosten können je nach Mapbox-Tarif variieren.

### Ergebnisse prüfen

Nach dem Geocoding siehst du eine Tabelle mit:

| Spalte | Beschreibung |
|--------|--------------|
| **Status** | ✓ Erfolg / ✗ Fehler |
| **Name** | Erkannter Ortsname |
| **Adresse** | Vollständige Adresse |
| **Confidence** | Genauigkeit (Exakt/Hoch/Mittel/Niedrig) |

### Confidence-Level

| Level | Bedeutung | Aktion |
|-------|-----------|--------|
| **Exakt** | Sehr genaue Übereinstimmung | Kann automatisch verwendet werden |
| **Hoch** | Gute Übereinstimmung | In den meisten Fällen korrekt |
| **Mittel** | Unsichere Übereinstimmung | Manuell überprüfen empfohlen |
| **Niedrig** | Ungenau | Manuell korrigieren |

---

## Testen der Features

### Test 1: Webhook-Verbindung

```bash
# Mit cURL testen (ersetze TOKEN und URL)
curl -X POST https://deine-domain.ch/api/location/webhook \
  -H "Authorization: Bearer loc_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "_type": "location",
    "lat": 47.3769,
    "lon": 8.5417,
    "tst": 1704067200,
    "acc": 10
  }'

# Erwartete Antwort: []
```

### Test 2: Token-Management

```bash
# Token-Liste abrufen (mit Browser-Cookie)
curl https://deine-domain.ch/api/location/token \
  -H "Cookie: userId=xxx"

# Erwartete Antwort: { "tokens": [...] }
```

### Test 3: Import-API

```bash
# Mit einer kleinen Test-JSON
curl -X POST https://deine-domain.ch/api/location/import \
  -H "Cookie: userId=xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "semanticSegments": [{
      "startTime": "2024-01-15T08:00:00Z",
      "endTime": "2024-01-15T09:00:00Z",
      "visit": {
        "topCandidate": {
          "placeLocation": { "latLng": "47.3769° N, 8.5417° E" }
        }
      }
    }]
  }'
```

### Test 4: Geocoding-API

```bash
# Punkt geocoden (ersetze pointId)
curl -X POST https://deine-domain.ch/api/location/geocode \
  -H "Cookie: userId=xxx" \
  -H "Content-Type: application/json" \
  -d '{ "pointIds": ["uuid-des-punkts"] }'
```

### Unit Tests ausführen

```bash
# Alle Location-Tests
npm test -- --grep "location"

# Spezifische Test-Suites
npm test -- __tests__/lib/services/locationService.test.ts
npm test -- __tests__/lib/services/mapboxService.test.ts
npm test -- __tests__/lib/services/timelineParser.test.ts
```

---

## Fehlerbehebung

### OwnTracks sendet nicht

| Problem | Lösung |
|---------|--------|
| "Error 401" | Token überprüfen, neu erstellen wenn nötig |
| "Error 404" | URL überprüfen, muss mit `/api/location/webhook` enden |
| Keine Updates | Tracking-Modus prüfen, "Significant changes" aktivieren |
| Batterieverbrauch hoch | Auf "Significant changes" umstellen |

### Import schlägt fehl

| Problem | Lösung |
|---------|--------|
| "Ungültiges JSON" | Dateiformat überprüfen (muss .json sein) |
| "Parsing-Fehler" | Format prüfen – Google Takeout nutzen |
| 0 Punkte importiert | Zeitraum der Datei prüfen |

### Geocoding-Fehler

| Problem | Lösung |
|---------|--------|
| "Rate limit exceeded" | Warten und in kleineren Batches geocoden |
| "Invalid token" | MAPBOX_ACCESS_TOKEN prüfen |
| "403 Forbidden" | Siehe Mapbox Token-Konfiguration unten |
| Falsche Adressen | Confidence beachten, manuell korrigieren |

### Mapbox 403-Fehler beheben

**Symptom**: Geocoding oder Karten-Tiles geben 403 Forbidden zurück.

**Debug-Logging**: Die App loggt automatisch alle Mapbox-URLs (ohne Token) in die Server-Konsole:

```
[Mapbox] Single reverse geocode URL: https://api.mapbox.com/search/geocode/v6/reverse?longitude=...&access_token=TOKEN_HIDDEN
[Mapbox] Batch geocode URL: https://api.mapbox.com/search/geocode/v6/batch?access_token=TOKEN_HIDDEN
[Mapbox] Search Box reverse lookup URL: https://api.mapbox.com/search/searchbox/v1/reverse?...&access_token=TOKEN_HIDDEN
```

**Ursachen und Lösungen**:

1. **URL-Restrictions auf Token**
   - Gehe zu [console.mapbox.com/account/access-tokens](https://console.mapbox.com/account/access-tokens)
   - Prüfe, ob dein Token URL-Einschränkungen hat
   - **Empfehlung**: Für Server-Token (`MAPBOX_ACCESS_TOKEN`) KEINE URL-Restrictions setzen
   - Für Client-Token: `localhost` und deine Domain hinzufügen

2. **Fehlende Scopes**
   - Der Public Token (`pk.`) benötigt: `styles:tiles`, `styles:read`, `fonts:read`
   - Der Server Token (`MAPBOX_ACCESS_TOKEN`) sollte keine URL-Restrictions haben

3. **Adblocker blockiert Mapbox**
   - Fehler `ERR_BLOCKED_BY_CLIENT` = Adblocker
   - Mapbox-Domains zur Whitelist hinzufügen:
     - `api.mapbox.com`
     - `events.mapbox.com`

4. **Token neu erstellen**
   - Gehe zu Mapbox Console
   - Erstelle einen neuen Token **ohne URL-Restrictions**
   - Aktualisiere `MAPBOX_ACCESS_TOKEN` in `.env`

### Prisma-Fehler

```bash
# Schema neu generieren
npx prisma generate

# Schema mit DB synchronisieren
npx prisma db push

# Bei hartnäckigen Problemen
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

---

## Nächste Schritte

Nach erfolgreicher Einrichtung:

1. **OwnTracks im Hintergrund laufen lassen** für kontinuierliches Tracking
2. **Wöchentlich Batch-Geocoding** für neue Punkte durchführen
3. **Bekannte Orte manuell anlegen** (Zuhause, Arbeit, etc.) für automatisches Matching
4. **Historische Daten importieren** aus Google Timeline

---

## Verwandte Dokumentation

- [LOCATION_TRACKING_CONCEPT.md](../concepts/LOCATION_TRACKING_CONCEPT.md) – Technisches Konzept
- [PRD.md](../PRD.md) – Produkt-Anforderungen
