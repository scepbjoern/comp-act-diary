# Migration: Portainer Stack → Docker Compose CLI

Diese Anleitung beschreibt die einmalige Migration von einem Portainer-verwalteten Stack zu einer Docker Compose CLI-basierten Installation **ohne Datenverlust**.

## Aktuelles Setup (Portainer mit GitHub-Integration)

Dein Portainer-Stack nutzt die **Git Repository Integration**:
- **Repository:** `https://github.com/scepbjoern/comp-act-diary`
- **Branch:** `refs/heads/main`
- **Compose path:** `deploy/docker-compose.yml`

Portainer klont das Repository automatisch und baut das Image mit dem Dockerfile.

---

## Zusammenspiel der Dateien

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCKER BUILD & RUN WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. docker-compose.yml          → ORCHESTRIERUNG (welche Services, Ports, Volumes)
         │
         ├──► db: postgres:16-alpine (fertiges Image von Docker Hub)
         │
         └──► app: build from Dockerfile
                    │
                    ▼
2. Dockerfile                  → IMAGE BAUEN (wie wird die App "gebacken")
   ├── deps stage:    npm install, prisma generate
   ├── build stage:   npm run build (Next.js kompilieren)
   └── runner stage:  Schlankes Alpine-Image mit fertigem Build
                    │
                    ▼
3. entrypoint.sh              → CONTAINER START (was passiert beim Hochfahren)
   ├── Warte auf DB
   ├── Optional: Schema-Sync (SYNC_SCHEMA=true)
   └── Starte Node.js Server
```

| Phase | Datei | Wann ausgeführt |
|-------|-------|-----------------|
| **Orchestrierung** | `docker-compose.yml` | Immer - definiert Services, Netzwerk, Volumes |
| **Image bauen** | `Dockerfile` | Nur bei `--build` oder wenn kein Image existiert |
| **Container starten** | `entrypoint.sh` | Bei jedem Container-Start (auch Restart) |

---

## Hintergrund

### Wo speichert Portainer die Stack-Daten?

Portainer speichert Stack-Konfigurationen (YAML, Umgebungsvariablen) in seiner **internen BoltDB-Datenbank** unter `/data` im Portainer-Container. Diese Daten sind **nicht als Dateien** auf dem Host zugänglich.

### Wo sind die eigentlichen Anwendungsdaten?

Die Anwendungsdaten (Datenbank, Uploads) liegen in **Bind Mounts** auf dem Host:

```
${DB_DATA_PATH}        → PostgreSQL-Daten
${DB_BACKUP_PATH}      → Datenbank-Backups  
${PUBLIC_UPLOADS_PATH} → Hochgeladene Bilder/Audio
```

**Wichtig:** Diese Daten sind unabhängig von Portainer! Solange du dieselben Host-Pfade verwendest, bleiben alle Daten erhalten.

---

## Voraussetzungen

### Docker Compose V2 prüfen

```bash
# Docker 28.x hat Compose V2 als Plugin integriert
docker compose version

# Erwartete Ausgabe: Docker Compose version v2.x.x
```

Falls nicht installiert:
```bash
# Debian/Ubuntu
sudo apt update && sudo apt install docker-compose-plugin
```

---

## Migration Schritt für Schritt

### 1. Aktuelle Konfiguration aus Portainer exportieren

#### 1.1 Umgebungsvariablen kopieren

Da du die GitHub-Integration nutzt, ist das YAML bereits im Repository. Du brauchst nur die Umgebungsvariablen:

1. Öffne Portainer → Stacks → `comp-act-diary`
2. Scrolle zu "Environment variables"
3. Notiere/kopiere ALLE Variablen und ihre Werte:

**Erwartete Variablen (Keys):**

```bash
# Datenbank
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB

# Pfade (Host-Verzeichnisse)
DB_DATA_PATH
DB_BACKUP_PATH
PUBLIC_UPLOADS_PATH

# App
APP_PORT
UID
GID

# API Keys
OPENAI_API_KEY
TOGETHERAI_API_KEY

# Transcription Models
OPENAI_TRANSCRIBE_MODEL
TOGETHERAI_TRANSCRIBE_MODEL
NEXT_PUBLIC_OPENAI_TRANSCRIBE_MODEL
NEXT_PUBLIC_TOGETHERAI_TRANSCRIBE_MODEL
NEXT_PUBLIC_TRANSCRIBE_MODELS

# LLM Models
TOGETHERAI_LLM_MODEL
NEXT_PUBLIC_TOGETHERAI_LLM_MODEL
NEXT_PUBLIC_LLM_MODELS

