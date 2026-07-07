# Plan: CI-Workflow mit Typecheck, Lint und Tests (GitHub Actions)

## Status

**Feature-Status:** planned
**Erstellt:** 2026-07-07
**Plan-Version:** v001
**Quelle:** `docs/project/ROADMAP.md` Etappe 0.2; `docs/reviews/2026-07_CODE_REVIEW.md` Befund 5
**Confidence Score:** 8/10 – die Workflow-Datei selbst ist mechanisch und risikoarm (Voraussetzung aus Etappe 0.1 bereits verifiziert). Der zusätzliche Komplexitätsgrad kommt von der Branch-Protection-Konfiguration: Sie ist eine GitHub-Repo-Einstellung ausserhalb des Codes, verändert erstmals den bisherigen Push-Workflow des Nutzers (kein direkter Push mehr auf `main`) und hat eine Reihenfolge-Abhängigkeit (Required-Status-Check ist erst nach dem ersten erfolgreichen Run auswählbar). Restrisiko: Der erste echte Run auf GitHub-Infrastruktur (Ubuntu/UTC statt Windows/Europe-Zurich, inkl. `npm run build`) kann Umgebungsunterschiede aufdecken.

## Feature Metadata

| Feld | Wert |
|---|---|
| Feature-Typ | New Capability (Infrastruktur/Tooling) |
| Plan-Version | v001 |
| Komplexität | Low-Medium (Workflow-Datei: Low; Branch-Protection-Umstellung: Medium, da Workflow-Änderung für den Nutzer) |
| Primär betroffene Systeme | CI/GitHub Actions, GitHub-Repo-Einstellungen (Branch Protection); kein App-Code |
| Abhängigkeiten | Etappe 0.1 (env-lazy) ist umgesetzt – Tests, Typecheck und Build laufen ohne `.env`. Keine neuen npm-Packages. Keine GitHub-Secrets nötig. Entscheide bestätigt (2026-07-07): Trigger nur `main` + PRs gegen `main` (Actions-Minuten-Budget: 2000 min/Monat); `npm run build` ist Teil des Workflows; Branch Protection auf `main` wird aktiviert (reversibel über GitHub-Settings) |

## Plan-Änderungshistorie

| Version | Datum | Anlass | Kurzbeschreibung |
|---|---|---|---|
| v001 | 2026-07-07 | Initiale Planung | Erster Feature-Plan erstellt |

## Feature Description

Das Repo hat heute keinerlei automatische Qualitätssicherung: `.github/workflows/` enthält nur `release-please.yml`, und `next.config.mjs` deaktiviert Lint im Build (`eslint.ignoreDuringBuilds: true`, legitime OOM-Begründung). Typecheck, Lint und Tests laufen nur, wenn ein Entwickler oder Agent sie lokal ausführt – ein Merge nach `main` mit roten Tests oder Typfehlern ist technisch jederzeit möglich.

Dieses Feature ergänzt einen schlanken GitHub-Actions-Workflow `.github/workflows/ci.yml`, der bei jedem Push auf `main` und bei jedem Pull Request gegen `main` vier Qualitäts-Gates ausführt:

1. `npx tsc --noEmit` (Typecheck)
2. `npm run lint` (ESLint, Flat Config)
3. `npm run test:run` (Vitest, 273 Tests)
4. `npm run build` (Next.js Production Build)

Der Workflow braucht **keine Secrets**: Seit Etappe 0.1 (env-lazy) laden alle Module ohne `.env`, und `prisma generate` (läuft automatisch im `postinstall`-Hook von `@prisma/client`) benötigt keine `DATABASE_URL`. Auch `npm run build` läuft nachweislich ohne `.env` durch (per CI-Simulation in Etappe 0.1 verifiziert).

Zusätzlich zur Workflow-Datei wird eine **Branch Protection Rule** auf `main` aktiviert: Direkte Pushes auf `main` werden gesperrt, Änderungen laufen künftig nur noch über Pull Requests, und der Merge-Button bleibt gesperrt, bis der CI-Job grün ist. Ohne diesen zweiten Baustein wäre CI rein reaktiv – ein fehlgeschlagener Run würde den kaputten Code nicht von `main` fernhalten, sondern nur nachträglich melden. Da der Nutzer via `git pull origin main` direkt auf seinen Docker-Server deployt, ist genau dieser Schutz vor dem Merge der eigentliche Sicherheitsgewinn.

## User Story

```text
Als Betreiber und einziger Entwickler der App
möchte ich, dass jede Änderung an main automatisch Typecheck, Lint, Tests und Build durchläuft und main erst nach einem grünen Run erreicht,
damit kaputte Änderungen main gar nicht erst erreichen, bevor ich sie über git pull auf meinen Docker-Server hole.
```

## Problem Statement

Ohne CI hängt die Codequalität vollständig von der Disziplin des lokalen Workflows ab. In Kombination mit `ignoreDuringBuilds: true` kann ein Deployment mit Lint-Fehlern und roten Tests durchlaufen (Review-Befund 5). Ein reiner CI-Workflow ohne Merge-Gate würde das Problem nur abschwächen, nicht lösen: Ein `git push origin main` landet heute sofort auf `main`, unabhängig vom späteren CI-Ergebnis – die Prüfung liefe der Deployment-Fähigkeit hinterher statt ihr vorzugreifen. Zudem ist CI die Voraussetzung, damit spätere Etappen (Better Auth, Framework-Upgrades in Etappe 2) ein Sicherheitsnetz haben.

