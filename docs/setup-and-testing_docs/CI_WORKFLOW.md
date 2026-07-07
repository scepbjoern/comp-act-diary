# CI-Workflow: Qualitäts-Gate für `main`

Dieses Dokument beschreibt den GitHub-Actions-CI-Workflow und die Branch Protection Ruleset, die seit Etappe 0.2 aktiv sind.

## Was läuft wann?

| Trigger | Was passiert |
|---|---|
| Pull Request gegen `main` geöffnet oder aktualisiert | Job `Quality Checks` startet automatisch |
| `workflow_dispatch` im Actions-Tab | Manueller Lauf möglich |
| Direkter `git push origin main` | Wird von GitHub abgelehnt (`GH013`) |
| Push auf einen Feature-Branch (ohne PR) | Kein CI-Lauf (Budget-Entscheid) |

## Steps des Workflows

Der Workflow führt folgende Steps **sequenziell** aus (bricht beim ersten Fehler ab):

1. `npm ci` – reproduzierbares Dependency-Install
2. `npx prisma generate` – Prisma-Client-Typen generieren (kein DB-Zugang nötig)
3. `npx tsc --noEmit` – TypeScript-Typecheck
4. `npm run lint` – ESLint (Flat Config)
5. `npm run test:run` – Vitest (273 Tests)
6. `npm run build` – Next.js Production Build

**Keine Secrets erforderlich** – die App läuft seit Etappe 0.1 (env-lazy) ohne `.env`.

## Einen roten Run lesen

1. Auf GitHub: **Actions-Tab → Fehlgeschlagener Run** anklicken.
2. Den rot markierten Step aufklappen.
3. Fehlermeldung lesen und lokal reproduzieren:
   - Typecheck: `npx tsc --noEmit`
   - Lint: `npm run lint`
   - Tests: `npm run test:run`
   - Build: `npm run build`
4. Fehler beheben, auf denselben Feature-Branch committen und pushen – der Workflow startet automatisch neu.

## Der neue `main`-Workflow (ab Etappe 0.2)

> **Kein direkter Push auf `main` mehr möglich** – auch nicht als Admin.

Vor Etappe 0.2:
```bash
git checkout main
git merge feature/mein-feature
git push origin main   # ← funktioniert nicht mehr
```

Ab Etappe 0.2:
```bash
git checkout feature/mein-feature
git push origin feature/mein-feature
# → Pull Request auf GitHub öffnen
# → Quality Checks abwarten (grün)
# → PR mergen
git checkout main
git pull origin main
```

## Budget-Rationale

- GitHub Free Plan: 2000 Inklusiv-Minuten/Monat (ubuntu-Runner zählen 1:1).
- Erwartete Laufzeit pro PR: ~4 Minuten (erster Lauf 3:46 min; nach Cache-Aufwärmen etwas schneller).
- Kostenbremsen: `timeout-minutes: 20`, `concurrency.cancel-in-progress: true`, `npm`-Cache.

## Escape Hatch

Falls der CI dauerhaft rot ist und jeden Merge blockiert:

1. **Settings → Rules → Rulesets → Protect main → Edit → Enforcement: Disabled** – Ruleset deaktivieren.
2. Fehler beheben (direkt auf `main` pushen ist dann wieder möglich).
3. Ruleset wieder auf **Active** stellen.

> Diese Änderung ist jederzeit reversibel und hat keine Auswirkung auf Code oder Datenbankinhalt.
