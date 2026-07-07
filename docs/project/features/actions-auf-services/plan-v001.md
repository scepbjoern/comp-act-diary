# Plan: actions-auf-services (Etappe 0.3 – Dead-Code-Entfernung statt Umbau)

## Status

**Feature-Status:** planned
**Erstellt:** 2026-07-07
**Plan-Version:** v001
**Quelle:** `docs/project/ROADMAP.md` Etappe 0.3; `docs/reviews/2026-07_CODE_REVIEW.md` Befund 2 (+ Hygiene-Hinweis Zeile 168 zu `lib/legacy/mockdb.ts`)
**Confidence Score:** 9/10 – Reine Löschung von nachweislich unreferenziertem Code; einziges Restrisiko wären dynamische Referenzen, wofür die Recherche keinerlei Hinweise fand.

## Feature Metadata

| Feld | Wert |
|---|---|
| Feature-Typ | Refactor (Dead-Code-Entfernung) |
| Plan-Version | v001 |
| Komplexität | Low |
| Primär betroffene Systeme | Server Actions (Entfernung), Legacy-Lib (Entfernung) |
| Abhängigkeiten | Keine (keine Libraries, keine ENV-Änderungen, keine Daten) |

## Plan-Änderungshistorie

| Version | Datum | Anlass | Kurzbeschreibung |
|---|---|---|---|
| v001 | 2026-07-07 | Initiale Planung | Erster Feature-Plan erstellt; Scope-Entscheid des Nutzers: Löschen statt Umbau, `mockdb.ts` mitentfernen |

## Feature Description

Review-Befund 2 kritisiert, dass die Server Actions in `app/actions.ts` die eigene REST-API per HTTP aufrufen (ohne Cookie-Weitergabe, ohne `res.ok`-Prüfung, mit fragilem `NEXT_PUBLIC_BASE_URL`-Fallback). Die Roadmap sah vor, diese Aufrufe durch direkte Service-Aufrufe zu ersetzen.

Die Planungsrecherche hat jedoch ergeben: **`app/actions.ts` wird nirgends importiert.** Es ist die einzige `'use server'`-Datei im Repo, und `app/page.tsx` (Client Component) definiert eigene, gleichnamige lokale Funktionen (`updateDayMeta`, `updateStool`, `addMealNote`, …), die relative `fetch`-Aufrufe mit `credentials: 'same-origin'` verwenden – der im Review beschriebene Demo-User-Bug kann über diesen Pfad also gar nicht auftreten, weil der Code tot ist.

Zusätzlich ist `lib/legacy/mockdb.ts` (einzige Datei in `lib/legacy/`) ebenfalls unreferenziert; das Review empfiehlt bereits die Löschung («prüfen, ob noch referenziert; sonst löschen»). Die Datei exportiert u. a. dieselben toten Funktions-Zwillinge (`updateStool`, `updateDayMeta`) aus der Mock-Ära.

Das Feature entfernt beide Dateien ersatzlos. Damit ist Befund 2 erledigt (kein HTTP-Selbstaufruf mehr im Repo) und ein Hygiene-Punkt vorgezogen.

## User Story

```text
Als Entwickler/Betreiber von CompACT Diary
möchte ich toten Code (HTTP-Selbstaufruf-Actions und Legacy-Mock-DB) aus dem Repo entfernen,
damit keine irreführenden, fehleranfälligen Code-Pfade gepflegt oder versehentlich wiederverwendet werden.
```

## Problem Statement

`app/actions.ts` suggeriert ein funktionierendes Server-Action-Pattern, das in Wahrheit (a) nie aufgerufen wird und (b) bei Wiederverwendung fehlerhaft wäre (fehlende Cookie-Weitergabe → Demo-User-Fallback, fehlende `res.ok`-Prüfung, Container-fragiler URL-Fallback). `lib/legacy/mockdb.ts` hält parallel dazu veraltete Typen und Plaintext-Passwort-Mocks vor. Beides erhöht die kognitive Last und das Risiko, dass künftige Änderungen (z. B. Etappe 1 Better Auth, Etappe 2 src-Layout) toten Code mitschleppen oder daran scheitern.

## Solution Statement

Ersatzlose Löschung von `app/actions.ts` und `lib/legacy/mockdb.ts` (inkl. dann leerem Ordner `lib/legacy/`). Kein Umbau auf Services, weil es keine Aufrufer gibt – der einfachste korrekte Weg gemäss Projektregel «den einfachsten Lösungsweg umsetzen». Künftige echte Server Actions folgen der bestehenden Regel aus `KILO_INSTRUCTIONS.md`: Services direkt aufrufen, nie die eigene REST-API per `fetch`.

