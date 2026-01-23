# Docker Operations Guide

Tägliche Befehle, Update-Strategien und Troubleshooting für den CompACT Diary Stack.

**Voraussetzung:** Migration von Portainer abgeschlossen (siehe [PORTAINER_TO_CLI_MIGRATION.md](./PORTAINER_TO_CLI_MIGRATION.md))

---

## Umgebungen (PROD vs. TEST/DEMO)

Auf demselben LXC-Container laufen zwei unabhängige Umgebungen:

| Umgebung | URL | Interner Port | Stack-Verzeichnis | Compose-Datei |
|----------|-----|---------------|-------------------|---------------|
| **PROD** | `https://compactdiary.melbjo.win` | `65321` | `/opt/stacks/comp-act-diary` | `docker-compose.yml` |
| **TEST/DEMO** | `https://test-compactdiary.melbjo.win` | `65322` | `/opt/stacks/comp-act-diary-test` | `docker-compose.yml` |

**Cloudflare-Konfiguration:**
- PROD: `compactdiary.melbjo.win` → `http://192.168.188.170:65321`
- TEST: `test-compactdiary.melbjo.win` → `http://192.168.188.170:65322`

**Container-Namen:**

| Service | PROD | TEST |
|---------|------|------|
| App | `compact-diary-app` | `compact-diary-test-app` |
| Datenbank | `compact-diary-db` | `compact-diary-test-db` |
| Backup | `compact-diary-db-backup` | `compact-diary-test-db-backup` |

> **Wichtig:** Bei allen Befehlen in diesem Guide wird immer zuerst die PROD-Variante gezeigt, dann die TEST-Variante. Achte darauf, dass du im richtigen Verzeichnis arbeitest!

---

## Zusammenspiel der Dateien (Kurzübersicht)

```
docker-compose.yml  → WAS läuft (Services, Ports, Volumes)
Dockerfile          → WIE gebaut wird (nur bei --build)
entrypoint.sh       → WAS beim Start passiert (DB-Wait, Schema-Sync)
```

| Aktion | Dockerfile ausgeführt? | entrypoint.sh ausgeführt? |
|--------|------------------------|---------------------------|
| `docker compose up -d` | Nein (Image existiert) | Ja |
| `docker compose up -d --build` | Ja (neu bauen) | Ja |
| `docker compose restart app` | Nein | Ja |
| `docker compose build app` | Ja | Nein (nur bauen) |

---

## Inhaltsverzeichnis

