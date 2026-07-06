---
name: create-prd
description: >
  Creates a Product Requirements Document for one IT system or component, optionally using a Gesamtarchitektur document and architecture DSL as context. ONLY activate when the user explicitly runs /create-prd or directly requests this specific workflow by name. Do NOT activate during normal development, planning, or implementation conversations.
compatibility: Next.js 15, React 18, Prisma 6, PostgreSQL, Tailwind 3 + DaisyUI
metadata:
  piv-phase: plan
  version: "2.3"
disable-model-invocation: true
argument-hint: "[output-filename]"
---

> **KiloCode-Modus:** Dieser Skill muss im **Code-Modus** ausgeführt werden. Im Architect- oder Plan-Modus beschränkt KiloCode Schreibrechte auf `.kilo/`-Ordner – Dateien würden dort abgelegt statt in den korrekten Projektverzeichnissen (`docs/`). Wechsle in KiloCode vor der Ausführung auf den **Code-Modus**.

# Create PRD

Erstelle ein Product Requirements Document (PRD) für genau ein IT-System oder eine Komponente. Das PRD ist die fachliche Grundlage für spätere `plan-feature`-Schritte und ist noch kein Implementierungsplan auf Dateiebene.

## Grundregeln

- Führe den Nutzer schrittweise durch den PRD-Dialog.
- Stelle immer nur eine inhaltliche Frage auf einmal.
- Nutze eine vorhandene Gesamtarchitektur als Kontext, setze sie aber nie voraus.
- Wenn eine Gesamtarchitektur vorhanden ist und es dazu eine `architecture.dsl` gibt, fordere die DSL-Datei immer ebenfalls als Kontext an.
- Analysiere keine SVG-, PNG- oder Bildexporte inhaltlich. Verwende für Architekturdiagramm-Informationen die Markdown-Gesamtarchitektur und, falls vorhanden, die `architecture.dsl`.
- Markiere Annahmen klar, statt sie als bestätigte Fakten auszugeben.
- Schreibe das PRD auf Deutsch. Technische Begriffe wie API, Mock, Backend, Frontend, Authentication oder User Story dürfen Englisch bleiben.
- Unterscheide im PRD explizit zwischen MVP / Minimalversion, Medium-Version und Extended-/Luxus-Version.
- Beurteile den Gesamtumfang nicht eigenständig als zu gross oder zu klein. Dokumentiere die Ausbaustufen sauber; die Priorisierung entscheidet der Nutzer.
- Erzeuge das initiale PRD immer als Dokumentversion `v001`.
- Füge im initialen PRD eine Änderungshistorie mit einem Eintrag für `v001` an.
- Wenn der Nutzer einen Zielpfad ohne Versionssuffix nennt, ergänze `-v001` vor `.md`, z.B. aus `docs/project/prds/antragssystem.md` wird `docs/project/prds/antragssystem-v001.md`.
- Wenn der Zielpfad bereits ein Versionssuffix wie `-v001.md` enthält, verwende diesen Pfad unverändert.

## Datenschutz-Hinweis

Bevor Nutzer eine Gesamtarchitektur oder DSL-Datei als Kontext bereitstellen, weise kurz darauf hin:

> Gesamtarchitekturen können Unternehmensnamen, interne Systeme, Personenrollen oder vertrauliche Prozessdetails enthalten. Bitte anonymisiere die Unterlagen vor dem Einfügen oder Hochladen, wenn daraus ein reales Unternehmen, reale Personen oder sensible Informationen erkennbar sind.

## Brownfield und Greenfield

Kläre oder leite aus dem Kontext ab, ob das PRD für Brownfield- oder Greenfield-Entwicklung geschrieben wird.

- In diesem Repository ist standardmässig Brownfield anzunehmen: comp-act-diary existiert bereits, der technische Stack ist durch Projektregeln (`KILO_INSTRUCTIONS.md`, `docs/coding-guidelines/`) vorgegeben. Das PRD soll den Stack nicht neu entscheiden, sondern auf die bestehenden Vorgaben referenzieren.
- Bei Greenfield-Projekten muss das PRD den technischen Stack und die zentralen technischen Leitplanken selbst definieren.
- Im Brownfield-Kontext können vorhandene Komponenten ungenutzt bleiben, wenn sie für das konkrete Feature-Set nicht gebraucht werden. Sie sollen nicht nur deshalb gelöscht werden, weil das neue System sie nicht verwendet.

## Referenzen

- Verwende `references/prd-template.md` für Aufbau und Qualitätskriterien des PRD.
- Verwende `references/architecture-extraction.md`, wenn eine Gesamtarchitektur oder `architecture.dsl` vorliegt.

## Dialogablauf

### 1. Einstieg

Erkläre in 1-2 Sätzen, dass ein PRD für ein einzelnes IT-System oder eine einzelne Komponente erstellt wird. Frage danach zuerst, ob eine Gesamtarchitektur vorhanden ist.

Beispielfrage:

```text
Liegt eine Gesamtarchitektur-Dokumentation vor, die wir als Kontext für dieses PRD nutzen sollen?
```

### 2. Szenario A: Mit Gesamtarchitektur

Wenn der Nutzer eine Gesamtarchitektur nutzen will:

1. Gib den Datenschutz-Hinweis aus.
2. Bitte um den Pfad oder Inhalt der Gesamtarchitektur-Markdown-Datei.
3. Frage explizit nach der zugehörigen `architecture.dsl`, falls sie existiert.
4. Extrahiere Rollen, Systeme, Komponenten, Schnittstellen, Scope-Abgrenzung, Demo-Szenarien, Mocks, weggelassene Systeme, offene Fragen und Risiken gemäß `references/architecture-extraction.md`.
5. Fasse die extrahierten Informationen kompakt zusammen.
6. Lasse die Zusammenfassung bestätigen oder korrigieren.

Wenn mehrere Systeme oder Komponenten erkennbar sind, frage danach, für welches einzelne System oder welche einzelne Komponente das PRD erstellt werden soll. Biete die Kandidaten aus der Komponentenliste oder DSL an.

### 3. Szenario B: Ohne Gesamtarchitektur

Wenn keine Gesamtarchitektur vorhanden ist, überspringe die Architektur-Extraktion. Erfrage die fehlenden Kontextinformationen selbst, insbesondere:

- Name und Zweck des IT-Systems oder der Komponente
- Zielgruppen und Rollen
- wichtigste fachliche Vorgänge
- externe Systeme oder Schnittstellen
- Scope in Ausbaustufen: MVP / Minimalversion, Medium-Version, Extended-/Luxus-Version, Out of Scope
- technische Rahmenbedingungen, falls bekannt
- Brownfield- oder Greenfield-Kontext

### 4. Gezielte Rückfragen

Stelle nach der Kontextphase maximal 4-6 gezielte Rückfragen, jeweils einzeln. Priorisiere Fragen, die für ein brauchbares PRD kritisch sind:

- Welches konkrete Problem löst das System?
- Welche Rollen nutzen das System und mit welchen Berechtigungen?
- Welche Funktionen müssen zwingend in die MVP-/Minimalversion?
- Welche Funktionen gehören in eine mögliche Medium-Version?
- Welche Funktionen gehören höchstens in eine Extended-/Luxus-Version?
- Was ist ausdrücklich nicht Teil dieses Systems?
- Welche externen Systeme, Mocks oder APIs sind relevant?
- Welche Demo- oder Erfolgsszenarien müssen später funktionieren?

Im Brownfield-Kontext zusätzlich ableiten oder erfragen, welche Projekt-Bausteine genutzt werden (Auth, DB, UI, LLM, REST API, File Upload, Services). Diese Information fliesst in den Abschnitt "Genutzte Projekt-Bausteine" im PRD.

Dokumentiere bekannte spätere Ausbaustufen auch dann, wenn sie nicht Teil des MVP sind. So kann die spätere Feature-Planung Datenmodell, Schnittstellen und Architektur besser vorbereiten, ohne Medium- oder Extended-Funktionen als zugesagte MVP-Lieferung zu behandeln.

Vermeide Detailfragen, die erst in `plan-feature` gehören, zum Beispiel konkrete Dateinamen, UI-Komponenten oder vollständige API-Schemas, sofern sie für das PRD nicht zwingend sind.

### 5. PRD erzeugen

Erzeuge das PRD gemäß `references/prd-template.md`.

Wenn ein Zielpfad als Argument genannt wurde, normalisiere ihn zuerst auf ein `-v001.md`-Suffix. Wenn kein Zielpfad genannt wurde, verwende:

```text
docs/project/prds/[systemname]-v001.md
```

Normalisiere den Dateinamen kleingeschrieben und mit Bindestrichen, zum Beispiel `docs/project/prds/prozessportal-v001.md`.

Wenn der Nutzer einen Zielpfad ohne Versionssuffix übergibt, ändere nur den Dateinamen und behalte das Verzeichnis bei:

```text
docs/project/prds/prozessportal.md -> docs/project/prds/prozessportal-v001.md
```

Dokumentiere im PRD selbst die Dokumentversion `v001`, damit spätere Review- und Update-Workflows eindeutig darauf referenzieren können.

Fülle im Abschnitt `## Änderungshistorie` mindestens den Eintrag für `v001` aus:

```text
v001 | YYYY-MM-DD | Initiale Erstellung | Erstes PRD erstellt
```

### 6. Abschluss

Nach dem Schreiben des PRD:

1. Nenne den gespeicherten Dateipfad.
2. Fasse den Inhalt kurz zusammen.
3. Liste offene Annahmen oder ungeklärte Punkte auf.
4. Weise darauf hin, dass das PRD vor `plan-feature` fachlich geprüft werden muss.
5. Weise darauf hin, dass dieser erste PRD-Entwurf als `v001` committed werden soll, bevor der Review startet. Dafür kann der Nutzer entweder `/commit` verwenden oder in VS Code Source Control die Änderungen committen und sich dort eine Commit Message vorschlagen lassen.
6. Weise darauf hin, dass als nächster Schritt eine neue Reviewer-Session gestartet werden soll: zuerst `/prime`, danach `/review-prd [PRD-Pfad]`.
7. Weise darauf hin, dass die Review-Ergebnisse danach in der ursprünglichen Autor-Session mit `/integrate-prd-review [PRD-Pfad] [Review-Datei]` geprüft und in eine neue PRD-Version, z.B. `v002`, eingearbeitet werden sollen.

Abschlussfrage:

```text
Ist dieser PRD-Entwurf vollständig genug, um ihn in einer frischen Session mit /review-prd kritisch prüfen zu lassen?
```