## Scope

### Im Scope

- `REMOVE app/actions.ts` (alle 7 Funktionen: `updateDayMeta`, `updateStool`, `addMealNote`, `fetchDayData`, `fetchInlineAnalytics`, `fetchReflectionsDue`, `fetchCalendarData`)
- `REMOVE lib/legacy/mockdb.ts` und damit den gesamten Ordner `lib/legacy/`
- Verifikation per Suche, Typecheck, Lint, Tests und Build, dass nichts referenziert war
- `TASKS.md`-Statuspflege und Roadmap-Notiz zur Scope-Abweichung (Löschen statt Umbau)

### Nicht im Scope

- Umbau von `app/page.tsx` oder anderen Client-Fetches (funktionieren korrekt mit relativen URLs + Cookies)
- Entfernen der ENV-Variable `NEXT_PUBLIC_BASE_URL` – sie wird weiterhin in `app/prm/[slug]/page.tsx:11` und `app/prm/[slug]/edit/page.tsx:11` verwendet
- Zentrale Auth-Helper / Demo-User-Fallback (Etappe 1, Befunde 1 und 3)
- Übrige Hygiene-Punkte aus Etappe 0.5 (`mastra`, `googleapis`, `db:migrate`-Script usw.)
- Neue Server Actions oder Service-Erweiterungen (es gibt keinen Bedarf)

## Rollen und Berechtigungen

Nicht relevant – es wird ausschliesslich unreferenzierter Code entfernt; keine Auth-, Sichtbarkeits- oder Zugriffslogik ist betroffen. (Positiver Nebeneffekt: Der einzige Code-Pfad, der API-Aufrufe ohne Cookie-Weitergabe machte, verschwindet.)

## Context References

### Pflichtlektüre vor Umsetzung

- `app/actions.ts` – Warum: Die zu löschende Datei; vor dem Löschen Funktionsnamen gegen die Verifikations-Suchen abgleichen
- `lib/legacy/mockdb.ts` – Warum: Die zweite zu löschende Datei; enthält nur Mock-Typen/-Funktionen ohne Importeure
- `docs/reviews/2026-07_CODE_REVIEW.md` Befund 2 (Zeilen 57–71) und Zeile 168 – Warum: Begründung und Abnahmekriterium («HTTP-Selbstaufruf entfällt ersatzlos»)
- `app/page.tsx:275-311` – Warum: Beleg, dass die Tages-UI eigene lokale Funktionen nutzt (relative Fetches mit `credentials: 'same-origin'`) und von der Löschung unberührt bleibt
- `types/day.ts` – Warum: Wird von `app/actions.ts` importiert, aber auch von `app/page.tsx` u. a. – bleibt bestehen

### Relevante Dokumentation

- Keine externe Dokumentation nötig – reine Löschung ohne API-Fragen.

## Codebase Intelligence

### Projektstruktur und Architektur

- `app/actions.ts` ist die **einzige** `'use server'`-Datei im Repo (Grep über `**/*.{ts,tsx}` bestätigt). Das Projekt arbeitet durchgängig mit Client-Fetches auf Route Handler (`app/api/**/route.ts`), die Services aus `lib/services/` aufrufen.
- Grep über den gesamten Code (ohne `.cc-history/`-Sessionlogs) findet **keinen Import** von `app/actions` und **keinen Import** von `lib/legacy/mockdb`; auch `__tests__/` referenziert beides nicht.
- Die gleichnamigen Treffer für `updateDayMeta`/`updateStool`/`addMealNote` in `app/page.tsx:275,290,369` sind **lokale Funktionsdefinitionen** der Client Component, keine Importe.
- `lib/legacy/` enthält ausschliesslich `mockdb.ts` – nach der Löschung ist der Ordner leer und entfällt (Git trackt keine leeren Ordner).

### Patterns to Follow

- Datenänderungen laufen über Route Handler + Services (`KILO_INSTRUCTIONS.md`, Abschnitt «Next.js Konventionen») – genau deshalb ist die Actions-Datei überflüssig.
- Dead-Code-Entfernung als `REMOVE`-Task mit expliziter Nutzer-Bestätigung – die Bestätigung ist in dieser Planung bereits erfolgt (Nutzer-Entscheid vom 2026-07-07, dokumentiert in der Änderungshistorie).

### Anti-Patterns to Avoid

