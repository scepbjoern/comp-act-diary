# Planned Features

## Windsurf-related
**Skills und Workflows**: Sich einarbeiten in https://docs.windsurf.com/windsurf/cascade/skills und https://agentskills.io/home und https://docs.windsurf.com/windsurf/cascade/workflows und überlegen, wann skills und wann workflows
**Agents**: Sich einarbeiten in https://docs.windsurf.com/windsurf/cascade/agents-md

## MCP
**Playwright oder Puppeteer**: Könnte spannend sein.
**Supabase**: Aber nur für CAS
**Filesystem und Fetch**: Weniger für dieses Projekt, sondern um den Computer zu kontrollieren und Webseiten zu scrapen.
**PostgreSQL**: Spannend, damit selbständig Daten abgefragt werden können bei Fehlerdiagnose.


## Varia
**.env**: an .env.example anpassen, damit alle Beschreibungen enthalten sind. Zudem folgende Aussage prüfen: "MISTRAL_API_KEY und MAPBOX_ACCESS_TOKEN werden aktuell im Code nicht verwendet (Suche ergab keine Treffer)"

### Verlinkungen auf andere Ereignisse
**On This Day - Rediscover memories from previous years on the same date**: für jeden Tag, wenn man gerade in einem aktuellen Tag ist, immer in der Datenbank geschaut wird, ob es vom Vorjahr und vom Vormonat Tagebucheinträge gibt von diesem einen Tag. Und falls ja, wird dieser Eintrag, aber auch diejenigen der Vorjahre, immer kurz angezeigt, so das Wichtigste zusammengefasst. Dies soll erlauben, dass man mit der Zeit ein bisschen das Bewusstsein schärft, so im Sinne von Carpe Diem, dass man sieht auch, dass vor einem Jahr vielleicht es besser war oder auch schlechter war. Und beides kann ja ermuntern und zur Reflexion beitragen. -> Bei journiv entspricht dies: "On This Day — Rediscover memories from previous years on the same date"

**Date Range Filtering**: "Find entries from specific time periods with ease" aus https://journiv.com/docs

### Bisherige Daten importieren
**Monika**: Die App Monika macht keinen Sinn mehr, wenn ich meine neue eigene App habe. Daher die wichtigsten Dinge daraus auch in meiner App implementieren und auch die Einträge exportieren und sichern.

**Location-Import**: von C:\Users\bjoer\SynologyDrive\Bjoern\Mapping and GPS and Geotagging\ExcelGIS

### Export
**Druckbare PDFs**: Als PDF zwecks Reisetagebüchern

**JSON-Export**: Für Backup/Migration

### Reisetagebuch:
**Inspiration**:
    - https://www.journiapp.com/blog
    - https://findpenguins.com/
    - https://www.polarsteps.com/de/

## Offene Punkte aus Datenmodell
Im Datenmodell sind ja viele Teile wie zum Beispiel die ACT-Unterstützung schon angelegt => hier weiter fahren, daraus Features ableiten und implementieren


## Sicherheit & Datenschutz
**Verschlüsselung**: Zwischenfazit aus https://chatgpt.com/c/693c6f9b-1bb4-8325-a73c-688e9864e2f8:
- Hetzner nicht notwendig
- Zukünftig aber einen Share so haben, dass er nicht automatisch entschlüsselt, wenn NAS hochfährt, sondern dass ich via VPN auf Synology Admin zugreife und den Key von Hand eingebe
- Sinngemäss dasselbe gilt für Proxmox, aber dort ist mir noch nicht ganz klar, wie ich die Verschlüsselung eines Laufwerks mache

## Kategorien, Tags, Moods, usw.
**Tag-System**: Aus https://journiv.com/docs inspirieren lassen für "Tag System — Tag entries with many-to-many relationships for flexible organization"

**Mood-System**: Aus https://journiv.com/docs inspirieren lassen für "Intuitive Mood Logging — Track your emotional journey with timestamps and notes" und "Mood Analytics — Beautiful visualizations of your mood patterns over time". Und **Color Themes**: bei mindsera.com für das ganze Tagebuch, bei mir wäre es aber spannender als Teil der einzelnen Einträge basierend auf der KI-Einschätzung zu Mood

**Prompt-Typen**: Aus https://journiv.com/docs inspirieren lassen für "Daily Prompts — Get thoughtful writing prompts to inspire reflection and self-discovery", "Prompt Categories — Filter prompts by category, difficulty, and theme". Sowie Prompts Guide Library von https://www.reflection.app/journal-prompts-guides-library. Und auch von reflection.app inspirieren lassen für "Questions to Go Deeper: Get personalized questions to help you go deeper while writing." sowie **Journaling templates based on mental models & frameworks**: Ikigai, Energy Audit, Anti-Goals, Regret Minimization, ... aus https://www.mindsera.com/

## Coach-Features / Psychologische Analysen
**Identify Patterns**: Learn from the patterns in the experiences that bring you joy and those that challenge you. -> https://www.reflection.app

**Von Coach-Gespräch zu Tagebucheintrag**: Im Coach-Mode Tagebuch schreiben/sagen, dann gleich in Dialog kommen mit AI und das Gesamtergebnis als Tagebucheintrag abspeichern mit komplettem Transkript, Zusammenfassung und Analyse. Inspiriert aus https://www.mindsera.com/

**Emotional Analysis**: See the emotions detected in your writing and explore the related thoughts within any timeframe aus https://www.mindsera.com/

**Recurring Topics**: See the themes and topics you think about most and dive into the details behind each one. aus https://www.mindsera.com/

**Personality**: Based on the Big Five Personality Model, Mindsera provides insights into your personality over time. aus https://www.mindsera.com/

**Suggestions**: Get tailored improvement tips, customized to your unique journey. aus https://www.mindsera.com/



## Weitere Inspiration
- https://journey.cloud/
    - Wow, sieht ziemlich umfassend aus, genauer anschauen
- https://www.rosebud.app/
    - Ohne auszutesten, nicht beurteilbar