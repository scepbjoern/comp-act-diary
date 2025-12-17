# Schema-Workflow: Prisma db push

Dieses Projekt verwendet **`prisma db push`** statt Migrationen für Schema-Änderungen.

---

## Warum db push?

- **Einfacher** für ein Setup mit 1× Dev + 1× Prod
- **Keine Migrationsdateien** zu verwalten
- **Schneller** bei Änderungen
- **Reicht völlig aus** für unsere Anforderungen

---

## Workflow für Schema-Änderungen

### 1. Schema ändern

Bearbeite `prisma/schema.prisma` nach Bedarf.

### 2. Lokal testen (Development)

```bash
# Schema auf lokale DB anwenden
npx prisma db push

# Prisma Client neu generieren
npx prisma generate

# App testen
npm run dev
```

### 3. Deployen (Production)

**Wichtig:** Schema-Sync ist standardmäßig deaktiviert, um Datenverlust zu vermeiden.

```bash
git add .
git commit -m "Schema: <Beschreibung der Änderung>"
git push
```

**Bei Schema-Änderungen:** Setze `SYNC_SCHEMA=true` in `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - SYNC_SCHEMA=true  # Nach erfolgreichem Deploy entfernen!
```

Nach dem Redeploy und Prüfung:
1. `SYNC_SCHEMA=true` wieder entfernen
2. Erneut deployen (oder Container neu starten)

---

## Wichtige Hinweise

### Backup vor größeren Änderungen

Bei Änderungen, die Daten betreffen könnten (z.B. Spalten löschen):

```bash
# In Portainer oder per SSH
docker exec <db-container> pg_dump -U postgres -d "comp-act-diary" > backup_$(date +%Y%m%d).sql
```

### Was `db push` automatisch macht

- ✅ Neue Tabellen erstellen
- ✅ Neue Spalten hinzufügen
- ✅ Indizes erstellen/ändern
- ⚠️ Spalten löschen (mit `--accept-data-loss`)

### Was du manuell machen musst

- 🔧 Daten migrieren (wenn sich Struktur ändert)
- 🔧 Komplexe Umbenennungen
- 🔧 Daten transformieren

---

## Dateien

| Datei | Zweck |
|-------|---------|
| `prisma/schema.prisma` | Schema-Definition |
| `deploy/entrypoint.sh` | Wartet auf DB, optional Schema-Sync |
| `deploy/docker-compose.yml` | Container-Konfiguration mit Umgebungsvariablen |

### Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|---------------|
| `SYNC_SCHEMA` | `false` | Wenn `true`, führt `prisma db push` beim Start aus |
| `SCHEMA_PATH` | `prisma/schema.prisma` | Pfad zum Prisma-Schema |

---

## Alte Migrationen

Die alten Prisma-Migrationen (`prisma/migrations/202*`) wurden nach der V2-Migration gelöscht, da sie nicht mehr benötigt werden.

Falls du jemals zu `prisma migrate` wechseln willst:
```bash
npx prisma migrate dev --name init --create-only
```

---

*Stand: Dezember 2024*