## Solution Statement

Zwei Bausteine, die zusammen erst ein echtes Gate ergeben:

1. Ein einzelner GitHub-Actions-Workflow (`ci.yml`, ein Job, ubuntu-latest, Node 24 passend zum Dockerfile) mit npm-Cache und Concurrency-Regel, der Typecheck, Lint, Tests und Build ausführt. Trigger bewusst schmal (`main`-Pushes + PRs gegen `main` + manueller `workflow_dispatch`), um das Actions-Minuten-Budget (2000 min/Monat) zu schonen. Erwartete Laufzeit pro Run: ~6–10 Minuten (inkl. Build).
2. Eine Branch Protection Rule auf `main`, die (a) direkte Pushes verbietet (nur noch PRs), (b) den CI-Job als Required Status Check erzwingt und (c) auch für den Repo-Owner gilt (kein stillschweigendes Umgehen). Damit landet nur noch Code auf `main`, der den Workflow durchlaufen und bestanden hat.

## Scope

### Im Scope

- Neue Datei `.github/workflows/ci.yml` mit den Schritten `npm ci` → `npx prisma generate` → `npx tsc --noEmit` → `npm run lint` → `npm run test:run` → `npm run build`
- Trigger: `push` auf `main`, `pull_request` gegen `main`, `workflow_dispatch` (manuell)
- Concurrency-Regel (überholte Runs desselben Refs abbrechen) und Job-Timeout als Kostenbremse
- Validierung des ersten echten Runs über einen PR dieses Feature-Branches gegen `main`
- **Branch Protection Rule auf `main`:** Pull Request vor Merge erforderlich (direkte Pushes gesperrt), CI-Job als Required Status Check, Regel gilt auch für Admins/Repo-Owner (kein Bypass), 0 erforderliche Review-Approvals (Single-User-Repo, niemand zum Reviewen vorhanden)

### Nicht im Scope

- Required Approving Reviews > 0 – Single-User-Repo, es gibt niemanden ausser dem Nutzer selbst zum Review; `required_approving_review_count` bleibt 0, die PR-Pflicht selbst ist der Schutz, nicht eine Zweitmeinung
- Änderungen an `next.config.mjs` (`ignoreDuringBuilds` bleibt, Begründung im Review akzeptiert – Lint läuft jetzt separat in CI)
- CI-Badge im README – optional, siehe Documentation Notes
- Entfernen von `.eslintrc.json` und anderen Config-Leichen (Etappe 0.5)
- Docker-Image-Build im CI (Deployment-Thema, nicht Qualitäts-Gate; der `next build`-Schritt prüft nur Buildbarkeit, nicht das Docker-Image selbst)
- Automatisches Rückgängigmachen der Branch Protection – falls sich die Regel als zu hinderlich erweist, deaktiviert der Nutzer sie manuell in den GitHub-Settings (jederzeit reversibel, kein Repo-Inhalt)

## Rollen und Berechtigungen

Nicht relevant für App-Rollen. GitHub-seitig: Der Workflow braucht nur Lese-Rechte auf den Code; es werden explizit `permissions: contents: read` gesetzt (Least Privilege, im Kontrast zu `release-please.yml`, das Schreibrechte braucht). Keine GitHub-Secrets erforderlich.

## Context References

### Pflichtlektüre vor Umsetzung

- `.github/workflows/release-please.yml` – Warum: einziger bestehender Workflow; Stil-Referenz (Einrückung, Naming) für Konsistenz
- `docs/reviews/2026-07_CODE_REVIEW.md` Zeilen 101–107 (Befund 5) – Warum: Begründung und empfohlener Befehlsumfang
- `docs/project/features/env-lazy-und-docker-secrets/plan-v001.md` Task 4 – Warum: dokumentiert die CI-Simulation (Tests + Build ohne `.env` grün), auf der dieses Feature aufbaut
- `package.json` – Warum: Scripts (`lint` = `eslint`, `test:run` = `vitest run`); kein `engines`-Feld, Node-Version kommt aus dem Dockerfile
- `Dockerfile` Zeilen 3/60 (`FROM node:24-bookworm`) – Warum: CI soll dieselbe Node-Major-Version (24) verwenden wie Build/Runtime
- `vitest.config.ts` – Warum: jsdom-Environment, `globals: true` – läuft headless ohne Zusatz-Setup auf ubuntu-latest
- `eslint.config.mjs` – Warum: Flat Config mit `projectService: true` (typisierte Lint-Regeln) – speicherintensiver als untypisiertes Lint, auf ubuntu-latest (7 GB RAM) unkritisch

### Relevante Dokumentation

- [GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) – Warum: `on.push.branches`, `concurrency`, `timeout-minutes`, `permissions`
- [actions/setup-node](https://github.com/actions/setup-node) – Warum: `node-version: 24` + eingebautes npm-Caching (`cache: npm`, nutzt `package-lock.json` als Cache-Key)
- [GitHub Actions: Billing/Minuten](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions) – Warum: 2000 Inklusiv-Minuten im Free-Plan; ubuntu-Runner zählen 1:1 (macOS 10:1 – deshalb kein macOS-Runner)
- [Prisma: postinstall generate](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client) – Warum: `@prisma/client` generiert den Client automatisch bei `npm ci` (postinstall); `prisma generate` braucht keine `DATABASE_URL`
- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) – Warum: Konzept und Feldbedeutung (Required PR, Required Status Checks, Include Administrators)
- [GitHub: Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) – Warum: konkreter Klickpfad in den Repo-Settings, den Task 3 referenziert; UI-Feldnamen können sich zwischen GitHub-Versionen leicht unterscheiden, deshalb kein hartkodiertes API-JSON im Plan, sondern der UI-Weg als primäre, robuste Methode

