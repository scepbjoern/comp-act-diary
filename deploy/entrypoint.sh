#!/bin/sh
# Robust startup: wait for DB to be ready, apply schema/migrations, then start the app
# Assumes DATABASE_URL is set (docker-compose provides it)

set -eu

RETRY_DELAY="${RETRY_DELAY:-3}"
SCHEMA_PATH="${SCHEMA_PATH:-prisma/schema.prisma}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-prisma/migrations}"
MANUAL_MIGRATIONS_DIR="${MANUAL_MIGRATIONS_DIR:-prisma/migrations/manual}"
MIGRATION_MARKER="/app/.migration_v2_complete"

log() {
  echo "[entrypoint] $*"
}

run_with_retry() {
  CMD="$1"
  FAIL_MSG="$2"
  while :; do
    if sh -c "$CMD"; then
      break
    fi
    log "$FAIL_MSG Retrying in ${RETRY_DELAY}s ..."
    sleep "${RETRY_DELAY}"
  done
}

# Extrahiere DB-Verbindungsdaten aus DATABASE_URL für psql
extract_db_info() {
  # DATABASE_URL format: postgresql://user:password@host:port/database?schema=public
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
}

log "Starting with DATABASE_URL=${DATABASE_URL:-<unset>}"
log "Running as: $(whoami) (uid=$(id -u) gid=$(id -g))"
# Prisma-Version (nicht kritisch, aber hilfreich beim Debuggen)
if ./node_modules/.bin/prisma --version >/dev/null 2>&1; then
  # Zeile ohne Zeilenumbrueche loggen
  VERSION="$(./node_modules/.bin/prisma --version 2>/dev/null | tr '\n' ' ')"
  log "Prisma: $VERSION"
fi

# =============================================================================
# EINMALIGE V2-MIGRATION (nur wenn RUN_V2_MIGRATION=true und noch nicht durchgeführt)
# =============================================================================
if [ "${RUN_V2_MIGRATION:-false}" = "true" ] && [ ! -f "$MIGRATION_MARKER" ]; then
  log "=== V2-MIGRATION GESTARTET ==="
  extract_db_info
  export PGPASSWORD="$DB_PASS"
  
  # Warte auf DB
  log "Warte auf Datenbank $DB_HOST:$DB_PORT..."
  while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
    sleep "$RETRY_DELAY"
  done
  log "Datenbank erreichbar."
  
  # Teil 1: Manuelle Migration VOR Prisma
  if [ -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_001_complete_migration.sql" ]; then
    log "Führe PRODUCTION_001_complete_migration.sql aus..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_001_complete_migration.sql"
    log "PRODUCTION_001 abgeschlossen."
  else
    log "WARNUNG: PRODUCTION_001_complete_migration.sql nicht gefunden!"
  fi
  
  # Prisma Schema anwenden
  log "Wende Prisma Schema an (db push)..."
  ./node_modules/.bin/prisma db push --accept-data-loss --schema="$SCHEMA_PATH"
  log "Prisma Schema angewendet."
  
  # Teil 2: Manuelle Migration NACH Prisma
  if [ -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_002_post_prisma.sql" ]; then
    log "Führe PRODUCTION_002_post_prisma.sql aus..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_002_post_prisma.sql"
    log "PRODUCTION_002 abgeschlossen."
  else
    log "WARNUNG: PRODUCTION_002_post_prisma.sql nicht gefunden!"
  fi
  
  # Marker erstellen, damit Migration nicht nochmal läuft
  touch "$MIGRATION_MARKER"
  log "=== V2-MIGRATION ABGESCHLOSSEN ==="
  log "Marker erstellt: $MIGRATION_MARKER"
  log "Setze RUN_V2_MIGRATION=false im nächsten Deploy, um diese Meldung zu vermeiden."
else
  if [ -f "$MIGRATION_MARKER" ]; then
    log "V2-Migration bereits durchgeführt (Marker: $MIGRATION_MARKER)"
  fi
  
  # 1) Ausstehende Migrationen deployen (OHNE --skip-generate)
  run_with_retry \
    "./node_modules/.bin/prisma migrate deploy --schema=\"$SCHEMA_PATH\"" \
    "migrate deploy fehlgeschlagen oder DB nicht bereit."
fi

# 2) Schema-Sync mit db push (nur für Development, nie in Production!)
# Setze ENABLE_DB_PUSH=true nur lokal, wenn du Schema-Änderungen ohne Migration testen willst
if [ "${ENABLE_DB_PUSH:-false}" = "true" ]; then
  log "WARNUNG: db push aktiviert (Development-Modus) – kann Daten löschen!"
  run_with_retry \
    "./node_modules/.bin/prisma db push --skip-generate --accept-data-loss --schema=\"$SCHEMA_PATH\"" \
    "db push fehlgeschlagen oder DB nicht bereit."
else
  log "db push übersprungen (Production-Modus) – nur Migrationen werden angewendet."
fi

log "DB-Schema sichergestellt. Starte App..."
if [ "$#" -gt 0 ]; then
  log "Starte Kommando: $*"
  exec "$@"
else
  log "Kein Kommando angegeben – fallback auf npm run start"
  exec npm run start
fi
