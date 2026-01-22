/**
 * Kategorie 7: KI-Features
 */
import type { TopicContent } from './index'

export const kiFeaturesContent: Record<string, TopicContent> = {
  'bildgenerierung': {
    summary: `
      <h3>Bildgenerierung</h3>
      <p>Generiere <strong>KI-Bilder</strong> für deine Tage und Einträge.</p>
      <ul>
        <li><strong>Tagesbilder:</strong> Visuelle Darstellung deines Tages</li>
        <li><strong>Prompt-basiert:</strong> Automatisch aus deinen Einträgen generiert</li>
        <li><strong>Anpassbar:</strong> Modell und Stil konfigurierbar</li>
      </ul>
    `,
    instructions: `
      <h3>Bilder generieren</h3>
      <h4>Tagesbild erstellen</h4>
      <ol>
        <li>Gehe zur Tagesansicht (Startseite)</li>
        <li>Scrolle zu <strong>"Generierte Bilder"</strong></li>
        <li>Klicke auf <strong>"Bild generieren"</strong></li>
        <li>Warte, bis das Bild erstellt ist</li>
      </ol>
      <h4>Einstellungen anpassen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → KI → Bildgenerierung</strong></li>
        <li>Wähle das Modell (z.B. DALL-E 3, Flux)</li>
        <li>Passe den Stil-Prompt an</li>
        <li>Speichere die Einstellungen</li>
      </ol>
      <h4>Bild löschen</h4>
      <p>Klicke auf das Papierkorb-Symbol beim Bild.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Unterstützte Modelle</h4>
      <ul>
        <li><strong>DALL-E 3:</strong> OpenAI, höchste Qualität</li>
        <li><strong>Flux Schnell:</strong> Together.ai, schnell und günstig</li>
        <li><strong>Flux Pro:</strong> Together.ai, bessere Qualität</li>
      </ul>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/generated-images
GET /api/generated-images?dayId=...
DELETE /api/generated-images/[id]</code></pre>
      <h4>Prompt-Generierung</h4>
      <p>Der Prompt wird aus Tageseinträgen und konfigurierbarem Stil-Prefix zusammengesetzt.</p>
    `,
  },
  'transkription': {
    summary: `
      <h3>Transkription</h3>
      <p>Wandle <strong>Sprache in Text</strong> um mit verschiedenen KI-Modellen.</p>
      <ul>
        <li><strong>Mehrere Modelle:</strong> Whisper, Deepgram, GPT-4o</li>
        <li><strong>Sprachen:</strong> Deutsch, Schweizerdeutsch und mehr</li>
        <li><strong>Audio-Chunking:</strong> Lange Aufnahmen automatisch aufteilen</li>
      </ul>
    `,
    instructions: `
      <h3>Transkription nutzen</h3>
      <h4>Spracheingabe</h4>
      <ol>
        <li>Tippe auf das 🎤-Symbol neben einem Textfeld</li>
        <li>Sprich deinen Text</li>
        <li>Tippe erneut zum Beenden</li>
      </ol>
      <h4>Modell auswählen</h4>
      <ol>
        <li>Tippe auf das ⚙️-Symbol neben dem Mikrofon</li>
        <li>Wähle ein Modell</li>
      </ol>
      <h4>Transkriptions-Einstellungen</h4>
      <ol>
        <li>Gehe zu <strong>Einstellungen → KI → Transkription</strong></li>
        <li>Konfiguriere Prompt und Glossar</li>
        <li>Setze Sprachen pro Modell</li>
      </ol>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Unterstützte Modelle</h4>
      <pre><code>- openai/whisper-large-v3 (Together.ai)
- deepgram/nova-3 (Deepgram)
- gpt-4o-transcribe (OpenAI)
- gpt-4o-mini-transcribe (OpenAI)
- whisper-1 (OpenAI)</code></pre>
      <h4>API-Endpunkt</h4>
      <pre><code>POST /api/transcribe
Content-Type: multipart/form-data
Body: { audio, model?, language? }</code></pre>
      <h4>Audio-Chunking</h4>
      <p>FFmpeg teilt lange Aufnahmen in Chunks auf. Voraussetzung: FFmpeg auf Server installiert.</p>
    `,
  },
  'texterkennung': {
    summary: `
      <h3>Texterkennung (OCR)</h3>
      <p>Extrahiere <strong>Text aus Bildern und PDFs</strong> mit KI.</p>
      <ul>
        <li><strong>Bilder:</strong> Fotos von Dokumenten, Screenshots</li>
        <li><strong>PDFs:</strong> Gescannte Dokumente</li>
        <li><strong>Handschrift:</strong> Auch handgeschriebener Text</li>
      </ul>
    `,
    instructions: `
      <h3>OCR nutzen</h3>
      <h4>Text aus Bild extrahieren</h4>
      <ol>
        <li>Lade ein Bild hoch</li>
        <li>Klicke auf <strong>"Text erkennen"</strong></li>
        <li>Der erkannte Text wird angezeigt</li>
        <li>Kopiere oder bearbeite den Text</li>
      </ol>
      <h4>Tipps für bessere Ergebnisse</h4>
      <ul>
        <li>Gute Beleuchtung beim Fotografieren</li>
        <li>Text sollte gerade ausgerichtet sein</li>
        <li>Hohe Auflösung bevorzugen</li>
      </ul>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>Technologie</h4>
      <p>Vision-Modelle (GPT-4V oder ähnlich) für OCR-Aufgaben.</p>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/ocr
Body: { image: base64 | url }
Response: { text: string }</code></pre>
      <h4>Unterstützte Formate</h4>
      <ul>
        <li>Bilder: JPEG, PNG, WebP, GIF</li>
        <li>PDFs: Einzelne Seiten werden extrahiert</li>
      </ul>
    `,
  },
  'textverbesserung': {
    summary: `
      <h3>Textverbesserung</h3>
      <p>Verbessere deine Texte mit <strong>KI-Unterstützung</strong>.</p>
      <ul>
        <li><strong>Rechtschreibung:</strong> Fehler korrigieren</li>
        <li><strong>Stil:</strong> Formulierungen verbessern</li>
        <li><strong>Struktur:</strong> Text besser organisieren</li>
      </ul>
    `,
    instructions: `
      <h3>Textverbesserung nutzen</h3>
      <ol>
        <li>Schreibe deinen Text in ein Feld</li>
        <li>Klicke auf das ✨-Symbol</li>
        <li>Warte auf die Verbesserung</li>
        <li>Der verbesserte Text ersetzt den Original-Text</li>
      </ol>
      <h4>Wo verfügbar?</h4>
      <ul>
        <li>Bemerkungen</li>
        <li>Reflexionsfelder</li>
        <li>Ernährungsnotizen</li>
      </ul>
      <h4>Hinweis</h4>
      <p>Der Original-Text wird überschrieben. Kopiere ihn vorher, wenn du ihn behalten möchtest.</p>
    `,
    technical: `
      <h3>Technische Details</h3>
      <h4>API-Endpunkt</h4>
      <pre><code>POST /api/journal-ai/generate-content
Body: { text: string, typeCode: 'diary' }
Response: { content: string }</code></pre>
      <h4>Prompt</h4>
      <p>Der Text wird mit einem System-Prompt an das LLM gesendet, der auf Verbesserung von Tagebucheinträgen optimiert ist.</p>
    `,
  },
}

export const kiFeaturesOverview = `
  <p>CompACT Diary nutzt <strong>Künstliche Intelligenz</strong> für verschiedene Funktionen, die dein Erlebnis verbessern.</p>
  <p>Von Bildgenerierung über Transkription bis hin zu Texterkennung – hier erfährst du alles über die KI-Features.</p>
`
