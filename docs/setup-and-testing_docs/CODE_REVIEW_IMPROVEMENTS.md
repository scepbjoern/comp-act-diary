# Code Review: Systematische Verbesserungsvorschläge

**Erstellt:** 2026-01-19  
**Projekt:** comp-act-diary  
**Zweck:** Detaillierte, abarbeitbare Liste von Verbesserungen für Architektur, Struktur und Code-Qualität

---

## 1. ARCHITEKTUR & PROJEKTSTRUKTUR

### 1.1 Components-Ordner Reorganisation ⭐ PRIORITÄT HOCH

**Problem:** Der `components/`-Ordner enthält 96 Dateien ohne Unterstruktur.

**Zielstruktur:**
```
components/
├── ui/              # Wiederverwendbare UI (Button, Icon, Toast, SaveIndicator)
├── layout/          # Layout (SiteNav, HeaderClient, AuthNav, EdgeNavigationBars)
├── features/
│   ├── diary/       # DiarySection, DiaryAccordion, DiaryEntriesAccordion, etc.
│   ├── calendar/    # Calendar, DateNavigation
│   ├── day/         # DaySettings, DaySummary, DayLocationPanel, DayMapView
│   ├── habits/      # HabitsSection, HabitChips
│   ├── meals/       # MealNotesSection, MealNotesAccordion, DarmkurSection
│   ├── symptoms/    # SymptomsSection, StoolSection, WeightSection
│   ├── contacts/    # ContactCard, ContactDetails, ContactForm, ContactList
│   ├── locations/   # LocationsMap, LocationsTable, PointEditModal
│   ├── media/       # AudioPlayer, CameraPicker, PhotoViewerModal
│   ├── ai/          # AIConfigSection, LlmModelManager, ImageGeneration
│   ├── ocr/         # OCRUploadButton, OCRUploadModal, OCRSourcePanel
│   ├── search/      # GlobalSearch, SearchOverlay, SearchResults
│   ├── batch/       # BatchFilterForm, BatchGeocodeMap, BatchProgress
│   ├── sync/        # GoogleSyncSettings, GoogleSyncStatus
│   ├── tasks/       # TaskForm, TaskList
│   ├── security/    # PasscodeLock*, PasscodeSettings
│   ├── transcription/ # MicrophoneButton, RetranscribeButton
│   ├── editor/      # MarkdownEditor, RichTextEditor, MentionInput
│   ├── analytics/   # Sparkline, NumberPills, RelationshipGraph
│   └── notifications/ # NotificationBanner, NotificationBell
```

**Umsetzung:**
1. Neue Ordnerstruktur erstellen
2. Komponenten schrittweise verschieben (Feature für Feature)
3. Import-Pfade mit TypeScript Path Aliases aktualisieren
4. Tests anpassen

**Aufwand:** 4-6 Stunden | **Risiko:** Mittel

---

### 1.2 Lib-Ordner Strukturierung ⭐ PRIORITÄT MITTEL

**Zielstruktur:**
```
lib/
├── services/        # Business Logic (imageGenerationService, journalAIService, locationService)
├── validators/      # Zod Schemas (contact, location)
├── utils/           # Pure Helpers (date-utils, mentions, renderMentions)
├── config/          # Konfigurationen (constants, defaultPrompts, llmModels, imageModels)
├── core/            # Core (prisma, ai, chatMethod, mastra-agent)
├── media/           # Media Processing (audio-chunker, transcription, ocr)
├── prm/             # PRM-spezifisch (contact, contact-sync, google-auth)
└── legacy/          # Deprecated (mockdb, notification, task)
```

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

### 1.3 App-Router API-Routen Konsolidierung ⭐ PRIORITÄT MITTEL

**Problem:** 38 API-Ordner, teilweise mit nur 1-2 Routen.

**Empfehlung:** API-Versionierung einführen (`/api/v1/`) und verwandte Routen gruppieren:
- `/api/v1/journal/` (entries, types, ai)
- `/api/v1/contacts/` ([id], groups, interactions)
- `/api/v1/locations/` ([id], geocode, visits)
- `/api/v1/media/` (upload, assets, photos, generated-images)
- `/api/v1/ai/` (models, transcribe, ocr)

**Aufwand:** 6-8 Stunden | **Risiko:** Hoch (Breaking Changes)

---

## 2. CODE-QUALITÄT & BEST PRACTICES

### 2.1 TypeScript Strict Mode erweitern ⭐ PRIORITÄT HOCH

**Aktuelle Config:** Nur `strict: true`

**Empfohlene Erweiterungen:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Aufwand:** 2-4 Stunden | **Risiko:** Niedrig

---

### 2.2 ESLint Konfiguration erweitern ⭐ PRIORITÄT HOCH

**Aktuell:** Minimale Config (`next/core-web-vitals`)

