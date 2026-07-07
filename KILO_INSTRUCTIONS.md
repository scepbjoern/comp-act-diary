# KILO_INSTRUCTIONS.md – Coding-Guide für comp-act-diary

> Diese Datei steuert, wie AI-Agenten (Kilo Code, Claude Code, Codex u. a.) in diesem Projekt arbeiten.
> Projektkontext (Was/Warum) → siehe `AGENTS.md`. Detaillierte Coding-Regeln → `docs/coding-guidelines/00-README.md` (verbindlich, kapitelweise nach Kontext lesen). Diese Datei ist der kompakte Einstieg und regelt den Workflow; bei Detailfragen gelten die Coding-Guidelines. Widersprüche bitte melden statt still zu entscheiden.

## Tech-Stack (nicht verhandelbar)

| Bereich | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| UI | React 18, Tailwind CSS 3 + DaisyUI 5, @tabler/icons-react |
| Formulare | React Hook Form + Zod (zodResolver) |
| ORM | Prisma 6 + PostgreSQL (Singleton: `lib/core/prisma.ts`, Zugriff via `getPrisma()`/`prisma`) |
| Auth | Eigenes Cookie-Login (`userId`-Cookie, bcrypt) hinter Cloudflare Access (Single-User) |
| REST API | Native Next.js Route Handlers (`app/api/**/route.ts`) + Zod-Validators aus `lib/validators/` |
| Services | Fachlogik in `lib/services/` (Route Handler bleiben dünn) |
| LLM/AI | Vercel AI SDK (`ai`, `@ai-sdk/*`) + OpenAI/TogetherAI/Deepgram/Mistral über `lib/core/ai.ts` |
| Karten | Mapbox (`react-map-gl`, `lib/services/mapboxService.ts`) |
| Logging | Pino über `lib/core/logger.ts` (kein `console.log` in Produktivcode) |
| Testing | Vitest (`__tests__/`, `npm run test:run`) |
| Deployment | Docker (standalone), siehe `docs/setup-and-testing_docs/DOCKER_OPERATIONS.md` |

**Verboten:** Redux, andere ORMs, andere CSS-Frameworks (nur Tailwind + DaisyUI), andere Icon-Libraries (nur Tabler), Prisma Migrations, `db:reset`/`--force-reset` gegen Datenbanken mit echten Daten, `new PrismaClient()` ausserhalb des Singletons.

## Sprache und Stil

- Antworten an den Nutzer: **Deutsch** mit Schweizer Rechtschreibung (ss statt ß); übliche Fachbegriffe/Library-Namen bleiben Englisch.
- UI-Texte: **Deutsch**
- Code: **TypeScript strict** (kein `any`, kein unbegründetes `as`)
- Kommentare: **Englisch**; jede neue Datei erhält einen kurzen Kopf-Kommentar, knifflige Stellen gezielte Inline-Kommentare
- Namen: ausführlich und selbsterklärend (`createJournalEntry`, `validateFormData`)
- Wenn mehrere Lösungswege möglich sind: den einfachsten umsetzen, Alternativen nur kurz nennen
- Shell-Befehle separat in ```bash```-Blöcken, mit einem Satz Zweck davor
- Keine Emojis, ausser explizit gewünscht

## Projektstruktur (Root-Layout, kein src/)

```
app/                # App Router: Seiten + app/api/**/route.ts
components/         # features/ (fachlich), layout/, shared/, ui/
hooks/              # Custom React Hooks
lib/
├── core/           # prisma.ts, logger.ts, ai.ts
├── services/       # Fachlogik (journal, tasks, locations, search, …)
├── validators/     # Zod-Schemas für API-Inputs
├── prm/            # Kontakte/Google-Integration
├── media/, audio/  # Medienverarbeitung
└── utils/          # Helfer (dates, sanitize, mentions, …)
prisma/             # schema.prisma (db push-Workflow), seed.ts
scripts/            # Migrations- und Wartungsscripts (tsx + esbuild-Bundles)
types/              # Geteilte TypeScript-Typen
__tests__/          # Vitest (components/, hooks/, lib/)
docs/               # PRD, Konzepte, Guidelines, docs/project/ (PIV-Artefakte)
```

## Next.js Konventionen

- Server Components als Standard; `'use client'` nur bei Interaktivität, Browser-APIs oder Hooks
- Datenänderungen laufen über Route Handler (`app/api/…`), die Services aus `lib/services/` aufrufen
- Keine Server Actions, die die eigene REST-API per `fetch` aufrufen – Services direkt verwenden
- Fehlerbehandlung: `try/catch` im Route Handler, Fehler via `logger.error`, deutsche Fehlermeldungen an die UI
- Jeder schreibende Endpunkt validiert den Body mit einem Zod-Schema aus `lib/validators/` (`safeParse`)
- Auth in Route Handlern: `userId`-Cookie prüfen und User auflösen; bei fehlender Session `401` zurückgeben (keinen Demo-User-Fallback neu einbauen)

## Datenbankzugriff (Prisma 6 + PostgreSQL)

- Import immer: `import { prisma } from '@/lib/core/prisma'` (bzw. `getPrisma()`)
- Schema-Änderungen: `npx prisma db push && npx prisma generate` – Details in `docs/setup-and-testing_docs/SCHEMA_WORKFLOW.md`
- **NIE** `npm run db:reset` oder `prisma db push --force-reset` gegen eine Datenbank mit echten Daten – die Produktions- und die lokale Dev-DB enthalten Produktivdaten
- Keine Prisma Migrations
- Datenmigrationen als Script unter `scripts/` nach `docs/coding-guidelines/07-migration-scripts.md`

## Testing (Vitest)