# Image/Audio Settings
IMAGE_MAX_WIDTH
IMAGE_MAX_HEIGHT
IMAGE_FORMAT
IMAGE_QUALITY
MAX_AUDIO_FILE_SIZE_MB
AUDIO_RETENTION_DAYS
AUDIO_COMPRESSION_BITRATE

# Schema Sync (optional)
SYNC_SCHEMA
```

#### 1.2 Verwendete Host-Pfade identifizieren

Prüfe in der LXC, welche Pfade aktuell verwendet werden:

```bash
# Zeige alle Mounts des DB-Containers
docker inspect comp-act-diary-db-1 --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'

# Zeige alle Mounts des App-Containers
docker inspect comp-act-diary-app-1 --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
```

**Notiere diese Pfade!** Sie müssen in der `.env`-Datei identisch sein.

---

### 2. Projektverzeichnis auf dem Host erstellen

```bash
# Verzeichnis für Stack-Konfiguration
sudo mkdir -p /opt/stacks/comp-act-diary
cd /opt/stacks/comp-act-diary
```

---

### 3. Repository klonen

#### Option A: Öffentliches Repository (aktueller Stand)

```bash
# Vollständiges Repository klonen
git clone https://github.com/scepbjoern/comp-act-diary.git .
```

#### Option B: Privates Repository (nach Umstellung)

Für private Repositories benötigst du Authentifizierung:

**Variante B1: SSH-Key (empfohlen)**

```bash
# 1. SSH-Key auf der LXC generieren (falls nicht vorhanden)
ssh-keygen -t ed25519 -C "lxc-comp-act-diary"

# 2. Public Key anzeigen
cat ~/.ssh/id_ed25519.pub

# 3. Key in GitHub hinzufügen:
#    GitHub → Settings → SSH and GPG keys → New SSH key

# 4. Repository mit SSH-URL klonen
git clone git@github.com:scepbjoern/comp-act-diary.git .
```

**Variante B2: Personal Access Token (PAT)**

```bash
# 1. Token erstellen:
#    GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
#    Permissions: Contents (read)

# 2. Repository mit Token klonen
git clone https://scepbjoern:ghp_DEIN_TOKEN@github.com/scepbjoern/comp-act-diary.git .

# 3. Token für zukünftige Pulls speichern (optional)
git config credential.helper store
```

**Variante B3: GitHub CLI**

```bash
# GitHub CLI installieren
sudo apt install gh

# Authentifizieren
gh auth login

# Repository klonen
gh repo clone scepbjoern/comp-act-diary .
```

---

### 4. Umgebungsvariablen-Datei erstellen

```bash
# .env im deploy-Verzeichnis erstellen
nano /opt/stacks/comp-act-diary/deploy/.env
```

**Inhalt (mit deinen Werten aus Portainer):**

```env
# ===== DATENBANK =====
POSTGRES_USER=compactdiary
POSTGRES_PASSWORD=DEIN_GEHEIMES_PASSWORT
POSTGRES_DB=comp-act-diary

# ===== PFADE (WICHTIG: Exakt wie in Portainer!) =====
DB_DATA_PATH=/opt/comp-act-diary/postgres-data
DB_BACKUP_PATH=/opt/comp-act-diary/backups
PUBLIC_UPLOADS_PATH=/opt/comp-act-diary/uploads

# ===== APP =====
APP_PORT=3000
UID=1000
GID=1000

# ===== API KEYS =====
OPENAI_API_KEY=sk-...
TOGETHERAI_API_KEY=...

# ===== OPTIONALE EINSTELLUNGEN =====
SYNC_SCHEMA=false
IMAGE_MAX_WIDTH=1600
IMAGE_MAX_HEIGHT=1600
IMAGE_FORMAT=webp
IMAGE_QUALITY=80
MAX_AUDIO_FILE_SIZE_MB=50
AUDIO_RETENTION_DAYS=365
AUDIO_COMPRESSION_BITRATE=64

# ===== TRANSCRIPTION MODELS =====
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
TOGETHERAI_TRANSCRIBE_MODEL=openai/whisper-large-v3
NEXT_PUBLIC_OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
NEXT_PUBLIC_TOGETHERAI_TRANSCRIBE_MODEL=openai/whisper-large-v3
NEXT_PUBLIC_TRANSCRIBE_MODELS=openai/whisper-large-v3,gpt-4o-mini-transcribe,gpt-4o-transcribe