- Keine «Sicherheitskopie» des gelöschten Codes im Repo (auskommentiert o. ä.) – Git-Historie genügt.
- Keine parallele Neuimplementierung der 7 Funktionen als Service-Wrapper «auf Vorrat» (YAGNI; explizit vom Nutzer abgewählt).
- Keine Python-/pytest-Regeln.

### Dependency Analysis

Keine Dependencies betroffen. `package.json` bleibt unverändert. Die ENV-Variable `NEXT_PUBLIC_BASE_URL` bleibt erhalten (PRM-Seiten nutzen sie weiterhin).

### Testing Patterns

Es existieren keine Tests für `app/actions.ts` oder `lib/legacy/mockdb.ts` (Grep in `__tests__/` ohne Treffer) – es müssen also keine Tests angepasst oder entfernt werden. Die bestehende Vitest-Suite dient als Regressionsnetz.

## Architekturentscheidungen

### Gewählter Ansatz

Ersatzlose Löschung beider Dateien. Begründung: Kein einziger Aufrufer existiert; das Review-Ziel («HTTP-Selbstaufruf entfällt ersatzlos») wird ohne neuen Code erreicht; die Projektregel verlangt den einfachsten Lösungsweg.

### Erwogene Alternativen

- Alternative: Umbau der 7 Funktionen auf direkte Service-/Prisma-Aufrufe (Roadmap-Wortlaut) – Entscheidung: verworfen, weil dabei ungenutzter Code entstünde, der Auth-Kontext (`userId`-Cookie-Auflösung) in Server Actions neu gelöst werden müsste und Etappe 1 (Better Auth) dies ohnehin neu ordnet. Vom Nutzer am 2026-07-07 explizit abgewählt.
- Alternative: `mockdb.ts` erst in Etappe 0.5 entfernen – Entscheidung: verworfen (Nutzer-Entscheid), da gleiche Natur (toter Legacy-Code rund um Day-Operationen) und so ein kohärentes kleines Feature entsteht.

### Security, Performance, Maintainability

- Security: Entfernt den einzigen Code-Pfad mit Cookie-losen internen API-Aufrufen (potenzieller Demo-User-Schreibzugriff) sowie Plaintext-Passwort-Mocks in `mockdb.ts`. Reines Risiko-Minus.
- Performance: Keine Laufzeitänderung (Code wurde nie ausgeführt); marginal kleinerer Build.
- Maintainability: Weniger irreführender Code; klare Single-Source für Day-Operationen (Route Handler + `app/page.tsx`).

## Datenmodell und Prisma

Keine Änderung. Kein `db push`, kein `generate` nötig.

## Betroffene Dateien

### Bestehende Dateien

- `app/actions.ts` – REMOVE: toter Code, HTTP-Selbstaufrufe (Befund 2)
- `lib/legacy/mockdb.ts` – REMOVE: toter Legacy-Mock (Review Zeile 168); Ordner `lib/legacy/` entfällt damit
- `TASKS.md` – UPDATE: Statuspflege des Feature-Index (bereits bei Planung: neue Zeile; bei Abschluss: `done`)
- `docs/project/ROADMAP.md` – UPDATE: Etappe-0.3-Zeile um den tatsächlichen Ausgang ergänzen (gelöscht statt umgebaut), damit Folge-Sessions nicht nach einem Umbau suchen

### Neue Dateien

- Keine.

## Implementation Plan

### Phase 1: Foundation

Nicht relevant – keine Vorarbeiten nötig.

### Phase 2: Core Implementation

Task 1: Verifikation und Löschung beider Dateien in einem Schritt (die Verifikations-Greps sind integraler Bestandteil des Lösch-Tasks, kein eigener Task).

### Phase 3: Integration

Task 2: Dokumentations-/Index-Pflege (`ROADMAP.md`-Notiz; `TASKS.md`-Status setzt `/execute` bzw. der Abschluss).

### Phase 4: Testing and Validation

Vollständige automatisierte Validierung (Tests, Typecheck, Lint, Build) plus kurze manuelle Regression der Tagesseite.

## Step-by-Step Tasks

Wichtig: Tasks top-to-bottom ausführen. Jeder Task ist atomic und einzeln validierbar.

### Task 1: REMOVE app/actions.ts und lib/legacy/mockdb.ts (Dead Code)

**Status:** planned
**Ziel:** Beide unreferenzierten Dateien sind gelöscht; Repo baut, lintet und testet grün.
**IMPLEMENT:**

