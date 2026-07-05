---
name: execute
description: >
  Implements a confirmed, reviewed, versioned feature plan task by task while updating task status and validation evidence in the plan file. Use it only after a docs/project/features/[feature-name]/plan-vNNN.md file has been reviewed, integrated, approved, and committed. ONLY activate when the user explicitly runs /execute or directly requests this specific workflow by name. Do NOT activate during normal development, planning, or implementation conversations.
compatibility: Next.js 15, React 18, Prisma 6, PostgreSQL, Tailwind 3 + DaisyUI
metadata:
  piv-phase: implement
  version: "2.0"
disable-model-invocation: true
argument-hint: "[path-to-plan]"
---

> **KiloCode-Modus:** Dieser Skill muss im **Code-Modus** ausgeführt werden. Im Architect- oder Plan-Modus beschränkt KiloCode Schreibrechte auf `.kilo/`-Ordner – Änderungen an Projektdateien und Statusupdates in der Plan-Datei wären nicht möglich. Wechsle in KiloCode vor der Ausführung auf den **Code-Modus**.

# Execute: Plan Umsetzen

## Input

Pfad zur bestätigten Plan-Datei: `$ARGUMENTS`

Beispiel:

```text
/execute docs/project/features/journal-export/plan-v002.md
```

## Grundregeln

- Implementiere nur auf Basis einer bestätigten Plan-Datei.
- Verwende eine versionierte Plan-Datei `plan-vNNN.md`. Starte nicht mit `plan-v001.md`, wenn noch kein Review und keine Integration gelaufen sind. Der Normalfall nach einer Review-Integration ist `plan-v002.md`.
- Arbeite die Tasks in Plan-Reihenfolge ab. Du darfst **autonom von Task zu Task weiterfahren**, solange die Validierung des abgeschlossenen Tasks erfolgreich war und keine Stop-Bedingung (siehe unten) vorliegt. Es ist keine Bestätigung pro Task nötig.
- Ändere keine Dateien, die nicht zum aktuellen Task gehören.
- Lösche keine Dateien ohne explizite Bestätigung.
- Setze einen Task nie auf `done`, ohne die Validierung in der Plan-Datei zu dokumentieren.
- Ein Feature gilt erst nach allen `done`-Tasks, vollständiger Validierung und `/document` als abgeschlossen. Bei Verdacht auf wiederholbare Agent-Fehler, Planlücken oder wiederholte Nutzerkorrekturen soll vor dem finalen Commit zusätzlich `/reflect-rules` laufen.

## Stop-Bedingungen

Stoppe die autonome Abarbeitung und warte auf den Menschen, wenn:

- ein Task eine fachliche oder architektonische Entscheidung erfordert, die der Plan nicht abdeckt (`needs_human`)
- der bestätigte Plan nicht mehr tragfähig ist (siehe «Plan- und PRD-Abweichungen»)
- eine Validierung nach zwei Korrekturversuchen weiterhin fehlschlägt
- eine Änderung an `prisma/schema.prisma` ansteht, die im Plan nicht ausdrücklich vorgesehen ist
- Dateien gelöscht oder umbenannt werden müssten, die der Plan nicht nennt
- ein manueller Prüfschritt zwingend nötig ist, weil das Verhalten automatisiert nicht verifizierbar ist (z. B. Audio-Aufnahme im Browser, Karten-Interaktion)

Manuelle UI-Prüfungen, die nicht blockierend sind, sammelst du und gibst sie am Ende als konsolidierte Prüfanleitung aus, statt nach jedem Task zu stoppen.

## Pflichtlektüre vor Umsetzung

Lies vor dem ersten Task den gesamten Plan vollständig. Starte nicht direkt beim ersten Task, sondern verstehe zuerst den Gesamtzusammenhang.

Lies vollständig:

- Plan-Datei aus `$ARGUMENTS`
- `KILO_INSTRUCTIONS.md` oder `CLAUDE.md`
- `AGENTS.md`
- `TASKS.md`
- `prisma/schema.prisma`, wenn Datenmodell oder Status betroffen sind
- Alle im aktuellen Task referenzierten Dateien
- Relevante Kapitel aus `docs/coding-guidelines/`, wenn der Task Datenbank, Formulare, UI, Fehlerbehandlung oder Migrationsscripts betrifft

Analysiere vor der Umsetzung:

- Alle Tasks und ihre Abhängigkeiten
- Reihenfolge und kritische Pfade
- Validierungsschritte aus dem Plan
- Mögliche Auswirkungen auf bestehende Kernworkflows (Journal, Tagesansicht, Suche, PRM, Locations)

## Task-Status Aktualisieren

Aktualisiere die Plan-Datei während der Arbeit:

- Beim Start eines Tasks: `planned` -> `in_progress`
- Bei Unklarheit oder fehlender Entscheidung: `needs_human`, Frage in der Plan-Datei dokumentieren, stoppen
- Nach Implementierung vor Validierung: `validating`
- Nach erfolgreicher Validierung: `done`

Erlaubte Statuswerte:

```text
planned | in_progress | needs_human | validating | done
```

## Umsetzung pro Task

Wenn ein Task im Plan erkennbar nur ein technischer Folgeschritt des vorherigen Tasks ist (z. B. ein isolierter «`npx prisma generate`»-Task nach einem Schema-Task), führe beide zusammen aus und behandle sie als eine Einheit für Validierung und Commit. Dokumentiere das kurz in der Plan-Datei.

Für jeden Task:

1. Task aus der Plan-Datei identifizieren; betroffene Dateien, Aktion und Akzeptanzkriterien erfassen.
2. Status auf `in_progress` setzen und relevante Dateien lesen.
3. Detaillierte Spezifikation aus dem Plan exakt befolgen; bestehende Code-Patterns, Namenskonventionen und Architekturgrenzen (Route Handler → `lib/services/` → Prisma) einhalten.
4. TypeScript-Typen sauber definieren, keine unbegründeten `any` oder `as`.
5. Strukturiertes Logging über `logger` aus `lib/core/logger.ts` verwenden, kein `console.log` in Produktivcode.
6. Minimal korrekte Änderung umsetzen; Tests oder Validierung gemäss Task ergänzen.
7. Status auf `validating` setzen und automatisierte Validierung durchführen.
8. Validierungsergebnis in der Plan-Datei festhalten (Befehle und Resultat).
9. Status auf `done` setzen und mit dem nächsten Task weiterfahren.

## Validierung

Nutze projektkonforme Checks:

- Unit Tests: `npm run test:run`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build nach grösseren Änderungen oder spätestens nach 3 Tasks: `npm run build`
- Manuelle Prüfung in der laufenden App: am Ende konsolidiert beschreiben (siehe Abschluss); `npm run dev` startet der Nutzer selbst

Wenn die Plan-Datei konkrete Validierungsbefehle nennt, führe alle dort genannten Befehle vollständig und in der angegebenen Reihenfolge aus. Standardchecks ergänzen die Plan-Validierung, ersetzen sie aber nicht.

Wenn eine Validierung fehlschlägt:

- Fehlerursache analysieren
- Implementierung oder Test korrigieren
- denselben Validierungsschritt erneut ausführen
- nach zwei erfolglosen Korrekturversuchen den Task auf `needs_human` setzen und stoppen

Überspringe keine Validierungsschritte. Falls ein Schritt nicht ausführbar ist, dokumentiere den Grund und die manuelle Alternative in der Plan-Datei.

Prüfe Regressionen stack-spezifisch:

- Bestehende Vitest-Tests für betroffene Validators, Services und Utilities erweitern, wenn ein Kernverhalten stabil bleiben muss.
- Bei reinen Dokumentations- oder Konfigurationsänderungen reicht eine begründete manuelle Regressionseinschätzung.

## Plan- und PRD-Abweichungen

Wenn sich während der Implementierung ergibt, dass der bestätigte Plan oder ein zugrunde liegendes PRD nicht mehr korrekt ist:

- Setze den betroffenen Task auf `needs_human`, wenn die Abweichung eine fachliche oder architektonische Entscheidung erfordert.
- Führe keine stille Korrektur im Produktivcode und keine direkte Änderung der bestehenden Plan-Version durch.
- Erkläre konkret, welche Plan- oder PRD-Stelle nicht mehr tragfähig ist und warum daraus keine plan-konforme Umsetzung möglich ist.
- Wenn das PRD betroffen ist, fordere den Nutzer auf, zuerst `/update-prd [PRD-Pfad]` auszuführen.
- Wenn der Feature-Plan betroffen ist, fordere den Nutzer auf, danach oder direkt `/update-feature-plan [Plan-Pfad]` auszuführen.
- Fahre erst mit `/execute [neuer Plan-Pfad]` fort, wenn die neue Plan-Version bestätigt und committed wurde.

Kleine, offensichtlich nötige Abweichungen ohne fachliche Tragweite (z. B. ein zusätzlicher Import, eine im Plan vergessene Typanpassung) darfst du direkt umsetzen – dokumentiere sie als Abweichung im Plan beim betroffenen Task.

## Prisma-Regel

Bei Änderungen an `prisma/schema.prisma`:

- Nur ausführen, wenn der Plan die Schema-Änderung ausdrücklich vorsieht; sonst `needs_human`.
- Dokumentiere genau, was am Schema geändert wurde.
- Wende die Änderung mit `npx prisma db push && npx prisma generate` an (siehe `docs/setup-and-testing_docs/SCHEMA_WORKFLOW.md`).
- **NIE `npm run db:reset` oder `prisma db push --force-reset` ausführen oder empfehlen – die Datenbank enthält Produktivdaten.**
- Keine Prisma Migrations verwenden. Für Datenmigrationen ein Script unter `scripts/` nach bestehendem Muster (`docs/coding-guidelines/07-migration-scripts.md`) erstellen.
- Setze betroffene Tasks erst auf `done`, wenn die DB-Validierung dokumentiert ist.

## Abschluss

Wenn alle Tasks `done` sind:

- Root-`TASKS.md` auf Status `done` für dieses Feature aktualisieren.
- Zusammenfassung aller abgeschlossenen Tasks ausgeben.
- Dateien mit Änderungen auflisten.
- Validierungsergebnisse zusammenfassen (Befehle und Resultate).
- Konsolidierte manuelle Prüfanleitung ausgeben: was in der laufenden App (`npm run dev`) konkret zu prüfen ist, in sinnvoller Reihenfolge.
- Offene Risiken und dokumentierte Abweichungen nennen.
- Auf `/document docs/project/features/[feature-name]/plan-vNNN.md` als nächsten Workflow hinweisen.

## Unerwartete Issues

- Dokumentiere Issues, die nicht im Plan vorgesehen waren.
- Begründe jede notwendige Abweichung vom Plan.
- Führe keine nicht genehmigten fachlichen Scope-Änderungen durch.
- Halte bestehende Funktionalität regressionsfrei; wenn ein Restrisiko bleibt, dokumentiere es im Abschlussbericht.