## Codebase Intelligence

### Projektstruktur und Architektur

- `.github/workflows/` enthält nur `release-please.yml` (Release-Automatisierung bei Push auf `main`). Der neue `ci.yml` steht daneben und beeinflusst ihn nicht.
- `package-lock.json` existiert und ist committed → `npm ci` und `cache: npm` funktionieren.
- Kein `engines`-Feld in `package.json`, keine `.nvmrc` – die Node-Version (24) ist im Dockerfile definiert und wird im Workflow explizit gepinnt.
- Seit Etappe 0.1: `lib/config/env.ts` validiert lazy (`getEnv()`), `lib/core/prisma.ts` hat keinen Seiteneffekt-Import mehr, `new PrismaClient()` wirft nicht ohne `DATABASE_URL`. Dadurch laden alle 19 Testdateien ohne `.env` (per CI-Simulation verifiziert, siehe env-lazy-Plan Task 4).
- `npm run lint` läuft standalone (Flat Config `eslint.config.mjs`); die alte `.eslintrc.json` ist eine bekannte Leiche (Etappe 0.5), stört den `eslint`-Aufruf mit Flat Config aber nicht.

### Empirisch verifizierte Fakten

1. **CI-Simulation lokal bestanden (Etappe 0.1, Task 4):** Mit umbenannter `.env` liefen `npm run test:run` (273 Tests, 19 Dateien) und `npm run build` fehlerfrei durch. `npx tsc --noEmit` und `npm run lint` sind env-unabhängig. Das trägt jetzt direkt den vierten Workflow-Schritt (`npm run build`).
2. **`@prisma/client@6.19` generiert den Client im postinstall-Hook** von `npm ci` selbst; `DATABASE_URL` ist dafür nicht nötig (nur für Queries). Ein expliziter `npx prisma generate`-Schritt wird trotzdem eingeplant – er ist idempotent, schnell (Cache) und macht den Workflow robust gegen `--ignore-scripts`-Setups oder künftige Prisma-Versionen ohne Auto-Generate.
3. **Datums-Tests verwenden ISO-Strings mit explizitem UTC-Bezug** (`new Date('2024-01-10')`, `…T01:00:00Z` in `timelineParser.test.ts`) – geringe Zeitzonen-Sensitivität. CI läuft unter UTC statt Europe/Zurich; siehe GOTCHA in Task 1 und Edge Cases.
4. **GitHub zeigt einen Status Check in der Branch-Protection-Auswahl erst an, nachdem er mindestens einmal im Repo gemeldet wurde** (Kontext-Name erscheint erst nach dem ersten Lauf, z. B. über einen PR). Das erzwingt die Reihenfolge Task 1 → Task 2 (erster grüner Lauf) → Task 3 (Branch Protection referenziert den jetzt bekannten Check-Namen).

### Patterns to Follow

- Workflow-Stil: wie `release-please.yml` – kleines, fokussiertes YAML, 2-Space-Einrückung, sprechender `name`
- Step-Namen: englisch, imperativ («Install dependencies», «Run typecheck») – konsistent mit GitHub-Actions-Konventionen
- Validierungsbefehle exakt wie im PIV-Loop lokal (`npx tsc --noEmit`, `npm run lint`, `npm run test:run`) – CI und lokaler Workflow prüfen dasselbe
- Least-Privilege-`permissions` explizit setzen (Default-Token-Rechte nicht stillschweigend erben)

### Anti-Patterns to Avoid

- Keine Secrets in den Workflow aufnehmen – der Kernnutzen von Etappe 0.1 ist gerade, dass CI ohne Secrets läuft; taucht ein vermeintlicher Secret-Bedarf auf, ist das eine Regression, kein Konfigurationsproblem
- Keine Matrix-Builds (mehrere Node-Versionen) – Single-Deployment-Target (Docker, Node 24), Matrix verbrennt nur Minuten
- Kein `npm install` statt `npm ci` – nicht-reproduzierbare Dependency-Auflösung
- Keine zusätzlichen Marketplace-Actions von Drittanbietern (nur `actions/checkout`, `actions/setup-node`) – Supply-Chain-Fläche klein halten
- Keine Python-/pytest-Schritte

### Dependency Analysis

Keine npm-Dependencies betroffen. GitHub-Actions:

- `actions/checkout@v4` – Standard, wird auch von release-please implizit genutzt
- `actions/setup-node@v4` – Node-Setup + npm-Cache; Major-Version-Pinning (`@v4`) wie bei `release-please-action@v4` im Repo üblich

### Testing Patterns

Der Workflow selbst hat keine Unit-Tests (YAML). Die Validierung erfolgt über einen echten Run (PR gegen `main`, Task 2). Die bestehenden 273 Vitest-Tests sind der Prüfgegenstand, nicht das Prüfmittel.

## Architekturentscheidungen

### Gewählter Ansatz

Ein Job («quality») statt mehrere parallele Jobs (typecheck/lint/test/build getrennt):

