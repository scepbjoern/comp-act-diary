<!-- Konzeptdokument: Lesemodus (Read Mode) – per Gerät, read-only -->
# Read Mode Concept

## Übersicht

Ein globaler Lesemodus (Read Mode), der **pro Gerät** gespeichert wird und die App auf **read-only** schaltet. Alle CUD-Aktionen (Create/Update/Delete) sowie **KI-Generierung** werden ausgeblendet oder deaktiviert. Der Modus wird über einen Toggle in der Navbar aktiviert und durch eine **dezente Hintergrundfarbe** visualisiert.

## Ziele

1. **Schneller Toggle** in der Navbar (globale Steuerung)
2. **Read-only** Darstellung aller relevanten Bereiche (keine CUD-Aktionen)
3. **Kein KI-Generieren** im Lesemodus
4. **Persistenz pro Gerät** (LocalStorage), ohne Server-Settings
5. **Visuelle Kennzeichnung** nur über Hintergrundfarbe

## Nicht-Ziele

- Keine serverseitige Enforcement-Logik (UI reicht)
- Keine zusätzliche Badge/Banner-UI
- Keine Export-/Batch-Änderungen

## Datenmodell / Persistenz

Kein DB-Update. State bleibt rein clientseitig:

```text
LocalStorage Key: readModeEnabled = "true" | "false"
```

Optional (nur falls nötig für SSR-Flicker): zusätzliches Cookie `readMode=1|0`.

## UI-Komponenten

### 1. Navbar Toggle

**Platzierung:** links von der Suche in `app/layout.tsx`.

- Button: `btn btn-ghost btn-circle btn-sm`
- Icon: `IconBook` (aktiv) / `IconEdit` (inaktiv)
- Tooltip: „Lesemodus aktivieren“ / „Bearbeiten aktivieren“
- `aria-pressed` basierend auf State

Skizze:

```
[Logo]  [Read Mode Toggle]  [Suche] [Notifications] [Nav]
```

### 2. Hintergrundfarbe

Beim Aktivieren wird `data-read-mode="true"` auf `document.documentElement` gesetzt.

Beispiel:

```css
html[data-read-mode="true"] body {
  @apply bg-base-200;
}
```

## Read-only Regeln (Scope)

Im Lesemodus sind **alle Schreibaktionen deaktiviert/ausgeblendet**. Inhalte bleiben sichtbar.

### Tagebuch (Startseite)

- **Neuer Eintrag**: gesamtes Formular ausblenden
- **Tages-Zusammenfassung**: Generieren/Regenerieren/Löschen ausblenden
- **Tagesbild**: Generieren/Neu/Löschen ausblenden (inkl. Modal)
- **Bestehende Einträge**: Edit/Delete/AI/Uploads/Audio-Delete ausblenden
- **Interaktionen**: „Hinzufügen“ + Formular ausblenden
- **Darmkur**: alle Eingabe-/Toggle-Elemente ausblenden
- **Tag zurücksetzen**: komplett ausblenden
- **DayLocationPanel**: „Alle geocoden“ ausblenden

### Reflexionen

- **Neue Reflexion**: Formular + Uploads/KI-Verbessern ausblenden
- **Liste**: Bearbeiten/Löschen/Uploads ausblenden

### Kontakte (PRM)

- **Liste**: „Neuer Kontakt“, „Ersten Kontakt erstellen“ ausblenden
- **Cards**: Favoriten-Toggle ausblenden
- **Detail**: Edit/Archivieren/Löschen/Google-Push/Tasks/Interaktionen/Foto-Upload ausblenden
- **Create/Edit Seiten**: read-only (Inhalt anzeigen, keine Speichern-Aktionen)

### Orte

- **Inline Edit**, **Geocode**, **Delete**, **Favorite** ausblenden
- Filter/Suche/Map bleiben aktiv (read-only)

## Technische Umsetzung (Client)

### ReadModeProvider

```typescript
interface ReadModeContextValue {
  readMode: boolean
  setReadMode: (value: boolean) => void
  toggleReadMode: () => void
}
```

- Initial: aus LocalStorage laden
- Jede Änderung: LocalStorage + `data-read-mode` setzen

### Hooks

- `useReadMode()` in Komponenten
- Guard-Pattern: `if (readMode) return null` oder Actions-Container ausblenden

## Implementierungsschritte (Detailliert)

### 1. Provider + Hook erstellen

**Datei:** `hooks/useReadMode.tsx`

```typescript
// Context und Provider für globalen Read Mode State
export function ReadModeProvider({ children }: { children: ReactNode })
export function useReadMode(): ReadModeContextValue
```

**Funktionalität:**
- State wird initial aus `localStorage.getItem('readModeEnabled')` geladen
- Bei Änderung: LocalStorage aktualisieren + `data-read-mode` Attribut auf `<html>` setzen/entfernen
- Hydration-sicher: State erst nach Client-Mount aus LocalStorage laden

### 2. Navbar Toggle integrieren

**Dateien:**
- `components/ReadModeToggle.tsx` - Toggle-Button Komponente
- `components/HeaderClient.tsx` - Client-Wrapper für Header-Elemente
- `app/layout.tsx` - ReadModeProvider + HeaderClient einbinden

**Platzierung:** Links neben dem Suche-Button in der Navbar.

**Icons:** `IconBook` (Lesemodus aktiv) / `IconEdit` (Bearbeitungsmodus aktiv)

