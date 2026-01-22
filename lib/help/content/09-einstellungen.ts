/**
 * Kategorie 9: Einstellungen
 */
import type { TopicContent } from './index'

export const einstellungenContent: Record<string, TopicContent> = {
  'profil': {
    summary: `
      <h3>Profil & Konto</h3>
      <p>Verwalte dein <strong>Benutzerprofil</strong> und Konto-Einstellungen.</p>
      <ul>
        <li><strong>Anzeigename:</strong> Wie du in der App angezeigt wirst</li>
        <li><strong>Benutzername:</strong> Dein eindeutiger Identifier</li>
        <li><strong>Profilbild:</strong> Avatar hochladen und zuschneiden</li>
      </ul>
    `,
    instructions: `
      <h3>Profil bearbeiten</h3>
      <h4>Namen ändern</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Profil</strong></li>
        <li>Ändere Anzeigename oder Benutzername</li>
        <li>Klicke auf <strong>"Speichern"</strong></li>
      </ol>
      <h4>Profilbild ändern</h4>
      <ol>
        <li>Klicke auf <strong>"Profilbild ändern"</strong></li>
        <li>Wähle ein Bild von deinem Gerät</li>
        <li>Passe den Ausschnitt an (Verschieben, Zoomen)</li>
        <li>Klicke auf <strong>"Speichern"</strong></li>
      </ol>
      <h4>Profilbild entfernen</h4>
      <p>Klicke auf <strong>"Entfernen"</strong> neben dem Profilbild.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>User {
  id, username, displayName?
  profileImageUrl?
  settings: JSON
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET /api/me
PATCH /api/me
POST /api/me/avatar
DELETE /api/me/avatar</code></pre>
      <h4>Avatar-Verarbeitung</h4>
      <p>Client-seitig mit Canvas API zugeschnitten, als WebP (512x512) gespeichert.</p>
    `,
  },
  'sicherheit': {
    summary: `
      <h3>Sicherheit</h3>
      <p>Schütze deine Daten mit <strong>Passcode</strong> und anderen Sicherheitsfeatures.</p>
      <ul>
        <li><strong>Passcode:</strong> 4-6 stelliger PIN zum Entsperren</li>
        <li><strong>Auto-Lock:</strong> Automatisches Sperren nach Inaktivität</li>
      </ul>
    `,
    instructions: `
      <h3>Passcode einrichten</h3>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Darstellung → Passcode-Schutz</strong></li>
        <li>Aktiviere <strong>"Passcode aktivieren"</strong></li>
        <li>Gib einen 4-6 stelligen PIN ein</li>
        <li>Bestätige den PIN</li>
      </ol>
      <h4>Passcode ändern</h4>
      <ol>
        <li>Gib deinen aktuellen Passcode ein</li>
        <li>Wähle <strong>"Passcode ändern"</strong></li>
        <li>Gib den neuen PIN ein und bestätige</li>
      </ol>
      <h4>Passcode deaktivieren</h4>
      <ol>
        <li>Gib deinen aktuellen Passcode ein</li>
        <li>Wähle <strong>"Passcode deaktivieren"</strong></li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Speicherung</h4>
      <p>Passcode wird als Hash in localStorage gespeichert (nicht auf Server).</p>
      <h4>Lock-Screen</h4>
      <p>Client-seitige Implementierung mit React-State.</p>
      <h4>Sicherheitshinweis</h4>
      <p>Der Passcode bietet Schutz vor beiläufigem Zugriff, ist aber keine vollständige Verschlüsselung.</p>
    `,
  },
  'ki-konfiguration': {
    summary: `
      <h3>KI-Konfiguration</h3>
      <p>Konfiguriere <strong>KI-Modelle und Prompts</strong> für verschiedene Features.</p>
      <ul>
        <li><strong>LLM-Modelle:</strong> Verwalte verfügbare Modelle</li>
        <li><strong>Zusammenfassung:</strong> Modell und Prompt für Tageszusammenfassungen</li>
        <li><strong>Transkription:</strong> Modell, Sprache, Glossar</li>
        <li><strong>Bildgenerierung:</strong> Modell und Stil</li>
      </ul>
    `,
    instructions: `
      <h3>KI-Einstellungen konfigurieren</h3>
      <h4>LLM-Modelle verwalten</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → KI</strong></li>
        <li>Öffne <strong>"LLM-Modelle"</strong></li>
        <li>Füge neue Modelle hinzu oder bearbeite bestehende</li>
      </ol>
      <h4>Zusammenfassungs-Einstellungen</h4>
      <ol>
        <li>Wähle das <strong>Modell</strong> für Zusammenfassungen</li>
        <li>Passe den <strong>Prompt</strong> an deine Bedürfnisse an</li>
        <li>Speichere</li>
      </ol>
      <h4>Transkriptions-Einstellungen</h4>
      <ol>
        <li>Definiere einen <strong>Prompt</strong> für bessere Ergebnisse</li>
        <li>Füge ein <strong>Glossar</strong> mit häufigen Begriffen hinzu</li>
        <li>Setze <strong>Sprachen</strong> pro Modell</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>LLM-Modelle Datenmodell</h4>
      <pre><code>LlmModel {
  id, userId?, modelId, name
  provider, inputCost?, outputCost?
  supportsReasoningEffort
}</code></pre>
      <h4>User-Settings</h4>
      <pre><code>settings: {
  summaryModel, summaryPrompt
  transcriptionPrompt, transcriptionGlossary[]
  transcriptionModelLanguages: Record<model, lang>
  imageGenerationSettings: {...}
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/llm-models
PATCH /api/me { settings: {...} }</code></pre>
    `,
  },
  'darstellung': {
    summary: `
      <h3>Darstellung</h3>
      <p>Passe das <strong>Aussehen</strong> der App an deine Vorlieben an.</p>
      <ul>
        <li><strong>Theme:</strong> Dark oder Bright Mode</li>
        <li><strong>Autosave:</strong> Automatisches Speichern konfigurieren</li>
      </ul>
    `,
    instructions: `
      <h3>Darstellung anpassen</h3>
      <h4>Theme wechseln</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Darstellung → Theme</strong></li>
        <li>Wähle <strong>Dark</strong> oder <strong>Bright</strong></li>
        <li>Klicke auf <strong>"Übernehmen"</strong></li>
      </ol>
      <h4>Autosave konfigurieren</h4>
      <ol>
        <li>Aktiviere/Deaktiviere <strong>Autosave</strong></li>
        <li>Setze das <strong>Intervall</strong> (in Sekunden)</li>
        <li>Standard: 5 Sekunden</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Theme-Implementierung</h4>
      <p>Theme wird in Cookie und User-Settings gespeichert. CSS-Klassen <code>dark</code> / <code>bright</code> auf <code>&lt;html&gt;</code>.</p>
      <h4>Autosave</h4>
      <p>Debounced Save mit konfigurierbarem Intervall. Speicherung bei Inaktivität oder Seitenwechsel.</p>
    `,
  },
  'teilen': {
    summary: `
      <h3>Teilen</h3>
      <p>Teile <strong>Einträge mit anderen Benutzern</strong>.</p>
      <ul>
        <li><strong>Freigabe:</strong> Bestimmte Einträge für andere freigeben</li>
        <li><strong>Standardeinstellungen:</strong> Wer kann standardmässig sehen?</li>
      </ul>
    `,
    instructions: `
      <h3>Teilen konfigurieren</h3>
      <h4>Standardeinstellungen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Profil → Einträge teilen</strong></li>
        <li>Wähle, wer standardmässig deine Einträge sehen kann</li>
        <li>Speichere die Einstellungen</li>
      </ol>
      <h4>Einzelne Einträge teilen</h4>
      <p>Bei jedem Eintrag kannst du die Freigabe individuell anpassen.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Sharing-Modell</h4>
      <pre><code>EntrySharing {
  entryId, sharedWithUserId
  permissions: 'READ' | 'WRITE'
}</code></pre>
      <h4>Default-Settings</h4>
      <p>In User-Settings: <code>sharingDefaults</code></p>
    `,
  },
  'eigene-daten': {
    summary: `
      <h3>Eigene Daten</h3>
      <p>Erstelle und verwalte <strong>eigene Symptome, Gewohnheiten und Links</strong>.</p>
      <ul>
        <li><strong>Eigene Symptome:</strong> Zusätzliche Symptome tracken</li>
        <li><strong>Eigene Gewohnheiten:</strong> Persönliche Habits definieren</li>
        <li><strong>Eigene Links:</strong> Wichtige URLs speichern</li>
        <li><strong>Icons:</strong> Emoji oder Material-Symbole zuweisen</li>
      </ul>
    `,
    instructions: `
      <h3>Eigene Daten verwalten</h3>
      <h4>Eigene Symptome</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Erfassung → Eigene Symptome</strong></li>
        <li>Gib einen Titel ein</li>
        <li>Optional: Wähle ein Icon (Emoji oder z.B. <code>mood</code>)</li>
        <li>Klicke auf <strong>"Hinzufügen"</strong></li>
      </ol>
      <h4>Eigene Gewohnheiten</h4>
      <ol>
        <li>Scrolle zu <strong>"Gewohnheiten"</strong></li>
        <li>Gib Titel und optional Icon ein</li>
        <li>Klicke auf <strong>"Hinzufügen"</strong></li>
      </ol>
      <h4>Eigene Links</h4>
      <ol>
        <li>Scrolle zu <strong>"Links"</strong></li>
        <li>Gib Name und URL ein</li>
        <li>Klicke auf <strong>"Hinzufügen"</strong></li>
      </ol>
      <h4>Icons</h4>
      <ul>
        <li><strong>Emoji:</strong> Direkt eingeben, z.B. 😊</li>
        <li><strong>Material-Symbole:</strong> Namen eingeben, z.B. <code>fitness_center</code></li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodelle</h4>
      <pre><code>UserSymptom { id, userId, title, icon? }
Habit { id, userId, title, icon?, isActive }
UserLink { id, userId, name, url }</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/user-symptoms
GET/POST /api/habits
GET/POST /api/links
PATCH/DELETE für jeweilige [id]</code></pre>
      <h4>Icon-Rendering</h4>
      <p>Icons werden mit <code>TablerIcon</code> oder direkt als Emoji gerendert. Detection via Regex für Emoji-Range.</p>
    `,
  },
}

export const einstellungenOverview = `
  <p>In den <strong>Einstellungen</strong> passt du CompACT Diary an deine Bedürfnisse an.</p>
  <p>Konfiguriere dein Profil, Sicherheit, KI-Optionen und vieles mehr.</p>
`