**Empfehlung:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  }
}
```

**Aufwand:** 1-2 Stunden | **Risiko:** Niedrig

---

### 2.3 Client/Server Component Trennung ⭐ PRIORITÄT MITTEL

**Problem:** 85+ Client Components, viele könnten Server Components sein.

**Empfehlung:**
- Audit durchführen: Welche Komponenten benötigen wirklich Client-Interaktivität?
- Server Components bevorzugen für Datenabruf
- Composition Pattern: Server Components mit eingebetteten Client Components

**Beispiel:**
```tsx
// ✅ Server Component mit Client Island
export default async function Page() {
  const data = await fetchData()
  return (
    <div>
      <ServerData data={data} />
      <CounterButton /> {/* Client Component */}
    </div>
  )
}
```

**Aufwand:** 8-12 Stunden | **Risiko:** Mittel

---

### 2.4 Error Boundaries implementieren ⭐ PRIORITÄT HOCH

**Problem:** Keine Error Boundaries für Client Components.

**Lösung:** Error Boundary Component erstellen und in kritischen Bereichen einsetzen:
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <DiarySection />
</ErrorBoundary>
```

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

### 2.5 Loading States & Suspense ⭐ PRIORITÄT MITTEL

**Empfehlung:**
- Route-Level: `app/loading.tsx`
- Komponenten-Level: `<Suspense fallback={<Skeleton />}>`
- Skeleton Loader für bessere UX

**Aufwand:** 4-6 Stunden | **Risiko:** Niedrig

---

## 3. PERFORMANCE-OPTIMIERUNGEN

### 3.1 React.memo für teure Komponenten ⭐ PRIORITÄT MITTEL

**Kandidaten:**
- `DiaryEntriesAccordion` (30KB)
- `ContactDetails` (21KB)
- `SiteNav` (22KB)
- `DiarySection` (19KB)
- `RichTextEditor` (18KB)

**Aufwand:** 3-4 Stunden | **Risiko:** Niedrig

---

### 3.2 Dynamic Imports ⭐ PRIORITÄT HOCH

**Kandidaten:**
- `RichTextEditor` (MDX Editor, 18KB)
- `RelationshipGraph` (react-force-graph, 10KB)
- `LocationsMap` (Mapbox GL)
- `AudioPlayer` (nur bei Bedarf)

```tsx
const RichTextEditor = dynamic(
  () => import('@/components/features/editor/RichTextEditor'),
  { loading: () => <Skeleton />, ssr: false }
)
```

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

### 3.3 Image Optimization ⭐ PRIORITÄT MITTEL

**Empfehlung:** Konsequente Nutzung von `next/image` statt `<img>`

```tsx
<Image
  src={photo.url}
  alt={photo.alt}
  width={800}
  height={600}
  placeholder="blur"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Aufwand:** 4-6 Stunden | **Risiko:** Niedrig

---

### 3.4 Bundle Size Analyse ⭐ PRIORITÄT MITTEL

**Tool:** `@next/bundle-analyzer`

```bash
ANALYZE=true npm run build
```

**Aufwand:** 1 Stunde | **Risiko:** Niedrig

---

## 4. SICHERHEIT

### 4.1 Content Security Policy (CSP) ⏭️ BEWUSST NICHT IMPLEMENTIERT

**Begründung:** Für vertrauenswürdige Nutzer geringes Risiko. Mapbox GL benötigt `unsafe-eval`, MDX Editor könnte Probleme machen. Bei Bedarf später über `Content-Security-Policy-Report-Only` testbar.

~~**Aufwand:** 2-3 Stunden | **Risiko:** Mittel~~

---

### 4.2 Input Sanitization ⭐ PRIORITÄT HOCH

**Empfehlung:** DOMPurify für HTML, Text-Sanitization für alle User Inputs

```typescript
import DOMPurify from 'isomorphic-dompurify'
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['p', 'br', 'strong'] })
}
```

**Aufwand:** 3-4 Stunden | **Risiko:** Niedrig

---

### 4.3 Rate Limiting ⏭️ BEWUSST NICHT IMPLEMENTIERT

**Begründung:** Für eine App mit vertrauenswürdigen Nutzern nicht erforderlich. Würde unnötigen Overhead in jeder API-Route bedeuten (separater Import pro Route). Bei Bedarf später über Middleware oder Reverse Proxy implementierbar.

~~**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig~~

---

### 4.4 Environment Variables Validation ⭐ PRIORITÄT HOCH

**Lösung:** Zod Schema für ENV-Validierung beim Start

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
})
export const env = envSchema.parse(process.env)
```

**Aufwand:** 1 Stunde | **Risiko:** Niedrig

---

## 5. TESTING

### 5.1 Test Coverage erhöhen ⭐ PRIORITÄT MITTEL

**Aktuell:** 4 Test-Dateien

**Ziel:** Mindestens 60% Coverage

