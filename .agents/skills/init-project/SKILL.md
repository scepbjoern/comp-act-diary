---
name: init-project
description: >
  Guides through initializing a local comp-act-diary development environment, including skills setup, dependencies, environment variables, local PostgreSQL via Docker, Prisma client generation, and first login checks. Use it when setting up the project on a fresh machine. ONLY activate when the user explicitly runs /init-project or directly requests this specific workflow by name. Do NOT activate during normal development, planning, or implementation conversations.
compatibility: Next.js 15, React 18, Prisma 6, PostgreSQL, Tailwind 3 + DaisyUI
metadata:
  version: "1.0"
disable-model-invocation: true
---

> **KiloCode-Modus:** Dieser Skill muss im **Code-Modus** ausgeführt werden. Im Architect- oder Plan-Modus beschränkt KiloCode Schreibrechte auf `.kilo/`-Ordner – Initialisierungsschritte wie Datei-Anpassungen oder Konfiguration wären nicht möglich. Wechsle in KiloCode vor der Ausführung auf den **Code-Modus**.

# Init Project: Lokale Entwicklungsumgebung Einrichten

## Ziel

Richte comp-act-diary auf einer frischen Maschine für lokale Entwicklung ein. Das Produktions-Deployment läuft separat über Docker (siehe `docs/setup-and-testing_docs/DOCKER_OPERATIONS.md`) und ist nicht Teil dieses Workflows.

## Voraussetzungen Prüfen

Prüfe oder fordere den Nutzer auf zu prüfen:

- Node.js >= 20
- Docker (für die lokale PostgreSQL-Datenbank)
- Git und Zugriff auf das GitHub-Repository

## Setup-Schritte

### 1. Repository Klonen

```bash
git clone https://github.com/scepbjoern/comp-act-diary.git
cd comp-act-diary
```

### 2. Skills-Bridges Einrichten

```bash
npm run setup:skills
```

Hintergrund: `.agents/skills/` ist die Master-Quelle. Claude Code nutzt zusätzlich `.claude/skills/`, Kilo Code `.kilo/skills/` – beides Symlinks, die dieses Script anlegt. Danach das Tool/VS Code neu starten.

### 3. Dependencies Installieren

```bash
npm ci
```

### 4. Environment Einrichten

```bash
cp .env.example .env
```

Der Nutzer öffnet `.env` und trägt mindestens ein:

- `DATABASE_URL` (lokal: `postgresql://postgres:postgres@localhost:5432/comp-act-diary?schema=public`)
- `OPENAI_API_KEY` und `TOGETHERAI_API_KEY` (von der Env-Validierung verlangt)
- `MAPBOX_ACCESS_TOKEN` (von der Env-Validierung verlangt)
- optional: `DEEPGRAM_API_KEY`, `MISTRAL_API_KEY`, Google-OAuth-Werte für den Kontakt-Sync

### 5. Lokale Datenbank Starten

```bash
docker compose -f docker-compose_local.yml up -d
```

### 6. Schema Anwenden und Client Generieren

```bash
npx prisma db push
npx prisma generate
```

Nur auf der **leeren lokalen** Datenbank darf zusätzlich der Seed laufen:

```bash
npm run db:seed
```

**Achtung:** `npm run db:reset` niemals gegen eine Datenbank mit echten Daten ausführen – der Befehl löscht alle Daten (`--force-reset`).

### 7. App Starten

```bash
npm run dev
```

### 8. Login Prüfen

Im Browser `http://localhost:3000` öffnen. Nach dem Seed existiert der Benutzer `demo` (Passwort gemäss `prisma/seed.ts`). Erwartung:

- Login funktioniert und leitet auf die Tagesansicht.
- Journal-Seite lädt ohne Fehler.

## Entwicklungsregeln nach Setup

- Schema-Änderungen laufen über `npx prisma db push && npx prisma generate` (siehe `docs/setup-and-testing_docs/SCHEMA_WORKFLOW.md`). Keine Prisma Migrations, nie `db:reset` gegen echte Daten.
- Neue Features mit `/plan-feature` planen, `plan-v001.md` committen, in frischer Session mit `/review-feature-plan` prüfen, in der Autor-Session mit `/integrate-feature-plan-review` in eine neue Plan-Version überführen, dann mit `/execute` umsetzen.
- Root-`TASKS.md` bleibt Feature-Index; Detailtasks liegen in `docs/project/features/[feature-name]/plan-vNNN.md`.

## Output

Gib am Ende aus:

- Welche Setup-Schritte erledigt wurden
- Welche Schritte der Nutzer noch manuell ausführen muss (insbesondere `.env`-Werte)
- Ob der Login geprüft wurde