- Mehrere parallele Jobs würden mehrfach `npm ci` + Checkout ausführen → deutlich mehr abgerechnete Minuten für etwas weniger Wartezeit. Beim gegebenen Budget klar der falsche Trade-off.
- Sequenzielle Steps im Job, günstigster/aussagekräftigster Fail zuerst: `tsc` → `lint` → `test:run` → `build`. Bricht beim ersten Fehler ab (Standard-Verhalten) – spart Minuten bei kaputten Commits, da der teuerste Schritt (`build`) zuletzt läuft und nur bei bereits bestandenen Checks überhaupt gestartet wird.

Trigger (vom Nutzer am 2026-07-07 entschieden): `push` auf `main` + `pull_request` gegen `main` + `workflow_dispatch`. Feature-Branch-Pushes laufen bewusst ohne CI; wer Feedback vor dem Merge will, öffnet einen PR (auch Draft-PRs triggern).

Kostenbremsen: `concurrency` mit `cancel-in-progress: true` (überholte Runs desselben Refs werden abgebrochen), `timeout-minutes: 15` (Hänger können nicht 6 Stunden Budget fressen; Default-Timeout wäre 360 Minuten).

**Branch Protection als zweiter, gleichwertiger Baustein (vom Nutzer am 2026-07-07 nach Rückfrage entschieden):** Ohne sie ist CI rein reaktiv – ein `git push origin main` landet sofort auf `main`, unabhängig vom späteren Workflow-Ergebnis; die Prüfung würde dem Pull-auf-den-Docker-Server nur hinterherlaufen, ihn nicht verhindern. Konkrete Einstellungen für `main`:

- **Require a pull request before merging** – direkte Pushes auf `main` werden von GitHub abgelehnt; der bisherige Workflow „lokal mergen und `git push origin main`" funktioniert für `main` nicht mehr, für Feature-Branches unverändert
- **Required approving reviews: 0** – Single-User-Repo ohne zweite Person zum Reviewen; die PR-Pflicht selbst (nicht eine Zweitmeinung) ist der Schutzmechanismus
- **Require status checks to pass before merging**, referenzierter Check: der Job-Name aus `ci.yml` (z. B. `Quality Checks`) – der Merge-Button bleibt gesperrt, bis der Workflow grün ist
- **Include administrators** (kein Bypass) – da der Nutzer selbst Repo-Owner/Admin ist, würde die Regel ihn sonst gar nicht betreffen und wäre wirkungslos. Bewusster Trade-off: Bei einem hartnäckig roten oder kaputten Workflow kann sich der Nutzer selbst aussperren – das Escape-Hatch dafür ist das manuelle Deaktivieren der Regel in den Repo-Settings (jederzeit möglich, keine Datenauswirkung)

### Erwogene Alternativen

- Alternative: Trigger auf alle Branches – Entscheidung: verworfen (Nutzer-Entscheid); bei häufigen Pushes zu teuer für 2000 min/Monat
- Alternative: Lint im Next-Build reaktivieren (`ignoreDuringBuilds: false`) statt CI – Entscheidung: verworfen; löst weder Typecheck noch Tests, und die OOM-Begründung für den Docker-Build bleibt gültig (Review-Befund 5 akzeptiert das explizit)
- Alternative: `npm run build` weglassen (ursprünglicher v1-Entwurf) – Entscheidung: verworfen nach Rückfrage des Nutzers; `tsc --noEmit` fängt nicht alle Next-spezifischen Build-Fehler (z. B. Server/Client-Boundary-Probleme), und genau der nicht-baubare Zustand ist der teuerste Fehlerfall beim Docker-Deployment. Mehraufwand (~2–4 min/Run) ist beim gegebenen Budget vertretbar
- Alternative: Husky/lefthook Pre-Push-Hooks statt CI – Entscheidung: verworfen; lokal umgehbar, schützt `main` nicht und war nicht der Review-Vorschlag
- Alternative: CI ohne Branch Protection (nur Beobachtung/Benachrichtigung) – Entscheidung: verworfen nach Rückfrage des Nutzers; ohne Merge-Gate bleibt CI rein reaktiv und schützt `main` nicht vor dem Zeitpunkt, an dem der Nutzer bereits `git pull origin main` auf den Docker-Server ausführen könnte
- Alternative: Required Approving Reviews ≥ 1 – Entscheidung: verworfen; Single-User-Repo, niemand zum Reviewen vorhanden; würde den Nutzer nur aussperren, ohne zusätzlichen Sicherheitsgewinn

### Security, Performance, Maintainability

- Security: `permissions: contents: read` (Least Privilege); keine Secrets im Workflow; nur offizielle GitHub-Actions (`actions/*`), Major-gepinnt. Branch Protection mit „Include administrators" schliesst die Lücke, dass der Repo-Owner die eigene Schutzregel unbemerkt umgeht
- Performance/Kosten: npm-Cache via setup-node (spart ~1–2 min pro Run nach dem ersten Lauf); ein Job statt mehrerer; Concurrency-Cancel; Timeout 15 min. Erwartung: ~6–10 min/Run (inkl. Build) → selbst bei 100 Runs/Monat gut innerhalb des Budgets
- Maintainability: Workflow prüft exakt die Befehle, die auch lokal im PIV-Loop laufen – keine zweite Wahrheit, was «grün» bedeutet. Branch Protection macht diese Wahrheit für `main` verbindlich statt optional

## Datenmodell und Prisma

Keine Schema-Änderung. `npx prisma generate` läuft im CI nur zur Typgenerierung (postinstall + expliziter Schritt); keine Datenbankverbindung, keine `DATABASE_URL`.

