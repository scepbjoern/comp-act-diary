# Docker Operations Guide

Tägliche Befehle, Update-Strategien und Troubleshooting für den CompACT Diary Stack.

**Voraussetzung:** Migration von Portainer abgeschlossen (siehe [PORTAINER_TO_CLI_MIGRATION.md](./PORTAINER_TO_CLI_MIGRATION.md))

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

1. [Grundlegende Befehle](#1-grundlegende-befehle)
2. [Deployment-Varianten](#2-deployment-varianten)
3. [Logs und Debugging](#3-logs-und-debugging)
4. [Datenbank-Operationen](#4-datenbank-operationen)
5. [Backup und Restore](#5-backup-und-restore)
6. [Umgebungsvariablen](#6-umgebungsvariablen)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Grundlegende Befehle

### Arbeitsverzeichnis

```bash
cd /opt/stacks/comp-act-diary/deploy
```

### Status prüfen

```bash
# Alle Container des Stacks
docker compose ps

# Detaillierter Status
docker compose ps -a

# Ressourcenverbrauch
docker stats --no-stream
```

### Container steuern

```bash
# Alle starten
docker compose up -d

# Alle stoppen (Daten bleiben erhalten)
docker compose stop

# Alle stoppen und entfernen (Volumes bleiben!)
docker compose down

# Einzelnen Service neustarten
docker compose restart app
docker compose restart db
```

**Container-Namen:**
- App: `compact-diary-app`
- Datenbank: `compact-diary-db`
- Backup: `compact-diary-db-backup`

Diese Namen sind in `docker-compose.yml` mit `container_name` fest definiert.

---

## 2. Deployment-Varianten

### 2.1 Schnelles Update (empfohlen für kleine Änderungen)

Nutzt Docker Build-Cache maximal. Nur geänderte Layer werden neu gebaut.

```bash
cd /opt/stacks/comp-act-diary

# Code aktualisieren
git pull origin main

# Nur App-Container neu bauen und starten
cd deploy
# Variante 1: Zwei Schritte (mehr Kontrolle)
docker compose build app
docker compose up -d app  # --force-recreate nicht nötig!

# Variante 2: Ein Befehl (schneller)
docker compose up -d --build app

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
cd /opt/stacks/comp-act-diary
git pull origin main

cd deploy
docker compose build --no-cache app
docker compose up -d --force-recreate app

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
cd /opt/stacks/comp-act-diary
git pull origin main

cd deploy
# Einmalig mit SYNC_SCHEMA=true
SYNC_SCHEMA=true docker compose up -d --build --force-recreate app

# Danach prüfen
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
cd /opt/stacks/comp-act-diary/deploy

# Nur App neustarten
docker compose restart app

# Oder: Stop + Start (etwas sauberer)
docker compose stop app
docker compose up -d app
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
cd /opt/stacks/comp-act-diary/deploy

# Alles stoppen (Container werden entfernt, Volumes bleiben!)
docker compose down

# Alles neu starten
docker compose up -d
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
│   └─► 2.2 Vollständiges Rebuild (--no-cache)
│
├─► prisma/schema.prisma
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
# Alle Container, letzte 100 Zeilen
docker compose logs --tail 100

# Live-Logs (follow)
docker compose logs -f

# Nur App-Logs
docker compose logs -f app

# Nur DB-Logs
docker compose logs -f db

# Nur Backup-Logs
docker compose logs -f backup_db

# Mit Zeitstempel
docker compose logs -f --timestamps app
```

### Docker Events

```bash
# Live-Events
docker events

# Letzte Stunde
docker events --since="1h"

# Gefiltert nach Container
docker events --filter="container=comp-act-diary-app-1"

# Nur Fehler-Events
docker events --filter="event=die" --filter="event=kill"
```

### Container-Details inspizieren

```bash
# Vollständige Container-Info
docker inspect comp-act-diary-app-1

# Nur Mounts
docker inspect comp-act-diary-app-1 --format='{{json .Mounts}}' | jq

# Nur Umgebungsvariablen
docker inspect comp-act-diary-app-1 --format='{{range .Config.Env}}{{println .}}{{end}}'

# Nur Netzwerk
docker inspect comp-act-diary-app-1 --format='{{json .NetworkSettings.Networks}}' | jq
```

### In Container-Shell

```bash
# App-Container (sh, da Alpine-basiert)
docker compose exec app sh

# DB-Container
docker compose exec db bash

# Als Root
docker compose exec -u root app sh
```

---

## 4. Datenbank-Operationen

### Prisma Studio (Web-UI für DB)

```bash
# Temporär starten (Port 5555)
docker compose exec app npx prisma studio

# Oder mit anderem Port
docker compose exec app npx prisma studio --port 5556
```

Dann im Browser: `http://DEINE_LXC_IP:5555`

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
- **Speicherort:** `${DB_BACKUP_PATH}` (z.B. `/dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/`)

### Backup-Status prüfen

```bash
# Backup-Container-Logs
docker compose logs backup_db

# Vorhandene Backups auflisten
ls -lah /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/

# Neuestes Backup
ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/*.dump | head -1
```

### Manuelles Backup

```bash
# Ad-hoc Backup erstellen
docker compose exec db pg_dump -U compactdiary -d comp-act-diary -Fc \
  -f /tmp/manual_backup.dump

# Aus Container kopieren
docker cp compact-diary-db:/tmp/manual_backup.dump ./manual_backup.dump
```

### Restore

```bash
# 1. App stoppen (DB weiterlaufen lassen)
docker compose stop app

# 2. Bestehende DB löschen und neu erstellen
docker compose exec db psql -U compactdiary -c "DROP DATABASE \"comp-act-diary\""
docker compose exec db psql -U compactdiary -c "CREATE DATABASE \"comp-act-diary\""

# 3. Neuestes Backup finden und einspielen
LATEST=$(ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/*.dump | head -1)
echo "Restore von: $LATEST"
docker compose exec -T db pg_restore -U compactdiary -d comp-act-diary < "$LATEST"

# 4. App wieder starten
docker compose up -d app
```

### Backup-Verifikation mit temporärem Test-Stack

Um sicherzustellen, dass ein Backup wirklich funktioniert, kannst du einen komplett separaten Stack hochfahren, das Backup einspielen und testen. Dieser Stack nutzt ein temporäres Docker-Volume (kein Bind-Mount) und kann danach spurlos gelöscht werden.

#### 1. Test-Compose-Datei erstellen

```bash
# Im deploy-Verzeichnis eine Test-Datei erstellen
cat > /opt/stacks/comp-act-diary/deploy/docker-compose.test.yml << 'EOF'
version: "3.9"

services:
  test-db:
    image: postgres:16-alpine
    container_name: compact-diary-test-db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      # Temporäres Volume statt Bind-Mount
      - test-db-data:/var/lib/postgresql/data
      # Backup-Verzeichnis read-only einbinden
      - ${DB_BACKUP_PATH}:/backups:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - test-network

  test-app:
    container_name: compact-diary-test-app
    image: deploy-app:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@test-db:5432/${POSTGRES_DB}?schema=public
      SYNC_SCHEMA: "false"
    ports:
      - "3099:3000"
    depends_on:
      test-db:
        condition: service_healthy
    volumes:
      - test-uploads:/app/uploads
    networks:
      - test-network

volumes:
  test-db-data:
    # Temporäres Volume - wird mit docker compose down -v gelöscht
  test-uploads:

networks:
  test-network:
    name: compact-diary-test-network
EOF
```

#### 2. Test-Stack starten

```bash
cd /opt/stacks/comp-act-diary/deploy

# Test-Stack hochfahren (nutzt .env für Credentials)
docker compose -f docker-compose.test.yml up -d

# Warten bis DB ready
docker compose -f docker-compose.test.yml logs -f test-db
# (Ctrl+C wenn "database system is ready to accept connections")

# Status prüfen
docker compose -f docker-compose.test.yml ps
```

#### 3. Backup einspielen (automatisch neuestes)

```bash
# Verfügbare Backups im Container anzeigen
docker compose -f docker-compose.test.yml exec test-db ls -la /backups/

# Neuestes Backup automatisch finden und einspielen
LATEST_BACKUP=$(docker compose -f docker-compose.test.yml exec test-db \
  sh -c "ls -t /backups/*.dump 2>/dev/null | head -1")
echo "Neuestes Backup: $LATEST_BACKUP"

# Backup wiederherstellen (automatisch mit neuestem)
docker compose -f docker-compose.test.yml exec test-db \
  sh -c "pg_restore -U postgres -d comp-act-diary --no-owner \$(ls -t /backups/*.dump | head -1)"
```

#### 4. Test-App prüfen

```bash
# App-Logs prüfen
docker compose -f docker-compose.test.yml logs -f test-app

# Im Browser öffnen
# http://192.168.188.170:3099

# Oder curl-Test
curl -I http://localhost:3099
```

#### 4.1 Diarium-Import im Test-Stack

```bash
# 1) Neuesten Diarium-Export auf dem Host finden (Pfad anpassen falls nötig)
LATEST_DIARIUM=$(ls -t /dockerdata-slow/db_dumps/diary/comp-act-diary_db_dump/*.json 2>/dev/null | head -1)
echo "Neuster Diarium-Export: $LATEST_DIARIUM"

# 2) In den Test-App-Container kopieren
docker cp "$LATEST_DIARIUM" compact-diary-test-app:/app/uploads/diarium.json

# 3) Import im Test-App-Container ausführen
docker compose -f docker-compose.test.yml exec test-app \
  npx tsx scripts/import-diarium.ts /app/uploads/diarium.json
```

#### 5. Test-Stack komplett löschen

```bash
cd /opt/stacks/comp-act-diary/deploy

# Container UND Volumes löschen (-v ist wichtig!)
docker compose -f docker-compose.test.yml down -v

# Prüfen dass alles weg ist
docker compose -f docker-compose.test.yml ps
docker volume ls | grep test

# Optional: Test-Compose-Datei löschen
rm docker-compose.test.yml
```

#### Zusammenfassung Test-Workflow

```bash
# Komplett-Skript für schnellen Test
cd /opt/stacks/comp-act-diary/deploy

# 1. Hochfahren
docker compose -f docker-compose.test.yml up -d
sleep 10  # Warten auf DB

# 2. Neuestes Backup automatisch einspielen
docker compose -f docker-compose.test.yml exec test-db \
  sh -c "pg_restore -U postgres -d comp-act-diary --no-owner \$(ls -t /backups/*.dump | head -1)"

# 3. Testen (Browser: http://<IP>:3099)
docker compose -f docker-compose.test.yml logs test-app

# 4. Aufräumen
docker compose -f docker-compose.test.yml down -v
```

**Wichtig:**
- Der Test-Stack läuft auf **Port 3099** (nicht 3000), um Konflikte zu vermeiden
- Das `-v` bei `down -v` ist essentiell - ohne wird das Volume nicht gelöscht!
- Die Test-Compose-Datei kann im Repo bleiben oder jedes Mal neu erstellt werden

---

## 6. Umgebungsvariablen

### .env-Datei bearbeiten

```bash
nano /opt/stacks/comp-act-diary/deploy/.env
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
# Status
docker compose ps

# Logs
docker compose logs -f app

# Neustart
docker compose restart app

# Update (Standard)
git pull && docker compose up -d --build app

# Update (mit Schema-Sync)
git pull && SYNC_SCHEMA=true docker compose up -d --build --force-recreate app

# Shell
docker compose exec app sh

# Prisma Studio
docker compose exec app npx prisma studio
```

### Nützliche Aliase (für ~/.bashrc)

```bash
alias dcp='docker compose ps'
alias dcl='docker compose logs -f'
alias dcr='docker compose restart'
alias dce='docker compose exec'
alias dcu='docker compose up -d'
alias dcd='docker compose down'

# CompACT-spezifisch
alias cad='cd /opt/stacks/comp-act-diary/deploy'
alias cadlogs='docker compose -f /opt/stacks/comp-act-diary/deploy/docker-compose.yml logs -f app'
alias cadupdate='cd /opt/stacks/comp-act-diary && git pull && cd deploy && docker compose up -d --build app'
```
