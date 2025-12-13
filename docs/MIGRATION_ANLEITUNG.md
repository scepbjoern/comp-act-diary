# Migrations-Anleitung: Schema v1 → v2

Diese Anleitung beschreibt die Schritte zur Migration des Datenmodells.

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. ENTWICKLUNGSUMGEBUNG (zuerst!)                                          │
│     → Schema testen, Migration validieren                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. PRODUKTIVUMGEBUNG (nach erfolgreicher DEV-Migration)                    │
│     → Backup, Migration, Validierung                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Teil 1: Entwicklungsumgebung

### Schritt 1.1: Backup der DEV-Datenbank

```bash
# PostgreSQL Backup
pg_dump -h localhost -U postgres -d comp_act_diary_dev > backup_dev_$(date +%Y%m%d_%H%M%S).sql
```

### Schritt 1.2: Neues Schema aktivieren

```bash
# Im Projektverzeichnis
cd e:\bjoer\Documents\repos\comp-act-diary

# Altes Schema sichern
mv prisma/schema.prisma prisma/schema.old.prisma

# Neues Schema aktivieren
mv prisma/schema.new.prisma prisma/schema.prisma

# Prisma Client generieren (ohne Migration)
npx prisma generate
```

### Schritt 1.3: Schema-Diff prüfen (optional)

```bash
# Zeigt an, welche Änderungen Prisma vornehmen würde
npx prisma migrate diff --from-schema-datamodel prisma/schema.old.prisma --to-schema-datamodel prisma/schema.prisma
```

### Schritt 1.4: Neue Tabellen erstellen

```bash
# Erstellt neue Tabellen OHNE alte zu löschen
npx prisma db push --accept-data-loss
```

**WICHTIG:** `--accept-data-loss` ist hier OK, weil wir die Daten manuell migrieren.

### Schritt 1.5: Daten migrieren

```bash
# SQL-Script ausführen
psql -h localhost -U postgres -d comp_act_diary_dev -f prisma/migrations/manual/001_migrate_data.sql
```

**Erwartete Ausgabe:**
```
NOTICE:  TimeBox-Migration OK: X Einträge
NOTICE:  JournalEntry-Migration OK: Y Einträge
COMMIT
```

### Schritt 1.6: Validierung

```sql
-- Manuell prüfen
SELECT 'TimeBox (DAY)' as entity, COUNT(*) FROM "TimeBox" WHERE kind = 'DAY'
UNION ALL
SELECT 'TimeBox (CUSTOM)', COUNT(*) FROM "TimeBox" WHERE kind = 'CUSTOM'
UNION ALL
SELECT 'DayEntry', COUNT(*) FROM "DayEntry"
UNION ALL
SELECT 'JournalEntry', COUNT(*) FROM "JournalEntry"
UNION ALL
SELECT 'MediaAsset', COUNT(*) FROM "MediaAsset"
UNION ALL
SELECT 'Measurement', COUNT(*) FROM "Measurement"
UNION ALL
SELECT 'HabitCheckIn', COUNT(*) FROM "HabitCheckIn"
UNION ALL
SELECT 'Bookmark', COUNT(*) FROM "Bookmark"
UNION ALL
SELECT 'Entity', COUNT(*) FROM "Entity";
```

### Schritt 1.7: Alte Tabellen löschen (nur wenn alles OK!)

```bash
psql -h localhost -U postgres -d comp_act_diary_dev -f prisma/migrations/manual/002_drop_old_tables.sql
```

### Schritt 1.8: Prisma Schema finalisieren

```bash
# Schema mit DB synchronisieren
npx prisma db pull

# Client neu generieren
npx prisma generate
```

### Schritt 1.9: App testen

```bash
npm run dev
```

**Zu prüfen:**
- [ ] Login funktioniert
- [ ] Tagesansicht lädt (wird Fehler zeigen bis Code angepasst)

---

## Teil 2: Produktivumgebung

**WICHTIG:** Erst ausführen, nachdem DEV erfolgreich war!

### Schritt 2.1: Downtime ankündigen

Die App muss während der Migration offline sein.

### Schritt 2.2: App stoppen

```bash
# Docker/PM2/systemd - je nach Setup
docker-compose down
# oder
pm2 stop comp-act-diary
```

### Schritt 2.3: Produktiv-Backup erstellen