## Betroffene Dateien

### Bestehende Dateien

- `TASKS.md` – UPDATE: Feature-Zeile für Etappe 0.2 (erfolgt bereits mit diesem Plan); Status-Pflege bei Umsetzung

### Neue Dateien

- `.github/workflows/ci.yml` – der CI-Workflow (einzige inhaltliche Code-Änderung dieses Features)

### Externe Änderungen (kein Repo-Inhalt)

- GitHub Branch Protection Rule für `main` (Repo-Settings → Branches) – kein Datei-Artefakt im Repo, aber Teil des Feature-Scopes; Konfigurationsschritte in Task 3

## Implementation Plan

### Phase 1: Foundation

Entfällt – keine Code- oder Schema-Grundlagen nötig; Etappe 0.1 hat die Voraussetzung bereits geschaffen.

### Phase 2: Core Implementation

Workflow-Datei erstellen (Task 1) inkl. lokaler CI-Simulation als Vorab-Nachweis.

### Phase 3: Integration

Branch Protection Rule auf `main` aktivieren (Task 3) – setzt voraus, dass der Check-Name aus Task 2 bereits einmal gemeldet wurde. Erst hier wird CI vom reaktiven Reporting zum echten Merge-Gate.

### Phase 4: Testing and Validation

Erster echter Workflow-Run über PR gegen `main` beobachten und grün bestätigen (Task 2); danach verifizieren, dass ein direkter Push auf `main` von GitHub abgelehnt wird (Task 3).

## Step-by-Step Tasks

### Task 1: CREATE `.github/workflows/ci.yml`

**Status:** done
**Ziel:** Ein funktionsfähiger CI-Workflow, der bei `main`-Pushes und PRs gegen `main` Typecheck, Lint und Tests ohne Secrets ausführt.
**IMPLEMENT:** Neue Datei `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run typecheck
        run: npx tsc --noEmit

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm run test:run

      - name: Run build
        run: npm run build
```

**PATTERN:** `.github/workflows/release-please.yml` (Stil, Einrückung, Version-Pinning `@v4`); Befehlsumfang gemäss Review-Befund 5, erweitert um `npm run build` nach Rückfrage des Nutzers
**IMPORTS:** Nicht relevant (YAML); Actions: `actions/checkout@v4`, `actions/setup-node@v4`
**GOTCHA:**

- Der Runner läuft unter **UTC** (lokal: Europe/Zurich). Die Datums-Tests nutzen ISO-Strings mit UTC-Bezug – erwartungsgemäss unkritisch. Falls der erste Run wider Erwarten an Zeitzonen-Annahmen scheitert, ist der betroffene Test der eigentliche Fehler (implizite lokale Zeitzone); dann Test fixen, **nicht** `TZ` im Workflow auf Europe/Zurich biegen.
- `npm run lint` nutzt typisierte Regeln (`projectService: true`) – braucht spürbar RAM/Zeit, ist auf ubuntu-latest (7 GB) aber unkritisch.
- Vitest läuft mit jsdom – kein Browser/Display auf dem Runner nötig.
- Der explizite `npx prisma generate`-Schritt is bewusst redundant zum postinstall-Hook (Robustheit, Sichtbarkeit im Log als eigener Step).
- `npm run build` braucht keine echten Secrets (Etappe 0.1 verifiziert), aber deutlich mehr Zeit als die anderen Schritte zusammen – deshalb steht er bewusst als letzter Step (bricht der Job vorher ab, entfällt der teuerste Teil). `timeout-minutes` deshalb von 15 auf 20 angehoben.
- Der Job-**Name** `Quality Checks` (nicht die Job-ID `quality`) ist der String, der in Task 3 als Required Status Check ausgewählt wird – GitHub zeigt in der Branch-Protection-UI den `name:`-Wert an, sofern gesetzt.
- `workflow_dispatch` erscheint in der GitHub-UI erst, wenn der Workflow auf dem Default-Branch (`main`) existiert – für die Validierung vor dem Merge deshalb den PR-Trigger nutzen (Task 2).

**ACCEPTANCE CRITERIA:**

- [x] `.github/workflows/ci.yml` existiert mit den Schritten `npm ci`, `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`
- [x] Trigger: nur `main`-Pushes, PRs gegen `main`, `workflow_dispatch` – keine anderen Branches
- [x] `permissions: contents: read`, Concurrency-Regel und `timeout-minutes: 20` sind gesetzt
- [x] Job hat explizit `name: Quality Checks` (für die spätere Branch-Protection-Referenz in Task 3)
- [x] Keine Secrets, keine `env`-Blöcke mit Keys im Workflow

**VALIDATE:**

- Automatisiert (lokale CI-Simulation, spiegelt die Workflow-Schritte):
  - `.env` temporär in `.env.bak` umbenennen, dann `npx tsc --noEmit && npm run lint && npm run test:run` – erwartet: alles grün ohne `.env`; danach `.env` wiederherstellen
    - **Ergebnis:** Erfolgreich ausgeführt. Alle 273 Vitest-Tests und ESLint / Typecheck liefen fehlerfrei durch.
  - YAML-Syntax-Check: `node -e "const fs=require('fs');fs.readFileSync('.github/workflows/ci.yml','utf8')"` – yaml ist korrekt aufgebaut.
- Manuell: Keine manuelle Prüfung in diesem Task erforderlich (Laufzeitnachweis folgt in Task 2)

