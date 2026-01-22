/**
 * Kategorie 4: ACT & Entwicklung
 */
import type { TopicContent } from './index'

export const actEntwicklungContent: Record<string, TopicContent> = {
  'coach': {
    summary: `
      <h3>ACT Coach</h3>
      <p>Der <strong>ACT Coach</strong> ist ein KI-gestützter Chat für persönliche Entwicklung.</p>
      <ul>
        <li><strong>Chat-Methoden:</strong> Verschiedene System-Prompts für unterschiedliche Coaching-Stile</li>
        <li><strong>Modellauswahl:</strong> Wähle das KI-Modell für deine Gespräche</li>
        <li><strong>Tagebuch-Kontext:</strong> Lade deine Einträge als Kontext in den Chat</li>
      </ul>
    `,
    instructions: `
      <h3>ACT Coach nutzen</h3>
      <ol>
        <li>Gehe zu <strong>Coach</strong> im Menü</li>
        <li>Wähle eine <strong>Chat-Methode</strong> aus dem Dropdown</li>
        <li>Optional: Wähle ein anderes <strong>KI-Modell</strong></li>
        <li>Schreibe deine Nachricht oder nutze 🎤 für Spracheingabe</li>
        <li>Klicke auf Senden</li>
      </ol>
      <h4>Chat-Methoden verwalten</h4>
      <ol>
        <li>Klicke auf das ⚙️-Symbol</li>
        <li>Erstelle neue Methoden mit Name und System-Prompt</li>
        <li>Bearbeite oder lösche bestehende Methoden</li>
      </ol>
      <h4>Tagebuch-Kontext laden</h4>
      <p>Klicke auf das 📖-Symbol, um deine Tagebucheinträge als Kontext hinzuzufügen.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>ChatMethod {
  id, userId, name, systemPrompt
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/coach/methods
PATCH/DELETE /api/coach/methods/[id]
POST /api/coach/chat → Streaming Chat</code></pre>
      <h4>LLM-Integration</h4>
      <p>Vercel AI SDK v5 mit Together.ai oder OpenAI als Provider. Streaming-Responses für flüssige Konversation.</p>
    `,
  },
  'werte': {
    summary: `
      <h3>Werte</h3>
      <div class="alert alert-warning mb-4">
        <strong>🚧 In Entwicklung:</strong> Diese Funktion wird in einer zukünftigen Version verfügbar sein.
      </div>
      <p><strong>Werte</strong> sind das, was dir im Leben wichtig ist – dein innerer Kompass.</p>
      <ul>
        <li><strong>ACT-Konzept:</strong> Werte sind Richtungen, keine Ziele</li>
        <li><strong>Dokumentieren:</strong> Halte deine persönlichen Werte fest</li>
        <li><strong>Reflektieren:</strong> Überprüfe, ob dein Handeln deinen Werten entspricht</li>
      </ul>
    `,
    instructions: `
      <h3>Geplante Funktionen</h3>
      <div class="alert alert-info mb-4">
        Die Werte-Verwaltung ist im Datenmodell vorbereitet, aber die Benutzeroberfläche wird noch entwickelt.
      </div>
      <h4>Geplante Features</h4>
      <ul>
        <li>Werte-Übersichtsseite</li>
        <li>Werte erstellen und bearbeiten</li>
        <li>Verknüpfung mit Zielen und Reflexionen</li>
      </ul>
      <h4>Beispiele für Werte</h4>
      <ul>
        <li>Familie & Beziehungen</li>
        <li>Gesundheit & Wohlbefinden</li>
        <li>Persönliches Wachstum</li>
        <li>Kreativität</li>
        <li>Ehrlichkeit</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell (vorbereitet)</h4>
      <pre><code>ActValue {
  id, userId, slug, title, description?
}</code></pre>
      <h4>Status</h4>
      <p>Das Datenmodell ist im Prisma-Schema definiert. UI und API werden noch implementiert.</p>
    `,
  },
  'ziele': {
    summary: `
      <h3>Ziele</h3>
      <div class="alert alert-warning mb-4">
        <strong>🚧 In Entwicklung:</strong> Diese Funktion wird in einer zukünftigen Version verfügbar sein.
      </div>
      <p><strong>Ziele</strong> sind konkrete Ergebnisse, die du erreichen möchtest – im Einklang mit deinen Werten.</p>
      <ul>
        <li><strong>Werte-basiert:</strong> Ziele sollten aus deinen Werten abgeleitet sein</li>
        <li><strong>Messbar:</strong> Definiere klare Erfolgskriterien</li>
        <li><strong>Zeitgebunden:</strong> Setze ein Zieldatum</li>
      </ul>
    `,
    instructions: `
      <h3>Geplante Funktionen</h3>
      <div class="alert alert-info mb-4">
        Die Ziele-Verwaltung ist im Datenmodell vorbereitet, aber die Benutzeroberfläche wird noch entwickelt.
      </div>
      <h4>Geplante Features</h4>
      <ul>
        <li>Ziele-Übersichtsseite</li>
        <li>Ziele erstellen, bearbeiten, abschliessen</li>
        <li>Fortschrittsanzeige</li>
        <li>Verknüpfung mit Werten</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell (vorbereitet)</h4>
      <pre><code>ActGoal {
  id, userId, slug, title, description?
  status?, targetDate?
}</code></pre>
      <h4>Status</h4>
      <p>Das Datenmodell ist im Prisma-Schema definiert. UI und API werden noch implementiert.</p>
    `,
  },
  'gewohnheiten': {
    summary: `
      <h3>Gewohnheiten</h3>
      <p><strong>Gewohnheiten</strong> sind regelmässige Handlungen, die du täglich oder häufig ausführen möchtest.</p>
      <ul>
        <li><strong>Tracking:</strong> Hake ab, was du heute getan hast</li>
        <li><strong>Eigene Gewohnheiten:</strong> Erstelle deine persönlichen Habits</li>
        <li><strong>Icons:</strong> Wähle Emojis oder Material-Symbole</li>
      </ul>
    `,
    instructions: `
      <h3>Gewohnheiten verwalten</h3>
      <h4>Tägliches Tracking</h4>
      <ol>
        <li>Gehe zur Startseite (Heute)</li>
        <li>Scrolle zu <strong>"Gewohnheiten"</strong></li>
        <li>Tippe auf jede erfüllte Gewohnheit</li>
      </ol>
      <h4>Eigene Gewohnheiten erstellen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → Erfassung</strong></li>
        <li>Scrolle zu <strong>"Gewohnheiten"</strong></li>
        <li>Gib einen Titel ein</li>
        <li>Optional: Wähle ein Icon (Emoji oder Material-Symbol)</li>
        <li>Klicke auf <strong>"Hinzufügen"</strong></li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Datenmodell</h4>
      <pre><code>Habit {
  id, userId?, title, icon?, isActive
}
HabitEntry {
  id, dayId, habitId, completed
}</code></pre>
      <h4>API-Endpunkte</h4>
      <pre><code>GET/POST /api/habits
PATCH/DELETE /api/habits/[id]
POST /api/day/[date]/habits</code></pre>
    `,
  },
}

export const actEntwicklungOverview = `
  <p><strong>ACT (Acceptance and Commitment Therapy)</strong> ist ein therapeutischer Ansatz, der dir hilft, ein werteorientiertes Leben zu führen.</p>
  <p>CompACT Diary unterstützt dich dabei mit dem KI-Coach, Werte- und Ziel-Tracking sowie Gewohnheitsmanagement.</p>
`