### 3. Global Styling

**Datei:** `app/globals.css`

```css
/* Read Mode Styling */
html[data-read-mode="true"] body {
  @apply bg-base-200;
}

html.bright[data-read-mode="true"] body {
  background-color: #e2e8f0;
}
```

### 4. Read-only Guards in Komponenten

**Pattern:** `const { readMode } = useReadMode()`

**Betroffene Komponenten:**

| Komponente | Guard-Strategie |
|------------|-----------------|
| `DiarySection` | Neues Eintragsformular + Interaktions-Panel ausblenden |
| `DaySummary` | Generieren/Regenerieren/Löschen-Buttons ausblenden |
| `GeneratedImageGallery` | Generieren/Löschen-Buttons ausblenden |
| `ResetDaySection` | Komplette Sektion ausblenden |
| `DarmkurSection` | Komplette Sektion ausblenden |
| `DiaryEntriesAccordion` | Edit/Delete/AI-Buttons ausblenden |
| `DayLocationPanel` | "Alle geocoden"-Button ausblenden |
| `ContactList` | "Neuer Kontakt"-Button ausblenden |
| `ContactCard` | Favoriten-Toggle durch statisches Icon ersetzen |
| `ContactDetails` | Alle Action-Buttons ausblenden |
| `LocationsTable` | Geocode/Delete-Buttons ausblenden |
| `Reflections Page` | Neues Formular + Edit/Delete-Buttons ausblenden |

### 5. Create/Edit Seiten

**Datei:** `components/ContactForm.tsx`

- Speichern-Button im Lesemodus ausblenden
- "Abbrechen" zu "Zurück" umbenennen
- Formularfelder bleiben sichtbar (read-only Darstellung)

## Testing

### Manuelle Tests

#### Toggle-Funktionalität
1. [ ] Navbar-Button klicken → Icon wechselt von Edit zu Book
2. [ ] Hintergrundfarbe ändert sich (dunkler/heller)
3. [ ] Seite neu laden → Lesemodus bleibt erhalten (LocalStorage)
4. [ ] In anderem Tab öffnen → Lesemodus ist dort ebenfalls aktiv

#### Tagebuch-Seite (Startseite)
1. [ ] Neues Eintragsformular ist ausgeblendet
2. [ ] Mikrofon/Audio/OCR-Upload-Buttons sind ausgeblendet
3. [ ] "Zusammenfassung generieren"-Button ist ausgeblendet
4. [ ] Bei vorhandener Zusammenfassung: Regenerieren/Löschen ausgeblendet
5. [ ] "Tagesbild generieren"-Button ist ausgeblendet
6. [ ] Bei vorhandenem Bild: Neu generieren/Löschen ausgeblendet
7. [ ] Bestehende Einträge: Edit/Delete/AI-Buttons ausgeblendet
8. [ ] Interaktions-Panel ist ausgeblendet
9. [ ] Darmkur-Sektion ist komplett ausgeblendet
10. [ ] "Tag zurücksetzen" ist ausgeblendet
11. [ ] DayLocationPanel: "Alle geocoden" ausgeblendet

#### Reflexionen-Seite
1. [ ] Neues Reflexion-Formular ist ausgeblendet
2. [ ] Bestehende Reflexionen: Edit/Delete-Buttons ausgeblendet

#### Kontakte (PRM)
1. [ ] Liste: "Neuer Kontakt"-Button ausgeblendet
2. [ ] Kontaktkarten: Favoriten-Stern nur als Anzeige (kein Toggle)
3. [ ] Kontaktdetails: Alle Action-Buttons (Edit, Archive, Delete, Google Push) ausgeblendet
4. [ ] Edit-Seite: Speichern-Button ausgeblendet, "Zurück" statt "Abbrechen"

#### Orte-Seite
1. [ ] Geocode-Buttons ausgeblendet
2. [ ] Delete-Buttons ausgeblendet
3. [ ] Filter/Suche/Karte funktionieren weiterhin

### Automatisierte Tests (optional)

```typescript
// Beispiel: Playwright E2E Test
test('read mode hides create buttons', async ({ page }) => {
  await page.goto('/')
  
  // Activate read mode
  await page.click('[title="Lesemodus aktivieren"]')
  
  // Check background color changed
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(30, 41, 59)')
  
  // Check diary form is hidden
  await expect(page.locator('text=Neuer Tagebucheintrag')).not.toBeVisible()
  
  // Deactivate read mode
  await page.click('[title="Bearbeiten aktivieren"]')
  
  // Check diary form is visible again
  await expect(page.locator('text=Neuer Tagebucheintrag')).toBeVisible()
})
```

## Hinweise

- Kein serverseitiger Block: Schreibaktionen sind UI-seitig deaktiviert.
- Falls später gewünscht: optionales Server-Guard in API-Routen.
- Export-/Batch-Funktionen bleiben im Lesemodus verfügbar.
- Read Mode State ist gerätegebunden (LocalStorage), nicht benutzergebunden.

## Erweiterungsmöglichkeiten

- **Cookie-Sync:** Für SSR-Flicker-Vermeidung könnte ein Cookie zusätzlich gesetzt werden.
- **Server-Guard:** API-Routen könnten optional einen Read Mode Cookie prüfen und Schreibzugriffe ablehnen.
- **Benutzereinstellung:** Read Mode könnte in den Einstellungen als "Standard nach Login" konfigurierbar sein.
