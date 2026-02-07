/**
 * Help System Structure
 * Defines all categories and topics for the help system.
 */

import type { HelpCategory, HelpTopic } from './types'

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    slug: 'erste-schritte',
    title: 'Erste Schritte',
    description: 'Einführung in CompACT Diary, Installation und Grundkonzepte',
    icon: 'rocket_launch',
    topics: [
      {
        id: 'introduction',
        slug: 'einfuehrung',
        title: 'Einführung',
        description: 'Was ist CompACT Diary und wofür ist es gedacht?',
        icon: 'info',
        keywords: ['einführung', 'überblick', 'was ist', 'anfang', 'start']
      },
      {
        id: 'installation',
        slug: 'installation',
        title: 'Installation',
        description: 'App auf dem Gerät installieren (PWA)',
        icon: 'download',
        keywords: ['installieren', 'pwa', 'homescreen', 'app', 'desktop']
      },
      {
        id: 'navigation',
        slug: 'navigation',
        title: 'Navigation & Aufbau',
        description: 'Wie die App aufgebaut ist und wie du navigierst',
        icon: 'menu',
        keywords: ['menü', 'navigation', 'aufbau', 'struktur', 'bedienung']
      },
      {
        id: 'quickstart',
        slug: 'schnellstart',
        title: 'Schnellstart',
        description: 'In 5 Minuten zum ersten Eintrag',
        icon: 'bolt',
        keywords: ['schnell', 'erster eintrag', 'anfangen', 'tutorial']
      }
    ]
  },
  {
    id: 'journal',
    slug: 'tagebuch',
    title: 'Tagebuch & Reflexion',
    description: 'Tägliche Einträge, Notizen, Medien und Reflexionen',
    icon: 'book',
    topics: [
      {
        id: 'daily-entries',
        slug: 'tageseintraege',
        title: 'Tageseinträge',
        description: 'Tägliche Einträge mit Text, Symptomen und Gewohnheiten',
        icon: 'edit_note',
        keywords: ['eintrag', 'tag', 'notiz', 'symptom', 'gewohnheit']
      },
      {
        id: 'journal-view',
        slug: 'journal-ansicht',
        title: 'Journal-Ansicht',
        description: 'Einträge mit Aufgaben, OCR-Quellen, Sharing und Zeitstempeln',
        icon: 'book',
        keywords: ['journal', 'aufgabe', 'task', 'teilen', 'ocr', 'zeitstempel', 'panel', 'ai-einstellungen', 'template']
      },
      {
        id: 'reflections',
        slug: 'reflexionen',
        title: 'Reflexionen',
        description: 'Wochen- und Monatsreflexionen erstellen',
        icon: 'psychology',
        keywords: ['reflexion', 'woche', 'monat', 'rückblick', 'dankbarkeit']
      },
      {
        id: 'media',
        slug: 'medien',
        title: 'Fotos & Medien',
        description: 'Bilder hinzufügen, Kamera nutzen, Galerie',
        icon: 'photo_camera',
        keywords: ['foto', 'bild', 'kamera', 'galerie', 'upload']
      },
      {
        id: 'voice-input',
        slug: 'spracheingabe',
        title: 'Spracheingabe',
        description: 'Texte per Mikrofon diktieren',
        icon: 'mic',
        keywords: ['mikrofon', 'sprache', 'diktieren', 'audio', 'transkription']
      },
      {
        id: 'day-summary',
        slug: 'tageszusammenfassung',
        title: 'Tageszusammenfassung',
        description: 'KI-generierte Zusammenfassung des Tages',
        icon: 'summarize',
        keywords: ['zusammenfassung', 'ki', 'ai', 'summary', 'überblick']
      }
    ]
  },
  {
    id: 'analytics',
    slug: 'auswertungen',
    title: 'Auswertungen',
    description: 'Statistiken, Trends und Datenexport',
    icon: 'bar_chart',
    topics: [
      {
        id: 'weekly-view',
        slug: 'wochenansicht',
        title: 'Wochenansicht',
        description: 'Trends und Statistiken der aktuellen Woche',
        icon: 'date_range',
        keywords: ['woche', 'trend', 'statistik', 'verlauf', 'chart']
      },
      {
        id: 'phase-view',
        slug: 'phasenansicht',
        title: 'Phasenansicht',
        description: 'Auswertungen nach Phasen (historisch: Darmkur)',
        icon: 'timeline',
        keywords: ['phase', 'darmkur', 'durchschnitt', 'vergleich']
      },
      {
        id: 'overall-view',
        slug: 'gesamtansicht',
        title: 'Gesamtansicht',
        description: 'Langfristige Entwicklung über alle Einträge',
        icon: 'trending_up',
        keywords: ['gesamt', 'langfristig', 'entwicklung', 'alle']
      },
      {
        id: 'export',
        slug: 'export',
        title: 'Datenexport',
        description: 'Daten als CSV oder PDF exportieren',
        icon: 'download',
        keywords: ['export', 'csv', 'pdf', 'download', 'backup']
      }
    ]
  },
  {
    id: 'act',
    slug: 'act-entwicklung',
    title: 'ACT & Entwicklung',
    description: 'ACT-Coach, Werte, Ziele und Gewohnheiten',
    icon: 'self_improvement',
    topics: [
      {
        id: 'coach',
        slug: 'coach',
        title: 'ACT Coach',
        description: 'KI-gestütztes Coaching mit verschiedenen Methoden',
        icon: 'psychology_alt',
        keywords: ['coach', 'ki', 'chat', 'coaching', 'act', 'therapie']
      },
      {
        id: 'values',
        slug: 'werte',
        title: 'Werte',
        description: 'Persönliche Werte definieren und verfolgen',
        icon: 'favorite',
        keywords: ['wert', 'werte', 'values', 'persönlich', 'wichtig']
      },
      {
        id: 'goals',
        slug: 'ziele',
        title: 'Ziele',
        description: 'Ziele setzen und Fortschritte verfolgen',
        icon: 'target',
        keywords: ['ziel', 'goal', 'fortschritt', 'erreichen']
      },
      {
        id: 'habits',
        slug: 'gewohnheiten',
        title: 'Gewohnheiten',
        description: 'Gewohnheiten tracken und aufbauen',
        icon: 'repeat',
        keywords: ['gewohnheit', 'habit', 'routine', 'täglich', 'tracker']
      }
    ]
  },
  {
    id: 'people-places',
    slug: 'personen-orte',
    title: 'Personen & Orte',
    description: 'Kontakte verwalten, Orte erfassen, Interaktionen dokumentieren',
    icon: 'contacts',
    topics: [
      {
        id: 'contacts',
        slug: 'kontakte',
        title: 'Kontakte (PRM)',
        description: 'Persönliches Beziehungsmanagement',
        icon: 'person',
        keywords: ['kontakt', 'person', 'beziehung', 'prm', 'freund']
      },
      {
        id: 'locations',
        slug: 'orte',
        title: 'Orte',
        description: 'Orte verwalten, auf Karte anzeigen',
        icon: 'place',
        keywords: ['ort', 'location', 'karte', 'map', 'poi']
      },
      {
        id: 'interactions',
        slug: 'interaktionen',
        title: 'Interaktionen',
        description: 'Begegnungen und Gespräche dokumentieren',
        icon: 'handshake',
        keywords: ['interaktion', 'treffen', 'gespräch', 'begegnung']
      },
      {
        id: 'google-sync',
        slug: 'google-sync',
        title: 'Google Sync',
        description: 'Kontakte mit Google synchronisieren',
        icon: 'sync',
        keywords: ['google', 'sync', 'synchronisation', 'import']
      }
    ]
  },
  {
    id: 'tasks',
    slug: 'aufgaben',
    title: 'Aufgaben & Organisation',
    description: 'Aufgaben verwalten, Lesezeichen, Organisation',
    icon: 'checklist',
    topics: [
      {
        id: 'task-management',
        slug: 'aufgabenverwaltung',
        title: 'Aufgabenverwaltung',
        description: 'Aufgaben erstellen, priorisieren und erledigen',
        icon: 'task_alt',
        keywords: ['aufgabe', 'task', 'todo', 'erledigen', 'priorität']
      },
      {
        id: 'task-types',
        slug: 'aufgabentypen',
        title: 'Aufgabentypen',
        description: 'Verschiedene Typen: Sofort, Reflexion, Follow-up, etc.',
        icon: 'category',
        keywords: ['typ', 'kategorie', 'sofort', 'reflexion', 'follow-up']
      },
      {
        id: 'bookmarks',
        slug: 'lesezeichen',
        title: 'Lesezeichen',
        description: 'Links und URLs speichern',
        icon: 'bookmark',
        keywords: ['lesezeichen', 'bookmark', 'link', 'url', 'speichern']
      }
    ]
  },
  {
    id: 'ai-features',
    slug: 'ki-features',
    title: 'KI-Features',
    description: 'Bildgenerierung, Transkription, OCR und mehr',
    icon: 'smart_toy',
    topics: [
      {
        id: 'image-generation',
        slug: 'bildgenerierung',
        title: 'Bildgenerierung',
        description: 'KI-generierte Bilder für Tage und Einträge',
        icon: 'auto_awesome',
        keywords: ['bild', 'generieren', 'ki', 'ai', 'kunst', 'dalle']
      },
      {
        id: 'transcription',
        slug: 'transkription',
        title: 'Transkription',
        description: 'Sprache zu Text umwandeln',
        icon: 'record_voice_over',
        keywords: ['transkription', 'sprache', 'text', 'whisper', 'deepgram']
      },
      {
        id: 'ocr',
        slug: 'texterkennung',
        title: 'Texterkennung (OCR)',
        description: 'Text aus Bildern und PDFs extrahieren',
        icon: 'document_scanner',
        keywords: ['ocr', 'text', 'erkennung', 'bild', 'pdf', 'scan']
      },
      {
        id: 'text-improvement',
        slug: 'textverbesserung',
        title: 'Textverbesserung',
        description: 'Texte mit KI verbessern und umformulieren',
        icon: 'edit',
        keywords: ['verbessern', 'umformulieren', 'ki', 'text', 'korrektur']
      }
    ]
  },
  {
    id: 'data-sync',
    slug: 'daten-sync',
    title: 'Daten & Synchronisation',
    description: 'Location Tracking, Kalender-Sync, Batch-Verarbeitung',
    icon: 'cloud_sync',
    topics: [
      {
        id: 'location-tracking',
        slug: 'standortverfolgung',
        title: 'Standortverfolgung',
        description: 'GPS-Punkte erfassen mit OwnTracks oder Tasker',
        icon: 'my_location',
        keywords: ['gps', 'standort', 'tracking', 'owntracks', 'tasker']
      },
      {
        id: 'calendar-sync',
        slug: 'kalender-sync',
        title: 'Kalender-Synchronisation',
        description: 'Termine aus externen Kalendern importieren',
        icon: 'event',
        keywords: ['kalender', 'termin', 'sync', 'import', 'webhook']
      },
      {
        id: 'batch-operations',
        slug: 'batch-verarbeitung',
        title: 'Batch-Verarbeitung',
        description: 'Geocoding und Massenoperationen',
        icon: 'pending_actions',
        keywords: ['batch', 'geocoding', 'masse', 'verarbeitung']
      },
      {
        id: 'data-import',
        slug: 'datenimport',
        title: 'Datenimport',
        description: 'Daten aus anderen Apps importieren',
        icon: 'upload_file',
        keywords: ['import', 'diarium', 'migration', 'daten']
      }
    ]
  },
  {
    id: 'settings',
    slug: 'einstellungen',
    title: 'Einstellungen',
    description: 'Profil, Sicherheit, KI-Konfiguration und mehr',
    icon: 'settings',
    topics: [
      {
        id: 'profile',
        slug: 'profil',
        title: 'Profil & Konto',
        description: 'Benutzername, Anzeigename, Profilbild',
        icon: 'account_circle',
        keywords: ['profil', 'konto', 'benutzer', 'name', 'avatar']
      },
      {
        id: 'security',
        slug: 'sicherheit',
        title: 'Sicherheit',
        description: 'Passcode-Schutz und Datensicherheit',
        icon: 'lock',
        keywords: ['sicherheit', 'passcode', 'pin', 'schutz', 'privat']
      },
      {
        id: 'ai-config',
        slug: 'ki-konfiguration',
        title: 'KI-Konfiguration',
        description: 'Modelle, Prompts und KI-Einstellungen',
        icon: 'tune',
        keywords: ['ki', 'modell', 'prompt', 'einstellung', 'llm']
      },
      {
        id: 'appearance',
        slug: 'darstellung',
        title: 'Darstellung',
        description: 'Theme, Schriftgrösse, Anzeige',
        icon: 'palette',
        keywords: ['theme', 'dark', 'hell', 'dunkel', 'anzeige']
      },
      {
        id: 'sharing',
        slug: 'teilen',
        title: 'Teilen',
        description: 'Einträge mit anderen teilen',
        icon: 'share',
        keywords: ['teilen', 'share', 'freigabe', 'öffentlich']
      },
      {
        id: 'custom-data',
        slug: 'eigene-daten',
        title: 'Eigene Daten',
        description: 'Eigene Symptome, Gewohnheiten und Links',
        icon: 'add_circle',
        keywords: ['eigen', 'custom', 'symptom', 'gewohnheit', 'link']
      },
      {
        id: 'templates',
        slug: 'templates',
        title: 'Journal-Templates',
        description: 'Vorlagen für strukturierte Tagebucheinträge',
        icon: 'template',
        keywords: ['template', 'vorlage', 'felder', 'struktur', 'formular']
      }
    ]
  },
  {
    id: 'templates',
    slug: 'templates',
    title: 'Journal-Templates',
    description: 'Vorlagen für strukturierte Journal-Einträge mit benutzerdefinierten Feldern',
    icon: 'template',
    topics: [
      {
        id: 'templates-overview',
        slug: 'uebersicht',
        title: 'Übersicht',
        description: 'Was sind Templates und wie funktionieren sie?',
        icon: 'info',
        keywords: ['template', 'vorlage', 'übersicht', 'einführung']
      },
      {
        id: 'create-template',
        slug: 'erstellen',
        title: 'Template erstellen',
        description: 'Eigene Templates mit Feldern definieren',
        icon: 'add',
        keywords: ['erstellen', 'neu', 'anlegen', 'felder', 'definieren']
      },
      {
        id: 'use-template',
        slug: 'verwenden',
        title: 'Templates verwenden',
        description: 'Einträge mit Templates erstellen',
        icon: 'edit',
        keywords: ['verwenden', 'nutzen', 'eintrag', 'erstellen']
      },
      {
        id: 'ai-config',
        slug: 'ki-konfiguration',
        title: 'KI-Konfiguration',
        description: 'KI-Modelle und Prompts für Templates anpassen',
        icon: 'brain',
        keywords: ['ki', 'ai', 'modell', 'prompt', 'konfiguration']
      },
      {
        id: 'system-templates',
        slug: 'system-templates',
        title: 'System-Templates',
        description: 'Vorgefertigte Templates anpassen',
        icon: 'settings',
        keywords: ['system', 'vorgefertigt', 'standard', 'anpassen']
      }
    ]
  }
]

