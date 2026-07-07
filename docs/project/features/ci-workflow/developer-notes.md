# Developer Notes: CI-Workflow (GitHub Actions)

## Überblick

Etappe 0.2 ergänzt einen schlanken GitHub-Actions-Workflow (`.github/workflows/ci.yml`) und eine Branch Protection Ruleset auf `main`. Zusammen bilden sie ein echtes Merge-Gate: Kein Code landet auf `main`, ohne Typecheck, Lint, Tests und Build auf GitHub-Infrastruktur bestanden zu haben. Voraussetzung war Etappe 0.1 (env-lazy), durch die alle Module und Tests ohne `.env` laufen.

## Referenzen

- Plan: `docs/project/features/ci-workflow/plan-v001.md`
- PRD: Nicht relevant (infrastrukturelles Feature ohne eigenes PRD)
- Relevante Guides: `docs/setup-and-testing_docs/DOCKER_OPERATIONS.md` (Deployment-Workflow)
- Review-Befund: `docs/reviews/2026-07_CODE_REVIEW.md` Befund 5

## Betroffene Dateien

| Datei | Zweck / Änderung |
|---|---|
| `.github/workflows/ci.yml` | **NEU** – GitHub-Actions-Workflow mit Job `quality` («Quality Checks») |
| `TASKS.md` | Etappe 0.2 auf `done` gesetzt |
| `docs/project/features/ci-workflow/plan-v001.md` | Plan-Datei mit Validierungsevidence und Abweichungen |

**Keine Änderungen** an App-Code, `next.config.mjs`, `package.json` oder `prisma/schema.prisma`.

## Architektur und Datenfluss

### Workflow-Trigger

```yaml
on:
  pull_request:
    branches: [main]
  workflow_dispatch:
```

- **Nur PRs gegen `main`** lösen den Workflow aus. Feature-Branch-Pushes laufen bewusst ohne CI (Budget-Entscheid: 2000 Freiminuten/Monat, ubuntu läuft 1:1).
- Ursprünglich auch `push: branches: [main]`; nach Aktivierung der Branch Protection entfernt, da Merges ohnehin über einen PR (und damit den PR-Trigger) laufen.
- `workflow_dispatch` erlaubt manuelles Ausführen im Actions-Tab.

### Job-Schritte (sequenziell, bricht beim ersten Fehler ab)

```
Install dependencies (npm ci)
  → Generate Prisma client (npx prisma generate)
    → Run typecheck (npx tsc --noEmit)
      → Run lint (npm run lint)
        → Run tests (npm run test:run)
          → Run build (npm run build)
```

Reihenfolge ist bewusst: güngstigste/aussagekräftigste Checks zuerst, teuerster Schritt (`build`, ~2–4 min) zuletzt – spart Minuten bei kaputten Commits.

### Kostenbremsen

- `timeout-minutes: 20` – verhindert, dass hängende Prozesse das Budget auffressen.
- `concurrency: cancel-in-progress: true` – bricht überholte Runs desselben Refs ab.
- `cache: npm` in `actions/setup-node@v4` – cacht `node_modules` anhand `package-lock.json`; beim ersten Lauf fehlt der Cache (Warnung «npm cache is not found» im Log), danach ~1–2 Minuten schneller.

### Berechtigungen

```yaml
permissions:
  contents: read
```

Least Privilege: Der Workflow liest nur Code. Keine Secrets erforderlich (Voraussetzung aus Etappe 0.1).

### Branch Protection Ruleset (GitHub Rulesets, modern)

Eingerichtet über **Settings → Rules → Rulesets** (nicht Classic Branch Protection):

| Einstellung | Wert |
|---|---|
| Ruleset Name | Protect main |
| Enforcement | Active |
| Target | Default branch (main) |
| Bypass list | leer (kein Admin-Bypass) |
| Require pull request | ✅ (Required approvals: 0) |
| Require status checks | ✅ `Quality Checks` (Job-Name aus ci.yml) |
| Require up to date | ✅ |

Der Check-Name `Quality Checks` entspricht dem `name:`-Feld des Jobs in `ci.yml`. Er wird in den Ruleset-Einstellungen erst angeboten, nachdem er mindestens einmal im Repo gemeldet wurde (Task 2 war die Voraussetzung für Task 3).

