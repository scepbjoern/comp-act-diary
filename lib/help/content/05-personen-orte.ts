/**
 * Kategorie 5: Personen & Orte
 */
import type { TopicContent } from './index'

export const personenOrteContent: Record<string, TopicContent> = {
  'kontakte': {
    summary: `
      <h3>Kontakte (PRM)</h3>
      <p>Das <strong>Personal Relationship Management</strong> hilft dir, deine Beziehungen zu pflegen.</p>
      <ul>
        <li><strong>Kontaktliste:</strong> Alle deine Kontakte auf einen Blick</li>
        <li><strong>Details:</strong> Notizen, Tags, Interaktionshistorie</li>
        <li><strong>Google Sync:</strong> Kontakte aus Google importieren</li>
      </ul>
    `,
    instructions: `
      <h3>Kontakte verwalten</h3>
      <h4>Kontakte ansehen</h4>
      <ol>
        <li>Gehe zu <strong>Kontakte</strong> im Menü</li>
        <li>Durchsuche oder filtere deine Kontakte</li>
        <li>Klicke auf einen Kontakt für Details</li>
      </ol>
      <h4>Kontakt erstellen</h4>
      <ol>
        <li>Klicke auf <strong>"Neuer Kontakt"</strong></li>
        <li>Gib Name, E-Mail, Telefon etc. ein</li>
        <li>Füge optional Notizen hinzu</li>
        <li>Speichere den Kontakt</li>
      </ol>
      <h4>Kontakt bearbeiten</h4>
      <p>Klicke auf das Bearbeiten-Symbol in der Kontaktdetailansicht.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Contact {
  id, userId, slug
  givenName?, familyName?, displayName
  email?, phone?, notes?
  googleContactId? (für Sync)
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/contacts
GET/PATCH/DELETE /api/contacts/[id]</code></pre>
      <h4>Routing</h4>
      <p>Detailseite: <code>/prm/[slug]</code></p>
    `,
  },
  'orte': {
    summary: `
      <h3>Orte</h3>
      <p>Die <strong>Ortsverwaltung</strong> ermöglicht dir, wichtige Orte zu speichern und zu organisieren.</p>
      <ul>
        <li><strong>Karte:</strong> Alle Orte auf einer Karte sehen</li>
        <li><strong>Kategorien:</strong> POI-Typen wie Zuhause, Arbeit, Restaurant etc.</li>
        <li><strong>Favoriten:</strong> Wichtige Orte markieren</li>
        <li><strong>Geocoding:</strong> Adressen in Koordinaten umwandeln</li>
      </ul>
    `,
    instructions: `
      <h3>Orte verwalten</h3>
      <h4>Orte ansehen</h4>
      <ol>
        <li>Gehe zu <strong>Orte</strong> im Menü</li>
        <li>Nutze die Karte oder die Tabelle</li>
        <li>Filtere nach POI-Typ oder Favoriten</li>
      </ol>
      <h4>Ort bearbeiten</h4>
      <ol>
        <li>Klicke auf einen Ort in der Liste</li>
        <li>Bearbeite Name, Adresse, POI-Typ</li>
        <li>Markiere als Favorit mit ⭐</li>
      </ol>
      <h4>Geocoding</h4>
      <p>Klicke auf das Geocoding-Symbol, um Koordinaten aus der Adresse zu ermitteln.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Location {
  id, userId, slug, name
  lat?, lng?, address?, city?, country?
  poiType?, isFavorite, notes?
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/locations
PATCH/DELETE /api/locations/[id]
PATCH /api/locations/[id] { action: 'geocode' }</code></pre>
      <h4>Karte</h4>
      <p>Leaflet.js mit OpenStreetMap-Tiles für die Kartenansicht.</p>
    `,
  },
  'interaktionen': {
    summary: `
      <h3>Interaktionen</h3>
      <p><strong>Interaktionen</strong> dokumentieren deine Begegnungen und Gespräche mit Kontakten.</p>
      <ul>
        <li><strong>Zeitstempel:</strong> Wann hat die Interaktion stattgefunden?</li>
        <li><strong>Notizen:</strong> Was wurde besprochen?</li>
        <li><strong>Verknüpfung:</strong> Mit welchem Kontakt?</li>
      </ul>
    `,
    instructions: `
      <h3>Interaktionen erfassen</h3>
      <ol>
        <li>Gehe zur Kontaktdetailseite</li>
        <li>Scrolle zu <strong>"Interaktionen"</strong></li>
        <li>Klicke auf <strong>"Neue Interaktion"</strong></li>
        <li>Wähle Datum/Zeit und Art der Interaktion</li>
        <li>Füge Notizen hinzu</li>
        <li>Speichere</li>
      </ol>
      <h4>Interaktionsarten</h4>
      <ul>
        <li>Treffen</li>
        <li>Telefonat</li>
        <li>Nachricht</li>
        <li>E-Mail</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Interaction {
  id, userId, contactId
  occurredAt, type, notes?
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/interactions
GET/PATCH/DELETE /api/interactions/[id]</code></pre>
    `,
  },
  'google-sync': {
    summary: `
      <h3>Google Sync</h3>
      <p>Synchronisiere deine <strong>Google-Kontakte</strong> mit CompACT Diary.</p>
      <ul>
        <li><strong>Import:</strong> Kontakte aus Google laden</li>
        <li><strong>Verknüpfung:</strong> Google-IDs werden gespeichert</li>
        <li><strong>Aktualisierung:</strong> Änderungen synchronisieren</li>
      </ul>
    `,
    instructions: `
      <h3>Google Sync einrichten</h3>
      <ol>
        <li>Gehe zu <strong>Kontakte</strong></li>
        <li>Klicke auf <strong>"Google Sync"</strong> in der Sidebar</li>
        <li>Autorisiere den Zugriff auf dein Google-Konto</li>
        <li>Wähle, welche Kontakte importiert werden sollen</li>
        <li>Klicke auf <strong>"Synchronisieren"</strong></li>
      </ol>
      <h4>Hinweise</h4>
      <ul>
        <li>Nur Kontakte mit E-Mail werden importiert</li>
        <li>Bestehende Kontakte werden aktualisiert</li>
        <li>Löschungen werden nicht synchronisiert</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Google People API</h4>
      <p>Integration über Google People API v1.</p>
      <h4>OAuth2</h4>
      <p>Authentifizierung via Google OAuth2 mit Refresh-Token-Speicherung.</p>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/sync/google/status
POST /api/sync/google/contacts</code></pre>
    `,
  },
}

export const personenOrteOverview = `
  <p>Das <strong>Personal Relationship Management (PRM)</strong> hilft dir, deine Beziehungen zu pflegen und wichtige Orte zu dokumentieren.</p>
  <p>Verwalte Kontakte, speichere Orte und dokumentiere Interaktionen.</p>
`
