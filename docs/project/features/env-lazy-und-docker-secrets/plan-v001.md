# Plan: Env-Validierung lazy machen und Docker-Build von Secrets entkoppeln

## Status

**Feature-Status:** planned
**Erstellt:** 2026-07-07
**Plan-Version:** v001
**Quelle:** `docs/project/ROADMAP.md` Etappe 0.1; `docs/reviews/2026-07_CODE_REVIEW.md` Befund 4
**Confidence Score:** 9/10 – mechanische, gut abgegrenzte Änderung; die kritischen Annahmen (PrismaClient-Konstruktor wirft nicht ohne `DATABASE_URL`; `@prisma/client` lädt `.env` selbst) wurden während der Planung empirisch verifiziert. Restrisiko: Docker-Build kann nur manuell/optional validiert werden.

## Feature Metadata

| Feld | Wert |
|---|---|
| Feature-Typ | Refactor (Infrastruktur/Konfiguration) |
| Plan-Version | v001 |
| Komplexität | Medium |
| Primär betroffene Systeme | Env-Konfiguration (`lib/config/`), Prisma-Singleton, Docker/Deploy, Tests |
| Abhängigkeiten | Keine neuen Packages. Entscheide bestätigt: Fail-Fast via `instrumentation.ts`; `MAPBOX_ACCESS_TOKEN` wird optional |

## Plan-Änderungshistorie

| Version | Datum | Anlass | Kurzbeschreibung |
|---|---|---|---|
| v001 | 2026-07-07 | Initiale Planung | Erster Feature-Plan erstellt |

## Feature Description

Die Env-Validierung in `lib/config/env.ts` läuft heute beim Modul-Import (`export const env = validateEnv()`) und wird als Seiteneffekt von `lib/core/prisma.ts:2` in praktisch jeden Server-Codepfad gezogen. Dadurch:

1. schlägt `next build` ohne echte API-Keys fehl,
2. übergibt das `Dockerfile` deshalb Secrets als `ARG`/`ENV` in die deps-/build-Stages – **die Secrets liegen dauerhaft in den Image-Layern** (`docker history` zeigt sie),
3. lädt mindestens eine Vitest-Testdatei (`__tests__/lib/services/locationService.test.ts` → `locationService` → `prisma.ts` → `env.ts`) in Umgebungen ohne `.env` nicht – der Blocker für den CI-Workflow (Etappe 0.2).

Der Umbau: Validierung wird zu einer memoisierten Funktion `getEnv()`, der Seiteneffekt-Import im Prisma-Singleton entfällt, Fail-Fast beim Serverstart übernimmt eine neue `instrumentation.ts`. Danach werden alle Secret-`ARG`s/`ENV`s aus den Docker-Build-Stages und den Compose-`build.args` entfernt; Secrets kommen nur noch zur Laufzeit über die Compose-`environment`-Blöcke in den Container. Tote `NEXTAUTH_*`-Reste und die DEBUG-Blöcke im Dockerfile werden mitentfernt.

## User Story

```text
Als Betreiber der App
möchte ich, dass Secrets ausschliesslich zur Laufzeit in den Container gelangen und Build/Tests ohne echte Keys laufen,
damit keine API-Keys in Docker-Image-Layern liegen und ein CI-Workflow (Etappe 0.2) möglich wird.
```

## Problem Statement

Import-Zeit-Validierung koppelt Secrets an die Build-Zeit: Secrets landen in Image-Layern, `next build` und Vitest funktionieren nicht ohne echte Keys. Das blockiert CI (Review-Befund 5 / Etappe 0.2) und ist ein Security-Smell (Review-Befund 4).

## Solution Statement

Lazy-Validierung via memoisiertem `getEnv()` + expliziter Fail-Fast-Aufruf beim Serverstart über `instrumentation.ts` (Next.js 15, stabil). Docker-Build braucht danach keine Secrets mehr; nur der bewusst öffentliche `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` bleibt Build-Arg (Client-Bundle-Inlining).

## Scope

### Im Scope

