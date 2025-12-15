# Code-Migrationsplan: Altes Schema → Neues Schema

## Übersicht der Schema-Änderungen

### Entfernte/Geänderte Tabellen
| Alt | Neu | Änderung |
|-----|-----|----------|
| `DayEntry.date` | `TimeBox.startAt` + `localDate` | Datum ist jetzt in TimeBox |
| `DayEntry.phase` | ENTFERNT | Wird nicht mehr verwendet |
| `DayEntry.careCategory` | ENTFERNT | Wird nicht mehr verwendet |
| `DayNote` | `JournalEntry` | Umbenannt + erweitert |
| `AudioFile` | `MediaAsset` | Generalisiert |
| `PhotoFile` | `MediaAsset` | Generalisiert |
| `HabitTick` | `HabitCheckIn` | Umbenannt |
| `SymptomScore` | `Measurement` | Generalisiert |
| `StoolScore` | `Measurement` | Generalisiert |
| `UserSymptomScore` | `Measurement` | Generalisiert |
| `DaySummary` | `DayEntry.aiSummary` | In DayEntry integriert |

### Neue Tabellen
- `TimeBox` - Zeitcontainer (Tag, Woche, Monat, Custom)
- `JournalEntry` - Tagebucheinträge (ersetzt DayNote)
- `JournalEntryType` - Eintragstypen
- `MediaAsset` - Medien (ersetzt AudioFile, PhotoFile)
- `MediaAttachment` - Verknüpfung Media ↔ Entity
- `MetricDefinition` - Messwert-Definitionen
- `Measurement` - Messwerte (ersetzt SymptomScore, StoolScore)
- `Entity` - Polymorphe Registry

---

## Betroffene Dateien nach Schicht

### 1. TYPES (`types/`)
| Datei | Änderungen |
|-------|------------|
| `day.ts` | `Day.date` → über TimeBox, `phase`/`careCategory` entfernen, `DayNote` → `JournalEntry` |

### 2. LIB (`lib/`)
| Datei | Änderungen |
|-------|------------|
| `mockdb.ts` | Komplett überarbeiten (DayEntry, DayNote, etc.) |
| `date-utils.ts` | Evtl. TimeBox-Hilfsfunktionen hinzufügen |

### 3. API ROUTES (`app/api/`)

#### 3.1 Day API
| Datei | Änderungen |
|-------|------------|
| `day/route.ts` | `DayEntry.date` → `TimeBox`, `DayNote` → `JournalEntry`, Symptome → Measurement |
| `day/[id]/route.ts` | `phase`/`careCategory` entfernen, `DayNote` → `JournalEntry` |
| `day/[id]/notes/route.ts` | `DayNote` → `JournalEntry` |
| `day/[id]/symptoms/route.ts` | `SymptomScore` → `Measurement` |
| `day/[id]/stool/route.ts` | `StoolScore` → `Measurement` |
| `day/[id]/habit-ticks/route.ts` | `HabitTick` → `HabitCheckIn` |
| `day/[id]/summary/route.ts` | `DaySummary` → `DayEntry.aiSummary` |
| `day/[id]/user-symptoms/route.ts` | `UserSymptomScore` → `Measurement` |

#### 3.2 Notes API
| Datei | Änderungen |
|-------|------------|
| `notes/route.ts` | `DayNote` → `JournalEntry` |
| `notes/[noteId]/route.ts` | `DayNote` → `JournalEntry`, `AudioFile` → `MediaAsset` |
| `notes/[noteId]/photos/route.ts` | `PhotoFile` → `MediaAsset` + `MediaAttachment` |

#### 3.3 Photos API
| Datei | Änderungen |
|-------|------------|
| `photos/[photoId]/route.ts` | `PhotoFile` → `MediaAsset` |

#### 3.4 Diary API
| Datei | Änderungen |
|-------|------------|
| `diary/cleanup-audio/route.ts` | `AudioFile` → `MediaAsset` |
| `diary/retranscribe/route.ts` | `AudioFile` → `MediaAsset` |
| `diary/upload-audio/route.ts` | `AudioFile` → `MediaAsset` |

#### 3.5 Analytics API
| Datei | Änderungen |
|-------|------------|
| `analytics/inline/route.ts` | Symptome → Measurement, `DayEntry.date` → TimeBox |
| `analytics/overall/route.ts` | `DayEntry.date` → TimeBox |
| `analytics/phase/route.ts` | `phase`/`careCategory` entfernen oder TimeBox CUSTOM |
| `analytics/weekly/route.ts` | `DayEntry.date` → TimeBox |

