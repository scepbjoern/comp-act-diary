# Code Review comp-act-diary – Juli 2026

**Kontext:** Die Applikation läuft hinter Cloudflare Access (Google OAuth, nur eine autorisierte E-Mail-Adresse). Klassische Angriffsflächen aus dem offenen Internet sind dadurch stark reduziert. Sicherheitsbefunde werden deshalb bewusst tiefer priorisiert als bei einer frei erreichbaren Applikation – sie bleiben aber dokumentiert, damit die Annahme «Cloudflare Access schützt alles» bewusst und nachvollziehbar bleibt.

**Geprüfter Stand:** Branch `main` (Commit `759a0b2`), vollständiger Durchgang durch `app/`, `lib/`, `components/`, `prisma/`, `scripts/`, Konfiguration, Docker/Deploy und Tests.

**Automatisierte Checks im Review:**

| Check | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ✅ 0 Fehler |
| `npm run lint` | ✅ 0 Fehler |
| `npm run test:run` | ⚠️ 250/250 Tests grün, aber 2 Testdateien laden nicht ohne echte API-Keys (siehe Befund 4) |

---

## Zusammenfassung

Die Codebasis ist für ein Ein-Personen-Projekt in bemerkenswert gutem Zustand: TypeScript strict ohne Fehler, sauberer Lint, 250 grüne Unit-Tests, eine echte Service-Schicht, dokumentierte Coding-Guidelines und eine gepflegte Konzept-Dokumentation. Die wichtigsten Probleme sind **architektonisch**, nicht kosmetisch:

1. **Auth-Auflösung ist dezentral und fehlertolerant bis zur Unkenntlichkeit** – der Demo-User-Fallback in Dutzenden Routen kann Daten still dem falschen Benutzer zuschreiben.
2. **Server Actions rufen die eigene REST-API per HTTP auf** – ohne Cookie-Weitergabe, wodurch genau dieser Fallback getriggert wird.
3. **Secrets landen im Docker-Image**, weil die Env-Validierung beim Import Build-Zeit-Secrets erzwingt.
4. **Es gibt keine CI-Qualitätssicherung** – Lint ist im Build deaktiviert, kein Workflow führt Tests aus.

Diese vier Punkte würde ich vor jeder weiteren Feature-Arbeit angehen; alles andere ist Hygiene und kann inkrementell erfolgen.

---

## A. Kritische Befunde (Architektur & Korrektheit)

### 1. Demo-User-Fallback in API-Routen (Datenintegrität)

**Fundstellen:** `app/api/day/route.ts:27-34`, `app/api/admin/seed/route.ts` und per Muster in über 25 weiteren Route-Handlern (jeweils lokale `getCurrentUser*`-Helper).

```ts
// Resolve user by cookie; fallback to demo user
const cookieUserId = req.cookies.get('userId')?.value
let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
if (!user) {
  user = await prisma.user.findUnique({ where: { username: 'demo' } })
}
```

**Problem:**

- Ein fehlendes oder abgelaufenes Cookie führt nicht zu `401`, sondern zu **stillem Schreiben/Lesen auf den `demo`-User**. Einträge, Uploads oder Seeds landen dann beim falschen Konto, ohne dass es jemand merkt.
- Die Logik ist in jeder Route **dupliziert** (leicht unterschiedlich formuliert), was Drift und Inkonsistenzen begünstigt – einzelne Routen prüfen anders oder gar nicht.
- Die Middleware schützt `/api/*` überhaupt nicht (`middleware.ts:16` lässt alles unter `/api` durch); die gesamte API-Autorisierung hängt also an diesen verstreuten Helfern.

**Empfehlung:**

- Einen zentralen Helper `lib/core/auth.ts` mit `getSessionUser(req)` (gibt `User | null`) und `requireSessionUser(req)` (wirft/`401`) einführen.
- Demo-Fallback **komplett entfernen**; wo Demo-Daten gebraucht werden (z. B. `admin/seed`), den Zieluser explizit übergeben.
- Alle Route-Handler auf den Helper umstellen (mechanische, gut testbare Änderung; ideal als eigenes Refactoring-Feature mit Plan).

### 2. Server Actions rufen die eigene REST-API über HTTP auf

**Fundstelle:** `app/actions.ts` (gesamte Datei), z. B.:

```ts
const res = await fetch(`${process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000'}/api/day/${dayId}`, { method: 'PATCH', ... })
```

**Problem:**

- **Cookies werden nicht weitergereicht.** Der interne `fetch` hat kein `userId`-Cookie → die API fällt auf den Demo-User zurück (Befund 1). Server Actions, die über diesen Weg schreiben, ändern also potenziell Daten des falschen Users.
- Unnötiger HTTP-Roundtrip im selben Prozess, verlorene Typsicherheit, `res.json()` ohne `res.ok`-Prüfung (HTML-Fehlerseiten führen zu kryptischen JSON-Parse-Fehlern).
- `NEXT_PUBLIC_BASE_URL`-Fallback `http://localhost:3000` ist im Container fragil (Port-/Host-Annahme).

**Empfehlung:** Server Actions sollen die Service-Schicht (`lib/services/…`) bzw. Prisma direkt aufrufen – die Logik existiert grösstenteils schon serverseitig. Der HTTP-Selbstaufruf entfällt ersatzlos. Falls eine Route-Handler-Logik gebraucht wird, diese in einen Service extrahieren und von beiden Stellen nutzen.

### 3. Unsignierte `userId`-Cookies als Session-Ersatz

**Fundstellen:** `middleware.ts:24`, `app/api/auth/login/route.ts:21`.

Das Login setzt die nackte User-UUID als Cookie; Middleware und Routen vertrauen ihr blind. Es gibt kein Session-Secret, keine Signatur, kein Ablauf-Handling serverseitig, kein `secure`-Flag.

**Einordnung:** Hinter Cloudflare Access (nur du kommst durch) ist das Risiko real klein – ein Angreifer müsste zuerst CF Access überwinden. Es bleibt aber die einzige Verteidigungslinie für alles unter `/api`, und Webhook-Pfade sind vermutlich per CF-Bypass öffentlich (dort ist die Token-Lösung zum Glück solide, siehe Positives).

**Empfehlung (pragmatisch, ohne Auth-Framework):** Beim Login ein signiertes Token (z. B. `userId.HMAC(userId, SECRET)`) setzen und zentral im Helper aus Befund 1 verifizieren. Das ist ein kleiner Eingriff und beseitigt die «jede erratene UUID ist ein Login»-Eigenschaft. Alternative mit mehr Aufwand: Better Auth (siehe Stack-Alignment-Analyse).

### 4. Env-Validierung beim Import erzwingt Secrets zur Build-Zeit → Secrets im Docker-Image

**Fundstellen:** `lib/config/env.ts` (Import-seitige `envSchema.parse`), importiert von `lib/core/prisma.ts:2`; `Dockerfile` (deps/build-Stage).

**Kette:**

1. `lib/config/env.ts` validiert beim Modul-Import und **wirft**, wenn `OPENAI_API_KEY`, `TOGETHERAI_API_KEY`, `MAPBOX_ACCESS_TOKEN` usw. fehlen.
2. `next build` importiert diese Module → der Build schlägt ohne echte Keys fehl.
3. Deshalb übergibt das `Dockerfile` die Keys als `ARG`/`ENV` in die Build-Stages – **damit liegen die Secrets dauerhaft in den Image-Layern** (`docker history` zeigt sie).
4. Nebenwirkung: `vitest` kann 2 Testdateien (`__tests__/lib/services/…` mit Prisma-Import) ohne echte `.env` nicht laden.

**Empfehlung:**

- Validierung **lazy** machen: `getEnv()` mit Memoisierung statt Top-Level-`parse`, oder Validierung nur bei `NODE_ENV !== 'test'` und nicht während `next build` (z. B. via `instrumentation.ts` beim Serverstart).
- Danach alle Secret-`ARG`s/`ENV`s aus den Build-Stages des `Dockerfile` entfernen; Secrets nur zur Laufzeit via `docker compose`-Environment injizieren.
- `NEXTAUTH_URL`/`NEXTAUTH_SECRET` im `Dockerfile` sind tote Reste (next-auth ist nicht installiert) → entfernen.
- Die DEBUG-`RUN cat package-lock.json …`-Blöcke im Dockerfile aufräumen.

### 5. Keine CI-Qualitätssicherung; Lint im Build deaktiviert

**Fundstellen:** `.github/workflows/` enthält nur `release-please.yml`; `next.config.mjs` → `eslint.ignoreDuringBuilds: true`.

Typecheck, Lint und Tests laufen nirgends automatisch. In Kombination mit `ignoreDuringBuilds` kann ein Deployment mit Lint-Fehlern und roten Tests durchlaufen.

**Empfehlung:** Ein schlanker GitHub-Actions-Workflow (`ci.yml`): `npm ci && npx tsc --noEmit && npm run lint && npm run test:run`. Das setzt voraus, dass Befund 4 (Env-Kopplung der Tests) gelöst ist – ein Grund mehr dafür. `ignoreDuringBuilds` kann bleiben (OOM-Begründung ist legitim), sobald Lint in CI läuft.

---

## B. Mittlere Befunde (Sicherheit – durch Cloudflare Access relativiert)

### 6. Upload-Serving: schwacher Path-Traversal-Check und offenes CORS

**Fundstellen:** `app/api/uploads/[...path]/route.ts` und Duplikat `app/uploads/[...path]/route.ts`.

- `normalizedPath.startsWith(normalizedUploadsDir)` ist als Prefix-Check bypassbar, wenn ein Geschwisterordner mit gleichem Prefix existiert (`/app/uploads-x`). Robust: `const rel = path.relative(uploadsDir, fullPath); rel && !rel.startsWith('..') && !path.isAbsolute(rel)`.
- `Access-Control-Allow-Origin: *` auf privaten Dateien ist unnötig – entfernen.
- Es existieren **zwei fast identische Routen** für dasselbe Verzeichnis (`/uploads/...` und `/api/uploads/...`). Eine Kanonische behalten, die andere per Redirect/Löschung entfernen.

### 7. Upload-Eingaben kaum validiert

**Fundstelle:** `app/api/upload-image/route.ts`.

Die Dateiendung wird ungefiltert aus dem Client-Dateinamen übernommen, es gibt keine Grössenbegrenzung und keine MIME-Prüfung. Da Bilder ohnehin via `sharp` verarbeitet werden (anderswo), wäre eine Whitelist (`jpg|jpeg|png|webp|heic`), ein Size-Limit und ein `file.type`-Check günstig zu haben.

### 8. Offene Registrierung

**Fundstelle:** `app/api/auth/register/route.ts` (+ `/register`-Seite, in `middleware.ts` als public gelistet).

Jeder, der Cloudflare passiert, kann Konten anlegen (ohne Passwort-Mindestanforderungen). Für den Single-User-Betrieb: per ENV-Flag (`REGISTRATION_ENABLED=false`) deaktivierbar machen oder Route entfernen.

---

## C. Wartbarkeits-Befunde

### 9. Validierung uneinheitlich: nur ~49 von 129 Route-Handlern nutzen Zod

`lib/validators/` ist gut aufgebaut (task, contact, search, location, …), aber viele Routen parsen Bodies manuell (`String(body?.username || '')` in `login`/`register` etc.). Konvention festlegen: **jeder** schreibende Handler validiert mit einem Schema aus `lib/validators/` via `safeParse`. (Diese Regel ist in den neuen Agent-Instructions verankert.)

### 10. Logging uneinheitlich: 353× `console.*` vs. 51× `logger.*`

Pino ist konfiguriert (`lib/core/logger.ts`) und Guideline `docs/coding-guidelines/08-error-handling-logging.md` existiert – wird aber nicht gelebt. Empfehlung: ESLint-Regel `no-console` (mit `warn`-Ausnahme in Scripts) aktivieren und bei Berührung einer Datei migrieren; kein Big-Bang nötig.

### 11. Sehr grosse Client-Komponenten

| Datei | Zeilen |
|---|---|
| `components/features/journal/DynamicJournalForm.tsx` | 1240 |
| `app/settings/page.tsx` | 1202 |
| `app/journal/page.tsx` | 798 |
| `components/features/journal/JournalEntryCard.tsx` | 698 |

Alles Client-Komponenten mit vielen Verantwortlichkeiten (Formular-State, Upload, Transkript-Flows, Modals). Empfehlung: bei der nächsten funktionalen Änderung jeweils in Sub-Komponenten + Custom Hooks (`hooks/`) zerlegen; nicht präventiv alles umbauen.

### 12. Paket-Hygiene in `package.json`

- **`mastra` (^1.0.1) wird nirgends importiert** – `lib/core/mastra-agent.ts` ist ein reiner Kommentar-Platzhalter. Entfernen spart ein schweres Paket im Install/Docker-Build.
- **`googleapis` steht in `devDependencies`, wird aber zur Laufzeit gebraucht** (`lib/prm/google-auth.ts`, `google-people.ts`). Funktioniert nur, weil Next bundelt – gehört in `dependencies`.
- `react-force-graph` **und** `react-force-graph-2d` parallel – vermutlich reicht eines.
- `postcss`, `tailwindcss`, `daisyui`, `dotenv` in `dependencies` statt `devDependencies` (Build-Tooling; unkritisch, aber unsauber).
- `db:migrate`-Script existiert, obwohl das Projekt bewusst ohne Migrations arbeitet (`prisma/migrations/` fehlt) – entfernen, um Fehlbedienung zu verhindern (`SCHEMA_WORKFLOW.md` sagt explizit «db push»).

### 13. Doppelte/legacy Konfiguration

- `.eslintrc.json` (legacy) **und** `eslint.config.mjs` (flat config) existieren parallel – ESLint 9 nutzt nur die flat config; die alte Datei löschen.
- `scripts/*.bundled.cjs`: generierte Build-Artefakte sind eingecheckt und werden bei **jedem** Build via `prebuild` neu erzeugt. Entweder aus Git nehmen (`.gitignore`) oder `prebuild` entfernen und nur bei Bedarf bündeln.
- `lib/legacy/mockdb.ts` – prüfen, ob noch referenziert; sonst löschen.

### 14. Middleware: doppelte Wahrheit

`middleware.ts` pflegt public paths **zweimal** (im Code als `publicPaths`/`startsWith`-Liste und im `config.matcher`). Die Listen sind nicht deckungsgleich (`/icons`, `/docs` nur im Code). Eine Quelle wählen – am einfachsten alles in den Matcher.

---

## D. Positives (beibehalten)

- **TypeScript strict, `tsc` und ESLint fehlerfrei** – seltene Ausgangslage in gewachsenen Projekten.
- **Echte Service-Schicht** (`lib/services/`, `lib/prm/`, `lib/media/`) statt Logik in Routen; `journalEntryAccessService` mit sauberem Rollen-/Sharing-Modell.
- **Webhook-Token-Service** (`lib/services/webhookTokenService.ts`): Tokens werden bcrypt-gehasht gespeichert, generisch über Provider-Typen – genau richtig für CF-Bypass-Pfade.
- **250 Unit-Tests** mit sinnvollem Fokus (Validators, Services, Parser, Komponenten).
- **Vorbildliche Dokumentationskultur**: `docs/coding-guidelines/` (9 Kapitel), Konzept-Dokumente mit `implemented/`-Archiv, `SCHEMA_WORKFLOW.md`, `DOCKER_OPERATIONS.md`.
- **Release-Hygiene**: release-please, CHANGELOG, Versionierung in der App sichtbar.
- **Prisma-Schema** mit deutschsprachigen `///`-Doku-Kommentaren auf jedem Feld.
- **Sanitizing** von HTML via `isomorphic-dompurify` (`lib/utils/sanitize.ts`).

---

## E. Empfohlene Reihenfolge

| Prio | Massnahme | Aufwand | Befunde |
|---|---|---|---|
| 1 | Zentraler Auth-Helper, Demo-Fallback entfernen, Cookie signieren | 0.5–1 Tag | 1, 3 |
| 2 | `app/actions.ts` auf Service-Aufrufe umstellen | 0.5 Tage | 2 |
| 3 | Env-Validierung lazy + Dockerfile-Secrets entfernen | 0.5 Tage | 4 |
| 4 | CI-Workflow (tsc, lint, test) | 0.25 Tage | 5 |
| 5 | Upload-Härtung + Routen-Duplikat entfernen | 0.5 Tage | 6, 7 |
| 6 | Paket-/Config-Hygiene | 0.25 Tage | 12, 13, 14 |
| 7 | Inkrementell: Zod überall, Logger statt console, Komponenten zerlegen | laufend | 9, 10, 11 |

Jede dieser Massnahmen eignet sich als eigenes Feature im neuen PIV-Workflow (`/plan-feature` → `/execute`).