**Struktur:**
```
__tests__/
├── unit/           # Utils, Services, Validators
├── integration/    # API Routes, Database
└── e2e/            # User Flows (Playwright)
```

**Aufwand:** 20-30 Stunden | **Risiko:** Niedrig

---

### 5.2 Playwright für E2E Tests ⭐ PRIORITÄT NIEDRIG

**Empfehlung:** E2E Tests für kritische User Flows (Login, Entry Creation, Search)

**Aufwand:** 8-12 Stunden | **Risiko:** Niedrig

---

## 6. DATENBANK & BACKEND

### 6.1 Prisma Query Optimization ⭐ PRIORITÄT HOCH

**Problem:** Potenzielle N+1 Query Probleme

**Lösung:** Eager Loading mit `include` statt sequentielle Queries

```typescript
// ✅ Gut
const entries = await prisma.journalEntry.findMany({
  include: { type: true, timeBox: true, location: true }
})
```

**Aufwand:** 4-6 Stunden | **Risiko:** Niedrig

---

### 6.2 Database Indexing ⭐ PRIORITÄT HOCH

**Empfehlung:** Fehlende Indizes hinzufügen:

```prisma
model JournalEntry {
  @@index([userId, timeBoxId, occurredAt])
  @@index([userId, typeId, createdAt])
}

model RawGpsPoint {
  @@index([userId, capturedAt])
  @@index([userId, geocodedAt])
}
```

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

### 6.3 Connection Pooling ⏭️ BEWUSST NICHT IMPLEMENTIERT

**Begründung:** Prisma handhabt Connection Pooling automatisch (Default Pool Size 10). Erst relevant bei "connection limit exceeded" Fehlern oder Multi-Instance Deployments.

~~**Aufwand:** 1 Stunde | **Risiko:** Niedrig~~

---

## 7. MONITORING & OBSERVABILITY

### 7.1 Structured Logging ⭐ PRIORITÄT MITTEL

**Empfehlung:** Winston oder Pino für strukturiertes Logging

```typescript
logger.info('User logged in', { userId, timestamp })
logger.error('API error', { error, endpoint, userId })
```

**Aufwand:** 3-4 Stunden | **Risiko:** Niedrig

---

### 7.2 Error Tracking ⭐ PRIORITÄT MITTEL

**Empfehlung:** Sentry Integration für Production Errors

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

### 7.3 Performance Monitoring ⭐ PRIORITÄT NIEDRIG

**Empfehlung:** Vercel Analytics oder Custom Metrics für Core Web Vitals

**Aufwand:** 2-3 Stunden | **Risiko:** Niedrig

---

## 8. DOCUMENTATION

### 8.1 API Documentation ⏭️ BEWUSST NICHT IMPLEMENTIERT

**Begründung:** Für eine Single-User App mit vertrauenswürdigen Nutzern nicht erforderlich. API-Struktur ist durch Code selbsterklärend.

~~**Aufwand:** 6-8 Stunden | **Risiko:** Niedrig~~

---

### 8.2 Component Documentation ⭐ PRIORITÄT NIEDRIG

**Empfehlung:** Storybook für Component Library

**Aufwand:** 12-16 Stunden | **Risiko:** Niedrig

---

### 8.3 Architecture Decision Records (ADR) ⭐ PRIORITÄT NIEDRIG

**Empfehlung:** ADRs für wichtige Architektur-Entscheidungen dokumentieren

**Aufwand:** 4-6 Stunden | **Risiko:** Niedrig

---

## PRIORISIERUNG & ROADMAP

### Phase 1: Quick Wins (1-2 Wochen)
1. ESLint Config erweitern
2. TypeScript Strict Mode
3. Environment Variables Validation
4. Error Boundaries
5. Database Indexing
6. Dynamic Imports für große Komponenten

### Phase 2: Strukturverbesserungen (2-3 Wochen)
1. Components-Ordner Reorganisation
2. Lib-Ordner Strukturierung
3. Client/Server Component Trennung
4. Input Sanitization
5. ~~Rate Limiting~~ (bewusst nicht implementiert)
6. Prisma Query Optimization

### Phase 3: Performance & Security (2-3 Wochen)
1. React.memo für teure Komponenten
2. Image Optimization
3. ~~CSP Headers~~ (bewusst nicht implementiert)
4. Bundle Size Analyse
5. Loading States & Suspense
6. ~~Connection Pooling~~ (bewusst nicht implementiert)

### Phase 4: Testing & Monitoring (3-4 Wochen)
1. Test Coverage erhöhen
2. Structured Logging
3. Error Tracking
4. ~~API Documentation~~ (bewusst nicht implementiert)
5. E2E Tests (Playwright)
6. Performance Monitoring

---

**Gesamtaufwand:** 120-180 Stunden  
**Empfohlene Vorgehensweise:** Schrittweise Umsetzung nach Priorität
