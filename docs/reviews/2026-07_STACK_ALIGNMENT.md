# Stack-Alignment-Analyse: comp-act-diary → cas-prdig-starter-kit

**Zweck:** Aufzeigen, was es bedeuten würde, comp-act-diary an den grundsätzlichen Stack des Starter Kits (`cas-prdig-starter-kit`) anzunähern. **Es wird hier nichts umgebaut** – dieses Dokument ist die Entscheidungsgrundlage. Zweckspezifische Libraries (Mapbox, Deepgram, MDX-Editor, Recharts, ffmpeg …) sind ausdrücklich nicht Thema.

## Ist-Vergleich der Grundbausteine

| Bereich | Starter Kit | comp-act-diary | Abweichung |
|---|---|---|---|
| Framework | Next.js 16.2 (App Router) | Next.js 15.5 (App Router) | 1 Major |
| React | 19.2 | 18.3 | 1 Major |
| TypeScript | strict | strict | ✅ gleich |
| Styling | Tailwind 4 + shadcn/ui (Radix) | Tailwind 3 + DaisyUI 5 | 1 Major + anderes UI-Kit |
| Icons | lucide-react | @tabler/icons-react | kosmetisch |
| Formulare | React Hook Form + Zod 4 | React Hook Form + Zod 3 | Zod 1 Major |
| ORM | Prisma 7 (Adapter-Pattern) | Prisma 6 (klassisch) | 1 Major |
| Datenbank | SQLite (lokal) | PostgreSQL (Docker, pg_trgm) | bewusste Abweichung |
| Auth | Better Auth 1.6 (Rollen) | Eigenbau (bcrypt + userId-Cookie) hinter Cloudflare Access | konzeptionell anders |
| Projektlayout | `src/`-Layout | Root-Layout (`app/`, `lib/`, …) | strukturell |
| Testing | Vitest + Playwright (E2E) | nur Vitest | E2E fehlt |
| Deployment | lokal (Port Forwarding) | Docker (standalone) | bewusste Abweichung |
| Agent-Setup | AGENTS.md + KILO_INSTRUCTIONS.md + `.agents/skills/` | bisher `.windsurf/` (lokal) | wird mit diesem Branch angeglichen ✅ |

---

## 1. Framework-Basis (empfohlen)

### 1.1 Next.js 15 → 16 und React 18 → 19

**Was sich ändert:**

- Next 16 macht die async Request APIs verbindlich (`params`/`searchParams` als Promise, `cookies()`/`headers()` async). comp-act-diary hat ~130 Route-Handler und ~50 Pages – viele davon mit dynamischen Segmenten. Der offizielle Codemod (`npx @next/codemod@latest upgrade`) erledigt den Grossteil mechanisch.
- Geänderte Caching-Defaults (weniger implizites Caching – für diese App eher ein Vorteil, da fast alles `force-dynamic` ist).
- React 19: `ref` als Prop, entfernte Legacy-APIs, `@types/react@19`. Der eigene Code ist modern (Hooks, keine Klassen) – Hauptrisiko sind **Dritt-Libraries**: `@webscopeio/react-textarea-autocomplete` (alt, letzte Pflege lange her), `react-force-graph`, `@mdxeditor/editor`, `react-map-gl`. Jede davon vor dem Upgrade auf React-19-Kompatibilität prüfen; für die Autocomplete-Komponente realistisch einen Ersatz einplanen.
- `@testing-library/react` und `vitest`-Setup müssen auf React-19-Versionen.

**Aufwand:** 2–4 Tage inkl. Regressionstest der kritischen Flows (Journal-Erfassung, Audio, Karten). Codemod + Typecheck tragen weit; das Risiko sitzt in den 3–4 alten UI-Libraries.

### 1.2 Tailwind 3 → 4

- Config wandert von `tailwind.config.ts` zu CSS-first (`@theme` in `globals.css`), PostCSS-Plugin wird `@tailwindcss/postcss`.
- **DaisyUI 5 unterstützt Tailwind 4 offiziell** – die UI kann also unverändert DaisyUI bleiben (Abschnitt 2 ist davon entkoppelt).
- `@tailwindcss/typography` und eigene Erweiterungen (Fonts, Farben) müssen in die neue Syntax.

**Aufwand:** 0.5–1 Tag, gut isolierbar. Upgrade-Tool (`npx @tailwindcss/upgrade`) vorhanden.

### 1.3 Prisma 6 → 7

