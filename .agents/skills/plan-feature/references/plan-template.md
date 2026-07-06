# Plan: <Feature-Name>

## Status

**Feature-Status:** planned  
**Erstellt:** YYYY-MM-DD  
**Plan-Version:** v001
**Quelle:** <User Request, PRD oder Datei>  
**Confidence Score:** <#/10 mit kurzer Begründung>

## Feature Metadata

| Feld | Wert |
|---|---|
| Feature-Typ | New Capability / Enhancement / Refactor / Bug Fix |
| Plan-Version | v001 |
| Komplexität | Low / Medium / High |
| Primär betroffene Systeme | UI / Server Actions / Route Handler / Prisma / Auth / E-Mail / LLM / Tests |
| Abhängigkeiten | <Libraries, ENV-Werte, Daten, Entscheidungen> |

## Plan-Änderungshistorie

| Version | Datum | Anlass | Kurzbeschreibung |
|---|---|---|---|
| v001 | YYYY-MM-DD | Initiale Planung | Erster Feature-Plan erstellt |

Bei späteren Änderungen ergänzen `/integrate-feature-plan-review` oder `/update-feature-plan` neue Zeilen, ohne alte Einträge zu entfernen.

## Feature Description

<Detaillierte Beschreibung des Features, Zweck und Nutzen für Nutzer.>

## User Story

```text
Als <Rolle>
möchte ich <Aktion/Ziel>,
damit <Nutzen/Wert>.
```

## Problem Statement

<Welches konkrete Problem oder welche Chance adressiert das Feature?>

## Solution Statement

<Wie löst der geplante Ansatz das Problem?>

## Scope

### Im Scope

- ...

### Nicht im Scope

- ...

## Rollen und Berechtigungen

<Betroffene Sichtbarkeit, Aktionen und Schutzregeln. Single-User-App hinter Cloudflare Access; bei geteilten Einträgen den journalEntryAccessService beachten.>

## Context References

### Pflichtlektüre vor Umsetzung

- `pfad/zur/datei.ts` - Warum: <konkrete Relevanz, ggf. Zeilenbereich>
- `prisma/schema.prisma` - Warum: <falls Datenmodell betroffen>
- `__tests__/...` - Warum: <ähnliches Testpattern>
- `e2e/...` - Warum: <ähnlicher E2E-Flow>

### Relevante Dokumentation

