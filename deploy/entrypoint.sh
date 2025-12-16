#!/bin/sh
# Robust startup: wait for DB to be ready, run V2 migration if needed, then start app
# Assumes DATABASE_URL is set (docker-compose provides it)
#
# STRATEGIE: Automatisch erkennen ob V2-Migration nötig ist anhand alter Tabellen.
# KEIN Verlassen auf Umgebungsvariablen - das hat nicht funktioniert!

set -eu

RETRY_DELAY="${RETRY_DELAY:-3}"
SCHEMA_PATH="${SCHEMA_PATH:-prisma/schema.prisma}"
MANUAL_MIGRATIONS_DIR="${MANUAL_MIGRATIONS_DIR:-prisma/migrations/manual}"

log() {
  echo "[entrypoint] $*"
}

# Extrahiere DB-Verbindungsdaten aus DATABASE_URL für psql
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
# AUTOMATISCHE ERKENNUNG: Prüfe ob alte Tabellen existieren (= V2 Migration nötig)
# =============================================================================
OLD_TABLES_EXIST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'DayNote' AND table_schema = 'public';" 2>/dev/null | tr -d ' ')

NEW_TABLES_EXIST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'JournalEntry' AND table_schema = 'public';" 2>/dev/null | tr -d ' ')

log "Alte Tabellen (DayNote) existieren: $([ "$OLD_TABLES_EXIST" = "1" ] && echo 'JA' || echo 'NEIN')"
log "Neue Tabellen (JournalEntry) existieren: $([ "$NEW_TABLES_EXIST" = "1" ] && echo 'JA' || echo 'NEIN')"

# =============================================================================
# ENTSCHEIDUNGSLOGIK
# =============================================================================
if [ "$OLD_TABLES_EXIST" = "1" ] && [ "$NEW_TABLES_EXIST" != "1" ]; then
  # FALL 1: Alte Tabellen da, neue nicht → V2 Migration durchführen
  log "=== V2-MIGRATION WIRD AUTOMATISCH GESTARTET ==="
  log "(Alte Tabellen gefunden, neue fehlen noch)"
  
  # Teil 1: Manuelle Migration VOR Prisma (Daten kopieren)
  if [ -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_001_complete_migration.sql" ]; then
    log "Führe PRODUCTION_001_complete_migration.sql aus..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_001_complete_migration.sql"
    log "PRODUCTION_001 abgeschlossen."
  else
    log "FEHLER: PRODUCTION_001_complete_migration.sql nicht gefunden!"
    exit 1
  fi
  
  # _prisma_migrations zurücksetzen
  log "Setze _prisma_migrations zurück..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "TRUNCATE TABLE \"_prisma_migrations\" RESTART IDENTITY;" 2>/dev/null || true
  
  # Prisma Schema anwenden
  log "Wende Prisma Schema an (db push)..."
  ./node_modules/.bin/prisma db push --accept-data-loss --schema="$SCHEMA_PATH"
  log "Prisma Schema angewendet."
  
  # Teil 2: Manuelle Migration NACH Prisma (DayEntry neu erstellen)
  if [ -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_002_post_prisma.sql" ]; then
    log "Führe PRODUCTION_002_post_prisma.sql aus..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "$MANUAL_MIGRATIONS_DIR/PRODUCTION_002_post_prisma.sql"
    log "PRODUCTION_002 abgeschlossen."
  else
    log "WARNUNG: PRODUCTION_002_post_prisma.sql nicht gefunden."
  fi
  
  log "=== V2-MIGRATION ABGESCHLOSSEN ==="

elif [ "$NEW_TABLES_EXIST" = "1" ]; then
  # FALL 2: Neue Tabellen existieren bereits → nur Schema sync
  log "Neue Tabellen bereits vorhanden - nur Schema-Sync mit db push..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss --schema="$SCHEMA_PATH"
  log "Schema-Sync abgeschlossen."

else
  # FALL 3: Komplett leere DB → nur Schema erstellen
  log "Leere Datenbank erkannt - erstelle Schema mit db push..."
  ./node_modules/.bin/prisma db push --accept-data-loss --schema="$SCHEMA_PATH"
  log "Schema erstellt."
fi

log "DB-Schema sichergestellt. Starte App..."
if [ "$#" -gt 0 ]; then
  log "Starte Kommando: $*"
  exec "$@"
else
  log "Kein Kommando angegeben – fallback auf npm run start"
  exec npm run start
fi