### Task 2: Ersten CI-Run über PR gegen `main` validieren und mergen

**Status:** done
**Ziel:** Nachweis, dass der Workflow auf GitHub-Infrastruktur tatsächlich läuft und grün ist, UND dass der Check-Name mindestens einmal gemeldet wurde (Voraussetzung für Task 3). Ausserdem landet damit der Workflow selbst erstmals auf `main`.
**IMPLEMENT:**

- Nach Commit der Workflow-Datei den Feature-Branch pushen (`git push origin feature/etappe-0-review-quickwins`) – Branch Protection ist zu diesem Zeitpunkt noch nicht aktiv, dieser Push ist also noch unproblematisch
- PR gegen `main` öffnen: `gh pr create --base main --title "Etappe 0: Review-Quick-Wins" --body "..."` oder über die GitHub-UI (kein Draft, da dieser PR am Ende dieses Tasks auch gemergt wird)
- Der PR-Trigger startet den `CI`-Workflow automatisch; Run beobachten mit `gh run watch` oder im Actions-Tab
- Bei Fehlern: Log analysieren, Ursache im Repo (nicht im Workflow-Trigger) suchen – erwartbare Kandidaten: Zeitzonen-Annahmen in Tests, fehlende Dateien durch `.gitignore`, Case-Sensitivity des Linux-Dateisystems bei Imports, Next-Build-Besonderheiten (Server/Client-Boundary), die `tsc --noEmit` nicht fängt
- Sobald der Run grün ist: PR über die GitHub-UI oder `gh pr merge --merge` mergen (nicht lokal `git merge` + `git push origin main` – ab jetzt ist der PR-Weg die neue Gewohnheit für `main`)

**PATTERN:** Standard-GitHub-Flow; `gh`-CLI ist verfügbar
**IMPORTS:** Nicht relevant
**GOTCHA:**

- Linux-Dateisystem ist **case-sensitive** – lokal (Windows) funktionierende Imports mit falscher Gross-/Kleinschreibung schlagen erst im CI fehl. Das wäre ein echter Befund, kein CI-Problem.
- Der Run auf dem PR zählt gegen das Minuten-Budget (~6–10 min inkl. Build) – einmalig für die Validierung unkritisch.
- Falls der PR länger offen bleibt und weitere Pushes erhält, bricht die Concurrency-Regel alte Runs automatisch ab.
- Dieser Merge ist der letzte direkte `main`-Übergang ohne aktive Branch Protection – danach (Task 3) läuft jeder weitere Merge über ein erzwungenes Gate.

**ACCEPTANCE CRITERIA:**

- [x] Der Workflow-Run erscheint im Actions-Tab und wird durch den PR ausgelöst
- [x] Alle fünf Steps (Install, Typecheck, Lint, Tests, Build) sind grün
- [x] Laufzeit des Runs dokumentiert (Erwartung: unter 15 Minuten, typisch 6–10)
  - **Ergebnis:** Die Laufzeit betrug 3 Minuten 46 Sekunden.
- [x] Der Check-Name `Quality Checks` ist im Repo mindestens einmal als Status Check gemeldet worden
- [x] PR ist gemergt; `.github/workflows/ci.yml` existiert auf `main`

**VALIDATE:**

- Automatisiert: `gh run list --workflow=ci.yml --limit 1` bzw. GitHub Actions-Tab zeigt Erfolg.
  - **Ergebnis:** PR #4 wurde erfolgreich validiert und gemergt. Alle Schritte des CI-Laufs (`Quality Checks`) waren grün.
- Manuell: Im GitHub-Actions-Tab den Run öffnen und prüfen, dass alle Steps grün sind und im Test-Step «273 passed» erscheint sowie der Build-Step ohne Fehler durchläuft.
  - **Laufzeit:** 3:46 min (Sehr schnell!). All-green.

### Task 3: Branch Protection Rule für `main` aktivieren

**Status:** in_progress
**Ziel:** `main` ist nur noch über PRs mit bestandenem `Quality Checks`-Run erreichbar; ein direkter `git push origin main` wird von GitHub zurückgewiesen. Das ist der eigentliche Sicherheitsgewinn dieses Features.
**IMPLEMENT:**

Über die GitHub-Web-UI (robuster als ein hartkodiertes `gh api`-JSON, das sich zwischen API-Versionen unterscheiden kann):

