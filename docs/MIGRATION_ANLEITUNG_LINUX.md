# Migrations-Anleitung für Linux/Docker/Proxmox/Portainer

Diese Anleitung ist speziell für die Produktionsumgebung auf **Linux mit Docker in Proxmox LXC** und **Portainer**.

---

## Wichtige Hinweise für DEINE Situation

✅ **Keine Datenverlust-Gefahr für Darmkur-Daten** - du hast keine Stuhlwerte, Gewohnheiten, Bewertungen, Reflexionen, Gewichtsdaten oder Measurements.

⚠️ **Deine Tagebucheinträge werden migriert:**
- DayNote → JournalEntry (mit Typ `daily_note` oder `diary`)
- Audio-Dateien → MediaAsset + MediaAttachment
- **Verbessertes Transkript** → `JournalEntry.content`
- **Original-Transkript** → `JournalEntry.originalTranscript` (eigenes Feld!)

---

## Option A: Automatische Migration mit Portainer (EMPFOHLEN)

### Schritt 1: Backup erstellen

In Portainer oder per SSH:
```bash
docker exec <db-container> pg_dump -U postgres -d "comp-act-diary" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Schritt 2: Umgebungsvariable setzen

In Portainer → Stack → Environment variables:
```
RUN_V2_MIGRATION=true
```

### Schritt 3: Git Push & Redeploy

```bash
git add .
git commit -m "V2 Migration"
git push
```

In Portainer: **Redeploy** klicken.

Die Migration läuft automatisch:
1. `PRODUCTION_001_complete_migration.sql` wird ausgeführt
2. `prisma db push` wendet das neue Schema an
3. `PRODUCTION_002_post_prisma.sql` wird ausgeführt
4. Marker-Datei wird erstellt (verhindert erneute Ausführung)

### Schritt 4: Logs prüfen

```bash
docker logs <app-container> | grep -A 50 "V2-MIGRATION"
```

Erwartete Ausgabe:
```
[entrypoint] RUN_V2_MIGRATION=true
[entrypoint] MIGRATION_MARKER exists: no
[entrypoint] === V2-MIGRATION GESTARTET ===
[entrypoint] Führe PRODUCTION_001_complete_migration.sql aus...
[entrypoint] PRODUCTION_001 abgeschlossen.
[entrypoint] Leere _prisma_migrations Tabelle...
[entrypoint] Wende Prisma Schema an (db push)...
[entrypoint] Prisma Schema angewendet.
[entrypoint] Führe PRODUCTION_002_post_prisma.sql aus...
[entrypoint] PRODUCTION_002 abgeschlossen.
[entrypoint] === V2-MIGRATION ABGESCHLOSSEN ===
```

### Troubleshooting: V2-Migration startet nicht

Wenn die Logs zeigen:
```
[entrypoint] RUN_V2_MIGRATION=false
```

Dann wurde die Umgebungsvariable **nicht korrekt gesetzt**. Prüfe in Portainer:

1. **Stack → Environment variables** (nicht Container Environment!)
2. Exakt so eingeben: `RUN_V2_MIGRATION=true` (ohne Anführungszeichen, ohne Leerzeichen)
3. **Update the stack** klicken (nicht nur Redeploy)

**Alternative:** Direkt in der `docker-compose.yml` hinzufügen:
```yaml
services:
  app:
    environment:
      - RUN_V2_MIGRATION=true
```

### Schritt 5: Umgebungsvariable zurücksetzen

In Portainer → Stack → Environment variables:
```
RUN_V2_MIGRATION=false
```

Dann nochmal **Redeploy** (optional, aber sauberer).

---

## Option B: Manuelle Migration (Alternative)

Falls du die Migration lieber manuell durchführen möchtest:

## Voraussetzungen

```bash
# Container-Name herausfinden
docker ps
# Beispiel-Output: comp-act-diary-db-1 (oder ähnlich)

# Variablen setzen (anpassen!)
export DB_CONTAINER="comp-act-diary-db-1"  # PostgreSQL Container
export APP_CONTAINER="comp-act-diary-app-1"  # App Container (falls separat)
export DB_NAME="comp-act-diary"
export DB_USER="postgres"
```

---

## Schritt 1: Backup erstellen (KRITISCH!)

```bash
# Timestamp für Backup-Datei
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup erstellen
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d "$DB_NAME" > "backup_prod_${TIMESTAMP}.sql"