- `lib/config/env.ts`: Top-Level-Parse → memoisiertes `getEnv()`; `MAPBOX_ACCESS_TOKEN` optional
- `lib/core/prisma.ts`: Seiteneffekt-Import `import '@/lib/config/env'` entfernen
- Neue `instrumentation.ts` (Root) mit Startup-Validierung
- Neue Unit-Tests `__tests__/lib/config/env.test.ts`
- `Dockerfile`: Secret-`ARG`s/`ENV`s aus deps- und build-Stage entfernen, `NEXTAUTH_*`-Reste und DEBUG-Blöcke entfernen
- `deploy/docker-compose.prod.yml` + `deploy/docker-compose.demo.yml`: Secret-`build.args` entfernen
- Guideline-Snippets aktualisieren (`docs/coding-guidelines/03-typescript-quality.md`, `08-error-handling-logging.md`)

### Nicht im Scope

- CI-Workflow selbst (Etappe 0.2, separates Feature; setzt dieses hier voraus)
- Migration der Services von direktem `process.env`-Zugriff auf `getEnv()` (heute konsumiert kein Code das `env`-Export; eine breite Umstellung wäre ein eigenes Refactoring)
- Auth-/`NEXTAUTH`-Themen über das Entfernen toter Dockerfile-Zeilen hinaus (Etappe 1)
- Upload-Härtung, Paket-Hygiene (Etappen 0.4/0.5)
- `deploy/docker-compose.restore-test.yml` (enthält keinen `build:`-Block)

## Rollen und Berechtigungen

Nicht relevant – reine Infrastruktur-/Konfigurationsänderung ohne Auswirkung auf Zugriffsregeln oder geteilte Einträge.

## Context References

### Pflichtlektüre vor Umsetzung

- `lib/config/env.ts` – Warum: die zu refaktorierende Datei; Schema und Fehlerausgabe bleiben inhaltlich erhalten (bis auf Mapbox-optional)
- `lib/core/prisma.ts` – Warum: Zeile 2 (Seiteneffekt-Import) entfällt; Singleton-Struktur bleibt unverändert
- `docs/reviews/2026-07_CODE_REVIEW.md` Befund 4 (Zeilen 83–99) – Warum: Begründung und empfohlene Lösung
- `Dockerfile` – Warum: deps-Stage Zeilen 23–35 (Secret-ARGs/ENVs), Zeilen 40–46 (DEBUG-Block), build-Stage Zeilen 82–97 (Secret-ARGs/ENVs)
- `deploy/docker-compose.prod.yml` Zeilen 28–40 und `deploy/docker-compose.demo.yml` Zeilen 37–47 – Warum: `build.args` mit Secrets, die entfallen; `environment`-Blöcke bleiben unangetastet
- `__tests__/lib/validators/task.test.ts` – Warum: bestehendes Vitest-Pattern (describe/it/expect, Pfad-Spiegelung) für die neuen env-Tests
- `vitest.config.ts` + `vitest.setup.ts` – Warum: Test-Umgebung (jsdom, globals, Alias `@`); kein `.env`-Loading im Setup

### Relevante Dokumentation