- [Dokumentationstitel](https://example.com/docs#section) - Warum: <konkrete Relevanz>

## Codebase Intelligence

### Projektstruktur und Architektur

<Relevante Verzeichnisse, Komponenten-/Service-Grenzen und bestehende Patterns.>

### Patterns to Follow

- Naming: <konkrete Regel oder Beispiel>
- Datei-Organisation: <konkrete Regel oder Beispiel>
- Fehlerbehandlung: <konkrete Regel oder Beispiel>
- UI/DaisyUI: <konkrete Regel oder Beispiel>
- Auth/Rollen: <konkrete Regel oder Beispiel>
- Prisma: <konkrete Regel oder Beispiel>

### Anti-Patterns to Avoid

- Kein Redux, keine anderen ORMs, CSS-Frameworks oder Icon-Libraries, keine Prisma Migrations, kein `new PrismaClient()` ausserhalb des Singletons. Raw SQL nur wo bereits etabliert (Volltextsuche in `lib/services/searchService.ts`).
- Keine parallele Architektur neben bestehenden `app/`, `lib/`, `components/` Patterns.
- Keine Python-/pytest-/ruff-Regeln.

### Dependency Analysis

<Relevante Dependencies aus `package.json`, Integrationsweise und Versionen. Keine neuen Packages ohne Begründung und Bestätigung.>

### Testing Patterns

<Bestehende Vitest-Patterns in `__tests__/`, die gespiegelt werden sollen.>

## Architekturentscheidungen

### Gewählter Ansatz

<Beschreibung und Begründung.>

### Erwogene Alternativen

- Alternative: <Beschreibung> - Entscheidung: <warum nicht gewählt>

### Security, Performance, Maintainability

- Security: <Rollen, Inputvalidierung, Datenzugriff>
- Performance: <Rendering, DB-Zugriffe, unnötige Client Components vermeiden>
- Maintainability: <kleine Module, klare Namen, Tests>

## Datenmodell und Prisma

<Keine Änderung oder genaue geplante Änderung. Bei Schema-Änderung: `npx prisma db push && npx prisma generate` gemäss docs/setup-and-testing_docs/SCHEMA_WORKFLOW.md. NIE `npm run db:reset` (löscht Produktivdaten!), keine Prisma Migrations.>

## Betroffene Dateien

### Bestehende Dateien

- `pfad` - Aktion und Grund

### Neue Dateien

- `pfad` - Zweck und Grund

## Implementation Plan

### Phase 1: Foundation

<Foundational work, z.B. Schema, Typen, Utilities.>

### Phase 2: Core Implementation

<Hauptlogik, UI, Server Actions, API oder Datenzugriff.>

### Phase 3: Integration

<Navigation, Rollen, bestehende Workflows, E-Mail, LLM, Statuswechsel.>

### Phase 4: Testing and Validation

<Unit, E2E, Build, manuelle Prüfung, Regressionen.>

## Step-by-Step Tasks

Wichtig: Tasks top-to-bottom ausführen. Jeder Task ist atomic und einzeln validierbar.

Aktionskeywords:

- `CREATE`: neue Datei oder Komponente
- `UPDATE`: bestehende Datei ändern
- `ADD`: Funktionalität in bestehender Datei ergänzen
- `REMOVE`: veralteten Code entfernen, nur mit expliziter Bestätigung
- `REFACTOR`: Struktur ändern ohne Verhalten zu ändern
- `MIRROR`: bestehendes Pattern bewusst spiegeln

### Task 1: <ACTION> <target_file_or_area>

**Status:** planned  
**Ziel:** <konkretes Ergebnis>  
**IMPLEMENT:** <präzise Umsetzung>  
**PATTERN:** <Datei/Zeilen/Pattern, das gespiegelt wird>  
**IMPORTS:** <notwendige Imports oder Dependencies>  
**GOTCHA:** <Fallstrick, Constraint oder Edge Case>  
**ACCEPTANCE CRITERIA:**

- [ ] <messbares Kriterium>
- [ ] <messbares Kriterium>

**VALIDATE:**

- `npm run test:run`
- Manuelle Prüfung: <konkrete Schritte>

## Testing Strategy

### Unit Tests

<Vitest-Tests für Zod-Schemas, Status-Mappings, Utilities oder Serverlogik.>

### E2E Tests

<Nicht vorhanden in diesem Projekt (kein E2E-Setup). Stattdessen manuelle Prüfschritte im VALIDATE-Abschnitt beschreiben.>

### Regression Tests

<Bestehende Vitest-Tests erweitern, wenn Kernverhalten stabil bleiben muss. Keine Python-/pytest-Regressionssuite verwenden.>

### Edge Cases

- <Fehlerfall, Berechtigung, leerer Zustand, ungültige Eingabe, Statuskonflikt>

## Validation Commands

Führe diese Befehle nur aus, wenn sie für das Feature relevant sind. Dokumentiere nicht ausführbare Schritte mit Begründung.

### Level 1: Unit Tests

```bash
npm run test:run
```

### Level 2: Typecheck und Lint

```bash
npx tsc --noEmit
npm run lint
```

### Level 3: Build

```bash
npm run build
```

### Level 4: Manual Validation

<Konkrete Browser-Schritte, Rollen-Logins und erwartete Ergebnisse. Nutzer prüft `npm run dev`.>

## Acceptance Criteria

- [ ] Feature implementiert alle Scope-Anforderungen
- [ ] Rollen und Berechtigungen sind korrekt
- [ ] Validierung mit Zod/React Hook Form ist korrekt, falls Formular betroffen
- [ ] Prisma-Änderungen sind dokumentiert, falls vorhanden
- [ ] Relevante Unit-Tests sind ergänzt und grün
- [ ] Relevante E2E- oder manuelle Flows sind validiert
- [ ] Keine bekannten Regressionen in bestehenden Kernworkflows
- [ ] Dokumentationsbedarf ist notiert

## Completion Checklist

- [ ] Alle Tasks sind umgesetzt
- [ ] Jeder Task wurde validiert
- [ ] Alle relevanten Tests laufen erfolgreich oder Ausnahmen sind begründet
- [ ] `npm run build` wurde bei grösseren Änderungen ausgeführt oder begründet ausgelassen
- [ ] Manuelle Prüfung ist dokumentiert
- [ ] Plan-/PRD-Abweichungen sind dokumentiert und genehmigt
- [ ] Feature ist bereit für `/document` und `/commit`

## Documentation Notes

<Welche Endanwender- und Entwicklerdokumentation soll der spätere `/document`-Skill erstellen?>

## Notes and Trade-offs

<Designentscheidungen, Trade-offs, offene Risiken, spätere Erweiterungen.>

## Offene Fragen

- Keine oder konkrete Fragen

## Plan Review Notes

<Wird durch `/integrate-feature-plan-review` in späteren Plan-Versionen ergänzt. Beim initialen `plan-v001.md`: Nicht relevant.>