## Rollen und Berechtigungen

Nicht relevant für App-Rollen. GitHub-seitig: kein Admin-Bypass – auch der Repo-Owner muss den PR-Weg nehmen.

## Datenmodell und Persistenz

Nicht relevant – keine Schema-Änderungen.

## Validierung und Tests

| Prüfung | Ergebnis |
|---|---|
| Lokale CI-Simulation (ohne `.env`) | ✅ Alle 273 Vitest-Tests grün, Typecheck und Lint sauber, Build erfolgreich |
| Erster echter GitHub-Lauf (PR #4) | ✅ Alle 5 Steps grün, Laufzeit 3:46 min |
| Direkter `git push origin main` nach Ruleset-Aktivierung | ✅ GitHub antwortet `GH013: Changes must be made through a pull request.` |

### Bekannte Warnungen im CI-Log (harmlos)

- `Warning: An update to ... inside a test was not wrapped in act(...)` → UI-Tests (`JournalEntryCard.test.tsx`) führen implizite `fetch`-Calls durch; ohne `baseURL` im jsdom-Context schlägt die URL-Auflösung fehl, der Test besteht aber trotzdem, weil das Fehler-Handling korrekt ist.
- `npm warn deprecated …` → Transitive Abhängigkeiten; kein Handlungsbedarf für dieses Feature.
- `Update available 6.19.0 -> 7.8.0` (Prisma) → Etappe 2.

## Betriebs- und Setup-Hinweise

- **Escape Hatch bei dauerhaft rotem CI:** Branch Protection Ruleset unter **Settings → Rules → Rulesets → Protect main → Edit → Enforcement: Disabled** temporär deaktivieren, Fehler beheben, wieder aktivieren.
- **ENV-Werte:** Keine GitHub-Secrets erforderlich. Der Workflow läuft vollständig ohne `.env`.
- **Node-Version:** Node 24 (matching `FROM node:24-bookworm` im Dockerfile). Falls die Node-Version im Dockerfile ändert, muss `node-version: 24` in `ci.yml` angepasst werden.
- **Prisma `generate`:** Läuft bereits im `postinstall`-Hook von `@prisma/client` bei `npm ci`; der explizite Schritt im Workflow ist idempotent und macht den Ablauf robust gegen `--ignore-scripts`-Setups oder künftige Prisma-Versionen ohne Auto-Generate.

## Wartungshinweise

- **Trigger-Entscheid überprüfen:** Falls das Budget auf GitHub Pro steigt oder Feature-Branches häufig längere Regressionspausen verursachen, kann der `push`-Trigger für `main` wieder ergänzt werden (eine Zeile in `ci.yml`).
- **npm-Caching:** `cache: npm` in `setup-node@v4` nutzt `package-lock.json` als Cache-Key. Bei grossen Dependency-Änderungen wird der Cache automatisch invalidiert.
- **Job-Aufteilung:** Aktuell ein einziger sequenzieller Job statt paralleler Jobs. Wenn Budget und gewünschte Feedback-Geschwindigkeit es rechtfertigen, können Typecheck/Lint/Test als separate parallele Jobs mit eigenem Checkout laufen – kostet aber deutlich mehr Minuten.
- **act(…)-Warnungen sauber machen:** Langfristig könnten `fetch`-Calls in UI-Tests mit `msw` (Mock Service Worker) oder `vi.stubGlobal('fetch', …)` gemockt werden. Kein Handlungsbedarf für die Funktionalität, aber sauberer im Log.

## Bekannte Einschränkungen

- Feature-Branch-Pushes ohne PR lösen keine CI aus (Budget-Entscheid). Wer Feedback vor dem PR-Öffnen möchte, führt lokal `npm run test:run && npx tsc --noEmit && npm run lint && npm run build` aus.
- Der erste `npm ci`-Lauf in einem frischen Runner-Image dauert ~51 Sekunden (kein Cache). Ab dem zweiten Lauf wird der npm-Cache genutzt.
- Der Check-Name `Quality Checks` in der Ruleset-Konfiguration ist manuell eingetragen und muss bei einer Umbenennung des Job-`name:`-Felds in `ci.yml` auch in den Ruleset-Settings aktualisiert werden.
