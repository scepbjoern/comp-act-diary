# Roadmap & Handoff – Review-Fixes und Stack-Alignment

> Handoff-Dokument für neue Agent-Sessions (Stand 2026-07-06). Grundlage:
> `docs/reviews/2026-07_CODE_REVIEW.md` (Befunde) und `docs/reviews/2026-07_STACK_ALIGNMENT.md` (Analyse + Entscheide).
> Vorgehen pro Etappe: PIV-Workflow gemäss `docs/PIV-WORKFLOW.md` – neue Session, `/prime`, dann `/plan-feature`.

## Beschlossene Entscheide

1. **Schema-Workflow bleibt `db push`** (kein `migrate`); das irreführende npm-Script `db:migrate` wird in Etappe 0 entfernt.
2. **Better Auth wird komplett übernommen** (Etappe 1, direkt nach den Quick Wins – machbar auf Next 15/Prisma 6). Die HMAC-Cookie-Minimalvariante aus dem Review entfällt dadurch.
3. **UI: Koexistenz-Strategie** – shadcn/ui nach Tailwind 4 initialisieren, neue Features in shadcn, DaisyUI-Bestand bleibt.
4. **Bewusste Abweichungen vom Starter Kit:** PostgreSQL (kein SQLite), Docker-Deployment (kein Port Forwarding).

## Etappen

### Etappe 0 – Review-Quick-Wins (~2 Tage)

Einzelne, unabhängige PIV-Features (Review-Befunde in Klammern):

| # | Feature | Inhalt | Befund |
|---|---|---|---|
| 0.1 | env-lazy-und-docker-secrets | Env-Validierung lazy machen (`getEnv()` statt Import-Parse), Secret-`ARG`s/`ENV`s + `NEXTAUTH_*` + DEBUG-Blöcke aus Dockerfile entfernen; behebt auch die 2 nicht ladenden Testdateien | 4 |
| 0.2 | ci-workflow | GitHub Action: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test:run` (setzt 0.1 voraus) | 5 |
| 0.3 | actions-auf-services | `app/actions.ts`: HTTP-Selbstaufrufe durch direkte Service-/Prisma-Aufrufe ersetzen | 2 |
| 0.4 | upload-haertung | Path-Check via `path.relative`, CORS-`*` entfernen, Extension-Whitelist + Size-Limit, doppelte Upload-Route entfernen | 6, 7 |
| 0.5 | paket-und-config-hygiene | `mastra` raus, `googleapis` → dependencies, `db:migrate`-Script raus, `.eslintrc.json` raus, Middleware-publicPaths konsolidieren, `react-force-graph`-Duplikat prüfen | 12, 13, 14 |

Hinweis: Der zentrale Auth-Helper und die Entfernung des Demo-User-Fallbacks (Befunde 1, 3) sind **nicht** Teil von Etappe 0 – sie kommen mit Better Auth in Etappe 1, damit nichts doppelt gebaut wird.

### Etappe 1 – Better Auth komplett (~2–4 Tage)

Ein PIV-Feature (vorher PRD-Abschnitt oder direkt umfangreicher Plan):

- Better Auth 1.6 + Prisma-Adapter; Session-/Account-Tabellen via `db push`
- `email` als Login-Identifier klären (Datenmigration) oder Username-Plugin; bestehende bcrypt-Hashes via Custom-Hasher weiterverwenden (kein Passwort-Reset)
- `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth-helpers.ts` nach Starter-Kit-Muster; Login-/Register-Seiten ersetzen (Registrierung deaktivierbar)
- Middleware auf Session-Prüfung; **alle ~27 Route-Handler-Helper durch zentrales `getSession()` ersetzen, Demo-User-Fallback komplett entfernen** (Review-Befunde 1, 3)
- Rollen: Single-User bzw. `user`/`admin` – keine 3 Starter-Kit-Rollen

### Etappe 2 – Framework-Basis (6 Teiletappen, ~5–9 Tage)

Reihenfolge einhalten, jede Teiletappe = eigenes PIV-Feature mit eigenem Commit:

1. **playwright-grundgeruest** – Setup + 3 Kern-Flows (Login, Journal-Eintrag, Suche) als Sicherheitsnetz
2. **src-layout** – `app/`, `components/`, `lib/`, `hooks/`, `types/`, `middleware.ts` nach `src/`; Configs + Dockerfile + Skills/Instructions-Pfade in einem Rutsch nachziehen
3. **prisma-7** – `@prisma/adapter-pg`, Singleton anpassen, expliziter Client-Output
4. **next-16-react-19** – Codemod-gestützt; vorher React-19-Kompatibilität von `@webscopeio/react-textarea-autocomplete` (Ersatz wahrscheinlich), `react-force-graph`, `@mdxeditor/editor`, `react-map-gl` prüfen
5. **tailwind-4** – `npx @tailwindcss/upgrade`, DaisyUI 5 bleibt kompatibel
6. **zod-4** – Error-API und String-Formate; durch Validator-Tests abgesichert

### Etappe 3 – shadcn-Koexistenz (laufend)

Nach Etappe 2: shadcn via CLI initialisieren, `KILO_INSTRUCTIONS.md` + `docs/coding-guidelines/07-ui-styling.md` auf «DaisyUI (Bestand) + shadcn (neu)» aktualisieren. Kein Big-Bang-Umbau.

### Laufend (kein eigener Block)

- Zod-Validierung in allen schreibenden Route-Handlern nachziehen (Befund 9) – bei Berührung
- `console.*` → `logger` (Befund 10) – bei Berührung; optional ESLint `no-console`
- Grosse Komponenten zerlegen (Befund 11) – bei der nächsten funktionalen Änderung

## Session-Start für die nächste Etappe

```text
/prime
/plan-feature "Etappe 0.1 aus docs/project/ROADMAP.md: Env-Validierung lazy machen und Docker-Build von Secrets entkoppeln. Details siehe docs/reviews/2026-07_CODE_REVIEW.md Befund 4."
```

Danach Review-Zyklus gemäss `docs/PIV-WORKFLOW.md`. Kleine Hygiene-Punkte (0.5) können auch ohne vollen PIV-Zyklus direkt umgesetzt werden.