- Prisma 7 verlangt Driver Adapter: für PostgreSQL `@prisma/adapter-pg`; der Singleton `lib/core/prisma.ts` wird um den Adapter erweitert (im Starter Kit gibt es das fertige Muster mit better-sqlite3 – analog für pg).
- `prisma.config.ts` ersetzt die `prisma`-Sektion in `package.json` (comp-act-diary hat bereits `prisma.config.mjs` – Anpassung klein).
- Generierter Client wandert standardmässig in ein explizites Output-Verzeichnis (Starter Kit: `src/generated/prisma/` + `.gitignore`).
- Der `db push`-Workflow bleibt identisch nutzbar.

**Aufwand:** 0.5–1 Tag. Geringe Streuung, da alle DB-Zugriffe über den Singleton laufen. **Gute Gelegenheit**, das `db:migrate`-Script zu entfernen (Review-Befund 12).

### 1.4 Zod 3 → 4

- Breaking Changes u. a. bei Error-API (`error.errors` → `error.issues`), String-Formaten (`z.string().email()` → `z.email()` empfohlen), Default-Verhalten.
- Betroffen: `lib/validators/` (9 Dateien), `lib/config/env.ts`, ~49 Route-Handler mit `safeParse`-Aufrufen, Formular-Resolver.
- `@hookform/resolvers` ist bereits auf v5 (Zod-4-kompatibel).

**Aufwand:** 1–2 Tage, mechanisch, gut durch die bestehenden 250 Tests abgesichert (die Validator-Tests sind genau dafür da).

### 1.5 `src/`-Layout

- Verschieben von `app/`, `components/`, `lib/`, `hooks/`, `types/` nach `src/`; `middleware.ts` nach `src/`.
- Da alle Imports über `@/…`-Aliasse laufen, beschränkt sich der Rest auf `tsconfig.json` (paths/baseUrl), `tailwind.config` (content-Globs), `vitest.config.ts`, `next.config.mjs`, Dockerfile-COPY-Pfade und die `scripts/`-Bundler-Pfade.
- Reiner Struktur-Move ohne Verhaltensänderung → ideal als isolierter Commit direkt vor oder nach dem Next-16-Upgrade.

**Aufwand:** 0.5 Tage. Nutzen: identische Navigation/Regeln wie im Starter Kit, Skills und Instructions können dieselben Pfade nennen. (Die in diesem Branch erstellten Skills sind vorerst auf das Root-Layout geschrieben und müssten dann in einem Rutsch mitgezogen werden – bewusst als Suchen/Ersetzen machbar.)

### 1.6 Playwright-E2E ergänzen

- `@playwright/test` + `playwright.config.ts` aus dem Starter Kit übernehmen (Chromium reicht).
- Start-Set: Login-Flow, Journal-Eintrag erstellen/bearbeiten, Suche – die drei Flows, die bei Framework-Upgrades (1.1–1.4) am meisten Sicherheit geben. **Empfehlung: E2E zuerst einführen, dann upgraden**, damit die Upgrades ein Sicherheitsnetz haben.

**Aufwand:** 1 Tag für Setup + 3 Kern-Flows.

### Empfohlene Reihenfolge Framework-Basis

1. Playwright-Grundgerüst (Sicherheitsnetz)
2. `src/`-Layout (isolierter Move)
3. Prisma 7 (klein, unabhängig)
4. Next 16 + React 19 (grösster Block, Codemod-gestützt)
5. Tailwind 4 (mit DaisyUI 5 kompatibel)
6. Zod 4 (mechanisch, testgestützt)

**Gesamtaufwand Framework-Basis: ~5–9 Arbeitstage**, in 6 unabhängig committbare Etappen zerlegbar – jede davon ein sauberes PIV-Feature.

---

## 2. UI: DaisyUI → shadcn/ui (grosser Brocken, optional)

**Umfang:** 97 von 116 Komponenten-/Page-Dateien verwenden DaisyUI-Klassen (`btn`, `card`, `modal`, `drawer`, `toast`, `tab`, …). Das ist eine **vollständige UI-Neuimplementierung auf Komponentenebene**, kein Upgrade:

- DaisyUI ist klassenbasiert (Markup bleibt, Klassen stylen), shadcn ist komponentenbasiert (Radix-Primitives + importierte Komponenten). Jede Modal-, Dropdown- und Formular-Stelle wird strukturell umgeschrieben.
- Theming: DaisyUI-Themes (`data-theme`) → CSS-Variablen + `next-themes`.
- Voraussetzung: Tailwind 4 (Abschnitt 1.2) und React 19 (shadcn/Radix aktuelle Versionen).

**Machbare Strategie, falls gewünscht:** Koexistenz ist technisch problemlos (beides Tailwind). shadcn via CLI initialisieren, neue Features in shadcn bauen, bestehende Seiten nur bei ohnehin anstehenden Umbauten migrieren (z. B. wenn `DynamicJournalForm` gemäss Review-Befund 11 zerlegt wird). Big-Bang wäre **3–6 Wochen** Aufwand bei hohem Regressionsrisiko in einer funktionierenden, täglich genutzten App.

