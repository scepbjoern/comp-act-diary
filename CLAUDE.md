# CLAUDE.md – Projekt-Instructions für Claude Code

Primäre Quelle für Coding-Regeln ist `KILO_INSTRUCTIONS.md`. Lies diese Datei vor Planung oder Umsetzung vollständig und befolge sie als verbindlichen Projekt-Coding-Guide.

Kurzüberblick:

- Stack: Next.js 15 · React 18 · Tailwind 3 + DaisyUI · Prisma 6 + PostgreSQL · Vercel AI SDK · Vitest
- Projektkontext: `AGENTS.md`; detaillierte Coding-Regeln: `docs/coding-guidelines/`
- PIV-Skills liegen in `.agents/skills/` (Claude-Code-Bridge: `.claude/skills/`, einmalig via `npm run setup:skills` anlegen)
- PIV-Skills werden nur auf expliziten Aufruf (`/prime`, `/plan-feature`, `/execute`, …) aktiviert, nie automatisch
- Schema-Änderungen: `npx prisma db push && npx prisma generate` – **niemals** `db:reset`/`--force-reset` (Produktivdaten!)