# ===== LLM MODELS =====
TOGETHERAI_LLM_MODEL=openai/gpt-oss-20b
NEXT_PUBLIC_TOGETHERAI_LLM_MODEL=openai/gpt-oss-20b
NEXT_PUBLIC_LLM_MODELS=openai/gpt-oss-20b,openai/gpt-oss-120b,mistralai/Mistral-7B-Instruct-v0.3,meta-llama/Llama-4-Scout-17B-16E-Instruct
```

**Berechtigungen setzen (wichtig für Secrets!):**

```bash
chmod 600 /opt/stacks/comp-act-diary/deploy/.env
```

### 5. Portainer-Stack stoppen (NICHT löschen!)

**Wichtig:** Nur stoppen, nicht löschen - damit Volumes erhalten bleiben.

1. Portainer → Stacks → `comp-act-diary`
2. Klicke auf "Stop" (nicht "Delete"!)

Oder per CLI:
```bash
# Container stoppen (Volumes bleiben erhalten)
docker stop comp-act-diary-app-1 comp-act-diary-db-1 db-backup-compactdiary
```

### 6. Mit Docker Compose CLI starten

```bash
cd /opt/stacks/comp-act-diary/deploy

# Prüfen, ob .env korrekt geladen wird
docker compose config

# Stack starten
docker compose up -d
```

### 7. Verifizieren

```bash
# Container-Status
docker compose ps

# Logs prüfen
docker compose logs -f app

# App im Browser testen
curl -I http://localhost:3000
```

### 8. Portainer-Stack entfernen (optional)

Erst wenn alles funktioniert:

1. Portainer → Stacks → `comp-act-diary`
2. "Delete" → **OHNE** "Remove volumes" anzuhaken!

---

## Troubleshooting

### Container starten nicht

```bash
# Detaillierte Logs
docker compose logs --tail 50

# Container-Status
docker compose ps -a

# Events der letzten Stunde
docker events --since="1h" --filter="container=comp-act-diary"
```

### Datenbank-Verbindung fehlgeschlagen

```bash
# Prüfen, ob DB-Container läuft
docker compose ps db

# DB-Logs
docker compose logs db

# Manuell testen
docker compose exec db psql -U compactdiary -d comp-act-diary -c "SELECT 1"
```

### Pfade stimmen nicht überein

```bash
# Aktuelle Mounts prüfen
docker inspect comp-act-diary-app-1 --format='{{json .Mounts}}' | jq

# .env-Werte mit tatsächlichen Pfaden vergleichen
grep "_PATH" /opt/stacks/comp-act-diary/deploy/.env
```

### Berechtigungsprobleme

```bash
# UID/GID des Host-Users prüfen
id

# Pfad-Besitzer prüfen
ls -la /opt/comp-act-diary/

# Falls nötig, Besitzer anpassen
sudo chown -R 1000:1000 /opt/comp-act-diary/
```

---

## Rollback zu Portainer

Falls etwas schiefgeht:

```bash
# CLI-Container stoppen
cd /opt/stacks/comp-act-diary/deploy
docker compose down

# In Portainer: Stack wieder starten
```

Die Daten sind in den Volumes/Bind-Mounts unverändert.

---

## Zukünftige Updates nach der Migration

Nach der Migration verwendest du CLI-Befehle statt Portainer. Siehe **[DOCKER_OPERATIONS.md](./DOCKER_OPERATIONS.md)** für:

### Schnellreferenz: Update-Befehle

```bash
cd /opt/stacks/comp-act-diary

# 1. Code aktualisieren
git pull origin main

# 2. App neu bauen und starten
cd deploy
docker compose up -d --build app
```

### Bei Schema-Änderungen (Prisma)

```bash
cd /opt/stacks/comp-act-diary
git pull origin main
cd deploy
SYNC_SCHEMA=true docker compose up -d --build --force-recreate app
```

### Private Repository: Updates pullen

**Mit SSH-Key:**
```bash
cd /opt/stacks/comp-act-diary
git pull origin main
```

**Mit PAT (falls Token abgelaufen):**
```bash
# Neuen Token generieren und Remote aktualisieren
git remote set-url origin https://scepbjoern:ghp_NEUER_TOKEN@github.com/scepbjoern/comp-act-diary.git
git pull origin main
```

---

## Nächste Schritte

Nach erfolgreicher Migration siehe:
- **[DOCKER_OPERATIONS.md](./DOCKER_OPERATIONS.md)** - Tägliche Befehle, Updates, Troubleshooting