#### 3.6 Export API
| Datei | Änderungen |
|-------|------------|
| `export/csv/route.ts` | Alle Tabellen anpassen |
| `export/pdf/route.ts` | Alle Tabellen anpassen |

#### 3.7 Weitere APIs
| Datei | Änderungen |
|-------|------------|
| `calendar/route.ts` | `DayEntry.date` → TimeBox |
| `reflections/due/route.ts` | Evtl. anpassen |
| `habits/[id]/route.ts` | `HabitTick` → `HabitCheckIn` |

### 4. HOOKS (`hooks/`)
| Datei | Änderungen |
|-------|------------|
| `useDiaryManagement.ts` | `DayNote` Type → `JournalEntry`, `AudioFile` → `MediaAsset` |
| `useDaySummary.ts` | `DaySummary` → `DayEntry.aiSummary` |
| `useSymptomManagement.ts` | Evtl. anpassen für Measurement |
| `useHabitManagement.ts` | `HabitTick` → `HabitCheckIn` |

### 5. COMPONENTS (`components/`)
| Datei | Änderungen |
|-------|------------|
| `DarmkurSection.tsx` | `phase`/`careCategory` entfernen oder anpassen |
| `DaySettings.tsx` | `phase`/`careCategory` entfernen |
| `DiarySection.tsx` | `DayNote` → `JournalEntry`, `AudioFile` → `MediaAsset` |
| `DiaryEntriesAccordion.tsx` | `DayNote` → `JournalEntry` |
| `DiaryAccordion.tsx` | `DayNote` Type |
| `MealNotesSection.tsx` | `DayNote` → `JournalEntry` |
| `MealNotesAccordion.tsx` | `DayNote` → `JournalEntry`, `PhotoFile` → `MediaAsset` |
| `DaySummary.tsx` | `DaySummary` → `DayEntry.aiSummary` |
| `PhotoViewerModal.tsx` | `PhotoFile` → `MediaAsset` |
| `StoolSection.tsx` | Evtl. anpassen |
| `SymptomsSection.tsx` | Evtl. anpassen |
| `HabitsSection.tsx` | `HabitTick` → `HabitCheckIn` |
| `AudioPlayer.tsx` | `AudioFile` → `MediaAsset` |
| `AudioPlayerH5.tsx` | `AudioFile` → `MediaAsset` |
| `AudioUploadButton.tsx` | `AudioFile` → `MediaAsset` |
| `MicrophoneButton.tsx` | `AudioFile` → `MediaAsset` |
| `RetranscribeButton.tsx` | `AudioFile` → `MediaAsset` |

### 6. PAGES (`app/`)
| Datei | Änderungen |
|-------|------------|
| `page.tsx` | `Day` Type mit `date`, `phase`, `careCategory` |
| `analytics/page.tsx` | `phase`/`careCategory` |
| `export/page.tsx` | Evtl. anpassen |

---

## Migrations-Strategie

### Phase 1: Types und Basis
1. ✅ `types/day.ts` - Neue Types erstellen

### Phase 2: API Layer (Bottom-Up)
2. `app/api/day/route.ts` - Kern-API anpassen
3. `app/api/day/[id]/route.ts`
4. `app/api/day/[id]/notes/route.ts`
5. `app/api/notes/[noteId]/route.ts`
6. Weitere API Routes

### Phase 3: Hooks
7. `hooks/useDiaryManagement.ts`
8. `hooks/useDaySummary.ts`
9. Weitere Hooks

### Phase 4: Components
10. Komponenten anpassen

### Phase 5: Pages
11. Seiten anpassen

### Phase 6: Cleanup
12. Ungenutzte Imports entfernen
13. Tests durchführen

---

## Wichtige Entscheidungen

### Option A: Minimale Migration (Empfohlen)
- API-Response-Format beibehalten
- Nur interne Prisma-Queries ändern
- Frontend bleibt weitgehend unverändert

### Option B: Vollständige Migration
- Neue API-Response-Formate
- Frontend komplett anpassen
- Mehr Aufwand, aber sauberer

**Empfehlung:** Option A - Minimale Migration, um schnell lauffähig zu sein.