/**
 * Find a category by slug
 */
export function findCategory(slug: string): HelpCategory | undefined {
  return helpCategories.find(c => c.slug === slug)
}

/**
 * Find a topic within a category
 */
export function findTopic(categorySlug: string, topicSlug: string): HelpTopic | undefined {
  const category = findCategory(categorySlug)
  return category?.topics.find(t => t.slug === topicSlug)
}

/**
 * Get all topics across all categories
 */
export function getAllTopics(): Array<{ category: HelpCategory; topic: HelpTopic }> {
  return helpCategories.flatMap(category => 
    category.topics.map(topic => ({ category, topic }))
  )
}

/**
 * Search topics by keyword
 */
export function searchTopics(query: string): Array<{ category: HelpCategory; topic: HelpTopic; score: number }> {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return []

  const results: Array<{ category: HelpCategory; topic: HelpTopic; score: number }> = []

  for (const category of helpCategories) {
    for (const topic of category.topics) {
      let score = 0

      // Check title match
      if (topic.title.toLowerCase().includes(normalizedQuery)) {
        score += 10
      }

      // Check description match
      if (topic.description.toLowerCase().includes(normalizedQuery)) {
        score += 5
      }

      // Check keywords match
      for (const keyword of topic.keywords) {
        if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
          score += 3
        }
      }

      // Check category title match
      if (category.title.toLowerCase().includes(normalizedQuery)) {
        score += 2
      }

      if (score > 0) {
        results.push({ category, topic, score })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
