# Projektstruktur

Übersicht der Ordnerstruktur und Konventionen.

---

## Hauptverzeichnisse

```
comp-act-diary/
├── app/                    # Next.js App Router
├── components/             # React Components
├── lib/                    # Utilities, Services, Config
├── hooks/                  # Custom React Hooks
├── types/                  # TypeScript Type Definitions
├── prisma/                 # Prisma Schema
├── public/                 # Static Assets
├── docs/                   # Dokumentation
├── scripts/                # Utility Scripts
├── __tests__/              # Tests
└── deploy/                 # Docker/Deployment
```

---

## App-Router Struktur (`app/`)

```
app/
├── page.tsx                # Hauptseite (/)
├── layout.tsx              # Root Layout
├── loading.tsx             # Global Loading State
├── globals.css             # Global Styles
├── actions.ts              # Server Actions
│
├── (auth)/                 # Auth Route Group
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── api/                    # API Routes
│   ├── day/route.ts
│   ├── journal-entries/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   └── ...
│
├── settings/               # Settings Pages
│   ├── page.tsx
│   ├── loading.tsx
│   └── location/page.tsx
│
└── prm/                    # PRM (Contacts) Pages
    ├── page.tsx
    ├── loading.tsx
    └── [slug]/page.tsx
```

### Konventionen

- **`page.tsx`** - Route-Komponente (Server Component)
- **`loading.tsx`** - Loading State für die Route
- **`error.tsx`** - Error Boundary für die Route
- **`layout.tsx`** - Shared Layout
- **`route.ts`** - API Route Handler

---

## Components-Struktur (`components/`)

```
components/
├── ui/                     # Wiederverwendbare UI-Bausteine
│   ├── ErrorBoundary.tsx
│   ├── SaveIndicator.tsx
│   ├── Toast.tsx
│   └── ...
│
├── layout/                 # Layout-Komponenten
│   ├── SiteNav.tsx
│   ├── HeaderClient.tsx
│   └── ...
│
└── features/               # Feature-spezifische Komponenten
    ├── diary/              # Tagebuch
    ├── calendar/           # Kalender
    ├── habits/             # Gewohnheiten
    ├── symptoms/           # Symptome
    ├── contacts/           # Kontakte (PRM)
    ├── locations/          # Standorte
    ├── media/              # Audio, Fotos
    ├── ai/                 # KI-Konfiguration
    ├── editor/             # Rich Text Editor
    ├── search/             # Suche
    └── ...
```

---

## Lib-Struktur (`lib/`)

```
lib/
├── core/                   # Kern-Infrastruktur
│   ├── prisma.ts           # Prisma Client
│   ├── ai.ts               # AI SDK Setup
│   ├── logger.ts           # Pino Logger
│   └── ...
│
├── config/                 # Konfigurationen
│   ├── constants.ts
│   ├── env.ts              # ENV Validation
│   ├── llmModels.ts
│   └── imageModels.ts
│
├── utils/                  # Pure Helper Functions
│   ├── date-utils.ts
│   ├── mentions.ts
│   ├── sanitize.ts
│   └── ...
│
├── services/               # Business Logic
│   ├── journalAIService.ts
│   ├── locationService.ts
│   ├── searchService.ts
│   └── ...
│
├── validators/             # Zod Schemas
│   ├── contact.ts
│   ├── location.ts
│   └── ...
│
├── media/                  # Media Processing
│   ├── ocr.ts
│   ├── transcription.ts
│   └── audio-chunker.ts
│
└── prm/                    # PRM-spezifisch
    ├── contact.ts
    ├── contact-sync.ts
    └── google-auth.ts
```

---

## Import-Aliase

Definiert in `tsconfig.json`:

```typescript
// ✅ Korrekt
import { prisma } from '@/lib/core/prisma'
import { Button } from '@/components/ui/Button'
import { useAISettings } from '@/hooks/useAISettings'

// ❌ Vermeiden
import { prisma } from '../../../lib/core/prisma'
```

| Alias | Pfad |
|-------|------|
| `@/components/*` | `./components/*` |
| `@/lib/*` | `./lib/*` |
| `@/hooks/*` | `./hooks/*` |
| `@/types/*` | `./types/*` |
