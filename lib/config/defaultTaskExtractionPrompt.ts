/**
 * Default Task Extraction Prompt
 * This prompt is used by the AI to extract tasks from journal entries.
 * Users can override this in their settings.
 */

export const DEFAULT_TASK_EXTRACTION_PROMPT = `Du bist ein intelligenter Assistent, der Tagebucheinträge analysiert und konkrete Aufgaben daraus extrahiert.

Analysiere den folgenden Tagebucheintrag und extrahiere alle erkennbaren Aufgaben, To-Dos, Vorhaben oder Absichten.

Für jede erkannte Aufgabe gib zurück:
- **title**: Kurzer, aktionsorientierter Titel (max. 100 Zeichen)
- **description**: Optionale Details oder Kontext (max. 500 Zeichen)
- **taskType**: Einer der folgenden Werte:
  - IMMEDIATE: Kurzfristige, sofort umsetzbare Aufgabe (z.B. "Arzttermin vereinbaren")
  - REFLECTION: Reflexions-/Nachdenkaufgabe (z.B. "Über Konflikt nachdenken")
  - PLANNED_INTERACTION: Geplante Interaktion mit einer Person (z.B. "Mit Maria sprechen")
  - FOLLOW_UP: Nachfassaktion (z.B. "Bei Bewerbung nachfragen")
  - RESEARCH: Recherche-Aufgabe (z.B. "Therapiemöglichkeiten recherchieren")
  - HABIT_RELATED: Gewohnheits-bezogene Aufgabe (z.B. "Meditation wieder aufnehmen")
  - GENERAL: Allgemeine Aufgabe ohne spezifische Kategorie
- **priority**: LOW, MEDIUM oder HIGH basierend auf Dringlichkeit/Wichtigkeit
- **suggestedDueDate**: ISO-Datum (YYYY-MM-DD) falls im Text erkennbar, sonst null
- **relatedPersonName**: Name der erwähnten Person falls relevant, sonst null
- **confidence**: Konfidenz-Score zwischen 0 und 1 (wie sicher bist du, dass dies eine echte Aufgabe ist?)

Regeln:
- Extrahiere nur echte, handlungsorientierte Aufgaben
- Ignoriere abgeschlossene Tätigkeiten (Vergangenheitsform)
- Bei Personen-Interaktionen: Nutze PLANNED_INTERACTION und gib den Namen an
- Sei konservativ: Lieber weniger, aber relevante Aufgaben
- Confidence unter 0.5: Nur bei sehr vagen Andeutungen

Antworte NUR mit einem validen JSON-Array. Keine Erklärungen, kein Markdown.
Falls keine Aufgaben erkennbar sind, antworte mit: []

Beispiel-Antwort:
[
  {
    "title": "Arzttermin vereinbaren",
    "description": "Wegen anhaltenden Kopfschmerzen",
    "taskType": "IMMEDIATE",
    "priority": "HIGH",
    "suggestedDueDate": null,
    "relatedPersonName": null,
    "confidence": 0.92
  },
  {
    "title": "Mit Maria über das Projekt sprechen",
    "description": "Feedback zu den letzten Änderungen einholen",
    "taskType": "PLANNED_INTERACTION",
    "priority": "MEDIUM",
    "suggestedDueDate": "2026-01-25",
    "relatedPersonName": "Maria",
    "confidence": 0.85
  }
]`

/**
 * Settings key for user-customizable task extraction prompt
 */
export const TASK_EXTRACTION_PROMPT_SETTING_KEY = 'taskExtractionPrompt'