```bash
# WICHTIG: Vollständiges Backup!
pg_dump -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# Backup verifizieren
ls -la backup_prod_*.sql
```

### Schritt 2.4: Schema deployen

```bash
# Auf dem Produktiv-Server
cd /path/to/comp-act-diary

# Neues Schema aktivieren (wie in DEV)
mv prisma/schema.prisma prisma/schema.old.prisma
mv prisma/schema.new.prisma prisma/schema.prisma

# Neue Tabellen erstellen
npx prisma db push --accept-data-loss
```

### Schritt 2.5: Daten migrieren

```bash
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -f prisma/migrations/manual/001_migrate_data.sql
```

### Schritt 2.6: Validierung (wie in DEV)

```bash
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -c "
SELECT 'TimeBox (DAY)' as entity, COUNT(*) FROM \"TimeBox\" WHERE kind = 'DAY'
UNION ALL SELECT 'JournalEntry', COUNT(*) FROM \"JournalEntry\"
UNION ALL SELECT 'Entity', COUNT(*) FROM \"Entity\";
"
```

### Schritt 2.7: Alte Tabellen löschen

```bash
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -f prisma/migrations/manual/002_drop_old_tables.sql
```

### Schritt 2.8: App neu starten

```bash
# Prisma Client generieren
npx prisma generate

# App starten
docker-compose up -d
# oder
pm2 start comp-act-diary
```

---

## Teil 3: Rollback (falls nötig)

### Bei Problemen vor dem Löschen der alten Tabellen

```bash
# Neue Tabellen löschen
psql -d <DB> -c "
DROP TABLE IF EXISTS \"Entity\" CASCADE;
DROP TABLE IF EXISTS \"TimeBox\" CASCADE;
DROP TABLE IF EXISTS \"DayEntry\" CASCADE;
DROP TABLE IF EXISTS \"JournalEntry\" CASCADE;
-- etc.
"

# Altes Schema wiederherstellen
mv prisma/schema.prisma prisma/schema.new.prisma
mv prisma/schema.old.prisma prisma/schema.prisma
npx prisma generate
```

### Bei Problemen nach dem Löschen

```bash
# Backup wiederherstellen
psql -d <DB> < backup_*.sql

# Altes Schema wiederherstellen
mv prisma/schema.prisma prisma/schema.new.prisma
mv prisma/schema.old.prisma prisma/schema.prisma
npx prisma generate
```

---

## Teil 4: Nach der Migration - App-Code anpassen

Nach erfolgreicher Datenbank-Migration muss der App-Code angepasst werden.

### Betroffene Bereiche

| Bereich | Änderungen |
|---------|------------|
| **API Routes** | Alle `/api/days/*` → `/api/timeboxes/*` |
| **Services** | `dayEntryService` → `timeBoxService` + `dayEntryService` |
| **Components** | `DayView`, `NoteEditor`, etc. |
| **Types** | Neue TypeScript-Typen aus Prisma |

### Empfohlene Reihenfolge

1. **Types aktualisieren:** `npx prisma generate` erzeugt neue Typen
2. **API Routes:** Eine Route nach der anderen umstellen
3. **Services/Hooks:** Parallel zu den Routes
4. **Components:** Am Ende, wenn APIs funktionieren

### Beispiel: Alte API → Neue API

```typescript
// ALT
const response = await fetch('/api/days/2024-01-15');
const { dayEntry, notes } = await response.json();

// NEU
const response = await fetch('/api/timeboxes/2024-01-15');
const { timeBox, dayEntry, journalEntries } = await response.json();
```

---

## Checkliste

### Entwicklungsumgebung
- [ ] Backup erstellt
- [ ] Neues Schema aktiviert
- [ ] `prisma db push` erfolgreich
- [ ] `001_migrate_data.sql` ausgeführt
- [ ] Validierung zeigt korrekte Zahlen
- [ ] `002_drop_old_tables.sql` ausgeführt
- [ ] App startet ohne Fehler

### Produktivumgebung
- [ ] DEV-Migration erfolgreich abgeschlossen
- [ ] Downtime kommuniziert
- [ ] App gestoppt
- [ ] Backup erstellt und verifiziert
- [ ] Schema deployed
- [ ] Daten migriert
- [ ] Validierung OK
- [ ] Alte Tabellen gelöscht
- [ ] App neu gestartet
- [ ] Smoke-Test durchgeführt

---

*Erstellt: Dezember 2024*
