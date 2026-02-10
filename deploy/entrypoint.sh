#!/bin/sh
# Robust startup: wait for DB to be ready, optionally sync schema, then start app
# Assumes DATABASE_URL is set (docker-compose provides it)
#
# Umgebungsvariablen:
#   SYNC_SCHEMA=true  - Schema-Sync bei Start durchführen (default: false)
#   SCHEMA_PATH       - Pfad zum Prisma-Schema (default: prisma/schema.prisma)
#   SETUP_FTS=true    - Full-Text Search Setup bei Start (default: true)

set -eu

RETRY_DELAY="${RETRY_DELAY:-3}"
SCHEMA_PATH="${SCHEMA_PATH:-prisma/schema.prisma}"
SYNC_SCHEMA="${SYNC_SCHEMA:-false}"
SETUP_FTS="${SETUP_FTS:-true}"

log() {
  echo "[entrypoint] $*"
}

# Extrahiere DB-Verbindungsdaten aus DATABASE_URL für pg_isready
extract_db_info() {
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
}

log "Starting with DATABASE_URL=${DATABASE_URL:-<unset>}"
log "Running as: $(whoami) (uid=$(id -u) gid=$(id -g))"

extract_db_info
export PGPASSWORD="$DB_PASS"

# Warte auf DB
log "Warte auf Datenbank $DB_HOST:$DB_PORT..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep "$RETRY_DELAY"
done
log "Datenbank erreichbar."

# =============================================================================
# OPTIONALER SCHEMA SYNC mit prisma db push
# =============================================================================
if [ "$SYNC_SCHEMA" = "true" ]; then
  log "SYNC_SCHEMA=true → Synchronisiere Schema mit db push..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss --schema="$SCHEMA_PATH"
  log "Schema-Sync abgeschlossen."
else
  log "SYNC_SCHEMA nicht gesetzt → Kein Schema-Sync (Standard-Verhalten)."
  log "Setze SYNC_SCHEMA=true in docker-compose.yml wenn Schema-Änderungen deployt werden."
fi

# =============================================================================
# FULL-TEXT SEARCH SETUP (idempotent, runs by default)
# =============================================================================
if [ "$SETUP_FTS" = "true" ]; then
  log "SETUP_FTS=true → Richte Volltextsuche ein (idempotent)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/setup-fulltext-search.sql -q 2>/dev/null || {
    log "FTS-Setup via psql fehlgeschlagen, versuche via Node.js..."
    node -e "require('./scripts/setup-fulltext-search.ts')" 2>/dev/null || \
    npx ts-node scripts/setup-fulltext-search.ts 2>/dev/null || \
    log "Warnung: FTS-Setup konnte nicht ausgeführt werden. Suche funktioniert evtl. nicht optimal."
  }
  log "FTS-Setup abgeschlossen."
else
  log "SETUP_FTS=false → Kein Volltextsuche-Setup."
fi

# =============================================================================
# SYSTEM DATA SYNC (types + templates, idempotent, runs on every start)
# =============================================================================
log "Synchronisiere System-Typen und -Templates..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/sync-system-types.sql -q 2>/dev/null || \
  log "Warnung: System-Daten-Sync fehlgeschlagen (nicht kritisch)."
log "System-Typen und -Templates synchronisiert."

log "DB-Schema sichergestellt. Starte App..."
if [ "$#" -gt 0 ]; then
  log "Starte Kommando: $*"
  exec "$@"
else
  log "Kein Kommando angegeben – fallback auf npm run start"
  exec npm run start
fi
