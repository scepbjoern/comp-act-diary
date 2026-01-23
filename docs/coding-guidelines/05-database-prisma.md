# Datenbank & Prisma

Prisma ORM Patterns und Schema-Workflow.

---

## Wichtig: db push statt migrate

Dieses Projekt verwendet **`prisma db push`** statt Migrationen.

### Warum?

- Einfacher für 1× Dev + 1× Prod Setup
- Keine Migrationsdateien zu verwalten
- Schneller bei Änderungen
- Reicht völlig aus für unsere Anforderungen

### Workflow

```bash
# 1. Schema ändern
# prisma/schema.prisma bearbeiten

# 2. Lokal anwenden
npx prisma db push
npx prisma generate

# 3. Testen
npm run dev

# 4. Deployen
git commit -m "Schema: <Beschreibung>"
git push
# In docker-compose.yml: SYNC_SCHEMA=true setzen
# Nach Deploy: SYNC_SCHEMA=true wieder entfernen!
```

---

## Prisma Client

### Import

```typescript
import { prisma } from '@/lib/core/prisma'
// oder
import { getPrisma } from '@/lib/core/prisma'
const prisma = getPrisma()
```

### Beispiel Query

```typescript
const entries = await prisma.journalEntry.findMany({
  where: { 
    userId,
    deletedAt: null
  },
  include: {
    type: true,
    timeBox: true,
    location: true
  },
  orderBy: { occurredAt: 'desc' },
  take: 50
})
```

---

## Query Patterns

### Eager Loading (N+1 vermeiden)

```typescript
// ❌ N+1 Problem
const entries = await prisma.journalEntry.findMany()
for (const entry of entries) {
  const type = await prisma.journalEntryType.findUnique({
    where: { id: entry.typeId }
  })
}

// ✅ Eager Loading mit include
const entries = await prisma.journalEntry.findMany({
  include: { type: true }
})
```

### Select für Performance

```typescript
// Nur benötigte Felder laden
const entries = await prisma.journalEntry.findMany({
  select: {
    id: true,
    title: true,
    occurredAt: true,
    type: {
      select: { name: true, icon: true }
    }
  }
})
```

### Transaktionen

```typescript
await prisma.$transaction(async (tx) => {
  const entry = await tx.journalEntry.create({ data: {...} })
  await tx.entity.create({ data: { id: entry.id, ... } })
})
```

---

## Indexing

### Wichtige Indices

Bereits im Schema definiert (50+ Indices):

```prisma
model JournalEntry {
  @@index([userId, typeId])
  @@index([userId, typeId, createdAt])
  @@index([timeBoxId])
  @@index([timeBoxId, occurredAt])
  @@index([locationId])
  @@index([deletedAt])
  @@index([userId, deletedAt])
}

model RawGpsPoint {
  @@index([userId, capturedAt])
  @@index([userId, geocodedAt])
  @@index([userId, locationId])
  @@index([lat, lng])
}
```

### Neue Indices hinzufügen

Bei neuen häufigen Queries:

```prisma
model NewModel {
  // Composite Index für häufige Filter-Kombination
  @@index([userId, status, createdAt])
}
```

---

## Schema-Konventionen

### Relationen

```prisma
model JournalEntry {
  id        String   @id @default(cuid())
  userId    String
  typeId    String
  
  // Relationen
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      JournalEntryType @relation(fields: [typeId], references: [id])
}
```

### Soft Deletes

```prisma
model JournalEntry {
  deletedAt DateTime?
  
  @@index([deletedAt])
  @@index([userId, deletedAt])
}
```

```typescript
// Queries mit Soft Delete
const entries = await prisma.journalEntry.findMany({
  where: { deletedAt: null }
})
```

### Timestamps

```prisma
model JournalEntry {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Testdaten bei Schema-Änderungen

Bei Änderungen am Prisma-Schema müssen auch die Testdaten angepasst werden:

| Datei | Zweck |
|-------|-------|
| `prisma/seed.ts` | Initiales Seeding nach DB-Reset (`npx prisma db seed`) |
| `lib/services/testDataService.ts` | UI-basierte Testdaten-Generierung (Einstellungen → Daten) |

**Checkliste:**
1. Neue Pflichtfelder → In `PREDEFINED_*` Arrays und KI-Prompts ergänzen
2. Neue Entitäten → Neue Kategorie im `testDataService.ts` hinzufügen
3. Geänderte Enums → Import und Verwendung in beiden Dateien prüfen
4. Neue Relationen → Entity-Erstellung und Verknüpfungen anpassen

---

## Siehe auch

- **[Datenmodell-Architektur](../data-model-architecture.md)** - Detaillierte Schema-Dokumentation
- **[Schema-Workflow](../setup-and-testing_docs/SCHEMA_WORKFLOW.md)** - Vollständige Anleitung
