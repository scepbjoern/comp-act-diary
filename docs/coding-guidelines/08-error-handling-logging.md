# Error Handling & Logging

Strukturierte Fehlerbehandlung und Pino-Logging.

---

## Error Handling Grundprinzipien

### Fehlerarten trennen

| Typ | Beispiele | Behandlung |
|-----|-----------|------------|
| **Betriebsfehler** | Netzwerk, Auth, ENV | Retry, Fallback, User-Info |
| **Validierungsfehler** | Zod, Formular | Feld-spezifische Meldung |
| **Programmierfehler** | Bugs | Logging, Error Boundary |

### Benutzerfreundliche Meldungen

```typescript
// ❌ Technisch
"ECONNREFUSED 127.0.0.1:5432"
"ZodError: invalid_type at path email"

// ✅ Benutzerfreundlich
"Verbindung zur Datenbank fehlgeschlagen. Bitte später erneut versuchen."
"Bitte gib eine gültige E-Mail-Adresse ein."
```

---

## API Route Error Handling

```typescript
import { z } from 'zod'
import { logger } from '@/lib/core/logger'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validierung
    const result = schema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: 'Ungültige Eingabe', details: result.error.flatten() },
        { status: 400 }
      )
    }
    
    // Business Logic
    const data = await doSomething(result.data)
    return Response.json(data)
    
  } catch (error) {
    // Logging mit Kontext
    logger.error({ error, path: req.url }, 'API request failed')
    
    return Response.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
```

---

## Client-Side Error Handling

### Try-Catch in Event Handlers

```typescript
const handleSubmit = async (data: FormData) => {
  try {
    setLoading(true)
    const response = await fetch('/api/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Speichern fehlgeschlagen')
    }
    
    toast.success('Gespeichert!')
  } catch (error) {
    console.error('Submit failed:', error)
    toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
  } finally {
    setLoading(false)
  }
}
```

### Error Boundaries

Für unerwartete Render-Fehler:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function Page() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <CriticalFeature />
    </ErrorBoundary>
  )
}
```

---

## Structured Logging mit Pino

### Import

```typescript
import { logger } from '@/lib/core/logger'
```

### Log Levels

```typescript
logger.debug({ data }, 'Debug info')      // Nur in Development
logger.info({ userId }, 'User logged in')
logger.warn({ attempt }, 'Rate limit approaching')
logger.error({ error }, 'Operation failed')
```

### Kontext hinzufügen

```typescript
// ✅ Strukturiert mit Kontext
logger.error(
  { error, userId, entryId, operation: 'save' },
  'Failed to save journal entry'
)

// ❌ Vermeiden
console.error('Error:', error)
```

### Wo Logging einsetzen

| Bereich | Log Level | Beispiel |
|---------|-----------|----------|
| API Errors | `error` | Request fehlgeschlagen |
| Service Errors | `error` | Externe API Fehler |
| Wichtige Operationen | `info` | User erstellt, Entry gelöscht |
| Debug/Development | `debug` | Request Details |

### Konfiguration

```typescript
// lib/core/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Pretty-Logs in Development, JSON in Production
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  })
})
```

---

## Typische Fehlerfälle

### ENV-Variable fehlt

```typescript
// lib/config/env.ts validiert beim Start
// Bei fehlendem OPENAI_API_KEY:
// ❌ App startet nicht
// → Prüfe .env Datei
```

### Datenbank nicht erreichbar

```typescript
try {
  await prisma.user.findFirst()
} catch (error) {
  logger.error({ error }, 'Database connection failed')
  // Prüfe:
  // - DATABASE_URL korrekt?
  // - DB Container läuft?
  // - Netzwerk erreichbar?
}
```

### API Rate Limit

```typescript
if (response.status === 429) {
  logger.warn({ provider: 'openai' }, 'Rate limit exceeded')
  // Retry nach Delay oder Fallback
}
```

---

## Debugging Tipps

1. **Prüfe ENV-Variablen** - `console.log(process.env.DATABASE_URL)`
2. **Prüfe Netzwerk** - Container erreichbar?
3. **Prüfe Logs** - `docker logs <container>`
4. **Prisma Studio** - `npx prisma studio`
