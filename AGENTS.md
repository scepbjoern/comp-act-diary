# AGENTS.md – Projektkontext

> Coding-Regeln und Stack-Details: siehe `KILO_INSTRUCTIONS.md` und `docs/coding-guidelines/`

## Projektbeschreibung

CompACT Diary («Set. Track. Reflect. Act.») ist eine Mobile-first PWA für ein ACT-inspiriertes Tagebuch mit Reflexion und persönlicher Entwicklung. Kernfunktionen: tägliche Journal-Einträge mit Templates, KI-Transkription von Spracheingaben (Whisper/Deepgram/GPT-4o), OCR, KI-Tageszusammenfassungen, Habit- und Symptom-Tracking, Aufgaben aus Tagebucheinträgen, Volltextsuche (pg_trgm), Locations/Tracking mit Mapbox, persönliches Kontaktmanagement (PRM) mit optionalem Google-Kontakte-Sync sowie ein KI-Coach.

Fachliche Grundlage: `docs/PRD.md`; Datenmodell-Übersicht: `docs/data-model-architecture.md`; Konzept-Dokumente: `docs/concepts/` (umgesetzte unter `docs/concepts/implemented/`).

## Betriebskontext

- **Single-User-Betrieb:** Die App läuft hinter Cloudflare Access (Google OAuth, eine autorisierte E-Mail-Adresse). Interne Auth ist ein einfaches Cookie-Login.
- **Produktivdaten:** Die Datenbank enthält echte, persönliche Tagebuchdaten. Destruktive DB-Operationen sind tabu (kein `db:reset`, keine `--force-reset`, keine ungeprüften Massen-Updates).
- **Deployment:** Docker (standalone Build) auf eigenem Server; lokale Entwicklung mit Docker-PostgreSQL (`docker-compose_local.yml`).
- Webhook-Endpunkte (z. B. OwnTracks, Tasker) sind über Cloudflare-Bypass erreichbar und über gehashte Tokens (`webhookTokenService`) geschützt.

## Stack-Entscheidungen

Kerntechnologien: Next.js 15 · React 18 · Tailwind 3 + DaisyUI · Prisma 6 + PostgreSQL · Vercel AI SDK · Mapbox · Vitest · Docker

**Bewusste Abweichungen vom cas-prdig-starter-kit** (nicht «korrigieren»): PostgreSQL statt SQLite, DaisyUI statt shadcn/ui, eigenes Cookie-Login statt Better Auth, Docker-Deployment statt Port Forwarding. Hintergrund: `docs/reviews/2026-07_STACK_ALIGNMENT.md`.

**Verboten:** Redux, andere ORMs, andere CSS-Frameworks, andere Icon-Libraries, Prisma Migrations.

## Rollenkonzept

Single-User-App: Es gibt keine fachlichen Rollen. Mehrere DB-User existieren nur für geteilte Journal-Einträge (`journalEntryAccessService` mit Owner/Reader/Writer-Zugriff).

## Datenmodell

Zentrale Entitäten (Details in `prisma/schema.prisma`, ~2000 Zeilen, kommentiert):

- `User`, `TimeBox` (Tage/Zeiträume), `DayEntry`, `JournalEntry` + `JournalTemplate`/`JournalEntryType`
- `MediaAsset` (Audio/Fotos inkl. Transkripte), `Task`, `Habit`/`HabitCheckin`, Symptome
- `Entity`/Mentions (verknüpfbare Objekte), `Contact` + Gruppen/Interaktionen (PRM)
- `Location`/Tracking, `SyncProvider`/Webhook-Tokens, Kalender-Sync

## Testing-Ansatz

- **Vitest** für Unit-Tests (`__tests__/`): Validators, Services, Utilities, ausgewählte Komponenten – `npm run test:run`
- Kein E2E-Setup; Laufzeitprüfung manuell über `npm run dev`
- PIV-Loop: Plan → Review → Implement (autonom, `/execute`) → Validate (`npm run test:run`, `tsc`, `lint`, ggf. `build`) → Document → bei Verdacht Reflect → Commit

## Entwicklungsstand

Siehe `TASKS.md` (Feature-Index) und `docs/__PLANNED_FEATURES__.md` (Ideensammlung).
