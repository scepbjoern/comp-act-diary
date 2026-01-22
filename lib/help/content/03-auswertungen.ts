/**
 * Kategorie 3: Auswertungen
 */
import type { TopicContent } from './index'

export const auswertungenContent: Record<string, TopicContent> = {
  'wochenansicht': {
    summary: `
      <h3>Wochenauswertung</h3>
      <p>Die <strong>Wochenansicht</strong> zeigt Trends und Statistiken der aktuellen oder einer ausgewählten Woche.</p>
      <ul>
        <li><strong>Wohlbefinden-Index:</strong> Durchschnitt aller Symptomwerte</li>
        <li><strong>Stuhl:</strong> Bristol-Skala Verlauf</li>
        <li><strong>Gewohnheiten:</strong> Erfüllungsquote</li>
        <li><strong>Einzelne Symptome:</strong> Detailansicht pro Symptom</li>
      </ul>
    `,
    instructions: `
      <h3>Wochenauswertung nutzen</h3>
      <ol>
        <li>Gehe zu <strong>Auswertungen</strong> im Menü</li>
        <li>Wähle den Tab <strong>"Woche"</strong></li>
      </ol>
      <h4>Navigation</h4>
      <ul>
        <li><strong>Vorherige:</strong> Zur vorherigen Woche</li>
        <li><strong>Heute:</strong> Zurück zur aktuellen Woche</li>
        <li><strong>Nächste:</strong> Zur nächsten Woche</li>
      </ul>
      <h4>Farbcodierung</h4>
      <ul>
        <li><strong>Grün:</strong> Wohlbefinden-Index</li>
        <li><strong>Blau:</strong> Stuhl</li>
        <li><strong>Violett:</strong> Gewohnheiten</li>
        <li><strong>Orange:</strong> Einzelne Symptome</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkt</h4>
      <pre><code>GET /api/analytics/weekly?from=YYYY-MM-DD</code></pre>
      <h4>Wohlbefinden-Index Berechnung</h4>
      <pre><code>WBI = Durchschnitt(BESCHWERDEFREIHEIT, ENERGIE, STIMMUNG, SCHLAF, ENTSPANNUNG, HEISSHUNGERFREIHEIT, BEWEGUNG)</code></pre>
      <h4>Chart-Bibliothek</h4>
      <p>Recharts mit AreaChart für Sparklines und LineChart für Details.</p>
    `,
  },
  'phasenansicht': {
    summary: `
      <h3>Phasenauswertung</h3>
      <p>Die <strong>Phasenansicht</strong> zeigt Auswertungen nach Phasen (historisches Feature aus der Darmkur-Zeit).</p>
      <ul>
        <li><strong>Phase 1-3:</strong> Verschiedene Phasen</li>
        <li><strong>KPI-Karten:</strong> Durchschnitt, Min, Max pro Symptom</li>
        <li><strong>Verlaufscharts:</strong> Entwicklung innerhalb der Phase</li>
      </ul>
    `,
    instructions: `
      <h3>Phasenauswertung nutzen</h3>
      <ol>
        <li>Gehe zu <strong>Auswertungen</strong></li>
        <li>Wähle den Tab <strong>"Phase"</strong></li>
        <li>Klicke auf Phase 1, 2 oder 3</li>
      </ol>
      <h4>KPI-Karten verstehen</h4>
      <ul>
        <li><strong>∅:</strong> Durchschnittswert</li>
        <li><strong>min:</strong> Niedrigster Wert</li>
        <li><strong>max:</strong> Höchster Wert</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkt</h4>
      <pre><code>GET /api/analytics/phase?phase=PHASE_1</code></pre>
      <h4>Phasen-Datenmodell</h4>
      <pre><code>Day.phase: 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | null
Day.category: 'SANFT' | 'MEDIUM' | 'INTENSIV' | null</code></pre>
    `,
  },
  'gesamtansicht': {
    summary: `
      <h3>Gesamtauswertung</h3>
      <p>Die <strong>Gesamtansicht</strong> zeigt die langfristige Entwicklung über alle Einträge.</p>
      <ul>
        <li><strong>Zeitraum:</strong> Alle erfassten Tage</li>
        <li><strong>Marker:</strong> Reflexionszeitpunkte werden markiert</li>
        <li><strong>Trends:</strong> Langfristige Entwicklungen erkennen</li>
      </ul>
    `,
    instructions: `
      <h3>Gesamtauswertung nutzen</h3>
      <ol>
        <li>Gehe zu <strong>Auswertungen</strong></li>
        <li>Wähle den Tab <strong>"Gesamt"</strong></li>
      </ol>
      <h4>Marker verstehen</h4>
      <ul>
        <li><strong>WEEK:</strong> Wochenreflexion</li>
        <li><strong>MONTH:</strong> Monatsreflexion</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkt</h4>
      <pre><code>GET /api/analytics/overall</code></pre>
      <h4>Performance</h4>
      <p>Für grosse Datensätze: Aggregation, Server-Caching, Lazy Loading der Charts.</p>
    `,
  },
  'export': {
    summary: `
      <h3>Datenexport</h3>
      <p>Exportiere deine Daten für Backup oder Weiterverarbeitung.</p>
      <ul>
        <li><strong>CSV:</strong> Tabellenformat für Excel, Google Sheets</li>
        <li><strong>PDF:</strong> Druckfähiges Dokument mit optionalen Fotos</li>
      </ul>
    `,
    instructions: `
      <h3>Daten exportieren</h3>
      <ol>
        <li>Gehe zu <strong>Export</strong> im Menü</li>
        <li>Wähle optional einen Zeitraum (Von/Bis)</li>
        <li>Für PDF: Optional "Fotos hinzufügen" aktivieren</li>
        <li>Klicke auf <strong>"CSV exportieren"</strong> oder <strong>"PDF exportieren"</strong></li>
      </ol>
      <h4>Was wird exportiert?</h4>
      <ul>
        <li><strong>CSV:</strong> WBI, Stuhl, Habits, Symptome (nur Zahlen)</li>
        <li><strong>PDF:</strong> Alle Einträge, Notizen und optional Fotos</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/export/csv?from=...&to=...
GET /api/export/pdf?from=...&to=...&photos=true&thumb=500</code></pre>
      <h4>CSV-Format</h4>
      <pre><code>date,wbi,stool,habits,BESCHWERDEFREIHEIT,...</code></pre>
      <h4>PDF-Generierung</h4>
      <p>Serverseitig mit PDF-Bibliothek, chronologisch sortiert, Fotos optional als Thumbnails.</p>
    `,
  },
}

export const auswertungenOverview = `
  <p>Die <strong>Auswertungen</strong> helfen dir, Muster und Trends in deinen Daten zu erkennen.</p>
  <p>Hier erfährst du, wie du deine Einträge analysieren und exportieren kannst.</p>
`