1. Verifikations-Suchen unmittelbar vor der Löschung erneut ausführen (Schutz gegen zwischenzeitliche Änderungen):
   - Grep nach `from '@/app/actions'`, `from './actions'`, `from '../actions'` über `**/*.{ts,tsx}` → erwartet: 0 Treffer ausserhalb von `.cc-history/`
   - Grep nach `mockdb` über `**/*.{ts,tsx}` → erwartet: 0 Treffer ausserhalb von `.cc-history/` und `docs/`
2. `app/actions.ts` löschen.
3. `lib/legacy/mockdb.ts` löschen (Ordner `lib/legacy/` bleibt danach leer und verschwindet aus Git).

**PATTERN:** Reine Löschung; kein Ersatzcode. Nutzer-Bestätigung für `REMOVE` liegt vor (Plan-Historie v001).
**IMPORTS:** Keine – es werden nur Importe entfernt, keine hinzugefügt. `types/day.ts` bleibt unangetastet (wird von `app/page.tsx` u. a. weiter genutzt).
**GOTCHA:**

- Die Treffer `updateDayMeta`/`updateStool`/`addMealNote` in `app/page.tsx` sind lokale Funktionen der Client Component – **nicht anfassen**.
- `lib/legacy/mockdb.ts:202` exportiert ein zweites `updateDayMeta` – bei den Verifikations-Greps nicht mit `app/page.tsx` verwechseln.
- `.cc-history/`-Treffer sind Session-Logs, kein Code.
- `NEXT_PUBLIC_BASE_URL` **nicht** aus `.env`/Doku entfernen – PRM-Seiten nutzen die Variable weiterhin.

**ACCEPTANCE CRITERIA:**

- [ ] `app/actions.ts` existiert nicht mehr
- [ ] `lib/legacy/` existiert nicht mehr (weder Datei noch Ordner in Git)
- [ ] Kein `'use server'`-Vorkommen mehr im Repo (Grep über `**/*.{ts,tsx}` → 0 Treffer)
- [ ] Kein Code-Vorkommen von `mockdb` mehr ausserhalb von `docs/` und `.cc-history/`

**VALIDATE:**

- Automatisiert:
  - `npx tsc --noEmit` → keine Fehler
  - `npm run lint` → keine Fehler
  - `npm run test:run` → alle Tests grün (gleicher Stand wie vor der Löschung)
  - `npm run build` → Build erfolgreich (beweist, dass Next.js keine Referenz auf die Actions-Datei mehr auflösen muss)
- Manuell: Keine manuelle Prüfung zwingend erforderlich (gelöschter Code war nie erreichbar). Empfohlene Kurz-Regression siehe Level 4 im Abschnitt Validation Commands.

### Task 2: UPDATE docs/project/ROADMAP.md – Ausgang von Etappe 0.3 dokumentieren

**Status:** planned
**Ziel:** Die Roadmap spiegelt den tatsächlichen Ausgang («Dead Code gelöscht statt umgebaut»), damit künftige Sessions nicht nach einem Service-Umbau suchen.
**IMPLEMENT:** In der Tabelle unter «Etappe 0 – Review-Quick-Wins» die Zeile 0.3 anpassen: Inhalt z. B. «`app/actions.ts` erwies sich als unreferenziert → ersatzlos gelöscht; `lib/legacy/mockdb.ts` (ebenfalls tot) mitentfernt». Befund-Spalte um Hinweis «2 (+ Hygiene Z. 168)» ergänzen.
**PATTERN:** Bestehender Tabellenstil in `docs/project/ROADMAP.md:20-26`.
**IMPORTS:** Nicht relevant (Markdown).
**GOTCHA:** `docs/reviews/2026-07_CODE_REVIEW.md` ist ein historisches Review-Dokument und wird **nicht** editiert.
**ACCEPTANCE CRITERIA:**

- [ ] Roadmap-Zeile 0.3 beschreibt Löschung statt Umbau inkl. `mockdb.ts`
- [ ] Keine weiteren Roadmap-Inhalte verändert

**VALIDATE:**

- Automatisiert: Keine (reine Doku-Änderung); `npm run lint` läuft ohnehin im Abschluss.
- Manuell: Keine manuelle Prüfung erforderlich (Sichtkontrolle der Markdown-Tabelle genügt und erfolgt beim Review des Diffs).

## Testing Strategy

### Unit Tests

Keine neuen Tests – es entsteht kein neuer Code. Die bestehende Vitest-Suite (`npm run test:run`) dient als Regressionsnetz; sie referenziert die gelöschten Dateien nicht (verifiziert per Grep in `__tests__/`).

### E2E Tests

Nicht vorhanden in diesem Projekt (kein E2E-Setup). Manuelle Kurz-Regression siehe Validation Commands Level 4.