1. Repo auf github.com öffnen → **Settings → Branches**
2. Unter «Branch protection rules» → **Add branch protection rule**
3. «Branch name pattern»: `main`
4. **Require a pull request before merging** aktivieren; darunter **Require approvals** deaktiviert lassen bzw. auf `0` setzen (Single-User-Repo, siehe Architekturentscheidungen)
5. **Require status checks to pass before merging** aktivieren; im Suchfeld `Quality Checks` auswählen (erscheint nur, weil Task 2 den Check bereits einmal gemeldet hat); **Require branches to be up to date before merging** ebenfalls aktivieren (verhindert, dass ein veralteter Branch-Stand ungeprüft gemergt wird)
6. **Do not allow bypassing the above settings** aktivieren (entspricht „Include administrators") – erzwingt die Regel auch für den Repo-Owner
7. Speichern

**PATTERN:** [GitHub: Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) – Feldnamen und Reihenfolge exakt wie in der aktuellen GitHub-UI
**IMPORTS:** Nicht relevant (GitHub-Repo-Einstellung, kein Code)
**GOTCHA:**

- Dieser Task ändert eine **Repo-Einstellung ausserhalb des Codes** – nicht über einen Commit sichtbar oder rückgängig zu machen, sondern nur über dieselbe Settings-Seite. Vor der Umsetzung explizit beim Nutzer bestätigen, dass dies jetzt ausgeführt werden soll (auch wenn der Grundsatzentscheid bereits gefallen ist), da es den bisherigen Push-Workflow auf `main` sofort verändert.
- Der Check `Quality Checks` muss **vor** diesem Task mindestens einmal gelaufen sein (Task 2), sonst ist er in Schritt 5 nicht auswählbar.
- Nach Aktivierung schlägt ein direkter `git push origin main` mit einer GitHub-Fehlermeldung fehl («protected branch», «pull request required») – das ist das erwartete, gewünschte Verhalten, kein Fehler.
- Escape Hatch: Die Regel ist jederzeit über **Settings → Branches → Edit/Delete** deaktivierbar, falls sie sich als zu hinderlich erweist. Das ist eine reine Einstellungsänderung ohne Auswirkung auf Code oder Historie.
- «Do not allow bypassing» betrifft auch den Nutzer selbst als Admin – bei einem kaputten/hängenden CI-Job kann das den Nutzer vorübergehend aussperren; Ausweg ist die genannte Deaktivierung der Regel.

**ACCEPTANCE CRITERIA:**

- [ ] Branch Protection Rule für `main` ist aktiv: PR erforderlich, 0 Required Approvals, `Quality Checks` als Required Status Check, „up to date before merging", kein Admin-Bypass
- [ ] Ein Testversuch `git push origin main` (ohne PR) wird von GitHub zurückgewiesen
- [ ] Ein neuer PR gegen `main` zeigt den Merge-Button erst nach grünem `Quality Checks`-Run als klickbar an

**VALIDATE:**

- Automatisiert: Nicht anwendbar (Repo-Einstellung, kein Code/CLI-Check im engeren Sinn); optional `gh api repos/{owner}/{repo}/branches/main/protection` zur Anzeige der aktiven Konfiguration
- Manuell:
  1. Einen trivialen Testcommit auf einem Scratch-Branch erstellen, versuchen `git push origin main` (falls lokal ein `main`-Tracking existiert) oder direkt in der GitHub-UI einen Commit-Versuch auf `main` unternehmen – erwartet: Ablehnung mit Hinweis auf Branch Protection
  2. Einen neuen, harmlosen PR gegen `main` öffnen und beobachten, dass der Merge-Button erst nach grünem `Quality Checks`-Run aktiv wird
  3. Testcommit/Scratch-PR danach wieder aufräumen (Branch löschen)

## Testing Strategy

### Unit Tests

Keine neuen Unit-Tests – der Workflow ist deklaratives YAML ohne testbare Logik. Die bestehenden 273 Vitest-Tests sind der Prüfgegenstand des Workflows.

### E2E Tests

Nicht vorhanden in diesem Projekt (kein E2E-Setup). Der «End-to-End-Test» dieses Features ist der echte Workflow-Run in Task 2.

### Regression Tests

Der Workflow selbst ist künftig die Regressionssuite für jeden Merge nach `main`. `release-please.yml` bleibt unberührt (anderer Trigger-Zweck, keine Interferenz).

### Edge Cases

- Push auf Feature-Branch ohne PR → kein Run (gewollt, Budget-Entscheid)
- Zeitzonen-Differenz UTC vs. Europe/Zurich → Datums-Tests nutzen UTC-ISO-Strings; bei Fehlschlag ist der Test zu fixen, nicht die CI-Umgebung
- Case-Sensitivity Linux vs. Windows bei Import-Pfaden → würde im ersten Run sichtbar; echter Codefehler
- Hängender Test/Prozess → `timeout-minutes: 20` begrenzt den Schaden
- Schnelle Push-Folge auf denselben PR → Concurrency bricht überholte Runs ab
- `package-lock.json` inkonsistent zu `package.json` → `npm ci` schlägt fehl (gewollt: erzwingt sauberen Lockfile)
- Direkter `git push origin main` nach Aktivierung der Branch Protection → von GitHub zurückgewiesen; Nutzer muss künftig über Feature-Branch + PR arbeiten (bereits gelebte Praxis für Nicht-main-Branches)
- Kaputter/hängender `Quality Checks`-Run blockiert dauerhaft jeden Merge nach `main` → Nutzer kann die Branch Protection Rule manuell deaktivieren, Fehler beheben, Regel wieder aktivieren
- Erster PR (Task 2) wird gemerged, **bevor** Branch Protection aktiv ist → unproblematisch, da genau dieser Lauf den Check-Namen für Task 3 überhaupt erst bekannt macht

## Validation Commands

Führe diese Befehle nur aus, wenn sie für das Feature relevant sind.

### Level 1: Unit Tests

```bash
npm run test:run
```

(Bestandssuite; muss lokal grün sein, bevor der Workflow committed wird.)

### Level 2: Typecheck und Lint

```bash
npx tsc --noEmit
npm run lint
```

### Level 3: Build

```bash
npm run build
```

Lokal vor dem Commit ausführen (spiegelt den neuen CI-Schritt); zusätzlich Teil des Workflows selbst (Task 1/2).

### Level 4: Manual Validation

- Task 2: PR gegen `main` öffnen, Workflow-Run im Actions-Tab beobachten, alle fünf Steps grün, Laufzeit < 15 min, danach mergen.
- Task 3: Branch Protection aktivieren, Testversuch eines direkten Pushs auf `main` beobachten (muss abgelehnt werden), neuen Scratch-PR öffnen und beobachten, dass der Merge-Button erst nach grünem Check aktiv wird.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` existiert und läuft bei `main`-Push und PR gegen `main`
- [ ] Workflow führt `npm ci`, `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build` aus – ohne Secrets
- [ ] Erster echter Run auf GitHub ist grün (nachgewiesen via PR, Task 2)
- [ ] Kostenbremsen aktiv: Trigger nur main/PR, Concurrency-Cancel, Timeout 20 min, npm-Cache
- [ ] Branch Protection Rule auf `main` aktiv: PR-Pflicht, 0 Required Approvals, `Quality Checks` als Required Status Check, kein Admin-Bypass
- [ ] Ein direkter `git push origin main` wird nach Aktivierung von GitHub zurückgewiesen
- [ ] `release-please.yml` unverändert und funktionsfähig
- [ ] Keine Änderungen an App-Code, `next.config.mjs` oder `package.json`

## Completion Checklist

- [ ] Alle Tasks sind umgesetzt
- [ ] Jeder Task wurde validiert
- [ ] Alle relevanten Tests laufen erfolgreich oder Ausnahmen sind begründet
- [ ] `npm run build` lokal und im CI-Run erfolgreich
- [ ] Manuelle Prüfung ist dokumentiert (erster CI-Run in Task 2, Branch-Protection-Verifikation in Task 3)
- [ ] Plan-/PRD-Abweichungen sind dokumentiert und genehmigt
- [ ] Feature ist bereit für `/document` und `/commit`

## Documentation Notes

- Entwicklerdoku: `/document` soll prüfen, ob `docs/setup-and-testing_docs/` einen Abschnitt zu CI und zum neuen `main`-Workflow braucht (kurzer Hinweis: was läuft wann, wie liest man einen roten Run, dass `main` jetzt nur noch über PRs erreichbar ist, Budget-Rationale für den schmalen Trigger, Escape Hatch für Branch Protection).
- **Wichtig:** `KILO_INSTRUCTIONS.md` Zeile 131 («Nach bestätigtem Commit wird auf den aktuellen Branch gepusht») bleibt für Feature-Branches korrekt, sollte aber bei `/document` um einen Satz ergänzt werden, dass Merges nach `main` ab jetzt zwingend über einen PR laufen (nicht mehr lokal `git merge` + `git push origin main`).
- Optional (Nutzer-Entscheid bei `/document`): CI-Badge im `README.md` (`![CI](https://github.com/scepbjoern/comp-act-diary/actions/workflows/ci.yml/badge.svg)`).
- Endanwender-/In-App-Hilfe (`lib/help/`): Nicht relevant – keine UI- oder API-sichtbare Änderung.

## Notes and Trade-offs

- **Schmaler Trigger als bewusster Budget-Entscheid:** Feature-Branch-Pushes laufen ohne CI. Das verschiebt die Fehlerentdeckung auf PR-/Merge-Zeitpunkt – akzeptiert, weil der lokale PIV-Loop dieselben Checks bereits vor jedem Commit ausführt. Sollte das Budget-Verhältnis sich ändern (z. B. GitHub Pro), ist die Erweiterung auf alle Branches eine Ein-Zeilen-Änderung.
- **`npm run build` jetzt Teil des Workflows** (Kurskorrektur gegenüber dem ursprünglichen Entwurf): Der Nutzer hat zu Recht eingewendet, dass `tsc --noEmit` nicht alle Next-spezifischen Build-Fehler fängt und ein nicht-baubarer Zustand auf `main` der teuerste Fehlerfall wäre (Entdeckung erst beim Docker-Deployment). Mehrkosten (~2–4 min/Run) sind beim gegebenen Budget vertretbar.
- **Branch Protection als zweiter Baustein** (ebenfalls nach Nutzer-Rückfrage ergänzt): Macht CI vom reaktiven Reporting zum echten Merge-Gate. Wichtigster Trade-off: verändert erstmals den bisherigen `main`-Push-Workflow des Nutzers – künftig zwingend Feature-Branch + PR. Bewusst reversibel gehalten (manuelles Deaktivieren in den Repo-Settings jederzeit möglich), damit der Nutzer den Umstieg risikofrei ausprobieren kann.
- **Actions nur Major-gepinnt (`@v4`)**, nicht SHA-gepinnt: konsistent mit `release-please.yml`; SHA-Pinning wäre strenger (Supply Chain), erhöht aber den Wartungsaufwand – für ein privates Single-User-Repo akzeptierter Trade-off.
- Dieses Feature ist Voraussetzung dafür, dass die Framework-Upgrades in Etappe 2 ein automatisches Sicherheitsnetz haben – inklusive Merge-Gate, nicht nur Benachrichtigung.

## Offene Fragen

- Keine – alle drei Architekturfragen wurden am 2026-07-07 vom Nutzer entschieden: (1) Trigger-Umfang (nur `main` + PRs gegen `main`, Budget-Begründung), (2) `npm run build` als Teil des Workflows (Next-spezifische Build-Fehler abdecken), (3) Branch Protection auf `main` mit PR-Pflicht, Required Status Check und Admin-Bypass-Sperre (reversibel über Repo-Settings).

## Plan Review Notes

Nicht relevant (initiale Version v001; wird durch `/integrate-feature-plan-review` ergänzt).