0. [Initiale Einrichtung TEST-Umgebung](#0-initiale-einrichtung-test-umgebung)
1. [Grundlegende Befehle](#1-grundlegende-befehle)
2. [Deployment-Varianten](#2-deployment-varianten)
3. [Logs und Debugging](#3-logs-und-debugging)
4. [Datenbank-Operationen](#4-datenbank-operationen)
5. [Backup und Restore](#5-backup-und-restore)
6. [Umgebungsvariablen](#6-umgebungsvariablen)
7. [Troubleshooting](#7-troubleshooting)

---

## 0. Initiale Einrichtung TEST-Umgebung

Diese Anleitung beschreibt die einmalige Einrichtung der permanenten TEST/DEMO-Umgebung auf demselben LXC wie PROD. Gilt sinngemäss analog für PROD-Umgebung

### 0.1 Cloudflare DNS konfigurieren

In Cloudflare einen neuen DNS-Record anlegen:
- **Type:** A (oder CNAME)
- **Name:** `test-compactdiary`
- **Target:** `192.168.188.170`
- **Proxy:** Aktiviert (orange Wolke)

Dann in Cloudflare Tunnel oder Origin Rules den Port `65322` konfigurieren:
- `test-compactdiary.melbjo.win` → `http://192.168.188.170:65322`

### 0.2 Verzeichnisstruktur auf dem Server erstellen

```bash
# Verzeichnis für TEST-Stack erstellen
sudo mkdir -p /opt/stacks/comp-act-diary-test
cd /opt/stacks/comp-act-diary-test

# Repository klonen (oder separaten Branch)
sudo git clone https://github.com/DEIN_USER/comp-act-diary.git .
# Alternative: gleichen Branch wie PROD nutzen
# sudo git clone --branch main https://github.com/DEIN_USER/comp-act-diary.git .

# Berechtigungen setzen
sudo chown -R $(id -u):$(id -g) /opt/stacks/comp-act-diary-test
```

### 0.3 Docker Compose für TEST konfigurieren

```bash
cd /opt/stacks/comp-act-diary-test/deploy

# docker-compose.demo.yml als docker-compose.yml verwenden
cp docker-compose.demo.yml docker-compose.yml

# Oder: PROD-Compose kopieren und anpassen (manuelle Änderungen nötig)
# cp /opt/stacks/comp-act-diary/deploy/docker-compose.yml .
```

### 0.4 .env-Datei für TEST erstellen

```bash
cd /opt/stacks/comp-act-diary-test/deploy

# .env von PROD als Vorlage kopieren
cp /opt/stacks/comp-act-diary/deploy/.env .env

# Wichtige Anpassungen in .env vornehmen:
nano .env
```

**Zwingend anzupassende Werte in `.env`:**

```bash
# Port (TEST auf 65322, PROD auf 65321)
APP_PORT=65322

# Separate Pfade für DB-Daten (WICHTIG: nicht gleich wie PROD!)
DB_DATA_PATH=/dockerdata-fast/postgres-data/comp-act-diary-test

# Separate Pfade für Uploads
PUBLIC_UPLOADS_PATH=/opt/comp-act-diary-test/uploads

# Separate Pfade für Backups
DB_BACKUP_PATH=/dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump
```

### 0.5 Verzeichnisse für TEST-Daten erstellen

```bash
# DB-Datenverzeichnis
sudo mkdir -p /dockerdata-fast/postgres-data/comp-act-diary-test
sudo chown 999:999 /dockerdata-fast/postgres-data/comp-act-diary-test

# Upload-Verzeichnis
sudo mkdir -p /opt/comp-act-diary-test/uploads
sudo chown $(id -u):$(id -g) /opt/comp-act-diary-test/uploads

# Backup-Verzeichnis
sudo mkdir -p /dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump
sudo chown $(id -u):$(id -g) /dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump
```

### 0.6 TEST-Stack starten

```bash
cd /opt/stacks/comp-act-diary-test/deploy

# Erstes Build und Start (mit Schema-Sync für leere DB)
SYNC_SCHEMA=true docker compose up -d --build

# Logs prüfen
docker compose logs -f app
```

### 0.7 Verifizierung

```bash
# Container-Status prüfen
docker ps --filter "name=compact-diary-test"

# Beide Umgebungen sollten laufen:
# - compact-diary-app        (PROD, Port 65321)
# - compact-diary-test-app   (TEST, Port 65322)

# Im Browser testen
curl -I http://localhost:65322
# Oder: https://test-compactdiary.melbjo.win
```

### 0.8 Optional: PROD-Daten in TEST importieren

Wenn du mit echten Daten testen möchtest:

```bash
# Neuestes PROD-Backup finden
LATEST=$(ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/*.dump | head -1)
echo "Importiere: $LATEST"

# TEST-App stoppen, DB resetten, Backup einspielen
cd /opt/stacks/comp-act-diary-test/deploy
docker compose stop app
docker compose exec db psql -U compactdiary -c "DROP DATABASE IF EXISTS \"comp-act-diary\""
docker compose exec db psql -U compactdiary -c "CREATE DATABASE \"comp-act-diary\""
docker compose exec -T db pg_restore -U compactdiary -d comp-act-diary < "$LATEST"
docker compose up -d app
```

---

## 1. Grundlegende Befehle

### Arbeitsverzeichnis

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
```

### Status prüfen

```bash
# Alle Container des Stacks (im jeweiligen Verzeichnis)
docker compose ps

# Detaillierter Status
docker compose ps -a

# Ressourcenverbrauch (zeigt alle Container)
docker stats --no-stream

# Beide Umgebungen gleichzeitig prüfen
docker ps --filter "name=compact-diary"
```

### Container steuern

```bash
# Alle starten (im jeweiligen Verzeichnis)
docker compose up -d

# Alle stoppen (Daten bleiben erhalten)
docker compose stop

# Alle stoppen und entfernen (Volumes bleiben!)
docker compose down

# Einzelnen Service neustarten
docker compose restart app
docker compose restart db
```

**Container-Namen:** Siehe Tabelle oben unter "Umgebungen (PROD vs. TEST/DEMO)".

---

## 2. Deployment-Varianten

### 2.1 Schnelles Update (empfohlen für kleine Änderungen)

Nutzt Docker Build-Cache maximal. Nur geänderte Layer werden neu gebaut.

```bash
# PROD
cd /opt/stacks/comp-act-diary
git pull origin main
cd deploy && docker compose up -d --build app

# TEST
cd /opt/stacks/comp-act-diary-test
git pull origin main  # oder: git pull origin develop
cd deploy && docker compose up -d --build app

# Optional: Alte Images direkt aufräumen
docker image prune -f
```

**Dauer:** ~1-3 Minuten (bei unverändertem package.json)  
**Wann nutzen:** 
- Code-Änderungen (TypeScript, React)
- Kleine Fixes
- Konfigurationsänderungen

**Was passiert:**
1. `git pull` → Neue Dateien auf Host
2. `--build` → Dockerfile wird ausgeführt, aber Cache für unveränderte Layer genutzt
3. Neuer Container startet → `entrypoint.sh` wartet auf DB, dann App-Start

### 2.2 Vollständiges Rebuild (bei Dependency-Änderungen)

Ignoriert Build-Cache komplett, baut alles von Grund auf neu.

```bash
# PROD
cd /opt/stacks/comp-act-diary
git pull origin main
cd deploy
docker compose build --no-cache app && docker compose up -d --force-recreate app

# TEST
cd /opt/stacks/comp-act-diary-test
git pull origin main  # oder: git pull origin develop
cd deploy
docker compose build --no-cache app && docker compose up -d --force-recreate app

# Mit Prisma-Änderungen (PROD oder TEST):
docker compose build --no-cache app && SYNC_SCHEMA=true docker compose up -d --force-recreate app

# Optional: Nach Rebuild gründlich aufräumen
docker builder prune -f
```

**Dauer:** ~5-15 Minuten  
**Wann nutzen:** 
- Nach `package.json` oder `package-lock.json` Änderungen
- Nach Node.js-Version-Updates im Dockerfile
- Bei mysteriösen Build-Fehlern (Cache-Korruption)

**Was passiert:**
1. `--no-cache` → Alle Dockerfile-Stages werden komplett neu ausgeführt
2. `npm ci` läuft erneut (alle Dependencies neu installiert)
3. `--force-recreate` → Container wird definitiv neu erstellt

### 2.3 Schema-Migration (bei Prisma-Änderungen)

```bash
# PROD
cd /opt/stacks/comp-act-diary
git pull origin main
cd deploy
SYNC_SCHEMA=true docker compose up -d --build --force-recreate app
docker compose logs -f app

# TEST
cd /opt/stacks/comp-act-diary-test
git pull origin main
cd deploy
SYNC_SCHEMA=true docker compose up -d --build --force-recreate app
docker compose logs -f app
```

**Wann nutzen:** Nach Schema-Änderungen in `prisma/schema.prisma`

**Was passiert:**
1. `SYNC_SCHEMA=true` → Umgebungsvariable nur für diesen Befehl gesetzt
2. `entrypoint.sh` erkennt `SYNC_SCHEMA=true`
3. Führt `prisma db push` aus → Schema wird auf DB angewendet
4. Danach normaler App-Start

**Wichtig:** `SYNC_SCHEMA=true` ist nur für diesen einen Start aktiv. Beim nächsten `docker compose up` ohne diese Variable wird kein Schema-Sync gemacht.

### 2.4 Nur Restart (ohne Rebuild)

Schnellste Option - nutzt bestehendes Image.

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy
docker compose restart app

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
docker compose restart app

# Oder: Stop + Start (etwas sauberer, im jeweiligen Verzeichnis)
docker compose stop app && docker compose up -d app
```

**Dauer:** ~5-10 Sekunden  
**Wann nutzen:**
- App hängt
- Umgebungsvariable in `.env` geändert (bei `restart` NICHT neu geladen!)
- Nach manuellem Eingriff im Container

**Achtung:** `restart` lädt `.env`-Änderungen NICHT neu! Dafür brauchst du:
```bash
docker compose up -d --force-recreate app
```

### 2.5 Kompletter Stack-Neustart

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy
docker compose down && docker compose up -d

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
docker compose down && docker compose up -d
```

**Dauer:** ~30 Sekunden - 2 Minuten  
**Wann nutzen:** 
- Nach Host-Neustart
- Bei Netzwerk-Problemen
- Wenn DB und App nicht mehr kommunizieren

### 2.6 Entscheidungsbaum: Welches Update?

```
Änderung gemacht?
│
├─► Nur Code (*.ts, *.tsx, *.css)
│   └─► 2.1 Schnelles Update (--build)
│
├─► package.json / package-lock.json
│   └─► 2.2 Vollständiges Rebuild (--no-cache) (falls zusätzlich Prisma geändert, dann noch SYNC_SCHEMA=true setzen)
│
├─► prisma/schema.prisma (und kleinere Änderungen gemäss Kapitel 2.1)
│   └─► 2.3 Schema-Migration (SYNC_SCHEMA=true)
│
├─► .env Datei
│   └─► docker compose up -d --force-recreate app
│
├─► docker-compose.yml
│   └─► docker compose up -d (erkennt Änderungen automatisch)
│
└─► Dockerfile
    └─► 2.2 Vollständiges Rebuild (--no-cache)
```

---

## 3. Logs und Debugging

### Logs anzeigen

```bash
# Im jeweiligen Verzeichnis (PROD oder TEST):

# Alle Container, letzte 100 Zeilen
docker compose logs --tail 100

# Live-Logs (follow)
docker compose logs -f

# Nur App-Logs
docker compose logs -f app

# Nur DB-Logs
docker compose logs -f db

# Mit Zeitstempel
docker compose logs -f --timestamps app
```

### Docker Events

```bash
# Live-Events
docker events

# Gefiltert nach Container (PROD)
docker events --filter="container=compact-diary-app"

# Gefiltert nach Container (TEST)
docker events --filter="container=compact-diary-test-app"

# Nur Fehler-Events
docker events --filter="event=die" --filter="event=kill"
```

### Container-Details inspizieren

```bash
# PROD
docker inspect compact-diary-app
docker inspect compact-diary-app --format='{{json .Mounts}}' | jq

# TEST
docker inspect compact-diary-test-app
docker inspect compact-diary-test-app --format='{{json .Mounts}}' | jq
```

### In Container-Shell

```bash
# Im jeweiligen Verzeichnis (PROD oder TEST):
docker compose exec app sh      # App-Container (sh, da Alpine-basiert)
docker compose exec db bash     # DB-Container
docker compose exec -u root app sh  # Als Root
```

---

## 4. Datenbank-Operationen

### Prisma Studio (Web-UI für DB)

```bash
# PROD (Port 5555)
cd /opt/stacks/comp-act-diary/deploy
docker compose exec app npx prisma studio --port 5555

# TEST (Port 5556, um Konflikte zu vermeiden)
cd /opt/stacks/comp-act-diary-test/deploy
docker compose exec app npx prisma studio --port 5556
```

Dann im Browser:
- PROD: `http://192.168.188.170:5555`
- TEST: `http://192.168.188.170:5556`

**Hinweis:** Studio bindet standardmässig an `0.0.0.0`, also von aussen erreichbar. Nur temporär nutzen!

### Prisma-Befehle

```bash
# Schema validieren
docker compose exec app npx prisma validate

# Client neu generieren
docker compose exec app npx prisma generate

# Schema auf DB anwenden (ohne Migration)
docker compose exec app npx prisma db push

# Schema anzeigen
docker compose exec app npx prisma db pull --print
```

### Direkte SQL-Abfragen

```bash
# Im jeweiligen Verzeichnis (PROD oder TEST):

# Interaktive psql-Session
docker compose exec db psql -U compactdiary -d comp-act-diary

# Einzelne Query
docker compose exec db psql -U compactdiary -d comp-act-diary -c "SELECT COUNT(*) FROM \"User\""

# Tabellen auflisten
docker compose exec db psql -U compactdiary -d comp-act-diary -c "\dt"
```

---

## 5. Backup und Restore

### Automatische Backups

Der `backup_db` Container erstellt automatisch Backups:
- **Intervall:** Alle 8 Stunden (konfigurierbar via `BACKUP_FREQUENCY`)
- **Aufbewahrung:** 3 neueste (konfigurierbar via `BACKUP_NUM_KEEP`)
- **Speicherort:**
  - PROD: `/dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/`
  - TEST: `/dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump/`

### Backup-Status prüfen

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy
docker compose logs backup_db
ls -lah /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
docker compose logs backup_db
ls -lah /dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump/
```

### Manuelles Backup

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy
docker compose exec db pg_dump -U compactdiary -d comp-act-diary -Fc -f /tmp/manual_backup.dump
docker cp compact-diary-db:/tmp/manual_backup.dump ./manual_backup_prod.dump

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
docker compose exec db pg_dump -U compactdiary -d comp-act-diary -Fc -f /tmp/manual_backup.dump
docker cp compact-diary-test-db:/tmp/manual_backup.dump ./manual_backup_test.dump
```

### Restore

```bash
# PROD
cd /opt/stacks/comp-act-diary/deploy
docker compose stop app
docker compose exec db psql -U compactdiary -c "DROP DATABASE \"comp-act-diary\""
docker compose exec db psql -U compactdiary -c "CREATE DATABASE \"comp-act-diary\""
LATEST=$(ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/*.dump | head -1)
echo "Restore von: $LATEST"
docker compose exec -T db pg_restore -U compactdiary -d comp-act-diary < "$LATEST"
docker compose up -d app

# TEST
cd /opt/stacks/comp-act-diary-test/deploy
docker compose stop app
docker compose exec db psql -U compactdiary -c "DROP DATABASE \"comp-act-diary\""
docker compose exec db psql -U compactdiary -c "CREATE DATABASE \"comp-act-diary\""
LATEST=$(ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary-test_db_dump/*.dump | head -1)
echo "Restore von: $LATEST"
docker compose exec -T db pg_restore -U compactdiary -d comp-act-diary < "$LATEST"
docker compose up -d app
```

### DB-Restore-Verifikation (temporärer Stack)

Um sicherzustellen, dass ein Backup wirklich funktioniert, kannst du einen komplett separaten Stack hochfahren, das Backup einspielen und testen. Dieser Stack nutzt ein temporäres Docker-Volume (kein Bind-Mount) und kann danach spurlos gelöscht werden.

> **Hinweis:** Dies ist NICHT die permanente TEST/DEMO-Umgebung! Für die permanente TEST-Umgebung siehe Abschnitt "Initiale Einrichtung TEST-Umgebung" weiter oben.

#### 1. Restore-Test-Compose-Datei erstellen

```bash
# Im deploy-Verzeichnis eine Restore-Test-Datei erstellen
cat > /opt/stacks/comp-act-diary/deploy/docker-compose.restore-test.yml << 'EOF'
version: "3.9"

services:
  restore-test-db:
    image: postgres:16-alpine
    container_name: compact-diary-restore-test-db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      # Temporäres Volume statt Bind-Mount
      - restore-test-db-data:/var/lib/postgresql/data
      # Backup-Verzeichnis read-only einbinden
      - ${DB_BACKUP_PATH}:/backups:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - restore-test-network

  restore-test-app:
    container_name: compact-diary-restore-test-app
    image: deploy-app:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@restore-test-db:5432/${POSTGRES_DB}?schema=public
      SYNC_SCHEMA: "false"
    ports:
      - "3099:3000"
    depends_on:
      restore-test-db:
        condition: service_healthy
    volumes:
      - restore-test-uploads:/app/uploads
    networks:
      - restore-test-network

volumes:
  restore-test-db-data:
    # Temporäres Volume - wird mit docker compose down -v gelöscht
  restore-test-uploads:

networks:
  restore-test-network:
    name: compact-diary-restore-test-network
EOF
```

#### 2. Restore-Test-Stack starten

```bash
cd /opt/stacks/comp-act-diary/deploy

# Restore-Test-Stack hochfahren (nutzt .env für Credentials)
docker compose -f docker-compose.restore-test.yml up -d

# Warten bis DB ready
docker compose -f docker-compose.restore-test.yml logs -f restore-test-db
# (Ctrl+C wenn "database system is ready to accept connections")

# Status prüfen
docker compose -f docker-compose.restore-test.yml ps
```

#### 3. Backup einspielen (automatisch neuestes)

```bash
# Verfügbare Backups im Container anzeigen
docker compose -f docker-compose.restore-test.yml exec restore-test-db ls -la /backups/

# Neuestes Backup automatisch finden und einspielen
LATEST_BACKUP=$(docker compose -f docker-compose.restore-test.yml exec restore-test-db \
  sh -c "ls -t /backups/*.dump 2>/dev/null | head -1")
echo "Neuestes Backup: $LATEST_BACKUP"

# Backup wiederherstellen (automatisch mit neuestem)
docker compose -f docker-compose.restore-test.yml exec restore-test-db \
  sh -c "pg_restore -U postgres -d comp-act-diary --no-owner \$(ls -t /backups/*.dump | head -1)"
```

#### 4. Restore-Test-App prüfen

```bash
# App-Logs prüfen
docker compose -f docker-compose.restore-test.yml logs -f restore-test-app

# Im Browser öffnen
# http://192.168.188.170:3099

# Oder curl-Test
curl -I http://localhost:3099
```

#### 5. Restore-Test-Stack komplett löschen

```bash
cd /opt/stacks/comp-act-diary/deploy

# Container UND Volumes löschen (-v ist wichtig!)
docker compose -f docker-compose.restore-test.yml down -v

# Prüfen dass alles weg ist
docker compose -f docker-compose.restore-test.yml ps
docker volume ls | grep restore-test

# Optional: Restore-Test-Compose-Datei löschen
rm docker-compose.restore-test.yml
```

#### Zusammenfassung Restore-Test-Workflow

```bash
# Komplett-Skript für schnellen Restore-Test
cd /opt/stacks/comp-act-diary/deploy

# 1. Hochfahren
docker compose -f docker-compose.restore-test.yml up -d
sleep 10  # Warten auf DB

# 2. Neuestes Backup automatisch einspielen
docker compose -f docker-compose.restore-test.yml exec restore-test-db \
  sh -c "pg_restore -U postgres -d comp-act-diary --no-owner \$(ls -t /backups/*.dump | head -1)"

# 3. Testen (Browser: http://<IP>:3099)
docker compose -f docker-compose.restore-test.yml logs restore-test-app

# 4. Aufräumen
docker compose -f docker-compose.restore-test.yml down -v
```

**Wichtig:**
- Der Restore-Test-Stack läuft auf **Port 3099** (nicht 3000), um Konflikte zu vermeiden
- Das `-v` bei `down -v` ist essentiell - ohne wird das Volume nicht gelöscht!
- Die Restore-Test-Compose-Datei kann im Repo bleiben oder jedes Mal neu erstellt werden

---

## 6. Umgebungsvariablen

### .env-Datei bearbeiten

```bash
# PROD
nano /opt/stacks/comp-act-diary/deploy/.env

# TEST
nano /opt/stacks/comp-act-diary-test/deploy/.env
```

### Einmalig Variable überschreiben

```bash
# Für einen Befehl
SYNC_SCHEMA=true docker compose up -d app

# Mehrere Variablen
SYNC_SCHEMA=true APP_PORT=3001 docker compose up -d app
```

### Aktuelle Werte prüfen

```bash
# Alle Variablen aus .env + docker-compose.yml
docker compose config

# Nur Umgebungsvariablen eines Containers
docker compose exec app env | sort

# Spezifische Variable
docker compose exec app printenv DATABASE_URL
```

### Wichtige Variablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `SYNC_SCHEMA` | Prisma Schema bei Start synchronisieren | `false` |
| `APP_PORT` | Externer Port der App | `3000` |
| `POSTGRES_PASSWORD` | DB-Passwort | - |
| `DB_DATA_PATH` | Host-Pfad für DB-Daten | - |
| `PUBLIC_UPLOADS_PATH` | Host-Pfad für Uploads | - |

---

## 7. Troubleshooting

### Container startet nicht

```bash
# Exit-Code prüfen
docker compose ps -a

# Letzte Logs vor Crash
docker compose logs --tail 50 app

# Container manuell starten für Debug-Output
docker compose run --rm app sh -c "node --version && npm start"
```

### "Port already in use"

```bash
# Wer belegt den Port?
sudo netstat -tlnp | grep 3000
# oder
sudo ss -tlnp | grep 3000

# Prozess beenden (vorsichtig!)
sudo kill <PID>
```

### Speicherplatz voll

```bash
# Überblick
df -h

# Docker-spezifisch
docker system df

# Aufräumen (ungenutzte Images, Container, Volumes)
docker system prune

# Aggressiver (auch ungetaggte Images)
docker system prune -a

# Nur Build-Cache
docker builder prune
```

### Netzwerk-Probleme

```bash
# Netzwerke auflisten
docker network ls

# Stack-Netzwerk inspizieren
docker network inspect comp-act-diary_default

# Container-IPs
docker compose exec app hostname -i
docker compose exec db hostname -i

# Verbindung testen
docker compose exec app ping db
docker compose exec app nc -zv db 5432
```

### DB-Verbindung fehlgeschlagen

```bash
# DB erreichbar?
docker compose exec app nc -zv db 5432

# Credentials testen
docker compose exec db psql -U compactdiary -d comp-act-diary -c "SELECT 1"

# DATABASE_URL prüfen
docker compose exec app printenv DATABASE_URL
```

### Berechtigungsprobleme

```bash
# Container-User prüfen
docker compose exec app id

# Host-Pfad-Berechtigungen
ls -la /opt/comp-act-diary/

# Anpassen falls nötig
sudo chown -R 1000:1000 /opt/comp-act-diary/uploads
sudo chown -R 999:999 /opt/comp-act-diary/postgres-data  # Postgres-User
```

### Build schlägt fehl

```bash
# Verbose Build
docker compose build --progress=plain app

# Ohne Cache
docker compose build --no-cache app

# Build-Logs separat
docker compose build app 2>&1 | tee build.log
```

---

## Quick Reference

### Häufigste Befehle

```bash
# === PROD ===
cd /opt/stacks/comp-act-diary/deploy
docker compose ps                    # Status
docker compose logs -f app           # Logs
docker compose restart app           # Neustart

# Update PROD
cd /opt/stacks/comp-act-diary && git pull origin main && cd deploy && docker compose up -d --build app

# === TEST ===
cd /opt/stacks/comp-act-diary-test/deploy
docker compose ps                    # Status
docker compose logs -f app           # Logs
docker compose restart app           # Neustart

# Update TEST
cd /opt/stacks/comp-act-diary-test && git pull origin main && cd deploy && docker compose up -d --build app
```

### Nützliche Aliase (für ~/.bashrc)

```bash
# Allgemeine Docker-Aliase
alias dcp='docker compose ps'
alias dcl='docker compose logs -f'
alias dcr='docker compose restart'
alias dce='docker compose exec'
alias dcu='docker compose up -d'
alias dcd='docker compose down'

# CompACT PROD
alias cad='cd /opt/stacks/comp-act-diary/deploy'
alias cadlogs='docker compose -f /opt/stacks/comp-act-diary/deploy/docker-compose.yml logs -f app'
alias cadupdate='cd /opt/stacks/comp-act-diary && git pull origin main && cd deploy && docker compose up -d --build app'

# CompACT TEST
alias cadt='cd /opt/stacks/comp-act-diary-test/deploy'
alias cadtlogs='docker compose -f /opt/stacks/comp-act-diary-test/deploy/docker-compose.yml logs -f app'
alias cadtupdate='cd /opt/stacks/comp-act-diary-test && git pull origin main && cd deploy && docker compose up -d --build app'
```
