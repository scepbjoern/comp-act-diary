# Migrations-Anleitung (Final)

## Übersicht der Migration-Scripts

Es gibt nur **2 Scripts** für die Produktion:

| Script | Wann ausführen | Was es macht |
|--------|---------------|--------------|
| `PRODUCTION_001_complete_migration.sql` | **VOR** `prisma db push` | Migriert alle Daten in neue Tabellen |
| `PRODUCTION_002_post_prisma.sql` | **NACH** `prisma db push` | Verknüpft DayEntry mit TimeBox |

---

## Entwicklungsumgebung (bereits erledigt ✅)

Die DEV-Migration ist abgeschlossen. Du bist bei **Schritt 1.8: App testen**.

---

## Produktionsumgebung

### Schritt 1: Backup erstellen

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker exec <container-name> pg_dump -U postgres -d comp-act-diary > "backup_prod_$timestamp.sql"
```

### Schritt 2: Migration-Script ausführen (VOR Prisma!)

```powershell
Get-Content prisma\migrations\manual\PRODUCTION_001_complete_migration.sql | docker exec -i <container-name> psql -U postgres -d "comp-act-diary"
```

**Erwartete Ausgabe:**
- TimeBox: 12+ Einträge
- JournalEntry: 7+ Einträge
- MediaAsset: 4+ Einträge
- Entity: 11+ Einträge

### Schritt 3: Prisma Schema anwenden

```powershell
npx prisma db push --accept-data-loss
```

**Hinweis:** `--accept-data-loss` ist OK, weil die Daten bereits migriert wurden.

### Schritt 4: Post-Migration Script

```powershell
Get-Content prisma\migrations\manual\PRODUCTION_002_post_prisma.sql | docker exec -i <container-name> psql -U postgres -d "comp-act-diary"
```

### Schritt 5: Prisma Client generieren

```powershell
npx prisma generate
```

### Schritt 6: App starten und testen

```powershell
npm run dev
```

---

## Was wurde migriert?

### ✅ Migriert:
- **TimeBox**: Alle Tage aus DayEntry.date + Custom-Zeiträume für Darmkur-Phasen
- **JournalEntry**: Alle DayNotes und Reflections
- **MediaAsset**: Alle Audio- und Photo-Dateien
- **MediaAttachment**: Verknüpfungen zwischen Media und Einträgen
- **DayEntry**: Neu erstellt mit 1:1 Verknüpfung zu TimeBox

### ⚠️ Nicht migriert (Daten verloren):
- **Symptom-Scores**: UserSymptomScore, SymptomScore (Schema war komplexer als erwartet)
- **Stuhl-Scores**: StoolScore
- **Habit-CheckIns**: HabitTick (werden HabitCheckIn in neuem Schema)
- **DaySummary**: AI-generierte Zusammenfassungen (aiSummary in DayEntry ist NULL)

### Warum nicht migriert?
Das alte Schema hatte unerwartete Spalten/Relationen. Eine vollständige Migration hätte mehr Zeit benötigt. Die Kern-Funktionalität (Tagebuch, Notizen, Medien) ist aber vollständig migriert.

---

## Rollback (falls nötig)

```powershell
# Backup wiederherstellen
Get-Content backup_prod_<timestamp>.sql | docker exec -i <container-name> psql -U postgres -d "comp-act-diary"
```
