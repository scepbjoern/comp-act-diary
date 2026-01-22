/**
 * Kategorie 6: Aufgaben & Organisation
 */
import type { TopicContent } from './index'

export const aufgabenContent: Record<string, TopicContent> = {
  'aufgabenverwaltung': {
    summary: `
      <h3>Aufgabenverwaltung</h3>
      <p>Die <strong>Aufgabenverwaltung</strong> hilft dir, den Überblick zu behalten.</p>
      <ul>
        <li><strong>Erstellen:</strong> Neue Aufgaben hinzufügen</li>
        <li><strong>Priorisieren:</strong> Hoch, Mittel, Niedrig</li>
        <li><strong>Fälligkeit:</strong> Deadlines setzen</li>
        <li><strong>Gruppierung:</strong> Nach Fälligkeit, Priorität oder Typ</li>
        <li><strong>Favoriten:</strong> Wichtige Aufgaben markieren</li>
      </ul>
    `,
    instructions: `
      <h3>Aufgaben nutzen</h3>
      <h4>Aufgabe erstellen</h4>
      <ol>
        <li>Gehe zu <strong>Aufgaben</strong> im Menü</li>
        <li>Klicke auf <strong>"Neue Aufgabe"</strong></li>
        <li>Gib Titel und optional Beschreibung ein</li>
        <li>Wähle Priorität, Typ und Fälligkeit</li>
        <li>Optional: Verknüpfe mit einem Kontakt</li>
        <li>Speichere</li>
      </ol>
      <h4>Aufgabe erledigen</h4>
      <ol>
        <li>Klicke auf das Häkchen-Symbol</li>
        <li>Die Aufgabe wird als erledigt markiert</li>
      </ol>
      <h4>Aufgabe wieder öffnen</h4>
      <p>Bei erledigten Aufgaben: Klicke auf "Wieder öffnen".</p>
      <h4>Filter und Sortierung</h4>
      <ul>
        <li><strong>Status:</strong> Offen, Erledigt, Alle</li>
        <li><strong>Priorität:</strong> Hoch, Mittel, Niedrig</li>
        <li><strong>Typ:</strong> Allgemein, Sofort, Reflexion, etc.</li>
        <li><strong>Gruppierung:</strong> Fälligkeit, Priorität, Typ, Keine</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Task {
  id, userId, title, description?
  status: 'PENDING' | 'COMPLETED'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  taskType: 'GENERAL' | 'IMMEDIATE' | 'REFLECTION' | ...
  dueDate?, completedAt?
  isFavorite, contactId?
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/tasks?status=...&priority=...
POST /api/tasks
PATCH /api/tasks/[id]
DELETE /api/tasks/[id]
PATCH /api/tasks/[id] { action: 'complete' }
PATCH /api/tasks/[id] { action: 'reopen' }</code></pre>
    `,
  },
  'aufgabentypen': {
    summary: `
      <h3>Aufgabentypen</h3>
      <p>Verschiedene <strong>Typen</strong> helfen bei der Organisation.</p>
      <ul>
        <li><strong>Allgemein:</strong> Standard-Aufgaben</li>
        <li><strong>Sofort:</strong> Dringende Aufgaben</li>
        <li><strong>Reflexion:</strong> Zum Nachdenken</li>
        <li><strong>Geplante Interaktion:</strong> Kontakt aufnehmen</li>
        <li><strong>Follow-up:</strong> Nachfassen</li>
        <li><strong>Recherche:</strong> Informationen sammeln</li>
        <li><strong>Gewohnheit-bezogen:</strong> Mit Habits verknüpft</li>
      </ul>
    `,
    instructions: `
      <h3>Aufgabentypen nutzen</h3>
      <h4>Typ beim Erstellen wählen</h4>
      <ol>
        <li>Beim Erstellen einer Aufgabe</li>
        <li>Wähle den passenden Typ aus dem Dropdown</li>
      </ol>
      <h4>Nach Typ filtern</h4>
      <ol>
        <li>Nutze den Filter "Typ" in der Aufgabenliste</li>
        <li>Wähle den gewünschten Typ</li>
      </ol>
      <h4>Nach Typ gruppieren</h4>
      <ol>
        <li>Wähle bei "Gruppierung" die Option "Typ"</li>
        <li>Aufgaben werden nach Typ gruppiert angezeigt</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Task Types</h4>
      <pre><code>enum TaskType {
  GENERAL           // Allgemein
  IMMEDIATE         // Sofort
  REFLECTION        // Reflexion
  PLANNED_INTERACTION // Geplante Interaktion
  FOLLOW_UP         // Follow-up
  RESEARCH          // Recherche
  HABIT_RELATED     // Gewohnheit-bezogen
}</code></pre>
      <h4>Verwendung in UI</h4>
      <p>Labels werden in <code>TaskFilters.tsx</code> und <code>TaskCard.tsx</code> definiert.</p>
    `,
  },
  'lesezeichen': {
    summary: `
      <h3>Lesezeichen</h3>
      <p>Speichere wichtige <strong>Links und URLs</strong> in deinen Lesezeichen.</p>
      <ul>
        <li><strong>Schnellzugriff:</strong> Wichtige URLs immer griffbereit</li>
        <li><strong>Im Menü:</strong> Eigene Links erscheinen unter "Links"</li>
      </ul>
    `,
    instructions: `
      <h3>Lesezeichen verwalten</h3>
      <h4>Lesezeichen hinzufügen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Erfassung → Links</strong></li>
        <li>Gib Name und URL ein</li>
        <li>Klicke auf <strong>"Hinzufügen"</strong></li>
      </ol>
      <h4>Lesezeichen aufrufen</h4>
      <ol>
        <li>Gehe zu <strong>Lesezeichen</strong> im Menü</li>
        <li>Oder: Nutze den "Links"-Bereich im Hauptmenü</li>
        <li>Klicke auf einen Link, um ihn zu öffnen</li>
      </ol>
      <h4>Lesezeichen löschen</h4>
      <p>In den Einstellungen: Klicke auf das 🗑️-Symbol neben dem Link.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>UserLink {
  id, userId, name, url
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/links
POST /api/links
DELETE /api/links/[id]</code></pre>
    `,
  },
}

export const aufgabenOverview = `
  <p>Mit der <strong>Aufgabenverwaltung</strong> behältst du den Überblick über alles, was du erledigen möchtest.</p>
  <p>Erstelle Aufgaben, setze Prioritäten und organisiere dich mit verschiedenen Aufgabentypen.</p>
`
