# TypeScript & Code-Qualität

Strikte Typisierung und ESLint-Regeln für konsistenten, wartbaren Code.

---

## TypeScript Konfiguration

Aktuelle `tsconfig.json` Einstellungen:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Was `strict: true` aktiviert

- `noImplicitAny` - Keine impliziten `any` Typen
- `strictNullChecks` - `null` und `undefined` explizit behandeln
- `strictFunctionTypes` - Strikte Funktions-Typen
- `strictBindCallApply` - Strikte bind/call/apply
- `strictPropertyInitialization` - Properties müssen initialisiert werden
- `noImplicitThis` - Kein implizites `this`
- `alwaysStrict` - `"use strict"` in allen Dateien

---

## ESLint Regeln

Konfiguriert in `eslint.config.mjs`:

### Aktive Regeln

| Regel | Einstellung | Beschreibung |
|-------|-------------|--------------|
| `@typescript-eslint/no-floating-promises` | `error` | Promises müssen awaited/handled werden |
| `@typescript-eslint/no-explicit-any` | `warn` | `any` vermeiden, mit eslint-disable wenn nötig |
| `@typescript-eslint/no-unused-vars` | `error` | Ungenutzte Variablen (ausser `_`-Prefix) |
| `no-console` | `warn` | console.log → logger verwenden |

### Umgang mit `any`

```typescript
// ❌ Vermeiden
function process(data: any) { ... }

// ✅ Besser: Generics oder konkrete Typen
function process<T>(data: T) { ... }
function process(data: unknown) { ... }

// ✅ Wenn unvermeidbar: eslint-disable mit Begründung
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleLibraryCallback(node: any) {
  // Library-Typ ist nicht exportiert
}
```

---

## Zod für Runtime-Validierung

Zod-Schemas für:
- API Request Bodies
- Form Inputs
- Environment Variables
- Externe Daten

### Beispiel: API Route

```typescript
import { z } from 'zod'

const createEntrySchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  content: z.string(),
  typeId: z.string().uuid(),
})

export async function POST(req: Request) {
  const body = await req.json()
  
  // Validierung mit benutzerfreundlichen Fehlermeldungen
  const result = createEntrySchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten() },
      { status: 400 }
    )
  }
  
  // result.data ist jetzt typisiert
  const { title, content, typeId } = result.data
}
```

### Beispiel: Environment Variables

```typescript
// lib/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = envSchema.parse(process.env)
```

---

## Namenskonventionen

### Dateien

| Typ | Konvention | Beispiel |
|-----|------------|----------|
| Components | PascalCase | `DiarySection.tsx` |
| Hooks | camelCase mit `use` | `useAISettings.ts` |
| Utils | camelCase | `date-utils.ts` |
| Types | camelCase | `search.ts` |
| API Routes | kebab-case | `journal-entries/route.ts` |

### Code

| Typ | Konvention | Beispiel |
|-----|------------|----------|
| Komponenten | PascalCase | `DiarySection` |
| Funktionen | camelCase, beschreibend | `createUserProfile` |
| Konstanten | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Typen/Interfaces | PascalCase | `JournalEntry` |
| Zod Schemas | camelCase + Schema | `createEntrySchema` |

---

## Kommentare

### Datei-Header

Jede neue Datei erhält einen kurzen Kommentar:

```typescript
/**
 * Journal AI Service
 * Handles AI-powered features for journal entries:
 * - Summarization
 * - Entity extraction
 * - Sentiment analysis
 */
```

### Inline-Kommentare

Nur an kniffligen/nicht-offensichtlichen Stellen:

```typescript
// Mapbox requires coordinates as [lng, lat], not [lat, lng]
const coordinates: [number, number] = [point.lng, point.lat]
```