# Backup verifizieren
ls -la backup_prod_*.sql
head -20 "backup_prod_${TIMESTAMP}.sql"  # Sollte SQL-Statements zeigen
```

---

## Schritt 2: Alte Daten prüfen (VOR Migration)

```bash
# Was haben wir aktuell?
docker exec $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" -c "
SELECT 'DayEntry' as tabelle, COUNT(*) FROM \"DayEntry\"
UNION ALL SELECT 'DayNote', COUNT(*) FROM \"DayNote\"
UNION ALL SELECT 'AudioFile', COUNT(*) FROM \"AudioFile\"
UNION ALL SELECT 'Reflection', COUNT(*) FROM \"Reflection\";
"
```

**Erwartete Ausgabe:** DayNotes und AudioFiles sollten Einträge haben.

---

## Schritt 3: Migrations-Script in Container kopieren

```bash
# Script in Container kopieren
docker cp prisma/migrations/manual/PRODUCTION_001_complete_migration.sql $DB_CONTAINER:/tmp/
docker cp prisma/migrations/manual/PRODUCTION_002_post_prisma.sql $DB_CONTAINER:/tmp/
```

---

## Schritt 4: Migration Script ausführen (VOR Prisma!)

```bash
# Migration Teil 1 ausführen
docker exec $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" -f /tmp/PRODUCTION_001_complete_migration.sql
```

**Erwartete Ausgabe:**
```
BEGIN
CREATE TABLE
...
=== MIGRATION TEIL 1 ABGESCHLOSSEN ===
 tabelle        | anzahl
----------------+--------
 TimeBox        |     XX  (sollte > 0 sein)
 JournalEntry   |     XX  (sollte = Anzahl DayNotes sein)
 MediaAsset     |     XX  (sollte = Anzahl AudioFiles sein)
 ...
```

---

## Schritt 5: App stoppen

```bash
# App-Container stoppen (nicht DB!)
docker stop $APP_CONTAINER
# oder bei docker-compose:
# docker-compose stop app
```

---

## Schritt 6: Prisma Schema anwenden

```bash
# Im App-Verzeichnis (auf dem Host oder im Container)
cd /path/to/comp-act-diary

# Falls du das auf dem Host ausführst:
npx prisma db push --accept-data-loss

# Falls du es im Container ausführen musst:
docker exec -it $APP_CONTAINER npx prisma db push --accept-data-loss
```

**Hinweis:** `--accept-data-loss` ist OK, weil die Daten bereits migriert wurden!

---

## Schritt 7: Post-Migration Script ausführen

```bash
docker exec $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" -f /tmp/PRODUCTION_002_post_prisma.sql
```

**Erwartete Ausgabe:**
```
=== MIGRATION KOMPLETT ABGESCHLOSSEN ===
 tabelle      | anzahl
--------------+--------
 DayEntry     |     XX
 TimeBox      |     XX
 JournalEntry |     XX
```

---

## Schritt 8: Prisma Client generieren

```bash
npx prisma generate
```

---

## Schritt 9: App neu starten und testen

```bash
# App starten
docker start $APP_CONTAINER
# oder:
# docker-compose up -d app

# Logs prüfen
docker logs -f $APP_CONTAINER
```

---

## Schritt 10: Validierung

```bash
# Daten nach Migration prüfen
docker exec $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" -c "
SELECT 'TimeBox (DAY)' as entity, COUNT(*) FROM \"TimeBox\" WHERE kind = 'DAY'
UNION ALL SELECT 'TimeBox (WEEK)', COUNT(*) FROM \"TimeBox\" WHERE kind = 'WEEK'
UNION ALL SELECT 'TimeBox (MONTH)', COUNT(*) FROM \"TimeBox\" WHERE kind = 'MONTH'
UNION ALL SELECT 'JournalEntry', COUNT(*) FROM \"JournalEntry\"
UNION ALL SELECT 'MediaAsset', COUNT(*) FROM \"MediaAsset\"
UNION ALL SELECT 'MediaAttachment', COUNT(*) FROM \"MediaAttachment\"
UNION ALL SELECT 'DayEntry', COUNT(*) FROM \"DayEntry\";
"
```

**Checkliste im Browser:**
- [ ] Login funktioniert
- [ ] Tagebucheinträge werden angezeigt
- [ ] Audio-Dateien sind noch verknüpft
- [ ] Kalender zeigt Tage mit Einträgen

---

## Rollback (falls nötig)

```bash
# Backup wiederherstellen
docker exec -i $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" < backup_prod_${TIMESTAMP}.sql
```

---

## Was wurde migriert?

| Alt | Neu | Status |
|-----|-----|--------|
| DayEntry.date | TimeBox (kind=DAY) | ✅ |
| DayNote | JournalEntry | ✅ |
| DayNote.text | JournalEntry.content | ✅ |
| AudioFile | MediaAsset | ✅ |
| AudioFile → DayNote | MediaAttachment | ✅ |
| Reflection | JournalEntry + TimeBox (WEEK/MONTH) | ✅ |

---

## Troubleshooting

### Fehler: "relation does not exist"
```bash
# Prüfe ob Tabellen existieren
docker exec $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" -c "\dt"
```

### Fehler: "duplicate key"
→ Migration wurde möglicherweise schon teilweise ausgeführt. Backup wiederherstellen und neu starten.

### App startet nicht
```bash
# Logs prüfen
docker logs $APP_CONTAINER --tail 100

# Prisma Client neu generieren
docker exec $APP_CONTAINER npx prisma generate
```

---

*Erstellt: Dezember 2024*
