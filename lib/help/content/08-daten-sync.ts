/**
 * Kategorie 8: Daten & Synchronisation
 */
import type { TopicContent } from './index'

export const datenSyncContent: Record<string, TopicContent> = {
  'standortverfolgung': {
    summary: `
      <h3>Standortverfolgung</h3>
      <p>Erfasse automatisch <strong>GPS-Punkte</strong> mit externen Apps.</p>
      <ul>
        <li><strong>OwnTracks:</strong> Open-Source Tracking-App</li>
        <li><strong>Tasker:</strong> Android-Automatisierung</li>
        <li><strong>Automatisch:</strong> Standorte werden im Hintergrund erfasst</li>
        <li><strong>Orte-Matching:</strong> GPS-Punkte werden bekannten Orten zugeordnet</li>
      </ul>
    `,
    instructions: `
      <h3>Standortverfolgung einrichten</h3>
      <h4>Mit OwnTracks</h4>
      <ol>
        <li>Installiere OwnTracks auf deinem Smartphone</li>
        <li>Konfiguriere den Webhook-Endpunkt: <code>/api/location/owntracks</code></li>
        <li>Setze deine User-ID und Device-ID</li>
        <li>Aktiviere Background-Tracking</li>
      </ol>
      <h4>Mit Tasker (Android)</h4>
      <ol>
        <li>Erstelle ein Profil mit Location-Trigger</li>
        <li>Sende HTTP-POST an <code>/api/location/tasker</code></li>
        <li>Übergebe Koordinaten im JSON-Body</li>
      </ol>
      <h4>Standorte ansehen</h4>
      <ol>
        <li>Gehe zu <strong>Orte</strong> im Menü</li>
        <li>Wechsle zu <strong>Einstellungen → Standort</strong> für Details</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>LocationPoint {
  id, userId, lat, lng
  accuracy?, altitude?, speed?
  timestamp, source
  locationId? (gematchter Ort)
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/location/owntracks
POST /api/location/tasker
GET /api/location/points
GET /api/location/visits</code></pre>
      <h4>Orte-Matching</h4>
      <p>GPS-Punkte werden automatisch mit definierten Orten verglichen (Radius-basiert).</p>
    `,
  },
  'kalender-sync': {
    summary: `
      <h3>Kalender-Synchronisation</h3>
      <p>Importiere <strong>Termine aus externen Kalendern</strong> in CompACT Diary.</p>
      <ul>
        <li><strong>Webhook:</strong> Events werden per Webhook empfangen</li>
        <li><strong>Tasker:</strong> Android-Kalender-Events senden</li>
        <li><strong>Orte-Verknüpfung:</strong> Events können Orten zugeordnet werden</li>
      </ul>
    `,
    instructions: `
      <h3>Kalender einrichten</h3>
      <h4>Mit Tasker (Android)</h4>
      <ol>
        <li>Erstelle ein Profil, das auf Kalender-Events reagiert</li>
        <li>Sende HTTP-POST an <code>/api/calendar/webhook</code></li>
        <li>Übergebe Event-Details im JSON-Body</li>
      </ol>
      <h4>Kalender-Einstellungen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Kalender</strong></li>
        <li>Konfiguriere Match-Patterns für Orte</li>
        <li>Aktiviere/Deaktiviere Quell-Kalender</li>
      </ol>
      <h4>Events verwalten</h4>
      <ol>
        <li>Gehe zu <strong>Kalender</strong> im Menü</li>
        <li>Wechsle zwischen Tag- und Wochenansicht</li>
        <li>Bearbeite oder blende Events aus</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>CalendarEvent {
  id, userId, title, description?
  startedAt, endedAt?, isAllDay
  location?, sourceCalendar?
  locationId?, isHidden
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/calendar/webhook
GET /api/calendar/events?date=...
PATCH /api/calendar/events/[id]</code></pre>
      <h4>Match-Patterns</h4>
      <p>Regex-Patterns matchen Event-Locations auf definierte Orte.</p>
    `,
  },
  'batch-verarbeitung': {
    summary: `
      <h3>Batch-Verarbeitung</h3>
      <p>Führe <strong>Massenoperationen</strong> auf deinen Daten aus.</p>
      <ul>
        <li><strong>Geocoding:</strong> Adressen in Koordinaten umwandeln</li>
        <li><strong>Batch-Updates:</strong> Mehrere Einträge gleichzeitig ändern</li>
      </ul>
    `,
    instructions: `
      <h3>Batch-Operationen nutzen</h3>
      <h4>Geocoding für alle Orte</h4>
      <ol>
        <li>Gehe zu <strong>Batch → Geocode</strong></li>
        <li>Wähle Orte ohne Koordinaten</li>
        <li>Klicke auf <strong>"Geocoding starten"</strong></li>
        <li>Warte, bis alle Adressen verarbeitet sind</li>
      </ol>
      <h4>Hinweise</h4>
      <ul>
        <li>Geocoding nutzt externe APIs (Rate-Limits beachten)</li>
        <li>Nicht alle Adressen können aufgelöst werden</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/batch/geocode
GET /api/batch/geocode/status</code></pre>
      <h4>Geocoding-Provider</h4>
      <p>Nominatim (OpenStreetMap) für kostenfreies Geocoding.</p>
      <h4>Rate-Limiting</h4>
      <p>Batch-Requests werden gedrosselt, um API-Limits einzuhalten.</p>
    `,
  },
  'datenimport': {
    summary: `
      <h3>Datenimport</h3>
      <p>Importiere <strong>Daten aus anderen Apps</strong> in CompACT Diary.</p>
      <ul>
        <li><strong>Diarium:</strong> Import aus der Diarium-App</li>
        <li><strong>JSON:</strong> Strukturierte Datenimporte</li>
      </ul>
    `,
    instructions: `
      <h3>Daten importieren</h3>
      <h4>Aus Diarium</h4>
      <ol>
        <li>Exportiere deine Daten aus Diarium (JSON-Format)</li>
        <li>Führe das Import-Script aus: <code>npm run import-diarium</code></li>
        <li>Folge den Anweisungen im Terminal</li>
      </ol>
      <h4>Hinweise</h4>
      <ul>
        <li>Erstelle vor dem Import ein Backup</li>
        <li>Duplikate werden erkannt und übersprungen</li>
        <li>Bilder müssen separat importiert werden</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Import-Script</h4>
      <pre><code>scripts/import-diarium.ts</code></pre>
      <h4>Mapping</h4>
      <p>Diarium-Einträge werden auf JournalEntry und Day gemapped.</p>
      <h4>Idempotenz</h4>
      <p>Import ist idempotent – mehrfaches Ausführen erzeugt keine Duplikate.</p>
    `,
  },
}

export const datenSyncOverview = `
  <p><strong>Daten und Synchronisation</strong> sorgen dafür, dass deine Informationen aktuell und vollständig sind.</p>
  <p>Lerne, wie du Standorte trackst, Kalender synchronisierst und Daten importierst.</p>
`
