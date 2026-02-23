# Phase 6: Startseite-Migration zum Unified JournalEntry-System

**Erstellt:** Februar 2026  
**Status:** Planung  
**Basiert auf:** `2026-02_Unified_JournalEntry_Implementation_Plan.md`

---

## Inhaltsverzeichnis

1. [Beschreibung des geplanten Features](#1-beschreibung-des-geplanten-features)
2. [Anforderungen](#2-anforderungen)
3. [Architekturübersicht](#3-architekturübersicht)
4. [Datenmodell](#4-datenmodell)
5. [Services, Libraries und API-Routen](#5-services-libraries-und-api-routen)
6. [UX (Komponenten und Screens)](#6-ux-komponenten-und-screens)
7. [Dateistruktur](#7-dateistruktur)
8. [Implementierungsplan](#8-implementierungsplan)
9. [Testdaten-Anpassungen](#9-testdaten-anpassungen)
10. [Automatisiertes Testing](#10-automatisiertes-testing)
11. [Manuelles Testing](#11-manuelles-testing)
12. [Fragen an den Auftraggeber](#12-fragen-an-den-auftraggeber)

---

## 1. Beschreibung des geplanten Features

### 1.1 Ziel

Phase 6 ist die **Abschlussphase** der Unified JournalEntry-Implementation. Sie migriert die Startseite (`/`) von den Legacy-Komponenten (`DiarySection`, `DiaryEntriesAccordion`) zu den neuen unified Komponenten (`JournalEntryCard`, `DynamicJournalForm`).

### 1.2 Hintergrund

In den Phasen 1-5 wurden bereits:
- `JournalEntryCard` als unified Anzeigekomponente gebaut (Phase 1-3)
- `DynamicJournalForm` für template-basierte Eingabe erstellt (Phase 4)
- Die Journal-Seite `/journal` erfolgreich migriert (Phase 5)
- Audio-Upload-Konsolidierung mit `audioUploadCore.ts` umgesetzt (Phase 4)

### 1.3 Was Phase 6 leistet

1. **Startseite migrieren**: `app/page.tsx` nutzt `JournalEntryCard` statt `DiaryEntriesAccordion`
2. **Neue Einträge**: `DiarySection` nutzt `DynamicJournalForm` für die Eingabe
3. **Dateien verschieben**: Komponenten aus `diary/` nach `journal/` oder `shared/` verschieben
4. **Legacy APIs entfernen**: Veraltete API-Routen löschen
5. **Daten-Migration**: Audio-MediaAssets nachträglich mit MediaAttachments verknüpfen

### 1.4 Was Phase 6 NICHT leistet

- Keine Änderungen am Datenmodell (Schema bleibt identisch)
- Keine neuen Features (nur Migration bestehender Funktionalität)
- Keine Änderungen an anderen Seiten (MealNotes, Reflections bleiben vorerst auf Legacy)

---

## 2. Anforderungen

### 2.1 Funktionale Anforderungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| **F-01** | Startseite zeigt Tagebucheinträge mit `JournalEntryCard` an | Hoch |
| **F-02** | Neue Einträge können über `DynamicJournalForm` erstellt werden | Hoch |
| **F-03** | Alle Features von `DiaryEntriesAccordion` sind in `JournalEntryCard` verfügbar | Hoch |
| **F-04** | Audio-MediaAssets aus Legacy-Upload haben nachträglich MediaAttachments | Hoch |
| **F-05** | Legacy API `/api/diary/upload-audio` wird entfernt | Mittel |
| **F-06** | Legacy API `/api/notes/[noteId]/photos` wird entfernt | Mittel |
| **F-07** | Komponenten werden in korrekte Ordner verschoben | Niedrig |

### 2.2 Detaillierte Feature-Matrix

Die folgende Matrix zeigt, welche Features von `DiaryEntriesAccordion` bereits in `JournalEntryCard` verfügbar sind:

| Feature | DiaryEntriesAccordion | JournalEntryCard | Status |
|---------|----------------------|------------------|--------|
| Eintrag anzeigen (compact/expanded) | ✅ | ✅ | OK |
| Titel + Zeit anzeigen | ✅ | ✅ | OK |
| Inhalt mit Markdown + Mentions | ✅ | ✅ | OK |
| AI-Zusammenfassung (blau) | ✅ | ✅ | OK |
| AI-Analyse (gelb) | ✅ | ✅ | OK |
| AI-Pipeline Button | ✅ | ✅ | OK |
| AI-Settings Popup | ✅ | ✅ | OK |
| Timestamp Modal | ✅ | ✅ | OK |
| Multi-Audio mit Transkripten | ✅ | ✅ | OK |
| Audio-Upload (bestehend) | ✅ | ✅ | OK |
| Audio löschen | ✅ | ✅ | OK |
| Neu transkribieren | ✅ | ✅ | OK |
| Fotos anzeigen | ✅ | ✅ | OK |
| Foto-Upload (best. Einträge) | ✅ | ❌ | Nicht in Card, nur via DynamicJournalForm |
| Foto-Upload (Bearbeiten) | ✅ | ❌ | Im Edit-Formular nicht sichtbar |
| Foto löschen | ✅ | ❌ | Nicht in Card |
| OCR-Quellen anzeigen | ✅ | ✅ | OK |
| Tasks-Panel | ✅ | ✅ | OK |
| Sharing Badge + Modal | ✅ | ✅ | OK |
| Bearbeiten-Modus | ✅ | ✅ | via onEdit-Callback (öffnet Modal/Form) |
| Eintrag löschen | ✅ | ✅ | OK |
| URL-Highlighting (#entry-id) | ✅ | ❌ | Muss ergänzt werden |

### 2.3 Nicht-funktionale Anforderungen

| ID | Anforderung |
|----|-------------|
| **NF-01** | Keine Regression: Alle bestehenden Funktionen müssen weiterhin funktionieren |
| **NF-02** | Performance: Ladezeit der Startseite darf sich nicht verschlechtern |
| **NF-03** | Backward-Kompatibilität: Bestehende Daten müssen ohne Verluste migriert werden |
| **NF-04** | Code-Qualität: Keine Code-Duplizierung zwischen alter und neuer Implementierung |
| **NF-05** | Testbarkeit: Änderungen müssen durch bestehende Tests abgedeckt sein |

---

## 3. Architekturübersicht

### 3.1 Aktuelle Architektur (vor Phase 6)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           STARTSEITE (/)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      DiarySection                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────┐ │    │
│  │  │  Neuer Eintrag Formular (eigenes Formular)                  │ │    │
│  │  │  - MicrophoneButton (legacy API)                            │ │    │
│  │  │  - AudioUploadButton (legacy API)                           │ │    │
│  │  │  - OCRUploadButton                                          │ │    │
│  │  │  - RichTextEditor                                           │ │    │
│  │  └─────────────────────────────────────────────────────────────┘ │    │
│  │                                                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐ │    │
│  │  │  DiaryEntriesAccordion (bestehende Einträge)                │ │    │
│  │  │  - Eigenes Edit-Formular                                    │ │    │
│  │  │  - Eigenes Audio-Handling                                   │ │    │
│  │  │  - Eigenes AI-Handling                                      │ │    │
│  │  └─────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Legacy APIs:                                                            │
│  - POST /api/diary/upload-audio (keine MediaAttachments!)               │
│  - POST /api/notes/[noteId]/photos                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Zielarchitektur (nach Phase 6)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           STARTSEITE (/)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              DiarySection (refactored)                            │    │
│  │  ┌─────────────────────────────────────────────────────────────┐ │    │
│  │  │  DynamicJournalForm (neue Einträge)                         │ │    │
│  │  │  - Template-basiert                                         │ │    │
│  │  │  - Unified Audio via audioUploadCore                        │ │    │
│  │  │  - OCRUploadButton                                          │ │    │
│  │  └─────────────────────────────────────────────────────────────┘ │    │
│  │                                                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐ │    │
│  │  │  JournalEntryCard[] (bestehende Einträge)                   │ │    │
│  │  │  - Unified Anzeige                                          │ │    │
│  │  │  - Inline-Edit (Phase 5)                                    │ │    │
│  │  │  - Alle AI/Audio/Photo Features                             │ │    │
│  │  └─────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Unified APIs:                                                           │
│  - POST /api/journal-entries (neue Einträge)                            │
│  - POST /api/journal-entries/[id]/audio (mit MediaAttachments)          │
│  - POST /api/journal-entries/[id]/media (Fotos)                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Komponenten-Verschiebungen

```
VORHER                          NACHHER
─────────────────────────────────────────────────────────────
diary/JournalEntrySection.tsx   → journal/JournalEntrySection.tsx
diary/ShareEntryModal.tsx      → shared/ShareEntryModal.tsx
diary/SharedBadge.tsx          → shared/SharedBadge.tsx
diary/DiaryContentWithMentions → shared/ContentWithMentions.tsx

diary/DiaryEntriesAccordion.tsx → ENTFERNEN (ersetzt durch JournalEntryCard)
```

---

## 4. Datenmodell

### 4.1 Betroffene Entitäten

Phase 6 ändert **kein** Datenmodell. Die folgenden Entitäten sind relevant:

| Entität | Änderung |
|---------|----------|
| `JournalEntry` | Keine Änderung |
| `MediaAsset` | Keine Änderung |
| `MediaAttachment` | Keine Änderung (wird durch Migrationsskript befüllt) |

### 4.2 Migration von Audio-MediaAttachments

**Problem**: Audio-Uploads via `/api/diary/upload-audio` haben `MediaAsset` erstellt, aber **kein** `MediaAttachment`. Die Verknüpfung zum JournalEntry fehlt.

**Lösung**: Erweiterung des bestehenden `scripts/migrate-journal-entries.ts` um Audio-MediaAttachment-Migration.

**Hinweis**: Das Skript `scripts/migrate-journal-entries.ts` existiert bereits, migriert aber nur Entity-Einträge und Sharing-Regeln. Es muss um Audio-Migration erweitert werden.

```typescript
// Pseudo-Logik für Migration
async function migrateAudioAttachments() {
  // 1. Finde alle JournalEntries
  const entries = await prisma.journalEntry.findMany({
    where: { deletedAt: null },
    include: { mediaAttachments: true }
  })

  for (const entry of entries) {
    // 2. Finde orphaned Audio-MediaAssets
    // Kriterien: 
    // - Gleicher userId
    // - mimeType starts with 'audio/'
    // - capturedAt innerhalb ±5min von entry.occurredAt
    // - Kein existierendes MediaAttachment
    const orphanedAssets = await prisma.mediaAsset.findMany({
      where: {
        userId: entry.userId,
        mimeType: { startsWith: 'audio/' },
        capturedAt: {
          gte: subMinutes(entry.occurredAt, 5),
          lte: addMinutes(entry.occurredAt, 5)
        },
        mediaAttachments: { none: {} }
      }
    })

    // 3. Erstelle MediaAttachments
    for (const asset of orphanedAssets) {
      await prisma.mediaAttachment.create({
        data: {
          entityId: entry.id,
          userId: entry.userId,
          assetId: asset.id,
          timeBoxId: entry.timeBoxId,
          role: 'ATTACHMENT',
          displayOrder: 0
        }
      })
    }
  }
}
```

**Wichtig**: Das Migrationsskript muss **vor** der eigentlichen Phase 6-Implementation ausgeführt werden.

---

## 5. Services, Libraries und API-Routen

### 5.1 Zu entfernende API-Routen

| Route | Grund | Ersatz |
|-------|-------|--------|
| `/api/diary/upload-audio` | Erstellt keine MediaAttachments | `/api/journal-entries/[id]/audio` |
| `/api/notes/[noteId]/photos` | Legacy-Photo-Upload | `/api/journal-entries/[id]/media` |

### 5.2 Bestehende Services (wiederverwenden)

| Service | Verwendung |
|---------|------------|
| `lib/services/journal/journalService.ts` | CRUD für JournalEntries |
| `lib/audio/audioUploadCore.ts` | Unified Audio-Upload |
| `hooks/useJournalAI.ts` | AI-Operationen |
| `hooks/useTasksForEntry.ts` | Tasks für Eintrag |

### 5.3 Neue Dependencies

Keine neuen Dependencies erforderlich.

---

## 6. UX (Komponenten und Screens)

### 6.1 DiarySection (Refactored)

Die `DiarySection` wird zu einem dünnen Wrapper:

```typescript
// NEU: DiarySection als Wrapper
export function DiarySection({ date, timeBoxId, notes, ... }) {
  return (
    <div className="card p-4 space-y-3">
      <h2>Tagebuch</h2>
      
      {/* Neue Einträge */}
      <DynamicJournalForm
        typeCode="diary"
        date={date}
        timeBoxId={timeBoxId}
        onSubmit={handleNewEntry}
      />
      
      {/* Bestehende Einträge */}
      {entries.map(entry => (
        <JournalEntryCard
          key={entry.id}
          entry={entry}
          mode="compact"
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRunPipeline={handlePipeline}
        />
      ))}
    </div>
  )
}
```

### 6.2 JournalEntryCard-Erweiterungen

Für Phase 6 müssen folgende Features ergänzt werden:

| Feature | Beschreibung |
|---------|--------------|
| **URL-Highlighting** | `#entry-{id}` oder `?entry={id}` scrollt zum Eintrag |
| **Foto-Upload UI** | Buttons für Upload und Kamera |
| **Inline-Edit** | Vollständiger Edit-Modus innerhalb der Card |

### 6.3 Screens

Nur ein Screen betroffen: **Startseite (`/`)**

**Änderungen:**
- Tagebuch-Sektion nutzt neue Komponenten
- Visuell identisch (keine UX-Änderung für Endbenutzer)

---

## 7. Dateistruktur

### 7.1 Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `app/page.tsx` | DiarySection durch refactored Version ersetzen |
| `components/features/diary/DiarySection.tsx` | Refactoren: DynamicJournalForm + JournalEntryCard nutzen |

### 7.2 Zu verschiebende Dateien

| Datei | Von | Nach |
|-------|-----|------|
| `JournalEntrySection.tsx` | `diary/` | `journal/` |
| `ShareEntryModal.tsx` | `diary/` | `shared/` |
| `SharedBadge.tsx` | `diary/` | `shared/` |
| `DiaryContentWithMentions.tsx` | `diary/` | `shared/ContentWithMentions.tsx` |

### 7.3 Zu erstellende Dateien

| Datei | Zweck |
|-------|-------|
| `scripts/migrate-audio-attachments.ts` | Daten-Migration |

### 7.4 Zu entfernende Dateien

| Datei | Grund |
|-------|-------|
| `components/features/diary/DiaryEntriesAccordion.tsx` | Ersetzt durch JournalEntryCard |
| `app/api/diary/upload-audio/route.ts` | Legacy API |
| `app/api/notes/[noteId]/photos/route.ts` | Legacy API |

---

## 8. Implementierungsplan

### Schritt 1 (LLM): Migrationsskript erstellen

**Ziel**: `scripts/migrate-audio-attachments.ts` erstellen

**Anforderungen**:
- Dry-Run-Modus (Standard) für sicheres Testen
- Echter Modus mit `--execute` Flag
- Detailliertes Logging der gefundenen und migrierten Assets
- Transaktion-basiert für Rollback bei Fehlern
- Progress-Anzeige für grosse Datenmengen

**Tipps**:
- Zeitfenster von ±5 Minuten für capturedAt-Matching verwenden
- Auch `transcript` und `transcriptModel` aus MediaAsset übernehmen falls vorhanden
- Bestehende MediaAttachments nicht überschreiben

---

### Schritt 2 (Mensch): Migrationsskript ausführen

**Ziel**: Datenbank migrieren

**Aktionen**:
1. Backup der Datenbank erstellen
2. Skript im Dry-Run ausführen: `npx ts-node scripts/migrate-audio-attachments.ts`
3. Ergebnisse prüfen
4. Echter Lauf: `npx ts-node scripts/migrate-audio-attachments.ts --execute`

---

### Schritt 3 (LLM): Dateien verschieben

**Ziel**: Komponenten in korrekte Ordner verschieben

**Aktionen**:
1. `JournalEntrySection.tsx` → `journal/`
2. `ShareEntryModal.tsx` → `shared/`
3. `SharedBadge.tsx` → `shared/`
4. `DiaryContentWithMentions.tsx` → `shared/ContentWithMentions.tsx`
5. Alle Imports in anderen Dateien aktualisieren

**Tipps**:
- Globale Suche nach Import-Pfaden verwenden
- `components/features/diary/index.ts` Exporte aktualisieren

---

### Schritt 4 (LLM): JournalEntryCard erweitern

**Ziel**: Fehlende Features ergänzen

**Features**:
1. **URL-Highlighting**: 
   - `useSearchParams()` für `?entry={id}` 
   - `useHash()` für `#entry-{id}`
   - `scrollIntoView()` mit Highlight-Animation

2. **Foto-Upload für bestehende Einträge**:
   - Upload-Button in der JournalEntryCard (auch ohne Bearbeiten-Modus)
   - Foto-Galerie mit Delete-Button pro Foto
   - Wie auf Journal-Seite: inline, nicht als separates Modal

3. **Foto-Anzeige im Bearbeiten-Modus**:
   - Beim Bearbeiten eines Eintrags mit vorhandenen Fotos: diese anzeigen
   - Möglichkeit, bestehende Fotos zu löschen
   - Möglichkeit, weitere Fotos hinzuzufügen

---

### Schritt 5 (LLM): DiarySection refactoren

**Ziel**: DiarySection nutzt DynamicJournalForm und JournalEntryCard

**Anforderungen**:
- Props reduzieren (statt 80+ Props nur noch essentielle)
- `DynamicJournalForm` für neue Einträge
- `JournalEntryCard[]` für bestehende Einträge
- State-Management in Parent (`app/page.tsx`) belassen

**Tipps**:
- `useDiaryManagement` Hook weiterverwenden
- Daten von `DayNote[]` zu `EntryWithRelations[]` transformieren

---

### Schritt 6 (LLM): app/page.tsx anpassen

**Ziel**: Refactored DiarySection integrieren

**Änderungen**:
- Weniger Props an DiarySection übergeben
- Einträge als `EntryWithRelations[]` bereitstellen
- Callbacks vereinheitlichen

**Tipps**:
- Bestehende `useDiaryManagement` Logik beibehalten
- Daten-Transformation: `notes` → `entries`

---

### Schritt 7 (LLM): Legacy APIs entfernen

**Ziel**: Veraltete API-Routen löschen

**Aktionen**:
1. `/api/diary/upload-audio/route.ts` löschen
2. `/api/notes/[noteId]/photos/route.ts` löschen
3. Alle Referenzen entfernen

**Tipps**:
- Globale Suche nach `upload-audio` und `photos/route`
- Prüfen ob andere Stellen noch diese APIs nutzen

---

### Schritt 8 (LLM): DiaryEntriesAccordion entfernen

**Ziel**: Legacy-Komponente löschen

**Voraussetzung**: Alle Tests grün

**Aktionen**:
1. `components/features/diary/DiaryEntriesAccordion.tsx` löschen
2. Export aus `diary/index.ts` entfernen

---

### Schritt 9 (LLM): Tests aktualisieren

**Ziel**: Tests an neue Struktur anpassen

**Aktionen**:
1. `JournalEntryCard.test.tsx` erweitern (URL-Highlighting, Foto-Upload)
2. `DiarySection` Tests entfernen oder anpassen
3. API-Tests für entfernte Routes löschen

---

## 9. Testdaten-Anpassungen

### 9.1 Keine Anpassungen erforderlich

Da das Datenmodell nicht geändert wird, sind keine Anpassungen an `testDataService.ts` oder `seed.ts` erforderlich.

### 9.2 Analyse der Testdaten

Die `prisma/seed.ts` erstellt **keine MediaAttachments** für Audio- oder Foto-Assets. Das bedeutet:
- Testdaten haben keine Audio-Anhänge
- Das Migrationsskript wird für Testdaten keine Audio-Migration durchführen
- Für realistische Tests müssen Audio-Attachments manuell oder via API erstellt werden

---

## 10. Automatisiertes Testing

### 10.1 Unit Tests

| Test | Beschreibung |
|------|--------------|
| `JournalEntryCard.test.tsx` | Erweitern um URL-Highlighting, Foto-Upload, Foto-Löschen |
| `DynamicJournalForm.test.tsx` | Prüfen ob für `typeCode="diary"` korrekt funktioniert |

### 10.2 Integration Tests

| Test | Beschreibung |
|------|--------------|
| API Route Tests | Sicherstellen dass `/api/journal-entries/[id]/audio` korrekt MediaAttachments erstellt |

### 10.3 E2E Tests (manuell)

Siehe nächster Abschnitt.

---

## 11. Manuelles Testing

### 11.1 Test-Szenarien

| # | Szenario | Erwartetes Ergebnis |
|---|----------|---------------------|
| 1 | Startseite laden | Alle Tagebucheinträge werden mit JournalEntryCard angezeigt |
| 2 | Neuen Eintrag erstellen (Text) | Eintrag erscheint in Liste |
| 3 | Neuen Eintrag mit Audio (Mikrofon) | Audio wird gespeichert, Transkript erscheint |
| 4 | Neuen Eintrag mit Audio (Upload) | Audio wird gespeichert, Transkript erscheint |
| 5 | Neuen Eintrag mit OCR | OCR-Text erscheint |
| 6 | Eintrag bearbeiten | Inline-Edit funktioniert |
| 7 | Audio zu bestehendem Eintrag hinzufügen | Audio erscheint in der Liste |
| 8 | Eintrag löschen | Eintrag verschwindet |
| 9 | AI-Pipeline ausführen | Zusammenfassung + Analyse werden generiert |
| 10 | Eintrag teilen | Share-Modal öffnet sich |
| 11 | URL mit `?entry={id}` | Zum Eintrag scrollen, Highlight |
| 12 | Foto hochladen | Foto erscheint in Galerie |
| 13 | Foto löschen | Foto verschwindet |

### 11.2 Regression Tests

| Feature | Prüfung |
|---------|---------|
| MealNotes | Noch funktionstüchtig (nutzt noch Legacy) |
| Reflections | Noch funktionstüchtig (nutzt noch Legacy) |
| DarmkurSection | Noch funktionstüchtig |

---

## 12. Entscheidungen des Auftraggebers

### 12.1 Technische Entscheidungen

| Frage | Entscheidung |
|-------|-------------|
| **Q1: Migrationsskript-Ausführung** | Manuell vor dem Deployment |
| **Q2: MealNotes und Reflections** | Bleiben auf Legacy-Implementierung |
| **Q3: Foto-Upload** | Inline wie auf Journal-Seite (bereits funktionsfähig) |

### 12.2 UX-Entscheidungen

| Frage | Entscheidung |
|-------|-------------|
| **Q4: Visuelle Konsistenz** | "Dünner Wrapper" wie in Kapitel 6.1 vorgeschlagen |
| **Q5: Edit-Modus** | Inline mit "+ Neuer Eintrag" Button oberhalb bestehender Einträge |

### 12.3 Priorisierungs-Entscheidung

| Frage | Entscheidung |
|-------|-------------|
| **Q6: Schrittweise vs. Vollständig** | Zunächst Schritt 1 (falls erforderlich), dann Schritte 3-9 in einer Phase |

---

## Zusammenfassung

Phase 6 migriert die Startseite zum unified JournalEntry-System. Die Hauptarbeit besteht in:

1. **Migrationsskript erweitern** für Audio-MediaAttachments (kritisch für Datenkonsistenz)
2. **DiarySection refactoren** mit DynamicJournalForm und JournalEntryCard
3. **JournalEntryCard erweitern** für URL-Highlighting (einziges fehlendes Feature)
4. **Legacy-Code-Entfernung** für saubere Codebasis

Das Risiko ist gering, da:
- Keine Datenmodell-Änderungen
- Journal-Seite bereits erfolgreich migriert
- Komponenten bereits existieren und getestet sind

Die grösste Sorgfalt erfordert das Migrationsskript, um keine Daten zu verlieren.
