# Coding Guidelines

Diese Dokumentation beschreibt die verbindlichen Coding-Standards und Best Practices für das comp-act-diary Projekt. Sie dient als Referenz für LLM-Assistenten (Windsurf/Cascade) und Entwickler.

---

## Inhaltsverzeichnis

1. **[Technologie-Stack](./01-tech-stack.md)** - Frameworks, Libraries, Tools
2. **[Projektstruktur](./02-project-structure.md)** - Ordnerstruktur, Konventionen
3. **[TypeScript & Code-Qualität](./03-typescript-quality.md)** - Strikte Typisierung, ESLint
4. **[React & Next.js Patterns](./04-react-nextjs-patterns.md)** - Components, Server/Client, Performance
5. **[Datenbank & Prisma](./05-database-prisma.md)** - Schema, Queries, Workflow
6. **[Formulare & Validierung](./06-forms-validation.md)** - React Hook Form, Zod
7. **[UI & Styling](./07-ui-styling.md)** - Tailwind, daisyUI, Icons
8. **[Error Handling & Logging](./08-error-handling-logging.md)** - Fehlerbehandlung, Pino

---

## Verwandte Dokumentation

- **[Datenmodell-Architektur](../data-model-architecture.md)** - Detaillierte Schema-Dokumentation
- **[Schema-Workflow](../setup-and-testing_docs/SCHEMA_WORKFLOW.md)** - Prisma db push Workflow

---

## Schnellübersicht: Die wichtigsten Regeln

### TypeScript
- `strict: true` - Keine Kompromisse
- Explizite Typen statt `any` (nur mit `eslint-disable` wenn unvermeidbar)
- Zod für Runtime-Validierung

### React/Next.js
- **Server Components** standardmässig
- **Client Components** nur bei Interaktivität (`'use client'`)
- **Dynamic Imports** für grosse Komponenten (Maps, Editors)
- **Error Boundaries** für kritische Bereiche

### Datenbank
- **`prisma db push`** statt `migrate dev`
- **Indices** für alle häufigen Queries (`@@index`)
- **Eager Loading** mit `include` statt N+1 Queries

### Styling
- **Tailwind** für Layout/Spacing
- **daisyUI** für Komponenten (btn, input, card)
- **Tabler Icons** (`@tabler/icons-react`)

### Formulare
- **React Hook Form** + **Zod** (zodResolver)
- Validierung client- UND serverseitig
- Fehler direkt am Feld anzeigen

---

**Letzte Aktualisierung:** 2026-01-19
