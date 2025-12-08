#!/bin/sh
# Robust startup: wait for DB to be ready, apply schema/migrations, then start the app
# Assumes DATABASE_URL is set (docker-compose provides it)

set -eu

RETRY_DELAY="${RETRY_DELAY:-3}"
SCHEMA_PATH="${SCHEMA_PATH:-prisma/schema.prisma}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-prisma/migrations}"

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

log "Starting with DATABASE_URL=${DATABASE_URL:-<unset>}"
log "Running as: $(whoami) (uid=$(id -u) gid=$(id -g))"
# Prisma-Version (nicht kritisch, aber hilfreich beim Debuggen)
if ./node_modules/.bin/prisma --version >/dev/null 2>&1; then
  # Zeile ohne Zeilenumbrueche loggen
  VERSION="$(./node_modules/.bin/prisma --version 2>/dev/null | tr '\n' ' ')"
  log "Prisma: $VERSION"
fi

# 1) Ausstehende Migrationen deployen (OHNE --skip-generate)
run_with_retry \
  "./node_modules/.bin/prisma migrate deploy --schema=\"$SCHEMA_PATH\"" \
  "migrate deploy fehlgeschlagen oder DB nicht bereit."

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
