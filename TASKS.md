# TASKS.md – Feature-Index

Diese Datei ist der grobe Feature-Index für den PIV-Workflow. Detailtasks, Status und Validierung liegen in den Plan-Dateien unter `docs/project/features/[feature-name]/plan-vNNN.md`.

Status-Werte: `planned` | `in_progress` | `done` | `paused`

| Feature | Status | Schema | Plan | Datum |
|---|---|---|---|---|
| Etappe 0.1: env-lazy-und-docker-secrets (Env-Validierung lazy, Docker-Build ohne Secrets) | planned | nein | `docs/project/features/env-lazy-und-docker-secrets/plan-v001.md` | 2026-07-07 |
| Etappe 0 (Rest): Review-Quick-Wins (CI, actions→Services, Upload-Härtung, Hygiene) | planned | – | siehe `docs/project/ROADMAP.md` | 2026-07-06 |
| Etappe 1: Better Auth komplett (inkl. zentralem Session-Helper, Demo-Fallback weg) | planned | – | siehe `docs/project/ROADMAP.md` | 2026-07-06 |
| Etappe 2: Framework-Basis (Playwright → src/ → Prisma 7 → Next 16/React 19 → Tailwind 4 → Zod 4) | planned | – | siehe `docs/project/ROADMAP.md` | 2026-07-06 |
| Etappe 3: shadcn-Koexistenz für neue Features | planned | – | siehe `docs/project/ROADMAP.md` | 2026-07-06 |

> Historische Features (vor Einführung des PIV-Workflows) sind in `docs/concepts/implemented/` dokumentiert. Roadmap-Etappen werden beim Planen in einzelne Feature-Zeilen mit eigener Plan-Datei aufgelöst.
