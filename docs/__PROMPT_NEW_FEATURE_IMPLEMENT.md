Implementiere das Feature, das im Konzept <document> beschrieben ist. Lass Dir für alles so viel Zeit, wie Du brauchst - sei also gründlich.

Gehe hierzu schrittweise vor:
1. Konzept lesen
2. Local-Rules und Coding-Guidelines lesen
3. Implementierungsplan abarbeiten
4. npm run build und npm run dev und npm run test
5. Dokumentation anpassen
6. Zusammenfassung

# Schritte
## Konzept lesen
1. Lese das Konzept gründlich, um zu verstehen, was wie implementiert werden soll.

## Local-Rules und Coding-Guidelines lesen
1. Lese [local rules](../.windsurf/rules/local-rules.md) und die dort verlinkten Dokumente im Ordner [coding-guidelines](coding-guidelines) gründlich, um zu verstehen, welche Regeln und Guidelines gelten.

## Implementierungsplan abarbeiten
1. Lese das Kapitel Implementierungsplan des Konzepts gründlich, um zu verstehen, welche Schritte und Ziele definiert sind.
2. Implementiere die Schritte in der Reihenfolge, in der sie definiert sind.
3. Sollte ein Schritt durch einen Menschen zu erledigen sein, höre vor diesem Schritt auf, bis der Benutzer in einem nächsten Prompt dazu auffordert, die verbleibenden Schritte auszuführen.
4. Das ist aber der einzige Grund, wieso Du aufhören solltest, zu implementieren. Höre NIE auf, nur weil Du denkst, es sei zu viel auf einmal.

## npm run build und npm run dev und npm run test
1. Führe immer wieder mal, spätestens aber nach Abarbeiten Deiner Implementation `npm run build` aus, um das Projekt zu bauen, bis weder Fehler noch Warnungen mehr auftreten.
2. Führe dann npm run lint aus und behebe allfällige Linting Errors UND Warnings. Erst wenn alle behoben sind, bin ich zufrieden.
3. Führe `npm run dev` aus, um das Projekt im Entwicklungsmodus zu starten, bis weder Fehler noch Warnungen mehr auftreten.
4. Führe `npm run test -- --run` und `npx vitest --run --reporter=verbose 2>&1 | Out-String -Width 1000` aus, um die Tests auszuführen, bis weder Fehler noch Warnungen mehr auftreten.
5. Schliesse die Implementation nicht ab, solange es noch Build- oder Testfehler gibt.

## Dokumentation anpassen
1. Falls sich etwas gegenüber dem Konzept geändert hat, aktualisiere das Konzept.
2. Falls Du bei der Implementation das [Datenbankschema](../prisma/schema.prisma) verändert hast, aktualisiere die [Data Model Architecture-Dokumentation](data-model-architecture.md).
3. **Hilfe-System aktualisieren:**
   - Füge ein neues Topic in [helpStructure.ts](../lib/help/helpStructure.ts) hinzu (falls eine neue Funktion)
   - Erstelle Content in der passenden Kategorie-Datei unter [lib/help/content/](../lib/help/content/)
   - Füge einen kontextuellen Help-Link zur Feature-Seite hinzu (TablerIcon `help`)
   - Siehe [Dokumentations-Guidelines](coding-guidelines/09-documentation.md) für Details

## Zusammenfassung
1. Sobald alles erfolgreich getestet und ausgeführt wurde, kannst Du als letztes eine Zusammenfassung des gesamten Implementierungsplans erstellen.
2. Schreibe dabei auch explizit, was der Benutzer nun zu erledigen hat, z.B. manuelle Tests.