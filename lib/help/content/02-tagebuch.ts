/**
 * Kategorie 2: Tagebuch & Reflexion
 */
import type { TopicContent } from './index'

export const tagebuchContent: Record<string, TopicContent> = {
  'tageseintraege': {
    summary: `
      <h3>Tageseinträge verstehen</h3>
      <p>Der <strong>Tageseintrag</strong> ist die zentrale Einheit in CompACT Diary.</p>
      <ul>
        <li><strong>Symptome:</strong> Wohlbefinden, Energie, Stimmung, Schlaf und mehr (1-10)</li>
        <li><strong>Gewohnheiten:</strong> Was hast du heute getan?</li>
        <li><strong>Bemerkungen:</strong> Freitext-Notizen zu deinem Tag</li>
        <li><strong>Ernährung:</strong> Was hast du gegessen? (mit Fotos)</li>
        <li><strong>Medien:</strong> Fotos und Bilder hinzufügen</li>
      </ul>
    `,
    instructions: `
      <h3>So erfasst du deinen Tag</h3>
      <h4>Symptome bewerten (1-10)</h4>
      <ol>
        <li>Tippe auf eine Zahl in der Number-Pill-Reihe</li>
        <li>Die ausgewählte Zahl wird hervorgehoben</li>
        <li>Ein <strong>Sparkline</strong> zeigt den 7-Tage-Trend</li>
        <li>Der <strong>Gestern-Marker</strong> zeigt den gestrigen Wert</li>
      </ol>
      <h4>Stuhlgang (Bristol-Skala 1-7)</h4>
      <ul>
        <li>Wähle einen Wert von 1-7 nach Bristol-Skala</li>
        <li><strong>"—"</strong> (ganz links) für "kein Stuhlgang"</li>
      </ul>
      <h4>Gewohnheiten tracken</h4>
      <ol>
        <li>Tippe auf eine Gewohnheit, um sie abzuhaken</li>
        <li>Ein blauer Ring zeigt: gestern aktiv, heute noch nicht</li>
      </ol>
      <h4>Bemerkungen schreiben</h4>
      <ol>
        <li>Tippe in das Textfeld unter "Bemerkungen"</li>
        <li>Optional: 🎤 für Spracheingabe, ✨ für KI-Verbesserung</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Day { id, date, userId, phase?, category? }
Measurement { id, dayId, metricName, value, unit }
HabitEntry { id, dayId, habitId, completed }</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET  /api/day/[date]           → Tag laden
POST /api/day/[date]/symptoms  → Symptome speichern
POST /api/day/[date]/habits    → Gewohnheiten speichern</code></pre>
      <h4>Sparkline</h4>
      <p>7-Tage-Verlauf mit Farbcodierung: Rot (schlecht) → Grau → Grün (gut)</p>
    `,
  },
  'journal-ansicht': {
    summary: `
      <h3>Journal-Ansicht</h3>
      <p>Die <strong>Journal-Ansicht</strong> (/journal) zeigt alle Einträge in einer kompakten Kartenansicht. Jede Karte kann aufgeklappt werden und bietet:</p>
      <ul>
        <li><strong>Aufgaben-Panel:</strong> Aufgaben zum Eintrag verwalten und KI-Extraktion triggern</li>
        <li><strong>OCR-Quellen:</strong> Originalbilder und PDFs, aus denen Text extrahiert wurde</li>
        <li><strong>Teilen:</strong> Eintrag mit anderen Benutzern teilen</li>
        <li><strong>Zeitstempel:</strong> Bezugs- und Erfassungszeit bearbeiten</li>
        <li><strong>AI-Einstellungen:</strong> Template-basierte KI-Konfiguration einsehen (Content, Analyse, Zusammenfassung, Titel, Audio-Segmentierung)</li>
      </ul>
    `,
    instructions: `
      <h3>So nutzt du die Journal-Ansicht</h3>
      <h4>Aufgaben</h4>
      <ol>
        <li>Klappe einen Eintrag auf – das Aufgaben-Panel wird angezeigt</li>
        <li>Klicke <strong>"Aufgabe hinzufügen"</strong> für eine neue Aufgabe</li>
        <li>Klicke <strong>"Tasks erkennen"</strong> um KI-Vorschläge zu erhalten</li>
        <li>Hake erledigte Aufgaben mit der Checkbox ab</li>
      </ol>
      <h4>OCR-Quellen</h4>
      <ol>
        <li>Einträge mit OCR-Quellen zeigen ein Panel "OCR-Quellen"</li>
        <li>Klicke auf das Panel um die Original-Dateien zu sehen</li>
        <li>Vorschau und Download sind möglich</li>
      </ol>
      <h4>Teilen und Zeitstempel</h4>
      <ul>
        <li><strong>🔗 Teilen:</strong> Klicke das Share-Icon um den Eintrag freizugeben</li>
        <li><strong>🕐 Zeitstempel:</strong> Klicke das Uhr-Icon um Bezugs-/Erfassungszeit zu ändern</li>
        <li><strong>⚙️ AI-Settings:</strong> Klicke das Zahnrad-Icon für die Template-KI-Konfiguration (Link zu /settings/templates)</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Architektur</h4>
      <p>Die Journal-Ansicht nutzt <code>JournalEntryCard</code> mit integrierten Panels und Modals:</p>
      <ul>
        <li><code>JournalTasksPanel</code> – Tasks pro Eintrag (lazy-loaded)</li>
        <li><code>OCRSourcePanel</code> – OCR-Quellen (lazy-loaded bei Expand)</li>
        <li><code>ShareEntryModal</code> – Freigabeverwaltung</li>
        <li><code>TimestampModal</code> – Zeitstempel bearbeiten</li>
        <li><code>AISettingsPopup</code> – KI-Konfiguration anzeigen</li>
      </ul>
      <h4>API-Endpunkte</h4>
      <pre><code>GET  /api/journal-entries/[id]/tasks    → Tasks laden
POST /api/journal-ai/extract-tasks       → KI-Task-Extraktion
GET  /api/notes/[id]/ocr-sources         → OCR-Quellen laden
POST /api/journal-entries/[id]/access     → Freigabe erteilen
PATCH /api/journal-entries/[id]           → Zeitstempel aktualisieren</code></pre>
    `,
  },
  'reflexionen': {
    summary: `
      <h3>Reflexionen verstehen</h3>
      <p><strong>Reflexionen</strong> sind strukturierte Rückblicke auf einen Zeitraum.</p>
      <ul>
        <li><strong>Wochenreflexion:</strong> Wöchentlicher Rückblick</li>
        <li><strong>Monatsreflexion:</strong> Monatlicher Rückblick</li>
      </ul>
      <p>Vier Fragen: Was hat sich verändert? Wofür bin ich dankbar? Welche Vorsätze? Sonstige Bemerkungen?</p>
    `,
    instructions: `
      <h3>So erstellst du eine Reflexion</h3>
      <ol>
        <li>Gehe zu <strong>Reflexionen</strong> im Menü</li>
        <li>Wähle den Typ: Wochenreflexion oder Monatsreflexion</li>
        <li>Fülle die vier Felder aus</li>
        <li>Optional: Nutze 🎤 Mikrofon oder ✨ KI-Verbesserung</li>
        <li>Optional: Füge Fotos hinzu</li>
        <li>Speichere über die SaveBar</li>
      </ol>
      <h4>Reflexion bearbeiten</h4>
      <p>Tippe auf das ✏️-Symbol bei einer bestehenden Reflexion.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Reflection {
  id, userId, kind: 'WEEK'|'MONTH'
  changed?, gratitude?, vows?, remarks?
  weight?, photos[]
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/reflections
PATCH/DELETE /api/reflections/[id]
POST /api/reflections/[id]/photos</code></pre>
    `,
  },
  'medien': {
    summary: `
      <h3>Fotos und Medien</h3>
      <p>CompACT Diary unterstützt <strong>Fotos</strong> in verschiedenen Bereichen:</p>
      <ul>
        <li><strong>Tageseinträge:</strong> Fotos zu Ernährungsnotizen</li>
        <li><strong>Reflexionen:</strong> Fotos zu Reflexionen</li>
        <li><strong>KI-Bilder:</strong> Automatisch generierte Tagesbilder</li>
      </ul>
      <p>Bilder werden automatisch komprimiert und optimiert.</p>
    `,
    instructions: `
      <h3>Fotos hinzufügen</h3>
      <h4>Foto hochladen</h4>
      <ol>
        <li>Tippe auf <strong>"Foto hochladen"</strong></li>
        <li>Wähle ein Bild von deinem Gerät</li>
        <li>Das Bild wird automatisch komprimiert</li>
      </ol>
      <h4>Kamera nutzen</h4>
      <ol>
        <li>Tippe auf <strong>"Kamera"</strong></li>
        <li>Erlaube den Kamerazugriff</li>
        <li>Nimm ein Foto auf</li>
      </ol>
      <h4>Foto-Einstellungen</h4>
      <p>In Einstellungen konfigurierbar: Format (WebP/JPEG/PNG), Qualität, Max. Grösse</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Upload-Prozess</h4>
      <ol>
        <li>Client: Bild mit Canvas API komprimiert</li>
        <li>Server: Speicherung in <code>/uploads</code></li>
        <li>Datenbank-Eintrag wird erstellt</li>
      </ol>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/upload-image
GET/DELETE /api/photos/[id]</code></pre>
    `,
  },
  'spracheingabe': {
    summary: `
      <h3>Spracheingabe</h3>
      <p>Mit der <strong>Spracheingabe</strong> kannst du Texte diktieren.</p>
      <ul>
        <li><strong>Wo verfügbar:</strong> Bemerkungen, Ernährungsnotizen, Reflexionen</li>
        <li><strong>Modellauswahl:</strong> Whisper, Deepgram, GPT-4o</li>
      </ul>
    `,
    instructions: `
      <h3>So nutzt du die Spracheingabe</h3>
      <ol>
        <li>Tippe auf das <strong>🎤 Mikrofon-Symbol</strong></li>
        <li>Erlaube den Mikrofonzugriff</li>
        <li>Sprich deinen Text</li>
        <li>Tippe erneut zum Beenden</li>
        <li>Der transkribierte Text erscheint im Feld</li>
      </ol>
      <h4>Modell auswählen</h4>
      <p>Tippe auf das ⚙️-Symbol für Modellauswahl:</p>
      <ul>
        <li><strong>Whisper Large V3:</strong> Sehr genau</li>
        <li><strong>Deepgram Nova 3:</strong> Gut für Schweizerdeutsch</li>
        <li><strong>GPT-4o Transcribe:</strong> Höchste Qualität</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Audio-Aufnahme</h4>
      <p>Web Audio API mit MediaRecorder (WebM/Opus oder MP4/AAC)</p>
      <h4>API-Endpunkt</h4>
      <pre><code>POST /api/transcribe
Body: { audio: File, model?, language? }</code></pre>
      <h4>Audio-Chunking</h4>
      <p>Lange Aufnahmen werden mit FFmpeg aufgeteilt und separat transkribiert.</p>
    `,
  },
  'tageszusammenfassung': {
    summary: `
      <h3>KI-Tageszusammenfassung</h3>
      <p>Die <strong>Tageszusammenfassung</strong> nutzt KI für eine übersichtliche Zusammenfassung.</p>
      <ul>
        <li><strong>Automatisch:</strong> Basiert auf allen Tageseinträgen</li>
        <li><strong>Strukturiert:</strong> Bullet Points mit Schlüsselbegriffen</li>
        <li><strong>Anpassbar:</strong> Modell und Prompt konfigurierbar</li>
      </ul>
    `,
    instructions: `
      <h3>Tageszusammenfassung nutzen</h3>
      <ol>
        <li>Gehe zur Tagesansicht (Startseite)</li>
        <li>Scrolle zu <strong>"Tageszusammenfassung"</strong></li>
        <li>Tippe auf <strong>"Zusammenfassung generieren"</strong></li>
      </ol>
      <h4>Was wird berücksichtigt?</h4>
      <ul>
        <li>Alle Bemerkungen des Tages</li>
        <li>Ernährungsnotizen</li>
        <li>Symptomwerte</li>
        <li>Erledigte Gewohnheiten</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Prozess</h4>
      <ol>
        <li>JournalEntries des Tages laden</li>
        <li>Text mit Symptom-/Habit-Daten kombinieren</li>
        <li>LLM generiert Zusammenfassung</li>
        <li>Ergebnis als DaySummary speichern</li>
      </ol>
      <h4>API-Endpunkt</h4>
      <pre><code>POST /api/day/[date]/summary</code></pre>
    `,
  },
}

export const tagebuchOverview = `
  <p>Das <strong>Tagebuch</strong> ist das Herzstück von CompACT Diary. Hier dokumentierst du deinen Alltag, deine Gedanken und Gefühle.</p>
  <p>In dieser Kategorie erfährst du alles über Tageseinträge, Reflexionen, Medien und mehr.</p>
`
