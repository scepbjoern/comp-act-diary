/**
 * Kategorie 10: Journal-Templates
 * Help content for the dynamic journal templates feature.
 */
import type { TopicContent } from './index'

export const templatesOverview = `
  <p>
    <strong>Journal-Templates</strong> ermöglichen dir, strukturierte Vorlagen für deine Tagebucheinträge zu erstellen.
    Statt eines freien Textfeldes kannst du spezifische Felder definieren, die dich beim Erfassen unterstützen.
  </p>
  <h4>Vorteile von Templates</h4>
  <ul>
    <li><strong>Struktur:</strong> Konsistente Einträge durch vordefinierte Felder</li>
    <li><strong>Effizienz:</strong> Schnellere Erfassung durch geführte Eingabe</li>
    <li><strong>KI-Integration:</strong> Anpassbare KI-Prompts pro Template</li>
    <li><strong>Flexibilität:</strong> Verschiedene Templates für verschiedene Eintragstypen</li>
  </ul>
`

export const templatesContent: Record<string, TopicContent> = {
  'uebersicht': {
    summary: `
      <h3>Was sind Templates?</h3>
      <p>Templates sind <strong>Vorlagen</strong> für Journal-Einträge mit vordefinierten Feldern.</p>
      <ul>
        <li><strong>Felder:</strong> Textbereiche, Einzeiler, Zahlen, Datum, Uhrzeit</li>
        <li><strong>Labels:</strong> Beschriftung mit optionalem Emoji-Icon</li>
        <li><strong>Instruktionen:</strong> Hilfetext für jedes Feld</li>
        <li><strong>KI-Konfiguration:</strong> Modelle und Prompts pro Template</li>
      </ul>
    `,
    instructions: `
      <h3>Templates nutzen</h3>
      <h4>Template-Verwaltung öffnen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Erfassung → Journal-Templates</strong></li>
        <li>Oder direkt zu <code>/settings/templates</code></li>
      </ol>
      <h4>Template-Typen</h4>
      <ul>
        <li><strong>System-Templates:</strong> Vordefinierte Vorlagen (nur AI-Konfiguration editierbar)</li>
        <li><strong>Eigene Templates:</strong> Vollständig anpassbar</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>JournalTemplate {
  id, name, description?
  fields: JSON (TemplateField[])
  aiConfig: JSON (TemplateAIConfig)
  typeId?, userId?, origin
}</code></pre>
      <h4>Feld-Typen</h4>
      <pre><code>TemplateField {
  id, type, label?, icon?
  instruction?, order, required
}
type: 'textarea' | 'text' | 'number' | 'date' | 'time'</code></pre>
    `,
  },
  'erstellen': {
    summary: `
      <h3>Template erstellen</h3>
      <p>Erstelle eigene Templates mit <strong>benutzerdefinierten Feldern</strong>.</p>
      <ul>
        <li><strong>Name:</strong> Eindeutiger Name für das Template</li>
        <li><strong>Beschreibung:</strong> Optionale Erläuterung</li>
        <li><strong>Typ:</strong> Für welchen Eintragstyp (z.B. Tagebuch, Reflexion)</li>
        <li><strong>Felder:</strong> Beliebig viele Felder hinzufügen</li>
      </ul>
    `,
    instructions: `
      <h3>Neues Template anlegen</h3>
      <ol>
        <li>Öffne <strong>Einstellungen → Templates</strong></li>
        <li>Klicke auf <strong>"Neues Template"</strong></li>
        <li>Gib einen <strong>Namen</strong> ein</li>
        <li>Wähle optional einen <strong>Typ</strong> (z.B. Tagebuch)</li>
      </ol>
      <h4>Felder hinzufügen</h4>
      <ol>
        <li>Klicke auf <strong>"+ Feld hinzufügen"</strong></li>
        <li>Wähle den <strong>Feldtyp</strong> (Textbereich, Einzeilig, etc.)</li>
        <li>Gib ein <strong>Label</strong> ein (z.B. "Was hast du heute erlebt?")</li>
        <li>Optional: Wähle ein <strong>Icon</strong> (Emoji)</li>
        <li>Optional: Füge eine <strong>Instruktion</strong> hinzu</li>
        <li>Markiere als <strong>Pflichtfeld</strong> falls nötig</li>
      </ol>
      <h4>Felder sortieren</h4>
      <p>Ziehe Felder per Drag & Drop in die gewünschte Reihenfolge.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/templates          - Liste aller Templates
POST /api/templates         - Neues Template erstellen
GET /api/templates/:id      - Template abrufen
PATCH /api/templates/:id    - Template aktualisieren
DELETE /api/templates/:id   - Template löschen
POST /api/templates/:id/duplicate - Duplizieren</code></pre>
      <h4>Validierung</h4>
      <ul>
        <li>Name ist Pflichtfeld</li>
        <li>Felder-IDs müssen eindeutig sein</li>
        <li>Order-Werte werden automatisch vergeben</li>
      </ul>
    `,
  },
  'verwenden': {
    summary: `
      <h3>Templates verwenden</h3>
      <p>Erstelle <strong>Journal-Einträge</strong> mit Templates.</p>
      <ul>
        <li><strong>Template wählen:</strong> Beim Erstellen eines neuen Eintrags</li>
        <li><strong>Felder ausfüllen:</strong> Strukturierte Eingabe</li>
        <li><strong>Speichern:</strong> Inhalt wird als Markdown gespeichert</li>
      </ul>
    `,
    instructions: `
      <h3>Eintrag mit Template erstellen</h3>
      <ol>
        <li>Gehe zu <strong>/journal</strong></li>
        <li>Klicke auf <strong>"Neuer Eintrag"</strong></li>
        <li>Wähle einen <strong>Typ</strong> (filtert verfügbare Templates)</li>
        <li>Wähle ein <strong>Template</strong> aus der Liste</li>
        <li>Fülle die <strong>Felder</strong> aus</li>
        <li>Klicke auf <strong>"Speichern"</strong></li>
      </ol>
      <h4>Inhalt-Format</h4>
      <p>Der Inhalt wird automatisch als Markdown formatiert:</p>
      <pre><code># 📝 Feldlabel
Feldinhalt...

# 🎯 Nächstes Feld
Weiterer Inhalt...</code></pre>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Content-Aggregation</h4>
      <p>Die Feldwerte werden zu einem Markdown-String zusammengebaut:</p>
      <pre><code>buildContentFromFields(fields, fieldValues)
parseContentToFields(content, fields)</code></pre>
      <h4>Mismatch-Erkennung</h4>
      <p>Bei Änderungen am Template wird geprüft, ob bestehende Einträge noch passen.</p>
      <ul>
        <li>Warnung bei fehlendem Pflichtfeld</li>
        <li>Fallback-Editor bei nicht-passendem Inhalt</li>
      </ul>
    `,
  },
  'ki-konfiguration': {
    summary: `
      <h3>KI-Konfiguration</h3>
      <p>Passe <strong>KI-Modelle und Prompts</strong> für jedes Template an.</p>
      <ul>
        <li><strong>Content-Verbesserung:</strong> Transkript aufbereiten</li>
        <li><strong>Titel-Generierung:</strong> Automatischer Titel</li>
        <li><strong>Zusammenfassung:</strong> Kurze Zusammenfassung</li>
        <li><strong>Analyse:</strong> Psychologische ACT-Analyse</li>
        <li><strong>Segmentierung:</strong> Audio auf Felder aufteilen</li>
      </ul>
    `,
    instructions: `
      <h3>KI-Konfiguration anpassen</h3>
      <ol>
        <li>Öffne ein Template zur Bearbeitung</li>
        <li>Scrolle zum Abschnitt <strong>"AI-Konfiguration"</strong></li>
        <li>Klappe den gewünschten Bereich auf (z.B. Titel-Generierung)</li>
        <li>Wähle ein <strong>Modell</strong> aus der Liste</li>
        <li>Passe optional den <strong>Prompt</strong> an</li>
        <li>Klicke auf <strong>"Speichern"</strong></li>
      </ol>
      <h4>System-Templates</h4>
      <p>Bei System-Templates kannst du nur die KI-Konfiguration ändern, nicht die Felder.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>TemplateAIConfig Schema</h4>
      <pre><code>TemplateAIConfig {
  contentModel?, contentPrompt?
  titleModel?, titlePrompt?
  summaryModel?, summaryPrompt?
  analysisModel?, analysisPrompt?
  segmentationModel?, segmentationPrompt?
}</code></pre>
      <h4>Modell-Auswahl</h4>
      <p>Modelle werden aus der LLM-Modellverwaltung geladen (/settings).</p>
      <h4>Segmentierung</h4>
      <p>Nur für Multi-Feld-Templates: Audio-Transkript wird auf die definierten Felder aufgeteilt.</p>
    `,
  },
  'system-templates': {
    summary: `
      <h3>System-Templates</h3>
      <p>Vordefinierte Templates für häufige Anwendungsfälle.</p>
      <ul>
        <li><strong>Tägliche Reflexion:</strong> Strukturierte Tagesreflexion</li>
        <li><strong>Wochenreflexion:</strong> Wöchentlicher Rückblick</li>
        <li><strong>Freier Eintrag:</strong> Unstrukturiertes Tagebuch</li>
      </ul>
    `,
    instructions: `
      <h3>System-Templates anpassen</h3>
      <p>System-Templates sind schreibgeschützt, aber du kannst:</p>
      <ol>
        <li>Die <strong>KI-Konfiguration</strong> anpassen</li>
        <li>Das Template <strong>duplizieren</strong> für eine eigene Version</li>
      </ol>
      <h4>Template duplizieren</h4>
      <ol>
        <li>Öffne das System-Template</li>
        <li>Klicke auf <strong>"Duplizieren"</strong></li>
        <li>Die Kopie erscheint unter "Meine Templates"</li>
        <li>Bearbeite die Kopie nach Belieben</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Origin-Feld</h4>
      <pre><code>origin: 'SYSTEM' | 'USER' | 'IMPORT'</code></pre>
      <p>System-Templates haben <code>origin: 'SYSTEM'</code> und <code>userId: null</code>.</p>
      <h4>Seed-Daten</h4>
      <p>System-Templates werden beim Seed erstellt (prisma/seed.ts).</p>
      <h4>Duplizieren</h4>
      <pre><code>POST /api/templates/:id/duplicate</code></pre>
      <p>Erstellt eine Kopie mit <code>origin: 'USER'</code> und dem aktuellen User.</p>
    `,
  },
}
