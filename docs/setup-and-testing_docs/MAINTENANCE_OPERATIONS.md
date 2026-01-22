# Wartungsoperationen (Maintenance Operations)

Regelmässige Wartungsarbeiten für das CompACT Diary Projekt. Diese Anleitung dient sowohl Menschen als auch LLM-Assistenten (Cascade/Windsurf) als Referenz.

**Letzte Aktualisierung:** 2026-01-22

---

## Inhaltsverzeichnis

1. [Dependencies-Management](#1-dependencies-management)
2. [Code-Qualität & Linting](#2-code-qualität--linting)
3. [Bundle-Analyse](#3-bundle-analyse)
4. [Node.js-Versionsmanagement](#4-nodejs-versionsmanagement)
5. [Dokumentationspflege](#5-dokumentationspflege)
6. [Docker & Deployment](#6-docker--deployment)
7. [Datenbank-Wartung](#7-datenbank-wartung)
8. [Release-Management mit release-please](#8-release-management-mit-release-please)
9. [Wartungskalender](#9-wartungskalender)

---

## 1. Dependencies-Management

### 1.1 Veraltete Pakete prüfen

```powershell
# Lokal (Windows PowerShell)
npm outdated

# Im Docker-Container (Production)
docker compose exec app npm outdated
```

**Interpretation:**
- **Current**: Installierte Version
- **Wanted**: Höchste Version laut semver in package.json
- **Latest**: Neueste Version auf npm

### 1.2 Sicherheitslücken prüfen

```powershell
# Audit durchführen
npm audit

# Nur High/Critical anzeigen
npm audit --audit-level=high

# Automatische Fixes (vorsichtig!)
npm audit fix
```

### 1.3 Dependencies aktualisieren

```powershell
# Patch-Updates (sicher)
npm update

# Interaktiv mit npm-check-updates (empfohlen)
npx npm-check-updates -i

# Nur ein spezifisches Paket
npm install paketname@latest
```

**Nach jedem Update:**
1. `npm run build` – Prüfen ob Build funktioniert
2. `npm run lint` – Linting-Fehler prüfen
3. `npm run test:run` – Tests durchführen
4. Manuell testen in Dev-Umgebung

### 1.4 Lock-File-Integrität

```powershell
# package-lock.json regenerieren bei Problemen
rm -r node_modules
rm package-lock.json
npm install
```

---

## 2. Code-Qualität & Linting

### 2.1 ESLint ausführen

```powershell
# Alle Dateien prüfen
npm run lint -- --cache oder nur npm run lint (kann etwas länger dauern)

# Mit Auto-Fix
npx eslint --fix .

# Nur bestimmte Dateien
npx eslint "app/**/*.tsx" "components/**/*.tsx"
```

### 2.2 TypeScript-Prüfung

```powershell
# Type-Check ohne Build
npx tsc --noEmit

# Mit Watch-Mode für kontinuierliche Prüfung
npx tsc --noEmit --watch
```

### 2.3 Häufige Probleme beheben

| Problem | Lösung |
|---------|--------|
| `any`-Types | Explizite Typen definieren oder `unknown` verwenden |
| Unused imports | ESLint Auto-Fix oder manuell entfernen |
| Missing dependencies | In `package.json` hinzufügen |

---

## 3. Bundle-Analyse

### 3.1 Next.js Bundle Analyzer

Der Bundle Analyzer ist bereits als DevDependency installiert (`@next/bundle-analyzer`).

```powershell
# Bundle-Analyse starten
$env:ANALYZE="true"; npm run build

# Alternativ in einer Zeile
cross-env ANALYZE=true npm run build
```

Dies öffnet automatisch den Browser mit der Bundle-Visualisierung.

### 3.2 Bundle-Grösse prüfen

```powershell
# Build-Output analysieren
npm run build

# Grösse der .next-Ordner anzeigen
Get-ChildItem -Recurse .next -File | Measure-Object -Property Length -Sum
```

**Zielwerte (Richtwerte):**
- First Load JS: < 100 KB
- Einzelne Route: < 50 KB
- Gesamte App: < 500 KB (gzipped)

### 3.3 Grosse Abhängigkeiten identifizieren

Bekannte grosse Pakete im Projekt:
- `@mdxeditor/editor` – Markdown-Editor
- `mapbox-gl` – Kartenansicht
- `recharts` – Diagramme
- `react-force-graph` – Graph-Visualisierung

Diese werden bereits via Dynamic Imports geladen (siehe Coding Guidelines).

---

## 4. Node.js-Versionsmanagement

### 4.1 Aktuelle Version prüfen

```powershell
# Lokale Version
node -v
npm -v

# Im Dockerfile (Zeile 3)
# FROM node:24-bookworm AS deps
```

**Aktuell im Projekt:** Node.js 24 (Dockerfile)

### 4.2 Version aktualisieren

1. **Lokal:** Über Node.js-Installer oder nvm-windows
2. **Docker:** Im `Dockerfile` die Base-Images anpassen:

```dockerfile
# deps stage
FROM node:XX-bookworm AS deps

# build stage  
FROM node:XX-bookworm AS build

# runner stage
FROM node:XX-alpine AS runner
```

3. **Nach Update:** Vollständiges Rebuild:

```bash
# Auf dem Server
cd /opt/stacks/comp-act-diary/deploy
docker compose build --no-cache app
docker compose up -d --force-recreate app
```

### 4.3 Node.js LTS-Zeitplan

| Version | Status | Ende |
|---------|--------|------|
| Node 20 | Active LTS | Apr 2026 |
| Node 22 | Active LTS | Apr 2027 |
| Node 24 | Current | TBD |

---

## 5. Dokumentationspflege

### 5.1 Zu pflegende Dokumente

| Dokument | Aktualisieren bei... |
|----------|---------------------|
| `README.md` | Neuen Features, Setup-Änderungen |
| `docs/data-model-architecture.md` | Schema-Änderungen (Prisma) |
| `docs/coding-guidelines/*.md` | Neuen Patterns, Technologieänderungen |
| `CHANGELOG.md` | Wird automatisch durch release-please gepflegt |
| `docs/setup-and-testing_docs/*.md` | Deployment-, Test-Änderungen |

### 5.2 Automatische Checks

```powershell
# Links in Markdown prüfen (optional)
npx markdown-link-check README.md

# Schema-Dokumentation mit Prisma abgleichen
npx prisma validate
```

### 5.3 Dokumentations-Checkliste

- [ ] Neue API-Routen dokumentiert
- [ ] Neue Umgebungsvariablen in `.env.example`
- [ ] Schema-Änderungen in `data-model-architecture.md`
- [ ] Breaking Changes im CHANGELOG

---

## 6. Docker & Deployment

### 6.1 Image-Grössen prüfen

```bash
# Auf dem Server
docker images | grep compact-diary

# Ungenutzte Images aufräumen
docker image prune -f

# Build-Cache aufräumen
docker builder prune -f
```

### 6.2 Container-Ressourcen prüfen

```bash
# Aktuelle Nutzung
docker stats --no-stream

# Disk Usage
docker system df
```

### 6.3 Regelmässige Aufräumarbeiten

```bash
# Auf dem Server (wöchentlich empfohlen)
cd /opt/stacks/comp-act-diary/deploy

# Alte Container/Images entfernen
docker system prune -f

# Aggressiver (inkl. ungenutzte Volumes - VORSICHT!)
docker system prune -a --volumes
```

Siehe auch: [DOCKER_OPERATIONS.md](./DOCKER_OPERATIONS.md)

---

## 7. Datenbank-Wartung

### 7.1 Prisma-Schema validieren

```powershell
# Lokal
npx prisma validate

# Im Container
docker compose exec app npx prisma validate
```

### 7.2 Datenbank-Statistiken (PostgreSQL)

```bash
# Auf dem Server
docker compose exec db psql -U compactdiary -d comp-act-diary -c "
SELECT 
  schemaname,
  relname as table,
  n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;
"
```

### 7.3 Backup-Status prüfen

```bash
# Backup-Logs
docker compose logs --tail 50 backup_db

# Vorhandene Backups
ls -lah /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/
```

Siehe auch: [DOCKER_OPERATIONS.md](./DOCKER_OPERATIONS.md) Abschnitt 5

---

## 8. Release-Management mit release-please

Das Projekt verwendet [release-please](https://github.com/googleapis/release-please) für automatisches Release-Management.

### 8.1 Funktionsweise

1. **Commit-Konventionen:** Commits mit `feat:` oder `fix:` Prefix triggern Releases
2. **Release-PR:** release-please erstellt automatisch einen Release-PR auf `main`
3. **Version-Bump:** Beim Mergen des Release-PR wird die Version automatisch hochgezählt
4. **CHANGELOG:** Wird automatisch aus Commits generiert

### 8.2 Commit-Typen

| Prefix | Beschreibung | Version-Bump |
|--------|--------------|--------------|
| `feat:` | Neues Feature | Minor (1.x.0) |
| `fix:` | Bugfix | Patch (1.0.x) |
| `feat!:` oder `BREAKING CHANGE:` | Breaking Change | Major (x.0.0) |
| `chore:`, `docs:`, `style:` | Keine Auswirkung | - |

### 8.3 Workflow

```bash
# Feature entwickeln
git commit -m "feat: add new journal export feature"

# Bugfix
git commit -m "fix: correct date formatting in analytics"

# Nach Push auf main:
# 1. release-please erstellt/aktualisiert Release-PR
# 2. Review und Merge des Release-PR (Merge auf github.com durchführen, nicht in Windsurf)
# 3. Automatisch: Tag, GitHub Release, CHANGELOG-Update
```

### 8.4 Konfiguration

Die Konfiguration befindet sich in:
- `.github/workflows/release-please.yml` – GitHub Action Workflow
- `release-please-config.json` – Release-Konfiguration
- `.release-please-manifest.json` – Aktuelle Version

### 8.5 Version im Footer

Die App-Version wird automatisch im Footer angezeigt via `NEXT_PUBLIC_APP_VERSION`. Diese Variable wird beim Build aus `package.json` gelesen und in die App eingebettet.

---

## 9. Wartungskalender

### Wöchentlich

- [ ] `npm audit` – Sicherheitslücken prüfen
- [ ] `npm run lint` – Code-Qualität prüfen
- [ ] Backup-Status prüfen (Docker-Logs)

### Monatlich

- [ ] `npm outdated` – Dependencies prüfen
- [ ] Bundle-Grösse analysieren
- [ ] Docker-System aufräumen (`docker system prune`)
- [ ] Dokumentation auf Aktualität prüfen

### Quartalsweise

- [ ] Node.js-Version prüfen (LTS-Status)
- [ ] Grosse Dependency-Updates evaluieren
- [ ] Performance-Audit durchführen
- [ ] Security-Audit durchführen

### Bei jedem Release

- [ ] CHANGELOG prüfen (automatisch via release-please)
- [ ] README auf Aktualität prüfen
- [ ] Breaking Changes dokumentiert?

---

## Quick Reference für LLM-Assistenten

Wenn du als LLM-Assistent (Cascade/Windsurf) Wartungsarbeiten durchführst:

```powershell
# 1. Dependencies-Status prüfen
npm outdated

# 2. Sicherheit prüfen
npm audit

# 3. Code-Qualität prüfen
npm run lint

# 4. Type-Check
npx tsc --noEmit

# 5. Tests ausführen
npm run test:run

# 6. Build testen
npm run build
```

**Wichtig:** Bei grösseren Updates (Major-Versions, Node.js-Update) immer erst in einer Testumgebung validieren!
