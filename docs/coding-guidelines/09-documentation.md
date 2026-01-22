# Dokumentation

Richtlinien für die kontinuierliche Pflege der Dokumentation im comp-act-diary Projekt.

---

## Grundprinzip

**Dokumentation ist Teil jeder Implementation.** Wenn Code geschrieben wird, muss auch die zugehörige Dokumentation aktualisiert werden. Dies gilt insbesondere für:

- Neue Features
- API-Änderungen
- Schema-Änderungen
- UI-Änderungen

---

## Dokumentationstypen

### 1. Hilfe-System (User-facing)

Das integrierte Hilfe-System unter `/help` bietet Endbenutzer-Dokumentation.

**Struktur:**
```
lib/help/
├── types.ts                    # TypeScript-Typen
├── helpStructure.ts            # Kategorien & Topics
└── content/
    ├── index.ts               # Export & Registry
    ├── registry.ts            # Content-Aggregation
    ├── 01-erste-schritte.ts   # Kategorie-Content
    ├── 02-tagebuch.ts
    └── ...
```

**Bei neuen Features:**

1. **Topic hinzufügen** in `helpStructure.ts`:
   ```typescript
   {
     id: 'new-feature',
     slug: 'neue-funktion',
     title: 'Neue Funktion',
     description: 'Kurze Beschreibung',
     icon: 'icon_name',  // Muss in TablerIcon gemappt sein
     keywords: ['keyword1', 'keyword2']
   }
   ```

2. **Content erstellen** in der entsprechenden Kategorie-Datei:
   ```typescript
   'neue-funktion': {
     summary: `<h3>Titel</h3><p>Kurze Zusammenfassung...</p>`,
     instructions: `<h3>Anleitung</h3><ol><li>Schritt 1</li>...</ol>`,
     technical: `<h3>Technische Details</h3><pre><code>API...</code></pre>`
   }
   ```

3. **Kontextuellen Help-Link** zur Feature-Seite hinzufügen:
   ```tsx
   <a href="/help/kategorie/topic" className="btn btn-ghost btn-sm" title="Hilfe">
     <TablerIcon name="help" size={16} />
   </a>
   ```

**Content-Struktur pro Topic:**
- **summary**: Was ist das Feature? (Überblick, Bullet-Points)
- **instructions**: Wie benutze ich es? (Schritt-für-Schritt)
- **technical**: Technische Details (API, Datenmodell, Code-Beispiele)

### 2. Konzept-Dokumente

Für geplante Features unter `docs/concepts/`.

**Naming-Konvention:** `YYYY-MM_Feature_Name.md`

**Template:**
```markdown
# Feature Name

## Zusammenfassung
Kurze Beschreibung...

## User Stories
- Als Benutzer möchte ich...

## Technisches Design
### Datenmodell
### API-Endpunkte
### UI-Komponenten

## Implementierungsplan
1. [ ] Schritt 1
2. [ ] Schritt 2
```

### 3. Technische Dokumentation

- **`docs/data-model-architecture.md`**: Prisma-Schema-Dokumentation
- **`docs/coding-guidelines/`**: Diese Guidelines
- **`docs/setup-and-testing_docs/`**: Setup & Operations

---

## Wann was dokumentieren

| Änderung | Hilfe-System | Konzept | data-model-arch | README |
|----------|--------------|---------|-----------------|--------|
| Neue Seite/Feature | ✅ | ✅ (vorher) | - | - |
| Schema-Änderung | - | - | ✅ | - |
| Neue API | ✅ (technical) | - | - | - |
| Neue Dependency | - | - | - | ✅ |
| Breaking Change | ✅ | - | - | ✅ |

---

## Icons für Hilfe-System

Icons müssen in `components/ui/TablerIcon.tsx` gemappt sein.

**Verfügbare Icons prüfen:**
```typescript
// In TablerIcon.tsx, iconMap enthält alle verfügbaren Mappings
const iconMap: Record<string, typeof IconSettings> = {
  settings: IconSettings,
  help: IconHelp,
  // ...
}
```

**Neues Icon hinzufügen:**
1. Import von `@tabler/icons-react` hinzufügen
2. Mapping in `iconMap` eintragen
3. Im Help-Content verwenden

---

## Qualitätsrichtlinien

### Do's
- ✅ Klare, prägnante Sprache
- ✅ Schritt-für-Schritt-Anleitungen mit nummerierten Listen
- ✅ Screenshots/Code-Beispiele wo hilfreich
- ✅ Technische Details für Entwickler
- ✅ Keywords für Suchfunktion
- ✅ "In Entwicklung"-Hinweise für geplante Features

### Don'ts
- ❌ Features dokumentieren, die nicht existieren
- ❌ Veraltete Informationen stehen lassen
- ❌ Zu technische Sprache in User-Dokumentation
- ❌ Icons verwenden, die nicht gemappt sind

---

## Workflow bei Feature-Implementation

1. **Vor der Implementation:**
   - Konzept-Dokument erstellen/lesen

2. **Während der Implementation:**
   - Code-Kommentare für komplexe Logik

3. **Nach der Implementation:**
   - Hilfe-System aktualisieren (Topic + Content)
   - Kontextuellen Help-Link hinzufügen
   - Bei Schema-Änderungen: `data-model-architecture.md` updaten
   - Konzept-Dokument als "implementiert" markieren

---

## Beispiel: Neues Feature dokumentieren

**Szenario:** Neues Feature "Kalender-Integration" in Kategorie "Daten & Sync"

**1. helpStructure.ts:**
```typescript
{
  id: 'calendar-integration',
  slug: 'kalender-integration',
  title: 'Kalender-Integration',
  description: 'Termine aus externen Kalendern importieren',
  icon: 'calendar',
  keywords: ['kalender', 'termine', 'sync', 'google', 'ical']
}
```

**2. 08-daten-sync.ts:**
```typescript
'kalender-integration': {
  summary: `
    <h3>Kalender-Integration</h3>
    <p>Importiere Termine aus externen Kalendern...</p>
  `,
  instructions: `
    <h3>Kalender verbinden</h3>
    <ol>
      <li>Gehe zu Einstellungen → Kalender</li>
      <li>Klicke auf "Kalender hinzufügen"</li>
      ...
    </ol>
  `,
  technical: `
    <h3>Technische Details</h3>
    <h4>API-Endpunkte</h4>
    <pre><code>POST /api/calendar/webhook
GET /api/calendar/events</code></pre>
  `
}
```

**3. Feature-Seite:**
```tsx
<a href="/help/daten-sync/kalender-integration" 
   className="btn btn-ghost btn-sm">
  <TablerIcon name="help" size={16} />
</a>
```

---

**Letzte Aktualisierung:** 2026-01-22