- [Next.js: instrumentation.ts](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) – Warum: `register()` läuft einmal beim Bootstrap einer Server-Instanz; in Next 15 stabil, kein experimental-Flag nötig; Guard über `process.env.NEXT_RUNTIME === 'nodejs'` ist das dokumentierte Muster
- [Docker: Build secrets](https://docs.docker.com/build/building/secrets/) – Warum: bestätigt, dass `ARG`/`ENV` in Image-Layern sichtbar bleiben (`docker history`) und deshalb kein Secret-Transportmittel sind
- [Vitest: vi.stubEnv / vi.resetModules](https://vitest.dev/api/vi.html#vi-stubenv) – Warum: sauberes Pattern, um `process.env` und die Memoisierung pro Test zu isolieren

## Codebase Intelligence

### Projektstruktur und Architektur

- `lib/config/env.ts` exportiert heute `env` (eager) und `Env` (Typ). **Empirisch verifiziert: Kein Code im Repo importiert das `env`-Export** – einziger Verweis ist der Seiteneffekt-Import in `lib/core/prisma.ts:2`. Alle Services lesen `process.env` direkt (z. B. `lib/services/mapboxService.ts:212`, `lib/media/ocr.ts:121` – beide mit eigener Laufzeitprüfung und klarer Fehlermeldung).
- Es existiert keine `instrumentation.ts`; Projekt nutzt Root-Layout ohne `src/`.
- `vitest.setup.ts` importiert nur `@testing-library/jest-dom`; Vitest lädt keine `.env`.
- `.github/workflows/` enthält nur `release-please.yml` – der künftige CI-Workflow (0.2) hängt von diesem Feature ab.

### Empirisch verifizierte Fakten (während Planung getestet)

1. **`new PrismaClient()` wirft NICHT, wenn `DATABASE_URL` fehlt** (Node-Test gegen `node_modules/@prisma/client`, Prisma 6.19). Der Fehler kommt erst bei der ersten Query. → Das eager Singleton `export const prisma = getPrisma()` in `prisma.ts:19` kann unverändert bleiben; Testdateien laden nach Entfernen des env-Imports auch ohne `.env`.
2. **`@prisma/client` lädt die `.env` des Projekts beim Import selbst nach** (dotenv-Verhalten des generierten Clients). → Lokale Test-/Buildläufe maskieren CI-Fehler. Die Abschlussvalidierung muss deshalb mit temporär umbenannter `.env` laufen (CI-Simulation).

### Patterns to Follow

- Naming: ausführliche, selbsterklärende Funktionsnamen (`getEnv`, nicht `env()`)
- Datei-Organisation: Tests spiegeln `lib/`-Struktur → `__tests__/lib/config/env.test.ts`
- Fehlerbehandlung: `console.error` in `env.ts` bleibt bewusst bestehen – die Validierung läuft in der Startphase, bevor Feature-Code den Pino-Logger nutzt; zudem läuft `instrumentation.ts` ausserhalb der Request-Pfade (kurzer Kommentar im Code begründet das)
- Kommentare: Englisch, Kopf-Kommentar pro Datei
- Lazy-Guard-Pattern wie `getAccessToken()` in `lib/services/mapboxService.ts:211-217` und `getMistralClient()` in `lib/media/ocr.ts:120-126`

### Anti-Patterns to Avoid

- Kein `new PrismaClient()` ausserhalb des Singletons; das Singleton selbst nicht umbauen (kein Proxy nötig, siehe verifizierte Fakten)
- Keine parallele zweite Env-Abstraktion; `getEnv()` ersetzt das bisherige `env`-Export vollständig
- Keine Prisma Migrations, kein `db:reset` – hier ohnehin keine Schema-Änderung
- Nicht `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` aus dem Docker-Build entfernen – der wird zur Build-Zeit ins Client-Bundle geinlined und ist bewusst öffentlich

### Dependency Analysis

- `zod@^3.23.8` (v3-API: `error.errors`; **nicht** die Zod-4-API verwenden – Zod 4 kommt erst in Etappe 2.6)
- `next@^15.5.2`: `instrumentation.ts` ist stabil, kein `experimental.instrumentationHook` nötig
- Keine neuen Packages

### Testing Patterns

- Vitest mit `globals: true`, Struktur wie `__tests__/lib/validators/task.test.ts`
- Für Memoisierungs-Tests: `vi.resetModules()` + dynamischer `await import('@/lib/config/env')` pro Test, `vi.stubEnv()`/`vi.unstubAllEnvs()` für `process.env`-Isolation

## Architekturentscheidungen

### Gewählter Ansatz

1. `getEnv()` mit Modul-lokaler Memoisierung ersetzt das eager `env`-Export; `Env`-Typ bleibt exportiert.
2. `instrumentation.ts` (Root) ruft `getEnv()` beim Serverstart auf – Fail-Fast-Verhalten wie heute, aber ohne Build-Zeit-Kopplung. Guards: nur `NEXT_RUNTIME === 'nodejs'` (nicht Edge) und nicht während `NEXT_PHASE === 'phase-production-build'`.
3. `MAPBOX_ACCESS_TOKEN` wird `optional()` – konsistent mit den Compose-Dateien (`${MAPBOX_ACCESS_TOKEN:-}`) und der bestehenden Laufzeitprüfung in `mapboxService.ts`. `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `DATABASE_URL` bleiben required.
4. Docker: Build-Stages erhalten keinerlei Secrets mehr; Laufzeit-Injektion via Compose-`environment` bleibt wie gehabt.

Beide Grundsatzentscheide (instrumentation.ts, Mapbox optional) wurden am 2026-07-07 vom Nutzer bestätigt.

### Erwogene Alternativen

- **Nur lazy `getEnv()` ohne Startvalidierung** – verworfen: kein Code ruft `getEnv()` bisher auf, die Validierung würde faktisch nie laufen; fehlende Secrets fielen erst mitten im Betrieb auf.
- **Validierung nur bei `NODE_ENV !== 'test'` im Modul-Import behalten** – verworfen: löst das Docker-Problem nicht (`next build` läuft mit `NODE_ENV=production`).
- **Prisma-Singleton auf Proxy-Lazy umbauen** – unnötig, da der Konstruktor ohne `DATABASE_URL` nachweislich nicht wirft.
- **Docker BuildKit-Secrets (`--mount=type=secret`)** – unnötig, sobald der Build gar keine Secrets mehr braucht.

### Security, Performance, Maintainability

- Security: Kernziel – keine Secrets in Image-Layern; tote `NEXTAUTH_*`-Variablen verschwinden; keine Verhaltensänderung an Auth/Zugriff
- Performance: Memoisierung = einmaliger Parse pro Prozess; keine messbare Änderung
- Maintainability: eine klare Stelle für Env-Anforderungen; Startup-Validierung explizit statt als Import-Nebenwirkung versteckt

## Datenmodell und Prisma

Keine Schema-Änderung. `lib/core/prisma.ts` verliert nur den Seiteneffekt-Import (Zeile 2); Singleton-Logik unverändert.

## Betroffene Dateien

### Bestehende Dateien

- `lib/config/env.ts` – REFACTOR: `getEnv()` memoisiert statt Top-Level-Parse; `MAPBOX_ACCESS_TOKEN` optional
- `lib/core/prisma.ts` – UPDATE: Zeile 2 (`import '@/lib/config/env'`) entfernen
- `Dockerfile` – UPDATE: Secret-ARGs/ENVs (deps: Z. 23–35, build: Z. 82–97) auf Nicht-Secrets reduzieren; DEBUG-Block Z. 40–46 entfernen
- `deploy/docker-compose.prod.yml` – UPDATE: `build.args` ohne `DATABASE_URL`, `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `MAPBOX_ACCESS_TOKEN`
- `deploy/docker-compose.demo.yml` – UPDATE: analog prod
- `docs/coding-guidelines/03-typescript-quality.md` (~Z. 105) – UPDATE: env-Snippet auf `getEnv()`-Pattern
- `docs/coding-guidelines/08-error-handling-logging.md` (~Z. 178) – UPDATE: «validiert beim Start» → instrumentation-Pattern

### Neue Dateien

- `instrumentation.ts` (Root) – Startup-Validierung via `register()`; Next.js-Konvention, einziger Ort für prozessweite Bootstrap-Checks
- `__tests__/lib/config/env.test.ts` – Unit-Tests für Schema, Memoisierung und Fehlerfall (bisher ungetestet)

## Implementation Plan

### Phase 1: Foundation

Env-Modul lazy machen und vom Prisma-Singleton entkoppeln – danach laden alle Module ohne Secrets.

### Phase 2: Core Implementation

`instrumentation.ts` stellt das Fail-Fast-Verhalten zur Laufzeit wieder her.

### Phase 3: Integration

Dockerfile und Compose-Dateien von Build-Secrets befreien; tote Reste und DEBUG-Blöcke entfernen.

### Phase 4: Testing and Validation

Guideline-Snippets nachziehen; Gesamtvalidierung inkl. CI-Simulation (Testlauf + Build mit temporär umbenannter `.env`).

## Step-by-Step Tasks

### Task 1: REFACTOR `lib/config/env.ts` auf memoisiertes `getEnv()` und Prisma-Entkopplung

**Status:** done
**Ziel:** Kein Modul-Import löst mehr eine Env-Validierung aus; `getEnv()` validiert beim ersten Aufruf und memoisiert.
**IMPLEMENT:**

- `export const env = validateEnv()` ersetzen durch:

```ts
let cachedEnv: Env | null = null

/** Validates and returns environment variables. Memoized after first call. */
export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv()
  }
  return cachedEnv
}
```

- `MAPBOX_ACCESS_TOKEN: z.string().min(1, …)` → `z.string().optional()` (Begründung als Kommentar: Compose behandelt den Token als optional, `mapboxService.getAccessToken()` prüft zur Laufzeit)
- `export type Env = z.infer<typeof envSchema>` bleibt; `validateEnv()` inkl. `console.error`-Ausgabe bleibt (Kommentar ergänzen: läuft vor Logger-Init in der Startphase, deshalb bewusst `console.error`)
- In `lib/core/prisma.ts` Zeile 2 `import '@/lib/config/env'` ersatzlos entfernen
- CREATE `__tests__/lib/config/env.test.ts` mit mindestens: (a) gültige Env → `getEnv()` liefert geparste Werte, (b) fehlender `OPENAI_API_KEY` → wirft `Environment validation failed`, (c) fehlender `MAPBOX_ACCESS_TOKEN` → wirft NICHT, (d) Memoisierung: zweiter Aufruf parst nicht erneut (z. B. Env zwischen den Aufrufen verändern und prüfen, dass das Ergebnis stabil bleibt). Pattern: `vi.resetModules()` + `await import('@/lib/config/env')` pro Test, `vi.stubEnv`/`vi.unstubAllEnvs` in `beforeEach`/`afterEach`

**PATTERN:** Lazy-Guard wie `lib/services/mapboxService.ts:211-217`; Teststruktur wie `__tests__/lib/validators/task.test.ts`
**IMPORTS:** unverändert `zod`; Tests: `vitest` (`describe/it/expect/vi`)
**GOTCHA:** Zod v3-API (`error.errors`), nicht Zod 4. `DATABASE_URL` hat `z.string().url()` – in Tests eine syntaktisch gültige URL stubben. Vitest setzt `NODE_ENV=test`; da nichts mehr beim Import parst, ist kein Test-Guard nötig.
- [x] Kein Top-Level-Parse mehr in `env.ts`; `getEnv()` memoisiert
- [x] `lib/core/prisma.ts` importiert `lib/config/env` nicht mehr
- [x] Repo-weit existiert kein Verweis mehr auf das alte `env`-Export (`grep -r "from '@/lib/config/env'"` liefert nur Typ-/`getEnv`-Importe)
- [x] Neue Tests decken Erfolgsfall, Fehlerfall, Mapbox-optional und Memoisierung ab

**VALIDATE:**

- Automatisiert:
  - `npm run test:run` (vitest): Alle 273 Tests in 19 Testdateien erfolgreich bestanden (inklusive der neuen `env.test.ts`).
  - `npx tsc --noEmit`: Erfolgreich ohne Typerrormeldungen durchgelaufen.
  - `npm run lint`: Erfolgreich ohne Warnungen oder Fehler durchgelaufen.
- Manuell: Keine manuelle Prüfung erforderlich

### Task 2: CREATE `instrumentation.ts` mit Startup-Validierung

**Status:** done
**Ziel:** Fehlende Pflicht-Variablen crashen den Server beim Start mit klarer Meldung – nicht erst beim ersten Feature-Aufruf.
**IMPLEMENT:** Neue Datei `instrumentation.ts` im Projekt-Root (neben `middleware.ts`):

```ts
// Next.js instrumentation hook: runs once when a server instance boots.
// Validates required environment variables (fail-fast at runtime, not at build time).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const { getEnv } = await import('@/lib/config/env')
    getEnv()
  }
}
```

**PATTERN:** Next.js-Konvention (siehe Doku-Link oben); dynamischer Import gemäss Next-Empfehlung, damit Node-only-Code nicht in den Edge-Bundle-Graph gerät
**IMPORTS:** nur dynamisch `@/lib/config/env`
**GOTCHA:** `register()` läuft auch bei `next dev`. Der `NEXT_PHASE`-Guard ist eine Defensivmassnahme für den Fall, dass der Build den Hook lädt – er darf den Produktions-Start (`next start`, dort ist `NEXT_PHASE` nicht gesetzt) nicht blockieren. In Next 15 ist kein `experimental.instrumentationHook`-Flag in `next.config.mjs` nötig.
- [x] `npm run dev` mit vollständiger `.env` startet fehlerfrei und die App funktioniert
- [x] Ohne `OPENAI_API_KEY` bricht der Serverstart mit der Fehlermeldung aus `validateEnv()` ab (Variablenliste sichtbar)
- [x] `npm run build` läuft weiterhin ohne echte Secrets durch (wird in Task 4 final geprüft)

**VALIDATE:**

- Automatisiert:
  - `npx tsc --noEmit`: Erfolgreich ohne Typerrormeldungen durchgelaufen.
  - `npm run lint`: Erfolgreich ohne Warnungen oder Fehler durchgelaufen.
- Manuell:
  - `.env` in `.env.bak` umbenannt und `npm run dev` gestartet. Erwartet fehlgeschlagen: Die Zod-Validierung bricht ab und listet `DATABASE_URL`, `OPENAI_API_KEY` und `TOGETHERAI_API_KEY` als fehlend auf.
  - `.env` wiederhergestellt und `npm run dev` gestartet. Erfolgreich gestartet, `/instrumentation` kompiliert und Server bereit in 5.4s.

### Task 3: UPDATE `Dockerfile` und Compose-Dateien – Build von Secrets entkoppeln

**Status:** done
**Ziel:** Kein Secret erreicht die Build-Stages; `docker history` zeigt keine Keys mehr; DEBUG- und `NEXTAUTH_*`-Reste sind weg.
**IMPLEMENT:**

- `Dockerfile` deps-Stage: `ARG`/`ENV` für `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` entfernen (Z. 23–35). `ARG CACHEBUST` und die Proxy-ARGs bleiben. Den DEBUG-Block `RUN echo "=== DEBUG: …" && cat package-lock.json …` (Z. 40–46) ersatzlos entfernen
- `Dockerfile` build-Stage: `ARG`/`ENV` für `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `MAPBOX_ACCESS_TOKEN` entfernen (Z. 82–97). **Behalten:** `ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` + zugehöriges `ENV` (wird ins Client-Bundle geinlined, bewusst öffentlich)
- `deploy/docker-compose.prod.yml`: aus `build.args` die Zeilen `DATABASE_URL`, `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `MAPBOX_ACCESS_TOKEN` entfernen (Z. 34–37); `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, Proxy-Args, `UID`/`GID` bleiben. Den `environment`-Block NICHT anfassen
- `deploy/docker-compose.demo.yml`: analog (Z. 43–46)

**PATTERN:** Laufzeit-Injektion via Compose-`environment` existiert bereits vollständig (prod Z. 45–82) – es wird nichts Neues gebaut, nur der Build-Pfad beschnitten
**IMPORTS:** Nicht relevant
**GOTCHA:** `npx prisma generate` (deps-Stage) braucht keine `DATABASE_URL`. `npm run build` braucht nach Task 1 keine Secrets mehr. `${MAPBOX_ACCESS_TOKEN:-}`-Syntax nur bei den zu löschenden Zeilen entfernen, Rest der YAML-Struktur unverändert lassen. `deploy/docker-compose.restore-test.yml` hat keinen `build:`-Block – nicht anfassen.
- [x] `grep -E "OPENAI|TOGETHERAI|NEXTAUTH|^ARG DATABASE|MAPBOX_ACCESS_TOKEN" Dockerfile` trifft nur noch `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- [x] Kein DEBUG-`cat package-lock.json`-Block mehr im Dockerfile
- [x] Beide Compose-Dateien: `build.args` ohne Secrets, `environment`-Blöcke unverändert (git diff prüfen)

**VALIDATE:**

- Automatisiert: Keine (von tsc/lint/vitest nicht abgedeckt).
- Manuell:
  - Git diff verifiziert: Secrets und debug blocks aus `Dockerfile` und `build.args` der Compose-Dateien entfernt.
  - Mit `Select-String` (grep) geprüft: Nur noch `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` wird im Dockerfile deklariert. `environment`-Blöcke sind unberührt geblieben.

### Task 4: UPDATE Guideline-Snippets und Gesamtvalidierung (CI-Simulation)

**Status:** done
**Ziel:** Dokumentation beschreibt das neue Pattern; nachgewiesen ist, dass Tests und Build ohne `.env` funktionieren (die eigentliche Definition of Done dieses Features).
**IMPLEMENT:**

- `docs/coding-guidelines/03-typescript-quality.md` (~Z. 105): env-Beispiel auf `getEnv()`-Pattern mit Memoisierung umschreiben
- `docs/coding-guidelines/08-error-handling-logging.md` (~Z. 178): Aussage «`lib/config/env.ts` validiert beim Start» präzisieren: Validierung erfolgt lazy via `getEnv()`, Fail-Fast beim Serverstart via `instrumentation.ts`
- Beide Stellen vorher lesen und im bestehenden Stil (Deutsch, knappe Codeblöcke) anpassen

**PATTERN:** Bestehender Guideline-Stil (kapitelweise, kurze TS-Snippets)
**IMPORTS:** Nicht relevant
**GOTCHA:** `@prisma/client` lädt die Projekt-`.env` beim Import selbst nach (empirisch verifiziert) – deshalb ist die CI-Simulation mit umbenannter `.env` zwingend; ein normaler lokaler Testlauf beweist nichts.
- [x] Beide Guideline-Stellen beschreiben das neue Pattern korrekt
- [x] Vollständige Testsuite lädt und ist grün OHNE `.env` (CI-Simulation)
- [x] `npm run build` läuft OHNE `.env` durch

**VALIDATE:**

- Automatisiert (CI-Simulation erfolgreich durchgeführt):
  1. `.env` umbenannt in `.env.bak`.
  2. `npm run test:run` ohne `.env` ausgeführt: Alle 273 Tests in 19 Testdateien erfolgreich (keine blockernden Ladefehler in LocationService-Tests).
  3. `npm run build` ohne `.env` ausgeführt: Erfolgreicher Produktions-Build ohne Env-Validierungsfehler durchgeführt.
  4. `.env` wiederhergestellt.
  5. `npm run test:run`, `npx tsc --noEmit` und `npm run lint` mit `.env` ausgeführt: Alles grün und ohne Fehler.
- Manuell: Keine manuelle Prüfung erforderlich (Laufzeitprüfung erfolgte in Task 2).

## Testing Strategy

### Unit Tests

Neu: `__tests__/lib/config/env.test.ts` (Schema-Erfolg, Pflichtfeld-Fehler, Mapbox-optional, Memoisierung) – die Datei war bisher ungetestet. Pattern: `vi.resetModules()` + dynamischer Import, `vi.stubEnv`.

### E2E Tests

Nicht vorhanden in diesem Projekt (kein E2E-Setup). Laufzeitverhalten wird über die manuellen Schritte in Task 2 geprüft.

### Regression Tests

Die bestehenden 250 Vitest-Tests sind die Regressionssuite; besonders relevant: `__tests__/lib/services/locationService.test.ts` muss weiterhin (und neu auch ohne `.env`) laden. Kein Test importiert das alte `env`-Export – keine Testanpassungen an Bestandstests nötig.

### Edge Cases

- `.env` fehlt komplett → Tests/Build grün, Serverstart schlägt kontrolliert fehl (gewollt)
- `MAPBOX_ACCESS_TOKEN` leer → Start ok; Geocoding-Aufrufe liefern den bestehenden `mapboxService`-Fehler
- `DATABASE_URL` fehlt zur Laufzeit → `instrumentation.ts` meldet sie beim Start (vorher: kryptischer Prisma-Fehler bei erster Query)
- Edge-Runtime (Middleware) → `register()`-Guard verhindert Node-only-Import
- Doppelter `getEnv()`-Aufruf → memoisiert, kein Doppel-Parse

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

Zusätzlich als Feature-spezifischer Kernnachweis die CI-Simulation aus Task 4 (Testlauf + Build mit umbenannter `.env`).

### Level 4: Manual Validation

Siehe Task 2 (dev-Start mit/ohne `.env`) und Task 3 (optionaler Docker-Build ohne Secrets).

## Acceptance Criteria

- [ ] `npm run test:run` und `npm run build` funktionieren ohne `.env`/Secrets (CI-fähig, Voraussetzung für Etappe 0.2)
- [ ] Serverstart ohne Pflicht-Variablen schlägt mit klarer Fehlermeldung fehl (`instrumentation.ts`)
- [ ] Dockerfile-Build-Stages enthalten keine Secret-`ARG`s/`ENV`s mehr; `NEXTAUTH_*` und DEBUG-Blöcke entfernt
- [ ] Compose-`build.args` ohne Secrets; Laufzeit-`environment` unverändert
- [ ] `MAPBOX_ACCESS_TOKEN` optional; `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` weiterhin Build-Arg
- [ ] Neue Unit-Tests für `getEnv()` grün; alle Bestandstests grün
- [ ] Guideline-Snippets (03, 08) aktualisiert
- [ ] Keine Regressionen: App startet und funktioniert mit vollständiger `.env` wie bisher

## Completion Checklist

- [x] Alle Tasks sind umgesetzt
- [x] Jeder Task wurde validiert
- [x] Alle relevanten Tests laufen erfolgreich oder Ausnahmen sind begründet
- [x] `npm run build` wurde ausgeführt (inkl. CI-Simulation ohne `.env`)
- [x] Manuelle Prüfung ist dokumentiert
- [x] Plan-/PRD-Abweichungen sind dokumentiert und genehmigt
- [x] Feature ist bereit für `/document` und `/commit`

## Documentation Notes

- Entwicklerdoku: Guideline-Updates (03, 08) sind Teil von Task 4. `/document` soll zusätzlich prüfen, ob `docs/setup-and-testing_docs/DOCKER_OPERATIONS.md` Build-Anweisungen mit Secret-Args enthält und diese nachziehen.
- Endanwender-/In-App-Hilfe (`lib/help/`): Nicht relevant – keine UI- oder API-sichtbare Änderung.

## Notes and Trade-offs

- Das `env`-Export war toter Code (kein Konsument) – die Umstellung auf `getEnv()` ist deshalb bruchfrei. Eine spätere Migration der Services von `process.env.X` auf `getEnv().X` wäre sinnvoll («bei Berührung»), ist aber bewusst nicht Teil dieses Features.
- `MAPBOX_ACCESS_TOKEN` optional zu machen lockert den Fail-Fast leicht; das entspricht aber dem realen Deployment (Compose-Default leer) und der vorhandenen Laufzeitprüfung.
- Der `NEXT_PHASE`-Guard in `instrumentation.ts` ist defensiv; sollte sich zeigen, dass Next 15 den Hook beim Build nie ausführt, ist er harmlos-redundant.
- Nach diesem Feature kann Etappe 0.2 (CI-Workflow) ohne Secrets im Workflow-File umgesetzt werden.

## Offene Fragen

- Keine – die beiden Architekturfragen (Fail-Fast-Trigger, Mapbox-Optionalität) wurden am 2026-07-07 vom Nutzer entschieden.

## Plan Review Notes

Nicht relevant (initiale Version v001; wird durch `/integrate-feature-plan-review` ergänzt).
