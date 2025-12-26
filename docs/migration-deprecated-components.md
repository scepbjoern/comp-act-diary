# Migrationsplan: Deprecated Komponenten entfernen

**Version:** 2.0
**Erstellt:** Dezember 2025
**Status:** ✅ VOLLSTÄNDIG ABGESCHLOSSEN (Phase 1-5)

---

## Übersicht

Mit der Einführung der neuen Journal AI-Features (siehe `concept-journal-ai-features.md`) werden einige bestehende Komponenten deprecated und müssen schrittweise durch die neuen Implementierungen ersetzt werden.

### Zu entfernende Dateien

| Datei | Status | Ersatz |
|-------|--------|--------|
| `components/TextImprovementDialog.tsx` | DEPRECATED | Inline-Generierung via `JournalEntrySection` |
| `components/ImproveTextButton.tsx` | DEPRECATED | Inline-Buttons in `DiaryEntriesAccordion` |
| `app/api/improve-text/route.ts` | DEPRECATED | `/api/journal-ai/generate-content` |
| `app/api/improvement-prompts/route.ts` | DEPRECATED | AI-Settings in `User.settings` JSON |
| `app/api/improvement-prompts/[id]/route.ts` | DEPRECATED | Nicht mehr benötigt |
| `lib/improvementPrompt.ts` | DEPRECATED | `lib/services/journalAIService.ts` |

---

## Betroffene Stellen

Die deprecated Komponenten werden aktuell an folgenden Stellen verwendet:

### 1. `components/DiarySection.tsx`
- **Zeile 4:** `import { ImproveTextButton } from '@/components/ImproveTextButton'`
- **Zeile 253-262:** `<ImproveTextButton .../>` für neue Tagebucheinträge

### 2. `components/MealNotesAccordion.tsx`
- **Import:** `ImproveTextButton`
- **Verwendung:** Textverbesserung für Mahlzeit-Notizen

### 3. `components/MealNotesSection.tsx`
- **Import:** `ImproveTextButton`
- **Verwendung:** Textverbesserung für Mahlzeit-Notizen

### 4. `app/reflections/page.tsx`
- **Mehrere Stellen:** `ImproveTextButton` und `TextImprovementDialog`
- **Verwendung:** Textverbesserung für Reflexionseinträge

---

## Migrationsstrategie

### Phase 1: DiarySection migrieren (Priorität: Hoch) ✅ ABGESCHLOSSEN

**Ziel:** `ImproveTextButton` aus `DiarySection.tsx` entfernen.

**Schritte:**
1. ✅ Neuen "Verbessern"-Button inline implementieren, der `/api/journal-ai/generate-content` aufruft
2. ✅ Original-Transkript-Logik beibehalten (für `onOriginalPreserved`)
3. ✅ Loading-State und Fehlerbehandlung hinzufügen
4. ✅ `ImproveTextButton` Import und Verwendung entfernen

**Abgeschlossen:** 26. Dezember 2025

### Phase 2: MealNotesAccordion und MealNotesSection migrieren (Priorität: Mittel) ✅ ABGESCHLOSSEN

**Ziel:** `ImproveTextButton` aus Mahlzeit-Komponenten entfernen.

**Schritte:**
1. ✅ Mahlzeit-Einträge nutzen die neue Journal AI-Pipeline mit typeCode 'meal'
2. ✅ Inline-Implementierung wie bei DiarySection umgesetzt
3. ✅ `MealNotesAccordion.tsx`: ImproveTextButton durch inline Button ersetzt
4. ✅ `MealNotesSection.tsx`: ImproveTextButton durch inline Button ersetzt

**Abgeschlossen:** 26. Dezember 2025

### Phase 3: Reflections-Page migrieren (Priorität: Mittel) ✅ ABGESCHLOSSEN

**Ziel:** `ImproveTextButton` und `TextImprovementDialog` aus Reflexions-Seite entfernen.

**Schritte:**
1. ✅ Analyse der bestehenden Implementierung (8 Verwendungen von ImproveTextButton)
2. ✅ Inline `InlineImproveButton` Komponente erstellt
3. ✅ Alle 8 ImproveTextButton-Verwendungen durch InlineImproveButton ersetzt
4. ✅ Import entfernt

**Abgeschlossen:** 26. Dezember 2025

### Phase 4: API-Routen entfernen (Priorität: Niedrig) ✅ ABGESCHLOSSEN

**Schritte:**
1. ✅ Keine Frontend-Referenzen mehr vorhanden
2. ✅ `app/api/improve-text/route.ts` gelöscht
3. ✅ `app/api/improvement-prompts/` Ordner gelöscht
4. ✅ `lib/improvementPrompt.ts` gelöscht

**Abgeschlossen:** 26. Dezember 2025

### Phase 5: Komponenten-Dateien entfernen (Priorität: Niedrig) ✅ ABGESCHLOSSEN

**Schritte:**
1. ✅ Keine Imports mehr vorhanden
2. ✅ `components/ImproveTextButton.tsx` gelöscht
3. ✅ `components/TextImprovementDialog.tsx` gelöscht

**Abgeschlossen:** 26. Dezember 2025

---

## Rollback-Plan

Falls Probleme auftreten, können die deprecated Komponenten jederzeit aus Git wiederhergestellt werden:

```bash
git checkout HEAD~1 -- components/ImproveTextButton.tsx
git checkout HEAD~1 -- components/TextImprovementDialog.tsx
git checkout HEAD~1 -- app/api/improve-text/route.ts
git checkout HEAD~1 -- app/api/improvement-prompts/
git checkout HEAD~1 -- lib/improvementPrompt.ts
```

---

## Testing-Checkliste

Nach jeder Phase:

- [ ] `npm run build` erfolgreich
- [ ] Betroffene Funktionalität manuell getestet
- [ ] Keine Console-Errors
- [ ] Keine TypeScript-Fehler

Nach Abschluss aller Phasen:

- [ ] Vollständiger E2E-Test aller Textverbesserungsfunktionen
- [ ] Performance-Check (keine Regression)
- [ ] Code-Review

---

## Geschätzter Gesamtaufwand

| Phase | Aufwand |
|-------|---------|
| Phase 1: DiarySection | 30 Min |
| Phase 2: MealNotes | 45 Min |
| Phase 3: Reflections | 60 Min |
| Phase 4: API-Routen | 15 Min |
| Phase 5: Komponenten | 10 Min |
| **Gesamt** | **~2.5 Stunden** |

---

## Hinweise

- Jede Phase sollte separat committed werden, um Rollbacks zu erleichtern
- Die `ImprovementPrompt` Datenbanktabelle kann vorerst bestehen bleiben (keine Daten-Migration nötig)
- Die neuen AI-Settings in `User.settings` ersetzen die `ImprovementPrompt`-Tabelle funktional

---

*Dieser Plan ist eine Referenz für die schrittweise Migration der deprecated Komponenten.*
