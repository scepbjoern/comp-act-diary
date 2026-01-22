/**
 * Kategorie 1: Erste Schritte
 */
import type { TopicContent } from './index'

export const ersteSchritteContent: Record<string, TopicContent> = {
  'einfuehrung': {
    summary: `
      <h3>Was ist CompACT Diary?</h3>
      <p><strong>CompACT Diary</strong> ist eine mobile-first Progressive Web App (PWA) für persönliche Entwicklung, inspiriert von ACT (Acceptance and Commitment Therapy).</p>
      <ul>
        <li><strong>Tagebuch führen:</strong> Tägliche Einträge mit Text, Symptomen, Gewohnheiten und Medien</li>
        <li><strong>Reflektieren:</strong> Regelmässige Wochen- und Monatsreflexionen</li>
        <li><strong>Analysieren:</strong> Trends erkennen und Fortschritte sehen</li>
        <li><strong>Wachsen:</strong> Mit dem KI-Coach an deinen Werten und Zielen arbeiten</li>
      </ul>
      <p>Die App funktioniert auf allen Geräten – Smartphone, Tablet und Desktop – und kann als App installiert werden.</p>
    `,
    instructions: `
      <h3>So startest du mit CompACT Diary</h3>
      <ol>
        <li><strong>Registrierung/Login:</strong> Melde dich an oder erstelle ein neues Konto</li>
        <li><strong>Erster Tageseintrag:</strong> Gehe zur Startseite (Heute) und trage deine ersten Werte ein</li>
        <li><strong>Symptome bewerten:</strong> Bewerte dein Wohlbefinden, Energie, Stimmung etc. auf einer Skala von 1-10</li>
        <li><strong>Gewohnheiten abhaken:</strong> Markiere, welche Gewohnheiten du heute erfüllt hast</li>
        <li><strong>Notizen schreiben:</strong> Füge Bemerkungen zu deinem Tag hinzu</li>
      </ol>
      <h4>Wichtige Bereiche</h4>
      <ul>
        <li><strong>Startseite (/):</strong> Dein täglicher Eintrag</li>
        <li><strong>Reflexionen:</strong> Wochen- und Monatsrückblicke</li>
        <li><strong>Auswertungen:</strong> Statistiken und Trends</li>
        <li><strong>Coach:</strong> KI-gestütztes Coaching</li>
        <li><strong>Einstellungen:</strong> App anpassen</li>
      </ul>
    `,
    technical: `
      <h3>Technischer Hintergrund</h3>
      <h4>Technologie-Stack</h4>
      <ul>
        <li><strong>Frontend:</strong> Next.js 14 (App Router), React 18, TypeScript</li>
        <li><strong>Styling:</strong> Tailwind CSS, DaisyUI</li>
        <li><strong>Backend:</strong> Next.js API Routes</li>
        <li><strong>Datenbank:</strong> PostgreSQL mit Prisma ORM</li>
        <li><strong>PWA:</strong> Service Worker, Web Manifest</li>
      </ul>
      <h4>Architektur</h4>
      <p>CompACT Diary verwendet eine moderne Server-Client-Architektur mit Server Components und Client Components. Die Daten werden in einer PostgreSQL-Datenbank gespeichert und über REST-APIs abgerufen.</p>
    `,
  },
  'installation': {
    summary: `
      <h3>App installieren</h3>
      <p>CompACT Diary ist eine <strong>Progressive Web App (PWA)</strong>. Du kannst sie wie eine native App auf deinem Gerät installieren – ohne App Store.</p>
      <ul>
        <li><strong>Vorteile:</strong> Schneller Zugriff, Offline-Nutzung, App-Icon auf dem Homescreen</li>
        <li><strong>Kein Download:</strong> Die App läuft im Browser, verhält sich aber wie eine native App</li>
        <li><strong>Automatische Updates:</strong> Immer die neueste Version ohne manuelles Update</li>
      </ul>
    `,
    instructions: `
      <h3>Installationsanleitung</h3>
      <h4>Direkt in der App</h4>
      <p>Wenn dein Browser es unterstützt, erscheint im Menü der Punkt <strong>"App installieren"</strong>.</p>
      <h4>Android (Chrome)</h4>
      <ol>
        <li>Öffne die App in Chrome</li>
        <li>Tippe auf das Drei-Punkte-Menü (⋮) oben rechts</li>
        <li>Wähle <strong>"Zum Startbildschirm hinzufügen"</strong></li>
        <li>Bestätige die Installation</li>
      </ol>
      <h4>iPhone/iPad (Safari)</h4>
      <ol>
        <li>Öffne die App in Safari</li>
        <li>Tippe auf das Teilen-Symbol (□↑)</li>
        <li>Wähle <strong>"Zum Home-Bildschirm"</strong></li>
        <li>Tippe auf <strong>"Hinzufügen"</strong></li>
      </ol>
      <h4>Desktop (Chrome, Edge)</h4>
      <ol>
        <li>Öffne die App im Browser</li>
        <li>Klicke auf das Installations-Icon in der Adressleiste (⊕)</li>
      </ol>
    `,
    technical: `
      <h3>PWA-Technologie</h3>
      <h4>Service Worker</h4>
      <p>Die App verwendet einen Service Worker (<code>sw.js</code>), der:</p>
      <ul>
        <li>Statische Assets cached für schnelleres Laden</li>
        <li>Offline-Zugriff auf bereits geladene Seiten ermöglicht</li>
        <li>Push-Benachrichtigungen verarbeitet (falls aktiviert)</li>
      </ul>
      <h4>Web App Manifest</h4>
      <p>Die Datei <code>manifest.webmanifest</code> definiert App-Name, Icons, Theme-Farben und Display-Modus.</p>
      <h4>Browser-Kompatibilität</h4>
      <ul>
        <li>Chrome (Desktop & Android) – vollständig</li>
        <li>Edge (Desktop) – vollständig</li>
        <li>Safari (iOS 16.4+) – mit Einschränkungen</li>
        <li>Firefox – nur als "Zum Startbildschirm hinzufügen"</li>
      </ul>
    `,
  },
  'navigation': {
    summary: `
      <h3>Navigation verstehen</h3>
      <p>CompACT Diary ist logisch aufgebaut und lässt sich intuitiv bedienen.</p>
      <ul>
        <li><strong>Hauptmenü:</strong> Zugriff auf alle Hauptbereiche der App</li>
        <li><strong>Startseite:</strong> Der aktuelle Tag mit allen Eingabemöglichkeiten</li>
        <li><strong>Datumsnavigation:</strong> Zwischen Tagen wechseln</li>
        <li><strong>Schnellzugriff:</strong> Häufig genutzte Funktionen direkt erreichbar</li>
      </ul>
    `,
    instructions: `
      <h3>So navigierst du durch die App</h3>
      <h4>Hauptmenü</h4>
      <p>Das Hamburger-Menü (☰) oben links öffnet das Hauptmenü mit:</p>
      <ul>
        <li><strong>Heute:</strong> Tageseintrag</li>
        <li><strong>Kalender:</strong> Termine und Events</li>
        <li><strong>Reflexionen:</strong> Wochen-/Monatsreflexionen</li>
        <li><strong>Auswertungen:</strong> Statistiken</li>
        <li><strong>Coach:</strong> KI-Chat</li>
        <li><strong>Kontakte:</strong> PRM</li>
        <li><strong>Orte:</strong> Standortverwaltung</li>
        <li><strong>Aufgaben:</strong> Task-Management</li>
        <li><strong>Einstellungen:</strong> Konfiguration</li>
        <li><strong>Hilfe:</strong> Diese Dokumentation</li>
      </ul>
      <h4>Datumsnavigation</h4>
      <ul>
        <li>Mit Pfeilen (← →) zwischen Tagen wechseln</li>
        <li>Auf das Datum tippen für Kalender</li>
        <li>Wischen (links/rechts) für schnellen Tageswechsel</li>
      </ul>
    `,
    technical: `
      <h3>Routing & Navigation</h3>
      <h4>Next.js App Router</h4>
      <p>Hauptrouten:</p>
      <pre><code>/              → Startseite (Heute)
/calendar      → Kalenderansicht
/reflections   → Reflexionen
/analytics     → Auswertungen
/coach         → KI-Coach
/prm           → Kontaktverwaltung
/locations     → Ortsverwaltung
/tasks         → Aufgaben
/settings      → Einstellungen
/help          → Hilfe</code></pre>
      <h4>Dynamische Routen</h4>
      <ul>
        <li><code>/day/[date]</code> – Spezifischer Tag</li>
        <li><code>/prm/[slug]</code> – Kontaktdetails</li>
        <li><code>/locations/[slug]</code> – Ortsdetails</li>
      </ul>
    `,
  },
  'schnellstart': {
    summary: `
      <h3>In 5 Minuten zum ersten Eintrag</h3>
      <p>Dieser Schnellstart-Guide bringt dich in wenigen Minuten zu deinem ersten vollständigen Tageseintrag.</p>
      <ul>
        <li><strong>Ziel:</strong> Einen kompletten Tageseintrag erstellen</li>
        <li><strong>Dauer:</strong> Ca. 5 Minuten</li>
        <li><strong>Was du lernst:</strong> Die wichtigsten Eingabemöglichkeiten</li>
      </ul>
    `,
    instructions: `
      <h3>Schritt-für-Schritt zum ersten Eintrag</h3>
      <h4>Schritt 1: Zur Startseite</h4>
      <p>Nach dem Login landest du automatisch auf der Startseite mit dem heutigen Datum.</p>
      <h4>Schritt 2: Symptome bewerten</h4>
      <ol>
        <li>Scrolle zum Bereich <strong>"Symptome"</strong></li>
        <li>Tippe für jedes Symptom auf eine Zahl (1-10)</li>
        <li>1 = schlecht, 10 = sehr gut</li>
      </ol>
      <h4>Schritt 3: Gewohnheiten abhaken</h4>
      <ol>
        <li>Scrolle zu <strong>"Gewohnheiten"</strong></li>
        <li>Tippe auf jede erfüllte Gewohnheit</li>
      </ol>
      <h4>Schritt 4: Bemerkung hinzufügen</h4>
      <ol>
        <li>Scrolle zu <strong>"Bemerkungen"</strong></li>
        <li>Schreibe eine kurze Notiz zu deinem Tag</li>
        <li>Optional: Nutze das Mikrofon-Symbol für Spracheingabe</li>
      </ol>
      <h4>Schritt 5: Speichern</h4>
      <p>Änderungen werden automatisch gespeichert (Autosave).</p>
      <p><strong>Geschafft! 🎉</strong></p>
    `,
    technical: `
      <h3>Technischer Ablauf</h3>
      <h4>Datenspeicherung</h4>
      <ol>
        <li>Symptomwerte werden als <code>Measurement</code>-Einträge gespeichert</li>
        <li>Gewohnheiten werden als <code>HabitEntry</code>-Einträge verknüpft</li>
        <li>Bemerkungen werden als <code>JournalEntry</code> gespeichert</li>
      </ol>
      <h4>API-Endpunkte</h4>
      <pre><code>POST /api/day/[date]/symptoms  → Symptome speichern
POST /api/day/[date]/habits    → Gewohnheiten speichern
POST /api/notes                → Notiz erstellen</code></pre>
      <h4>Autosave</h4>
      <p>Änderungen werden im lokalen State gehalten und nach konfigurierter Wartezeit (Standard: 5 Sek.) gespeichert.</p>
    `,
  },
}

export const ersteSchritteOverview = `
  <p>Willkommen bei <strong>CompACT Diary</strong>! Diese Hilfesektion führt dich durch die ersten Schritte mit der App.</p>
  <p>Du lernst hier, was CompACT Diary ist, wie du es installierst und wie du schnell mit deinen ersten Einträgen starten kannst.</p>
`