### Regression Tests

`npm run test:run` vor und nach der Löschung mit identischem Ergebnis. Zusätzlich `npm run build` als stärkster automatisierter Beweis, dass keine Referenz existierte.

### Edge Cases

- Zwischenzeitlich hinzugekommene Importe: durch die Verifikations-Greps in Task 1 Schritt 1 abgedeckt.
- Dynamische Importe/String-Referenzen: Grep nach `actions` und `mockdb` deckt auch `import()`-/`require`-Strings ab; keine Treffer gefunden.
- Leerer Ordner `lib/legacy/`: Git trackt ihn nicht; lokal ggf. manuell entfernen.

## Validation Commands

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

Optionale Kurz-Regression der Tagesseite (deren lokale Funktionen namensgleich mit den gelöschten sind, aber unabhängig):

1. `npm run dev` starten (macht der Nutzer) und `http://localhost:3000` öffnen, einloggen.
2. Auf der Tagesansicht das Tages-Rating ändern → Speichern-Indikator erscheint, Wert bleibt nach Reload erhalten (`updateDayMeta`-Pfad über `/api/day/[id]`).
3. Einen Stuhlgang-Wert (Bristol) setzen → Wert wird gespeichert, Sparkline aktualisiert sich (`updateStool`-Pfad über `/api/day/[id]/stool`).
4. Eine Mahlzeiten-Notiz hinzufügen → Notiz erscheint in der Liste (`addMealNote`-Pfad über `/api/day/[id]/notes`).

Erwartung: Alles verhält sich exakt wie vor der Änderung.

## Acceptance Criteria

- [ ] `app/actions.ts` und `lib/legacy/mockdb.ts` sind entfernt; kein `'use server'` und kein `mockdb`-Import mehr im Repo
- [ ] Rollen und Berechtigungen: nicht betroffen (bestätigt durch unveränderte Auth-/Middleware-Dateien im Diff)
- [ ] Zod/React Hook Form: nicht betroffen (kein Formular geändert)
- [ ] Prisma: nicht betroffen (kein Schema-Diff)
- [ ] `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` laufen fehlerfrei
- [ ] Manuelle Kurz-Regression der Tagesseite ohne Auffälligkeiten (optional, empfohlen)
- [ ] `ROADMAP.md` dokumentiert den Ausgang; `TASKS.md`-Index ist aktuell

## Completion Checklist

- [ ] Alle Tasks sind umgesetzt
- [ ] Jeder Task wurde validiert
- [ ] Alle relevanten Tests laufen erfolgreich oder Ausnahmen sind begründet
- [ ] `npm run build` wurde ausgeführt
- [ ] Manuelle Prüfung ist dokumentiert oder begründet ausgelassen
- [ ] Plan-/Roadmap-Abweichung (Löschen statt Umbau) ist dokumentiert und genehmigt (Nutzer-Entscheid 2026-07-07)
- [ ] Feature ist bereit für `/document` und `/commit`

## Documentation Notes

- Endanwender-Dokumentation: Nicht relevant – keine sichtbare Funktionsänderung; kein Eintrag im In-App-Hilfe-System (`lib/help/`) nötig.
- Entwickler-Dokumentation: Kurze `developer-notes.md` im Feature-Ordner genügt (was wurde warum gelöscht, Verweis auf Befund 2). Die Regel «keine Server Actions mit HTTP-Selbstaufruf» steht bereits in `KILO_INSTRUCTIONS.md` und braucht keine Änderung.

## Notes and Trade-offs

- Die Etappe heisst weiterhin «actions-auf-services» (Roadmap-Traceability), obwohl der Ausgang eine Löschung ist; die Abweichung ist in Roadmap und Plan-Historie dokumentiert.
- Sollten künftig echte Server Actions gewünscht sein (z. B. mit Next 16 in Etappe 2), entstehen sie neu nach der Regel «Services direkt aufrufen» – die gelöschte Datei wäre dafür ohnehin kein taugliches Vorbild gewesen.
- `.cc-history/` (untrackte Session-Logs) enthält Text-Treffer zu den gelöschten Symbolen; das ist erwartbar und irrelevant.

## Offene Fragen

- Keine. Die beiden Scope-Entscheide (Löschen statt Umbau; `mockdb.ts` mitentfernen) wurden am 2026-07-07 vom Nutzer getroffen.

## Plan Review Notes

Nicht relevant (initialer `plan-v001.md`). Wird durch `/integrate-feature-plan-review` in späteren Plan-Versionen ergänzt.