**Empfehlung:** Nicht als Migrationsprojekt angehen. Wenn Angleichung ans Starter Kit gewünscht ist: Koexistenz-Strategie mit shadcn für Neues; DaisyUI-Bestand leben lassen. Die Stack-Regel im Projekt entsprechend als «DaisyUI (Bestand) + shadcn (neu)» oder schlicht «DaisyUI» festhalten – Hauptsache eindeutig für die Agents.

---

## 3. Auth: Eigenbau → Better Auth (mittel, löst reale Probleme)

**Was es bringt:** Die Review-Befunde 1–3 (dezentraler Demo-Fallback, unsignierte Cookies, keine Session-Verwaltung) verschwinden strukturell: Better Auth liefert signierte Sessions, Prisma-Adapter, `getSession()`-Helper und ein gepflegtes Middleware-Muster – exakt das Pattern, das die Starter-Kit-Skills und -Regeln voraussetzen.

**Migrationsschritte:**

1. Better Auth + Prisma-Adapter installieren; `User`-Modell erweitern (Better Auth erwartet `email` als Login-Identifier – aktuell ist `username` der Schlüssel und `email` optional → Einmal-Datenmigration: E-Mail setzen oder Username-Plugin von Better Auth nutzen), Session-/Account-Tabellen via `db push` ergänzen.
2. Passwort-Hashes: bestehende bcrypt-Hashes können via Better-Auth-Konfiguration (custom password hasher) weiterverwendet werden – kein Passwort-Reset nötig.
3. `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth-helpers.ts` nach Starter-Kit-Muster anlegen; Login-/Register-Seiten ersetzen.
4. Middleware auf Session-Cookie-Prüfung umstellen; **alle ~27 Route-Handler-Helper** durch zentrales `getSession()` ersetzen (deckt sich mit Review-Massnahme 1 – wer Better Auth einführt, bekommt das Refactoring «gratis» dazu).
5. Rollenmodell: comp-act-diary braucht keine 3 Starter-Kit-Rollen; Single-User bzw. `user`/`admin` reicht.

**Aufwand:** 2–4 Tage inkl. Datenmigration und Test aller geschützten Flows.

**Alternative (Minimalvariante):** Nur Review-Massnahme 1+3 umsetzen (zentraler Helper + HMAC-signiertes Cookie) – 1 Tag, behebt die akuten Probleme, bleibt aber vom Starter-Kit-Muster entfernt. Empfehlung: Minimalvariante **jetzt** (Teil der Review-Fixes), Better Auth als bewusste spätere Entscheidung, idealerweise **nach** Prisma 7/Next 16.

---

## 4. Bewusste Abweichungen (nicht migrieren)

| Thema | Starter Kit | Entscheidung für comp-act-diary |
|---|---|---|
| **Datenbank** | SQLite | **PostgreSQL behalten.** Produktivdaten, pg_trgm-Volltextsuche (`scripts/setup-fulltext-search.sql`), Docker-Volumes, Backup-Prozesse. SQLite wäre ein Rückschritt. |
| **Deployment** | lokal via Port Forwarding | **Docker/Server behalten.** Das Starter-Kit-Muster ist ein Kurs-Kompromiss. |
| **E-Mail (Resend)** | vorhanden | Nur bei konkretem Bedarf einführen. |
| **LLM-Anbindung** | `src/lib/ai.ts`, OpenAI SDK direkt | comp-act-diary nutzt Vercel AI SDK + Multi-Provider – funktional überlegen für diesen Zweck, bleibt. |

Diese Abweichungen sind in `AGENTS.md`/`KILO_INSTRUCTIONS.md` des Projekts dokumentiert, damit Agents sie nicht «korrigieren».

---

## 5. Gesamtempfehlung

```text
Etappe 0 (sofort, Teil der Review-Fixes):  zentrale Auth-Helper, Env lazy, CI          ~2 Tage
Etappe 1 (Framework-Basis, 6 Teiletappen):  Playwright → src/ → Prisma 7 → Next 16
                                            + React 19 → Tailwind 4 → Zod 4           ~5–9 Tage
Etappe 2 (optional, bewusst entscheiden):   Better Auth                                ~2–4 Tage
Etappe 3 (nur bei echtem Bedarf):           shadcn-Koexistenz für neue Features        laufend
Nie:                                        SQLite, Port-Forwarding-Deployment         –
```

Nach Etappe 1 ist der Stack in allen «grundsätzlichen Dingen» (Framework-Versionen, Layout, ORM-Pattern, Test-Setup, Agent-Workflow) deckungsgleich mit dem Starter Kit; UI-Kit und Auth bleiben die einzigen dokumentierten Abweichungen.