**Pflicht:** Bei jedem neuen Feature die zugehörigen Unit-Tests schreiben (Validators, Services, Utilities; UI-Komponenten wo sinnvoll).

- Tests: `__tests__/` (spiegelnde Struktur zu `lib/`, `components/`, `hooks/`)
- Befehle: `npm run test:run` (einmalig), `npm run test` (Watch)
- Zusätzliche Checks: `npx tsc --noEmit`, `npm run lint`, bei grösseren Änderungen `npm run build`
- Kein Playwright/E2E-Setup vorhanden – Laufzeitverhalten wird manuell geprüft (`npm run dev` startet der Nutzer)

## PIV-Loop (Plan → Implement → Validate)

1. **Plan** – Feature mit `/plan-feature [Feature]` planen. Root-`TASKS.md` bleibt Feature-Index; Details, Tasks und Akzeptanzkriterien liegen in `docs/project/features/[feature-name]/plan-v001.md`. Erkennt der Agent beim Planen einen PRD-Widerspruch, stoppt er und fordert `/update-prd [PRD-Pfad]` an.
2. **Review Plan** – Initialen Plan committen, in frischer Session mit `/review-feature-plan` prüfen, in der Autor-Session mit `/integrate-feature-plan-review` in eine neue Plan-Version überführen (typisch `plan-v002.md`).
3. **Implement** – `/execute docs/project/features/[feature-name]/plan-v002.md` setzt die Tasks autonom nacheinander um; gestoppt wird nur bei den definierten Stop-Bedingungen (fachliche Entscheidungen, Planabweichungen, ungeplante Schema-Änderungen, wiederholt fehlschlagende Validierung).
4. **Validate** – `npm run test:run`, `npx tsc --noEmit`, `npm run lint`; bei grösseren Änderungen `npm run build`. Manuelle Prüfung konsolidiert am Ende.
5. **Document** – Nach vollständiger Umsetzung mit `/document` Endanwender- und Entwicklerdokumentation erstellen; bei UI-/API-sichtbaren Features gehört dazu das In-App-Hilfe-System (`lib/help/`, siehe `docs/coding-guidelines/09-documentation.md`).
6. **Reflect bei Verdacht** – Nach `/document` in derselben Session mit `/reflect-rules` prüfen, ob Agent-Fehler, Planlücken oder wiederholte Korrekturen dauerhafte Regel-/Skill-Anpassungen erfordern.
7. **Commit** – Nach validierten Tasks oder Phasen darf `/commit` einen fokussierten Zwischencommit erstellen. Der finale Feature-Commit folgt nach `/document` (und ggf. `/reflect-rules`).

Details: `docs/PIV-WORKFLOW.md`

## Verfügbare PIV-Skills

Skills liegen in `.agents/skills/`. Aufruf per `/skill-name` im Chat. Nie automatisch aktivieren – immer nur auf expliziten Aufruf.

| Skill | Aufruf | PIV-Phase |
|---|---|---|
| prime | `/prime` | Session-Start: Projekt-Kontext laden |
| create-prd | `/create-prd [Dateiname]` | Plan: PRD-Entwurf als `v001` generieren |
| review-prd | `/review-prd [Pfad-zum-PRD]` | Plan: PRD in frischer Reviewer-Session kritisch prüfen |
| integrate-prd-review | `/integrate-prd-review [PRD] [Review]` | Plan: Review bewerten, neue PRD-Version erstellen |
| update-prd | `/update-prd [Pfad-zum-PRD]` | Plan: PRD versioniert aktualisieren |
| plan-feature | `/plan-feature [Feature]` | Plan: initialen Feature-Plan `plan-v001.md` erstellen |
| review-feature-plan | `/review-feature-plan [Pfad-zum-Plan]` | Plan: Feature-Plan in frischer Reviewer-Session prüfen |
| integrate-feature-plan-review | `/integrate-feature-plan-review [Plan] [Review]` | Plan: Review bewerten, neue Plan-Version erstellen |
| update-feature-plan | `/update-feature-plan [Pfad-zum-Plan]` | Plan: Feature-Plan versioniert aktualisieren |
| execute | `/execute [Pfad-zum-Plan]` | Implement: Tasks autonom umsetzen |
| document | `/document [Pfad-zum-Plan]` | Validate/Docs: Feature-Dokumentation erstellen |
| reflect-rules | `/reflect-rules [Pfad-zum-Plan]` | Validate/Retro: Agent-Regeln und Skills verbessern |
| commit | `/commit` | Commit: Konventionellen Commit erstellen |
| create-rules | `/create-rules` | Setup: Instructions-Dateien aktualisieren |
| init-project | `/init-project` | Setup: Lokale Entwicklungsumgebung einrichten |

## Wann stoppen und fragen?

Stoppe und frage **vor**:

- Prisma-Schema-Änderungen, die nicht im bestätigten Plan stehen
- Installation neuer npm-Pakete
- Löschen/Umbenennen bestehender Seiten oder Services
- Kritischen Architekturentscheidungen
- Jedem Befehl, der Daten löschen könnte (`--force-reset`, `DROP`, destruktive Scripts)

## Commit-Konventionen

- Conventional Commits 1.0.0: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, …
- Kein Commit ohne erfolgreiche oder begründet dokumentierte Validierung
- Kleine, fokussierte Zwischencommits nach validierten Tasks oder Phasen sind erwünscht
- Nach bestätigtem Commit wird auf den aktuellen Branch gepusht (`git push origin <branch>`)
- **Merges nach `main` laufen zwingend über einen Pull Request** (direkte `git push origin main` werden seit Etappe 0.2 von GitHub abgelehnt). Lokales `git merge + git push origin main` funktioniert für `main` nicht mehr – stattdessen Feature-Branch pushen und PR öffnen.
