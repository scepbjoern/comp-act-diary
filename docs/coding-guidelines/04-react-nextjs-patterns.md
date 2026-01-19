# React & Next.js Patterns

Best Practices für React Components und Next.js App Router.

---

## Server vs. Client Components

### Grundregel

- **Server Components** sind der Standard
- **Client Components** nur wenn nötig

### Wann Client Component?

| Grund | Beispiel |
|-------|----------|
| Event Handlers | `onClick`, `onChange` |
| React Hooks | `useState`, `useEffect` |
| Browser APIs | `localStorage`, `navigator` |
| Interaktive Libraries | React Hook Form, Mapbox GL |

### Syntax

```typescript
// Server Component (Standard, kein Directive)
export default async function Page() {
  const data = await fetchData()
  return <div>{data.title}</div>
}

// Client Component (explizites Directive)
'use client'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Composition Pattern

Server Component mit eingebetteten Client Components:

```typescript
// app/page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData()
  
  return (
    <div>
      <h1>{data.title}</h1>           {/* Server-rendered */}
      <InteractiveChart data={data} /> {/* Client Component */}
    </div>
  )
}
```

---

## Dynamic Imports

Für grosse Komponenten, die nicht sofort benötigt werden:

```typescript
import dynamic from 'next/dynamic'

// Lazy load mit Loading State
const RichTextEditor = dynamic(
  () => import('@/components/features/editor/RichTextEditor'),
  { 
    loading: () => <div className="skeleton h-40" />,
    ssr: false  // Für Browser-only Libraries
  }
)

// Lazy load für Maps (Mapbox)
const LocationsMap = dynamic(
  () => import('@/components/features/locations/LocationsMap'),
  { ssr: false }
)
```

### Kandidaten für Dynamic Imports

- `RichTextEditor` (MDX Editor)
- `LocationsMap`, `BatchGeocodeMap` (Mapbox GL)
- `RelationshipGraph` (react-force-graph)
- `AudioPlayer` (nur bei Bedarf)

---

## Loading States

### Route-Level (app/loading.tsx)

```typescript
// app/settings/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-64 w-full" />
    </div>
  )
}
```

### Component-Level (Suspense)

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div className="skeleton h-40" />}>
        <AsyncComponent />
      </Suspense>
    </div>
  )
}
```

---

## Error Boundaries

### Verwendung

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

### Error Boundary Component

Bereits implementiert in `components/ui/ErrorBoundary.tsx`:
- Fängt Client-Side Errors
- Zeigt benutzerfreundliche Fehlermeldung
- Reload-Button
- Stack Trace in Development

---

## React.memo

Für teure Komponenten, die häufig re-rendern:

```typescript
import { memo } from 'react'

interface SparklineProps {
  data: number[]
  color?: string
}

function SparklineComponent({ data, color }: SparklineProps) {
  // Teure SVG-Berechnung
  return <svg>...</svg>
}

export const Sparkline = memo(SparklineComponent)
```

### Bereits optimierte Komponenten

- `Sparkline` - SVG-Rendering
- `NumberPills` - Häufig gerendert
- `MarkdownRenderer` - Teure Parsing-Operation

---

## Data Fetching

### Server Components

```typescript
// Direkt in der Komponente fetchen
export default async function Page() {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    include: { type: true }
  })
  
  return <EntryList entries={entries} />
}
```

### API Routes

```typescript
// app/api/entries/route.ts
import { prisma } from '@/lib/core/prisma'
import { getServerSession } from 'next-auth'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id }
  })
  
  return Response.json(entries)
}
```

### Client-Side (SWR/React Query nicht verwendet)

```typescript
'use client'
import { useEffect, useState } from 'react'

export function EntriesList() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/entries')
      .then(res => res.json())
      .then(data => {
        setEntries(data)
        setLoading(false)
      })
  }, [])
  
  if (loading) return <div className="skeleton h-40" />
  return <ul>...</ul>
}
```
