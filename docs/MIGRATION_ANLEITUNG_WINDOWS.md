# Migrations-Anleitung: Schema v1 → v2 (Windows/PowerShell)

Diese Anleitung beschreibt die Schritte zur Migration des Datenmodells unter Windows.

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

**Wenn die Datenbank in Docker läuft:**
```powershell
# PostgreSQL Backup aus Docker-Container
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker exec comp-act-diary-db-1 pg_dump -U postgres -d comp-act-diary > "backup_dev_$timestamp.sql"
```

**Alternativer Container-Name (falls anders):**
```powershell
# Alle Docker-Container anzeigen
docker ps

# Backup mit korrektem Containernamen
docker exec <container-name> pg_dump -U postgres -d comp-act-diary > "backup_dev_$timestamp.sql"
```

**Wenn PostgreSQL lokal installiert ist:**
```powershell
# PostgreSQL Backup mit Windows-Datum
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h localhost -U postgres -d comp_act_diary_dev > "backup_dev_$timestamp.sql"
```

### Schritt 1.2: Neues Schema aktivieren

```powershell
# Im Projektverzeichnis
cd e:\bjoer\Documents\repos\comp-act-diary

# Altes Schema sichern
Move-Item prisma\schema.prisma prisma\schema.old.prisma

# Neues Schema aktivieren
Move-Item prisma\schema.new.prisma prisma\schema.prisma

# Prisma Client generieren (ohne Migration)
npm run prisma:generate
```

### Schritt 1.3: Neue Tabellen erstellen

```powershell
# Erstellt neue Tabellen OHNE alte zu löschen
npm run prisma:db:push -- --accept-data-loss
```

**WICHTIG:** `--accept-data-loss` ist hier OK, weil wir die Daten manuell migrieren.

### Schritt 1.4: Daten migrieren

**Wenn die Datenbank in Docker läuft:**
```powershell
# SQL-Script in Docker ausführen
docker exec -i comp-act-diary-db-1 psql -U postgres -d comp-act-diary < prisma\migrations\manual\001_migrate_data.sql
```

**Wenn PostgreSQL lokal installiert ist:**
```powershell
# SQL-Script ausführen
psql -h localhost -U postgres -d comp_act_diary_dev -f prisma\migrations\manual\001_migrate_data.sql
```

**Alternative mit vollem Pfad:**
```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U postgres -d comp_act_diary_dev -f prisma\migrations\manual\001_migrate_data.sql
```

**Erwartete Ausgabe:**
```
NOTICE:  TimeBox-Migration OK: X Einträge
NOTICE:  JournalEntry-Migration OK: Y Einträge
COMMIT
```

### Schritt 1.5: Validierung

```sql
-- Manuell prüfen (in psql oder pgAdmin)
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

### Schritt 1.6: Alte Tabellen löschen (nur wenn alles OK!)

**Wenn die Datenbank in Docker läuft:**
```powershell
# SQL-Script in Docker ausführen
docker exec -i comp-act-diary-db-1 psql -U postgres -d comp-act-diary < prisma\migrations\manual\002_drop_old_tables.sql
```

**Wenn PostgreSQL lokal installiert ist:**
```powershell
psql -h localhost -U postgres -d comp_act_diary_dev -f prisma\migrations\manual\002_drop_old_tables.sql
```

### Schritt 1.7: Prisma Schema finalisieren

```powershell
# Schema mit DB synchronisieren
npm run prisma:db:pull

# Client neu generieren
npm run prisma:generate
```

### Schritt 1.8: App testen

```powershell
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

```powershell
# Docker/PM2/systemd - je nach Setup
docker-compose down
# oder
pm2 stop comp-act-diary
```

### Schritt 2.3: Produktiv-Backup erstellen

```powershell
# WICHTIG: Vollständiges Backup!
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> > "backup_prod_$timestamp.sql"

# Backup verifizieren
Get-ChildItem backup_prod_*.sql
```

### Schritt 2.4: Schema deployen

```powershell
# Auf dem Produktiv-Server
cd C:\path\to\comp-act-diary

# Neues Schema aktivieren (wie in DEV)
Move-Item prisma\schema.prisma prisma\schema.old.prisma
Move-Item prisma\schema.new.prisma prisma\schema.prisma

# Neue Tabellen erstellen
npm run prisma:db:push -- --accept-data-loss
```

### Schritt 2.5: Daten migrieren

```powershell
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -f prisma\migrations\manual\001_migrate_data.sql
```

### Schritt 2.6: Validierung (wie in DEV)

```powershell
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -c "
SELECT 'TimeBox (DAY)' as entity, COUNT(*) FROM \"TimeBox\" WHERE kind = 'DAY'
UNION ALL SELECT 'JournalEntry', COUNT(*) FROM \"JournalEntry\"
UNION ALL SELECT 'Entity', COUNT(*) FROM \"Entity\";
"
```

### Schritt 2.7: Alte Tabellen löschen

```powershell
psql -h <PROD_HOST> -U <PROD_USER> -d <PROD_DB> -f prisma\migrations\manual\002_drop_old_tables.sql
```

### Schritt 2.8: App neu starten

```powershell
# Prisma Client generieren
npm run prisma:generate

# App starten
docker-compose up -d
# oder
pm2 start comp-act-diary
```

---

## Teil 3: Rollback (falls nötig)

### Bei Problemen vor dem Löschen der alten Tabellen

```powershell
# Neue Tabellen löschen
psql -d <DB> -c "
DROP TABLE IF EXISTS \"Entity\" CASCADE;
DROP TABLE IF EXISTS \"TimeBox\" CASCADE;
DROP TABLE IF EXISTS \"DayEntry\" CASCADE;
DROP TABLE IF EXISTS \"JournalEntry\" CASCADE;
-- etc.
"

# Altes Schema wiederherstellen
Move-Item prisma\schema.prisma prisma\schema.new.prisma
Move-Item prisma\schema.old.prisma prisma\schema.prisma
npm run prisma:generate
```

### Bei Problemen nach dem Löschen

```powershell
# Backup wiederherstellen
psql -d <DB> < backup_*.sql

# Altes Schema wiederherstellen
Move-Item prisma\schema.prisma prisma\schema.new.prisma
Move-Item prisma\schema.old.prisma prisma\schema.prisma
npm run prisma:generate
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

1. **Types aktualisieren:** `npm run prisma:generate` erzeugt neue Typen
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

## Häufige Probleme & Lösungen

### pg_dump/psql nicht gefunden

**Problem:** `pg_dump: The term 'pg_dump' is not recognized`

**Lösung:**
```powershell
# PostgreSQL zum PATH hinzügen (temporär)
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

# Oder permanent in Systemumgebungsvariablen
# Systemsteuerung → System → Erweiterte Systemeinstellungen → Umgebungsvariablen
```

### Berechtigungsprobleme

**Problem:** `FATAL: password authentication failed`

**Lösung:**
```powershell
# Passwort über Umgebungsvariable
$env:PGPASSWORD = "dein-passwort"
pg_dump -h localhost -U postgres -d comp_act_diary_dev > backup.sql
```

### npm Skripte

**Problem:** `npm run prisma:generate` nicht gefunden

**Lösung:** In `package.json` hinzufügen:
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:db:push": "prisma db push",
    "prisma:db:pull": "prisma db pull"
  }
}
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

*Erstellt: Dezember 2024 (Windows/PowerShell Version)*
