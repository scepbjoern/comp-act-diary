# PIV-Workflow – Features mit Agent Skills bauen

PIV steht für **Plan → Implement → Validate**. Der Agent schreibt nicht direkt Code, sondern erstellt zuerst einen konkreten, versionierten Plan, der reviewt und bestätigt wird. Danach setzt der Agent den Plan autonom Task für Task um und validiert jeden Schritt. Die Skills liegen in `.agents/skills/` und werden per `/skill-name` aufgerufen (einmalig `npm run setup:skills` ausführen, damit `.claude/skills/` und `.kilo/skills/` als Bridges existieren).

Dieses Dokument ist die Kurzreferenz für den Ablauf in comp-act-diary. Es ist die auf professionelle Solo-Entwicklung zugeschnittene Variante des PIV-Workflows aus dem `cas-prdig-starter-kit`: keine Pflicht-Stops nach jedem Task, keine Mehrpersonen-Koordination.

## Die Skills im Überblick

| Skill | Wann nutzen? | Typische Eingabe |
|---|---|---|
| `prime` | Zu Beginn jeder Session, um Projektkontext zu laden | `/prime` |
| `create-prd` | Für ein grösseres Vorhaben, das eine fachliche Grundlage braucht | `/create-prd docs/project/prds/coach-v2.md` |
| `review-prd` | In frischer Reviewer-Session (idealerweise anderes Modell) | `/review-prd docs/project/prds/coach-v2-v001.md` |
| `integrate-prd-review` | Zurück in der Autor-Session | `/integrate-prd-review [PRD] [Review]` |
| `update-prd` | Bei fachlichen Änderungen an einem bestätigten PRD | `/update-prd [PRD-Pfad]` |
| `plan-feature` | Für ein einzelnes Feature, bevor Code geschrieben wird | `/plan-feature "Journal-Export als PDF"` |
| `review-feature-plan` | In frischer Reviewer-Session | `/review-feature-plan [Plan-Pfad]` |
| `integrate-feature-plan-review` | Zurück in der Autor-Session | `/integrate-feature-plan-review [Plan] [Review]` |
| `update-feature-plan` | Bei Planänderungen (PRD-Update, Execute-Befund, Klärung) | `/update-feature-plan [Plan-Pfad]` |
| `execute` | Wenn eine reviewte, bestätigte Plan-Version vorliegt | `/execute docs/project/features/journal-export/plan-v002.md` |
| `document` | Nach Umsetzung und Validierung | `/document [Plan-Pfad]` |
| `reflect-rules` | Nach `/document` bei Verdacht auf wiederholbare Agent-Fehler | `/reflect-rules [Plan-Pfad]` |
| `commit` | Nach validierten Zwischenständen oder zum Feature-Abschluss | `/commit` |
| `create-rules` | Wenn Instructions-Dateien aktualisiert werden sollen | `/create-rules` |
| `init-project` | Frische Entwicklungsmaschine einrichten | `/init-project` |

## Ablauf pro Feature

Für jedes Feature bewusst **zwei frische Sessions** verwenden – eine für Planung, eine für Umsetzung. So arbeitet der Agent mit sauberem Kontext statt mit altem Chatverlauf (Context Rot).

**Session A – Planung:**

```text
/prime
/plan-feature "Feature-Beschreibung oder PRD-Referenz"
/commit                     ← plan-v001.md + TASKS.md committen
```

**Session B – Review (frische Session, idealerweise anderes Modell):**

```text
/prime
/review-feature-plan docs/project/features/[name]/plan-v001.md
/commit                     ← Review-Datei committen
```

**Zurück in Session A – Integration:**

```text
/integrate-feature-plan-review docs/project/features/[name]/plan-v001.md docs/project/features/[name]/plan-reviews/plan-v001-r01-review.md
/commit                     ← plan-v002.md + Integration + TASKS.md committen
```

**Session C – Umsetzung (frische Session):**

```text
/prime
/execute docs/project/features/[name]/plan-v002.md
```

`/execute` arbeitet die Tasks **autonom** nacheinander ab: Status in der Plan-Datei nachführen, pro Task validieren (`npm run test:run`, `tsc`, `lint`, ggf. `build`), Ergebnis dokumentieren, weiter. Gestoppt wird nur bei den Stop-Bedingungen: fachliche Entscheidungen, Planabweichungen, ungeplante Schema-Änderungen, wiederholt fehlschlagende Validierung. Zwischencommits nach validierten Tasks/Phasen via `/commit`.

**Abschluss (in Session C):**

```text
/document docs/project/features/[name]/plan-v002.md
/reflect-rules docs/project/features/[name]/plan-v002.md   ← nur bei Verdacht
/commit                     ← finaler Feature-Commit
```

## Kleine Änderungen ohne PIV

Bugfixes und Kleinständerungen (eine Datei, kein Schema, kein neues Konzept) brauchen keinen Plan-Zyklus – direkt umsetzen, validieren, `/commit`. Der PIV-Loop lohnt sich ab Features mit mehreren Tasks, Schema-Änderungen oder Architekturentscheidungen.

## Plan bei Bedarf aktualisieren

Bestätigte Pläne und PRDs werden nie von Hand editiert, sondern versioniert:

- PRD-Änderung: `/update-prd [PRD-Pfad]` → neue PRD-Version + Update-Datei
- Plan-Änderung: `/update-feature-plan [Plan-Pfad]` → neue Plan-Version + Update-Datei
- Bis der betroffene Plan aktualisiert und bestätigt ist, nicht weiter mit `/execute` arbeiten.

## Task-Status

| Status | Bedeutung |
|---|---|
| `planned` | Task geplant, noch nicht gestartet |
| `in_progress` | Agent arbeitet daran |
| `validating` | Umgesetzt, Validierung läuft/wird dokumentiert |
| `done` | Abgeschlossen und validiert |
| `needs_human` | Entscheidung des Nutzers nötig |

Detailstatus steht in `docs/project/features/[name]/plan-vNNN.md`; `TASKS.md` im Root ist nur der grobe Feature-Index.

## Wenn der Agent vom Plan abweicht

1. Stoppen: «Stopp. Lies den Plan erneut und erkläre die Abweichung.»
2. Klären, welche Plan- oder PRD-Stelle nicht mehr tragfähig ist.
3. `/update-feature-plan [Plan-Pfad]` (bzw. zuerst `/update-prd`) ausführen.
4. `/execute` erst mit der neuen, bestätigten Plan-Version fortsetzen.

Das wichtigste PIV-Prinzip: **Die Implement-Phase beginnt immer mit einem bestätigten Plan.** Neue Erkenntnisse während der Umsetzung führen zuerst zu einer Plan-Aktualisierung, dann zu Code.
