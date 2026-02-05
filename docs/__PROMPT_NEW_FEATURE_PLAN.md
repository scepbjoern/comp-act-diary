Erstelle den Plan für das unten grob beschriebene Feature. Lass Dir für alles so viel Zeit, wie Du brauchst - sei also gründlich und wäge Alternativen ab, bevor Du Dich für eine als Vorschlag entscheidest.

Gehe hierzu schrittweise vor:
1. Recherche
2. Erstellung von funktionalen und nicht-funktionalen Anforderungen
3. Varianten vorschlagen und eine davon empfehlen
4. Konzept erstellen
5. Fragen überlegen an Auftraggeber
6. Zusammenfassung

# Schritte
## Recherche
1. Lese zunächst die Feature-Beschreibung und versuche diese zu füllen. Wo Unsicherheiten bestehen, triff zunächst Annahmen und merke dir die unklaren Punkte für den Schritt "Fragen überlegen an Auftraggeber".
2. Überlege Dir, welche Recherche in der bestehenden Dokumentation erforderlich ist, die Du primär in den Ordnern [coding-guidelines](coding-guidelines) und [concepts](concepts) vorhanden sind sowie in der Datei [Datenmodell-Architektur](data-model-architecture.md) und [local-rules](../.windsurf/rules/local-rules.md).
3. Überlege Dir, welche Recherche im Internet erforderlich ist, um dann den nächsten Schritt "Varianten vorschlagen und eine davon empfehlen" zu erreichen.
4. Führe die Recherche durch und sammle die Ergebnisse.

## Anforderungen
1. Leite eine nummerierte Liste von funktionalen Anforderungen ab, die sich aus der Feature-Beschreibung und der Recherche ableiten.
2. Leite eine nummerierte Liste von nicht-funktionalen Anforderungen ab, die sich aus der Feature-Beschreibung und der Recherche ableiten.
3. Wo nötig erläutere einzelne Anforderungen.

## Varianten vorschlagen und eine davon empfehlen
1. Überlege Dir aufgrund der Recherche, welche Varianten es gibt, um die identifizierten Anforderungen zu erfüllen und welche davon am besten geeignet ist.
2. Schlage eine Variante vor. Gehe dabei auf Punkte ein wie z.B. erforderliche Anpassungen an Datenmodell, APIs, UX, etc.
3. Begründe warum du diese Variante vorgeschlagen hast und die anderen nicht.

## Konzept erstellen
1. Erstelle ein duetschsprachiges Konzept in Schweizer Rechtschreibung, das auf den oben vorgeschlagenen Variante basiert.
2. Dieses Konzept lege bitte im docs-Verzeichnis ab und vergib einen passenden Titel, der besteht aus "JJJJ-MM_Featurename.md".
3. Erstelle mindestens die folgenden Kapitel:
- Inhaltsverzeichnis
- Beschreibung des geplanten Features
- Liste der Anforderungen
- Architekturübersicht als ASCII-Art
- Erläuterung der in der Architekturübersicht eingeführten Komponenten inkl. externer Anbieter, Datenbank, Backend und Frontend
- Datenmodell inkl. Aufführen, welche Entitäten betroffen sind, wo noch Anpassungen vorzunehmen sind, usw.)
- Services, Libraries und API-Routen
- UX (Komponenten und Screens)
- Allenfalls neue Dependencies in package.json
- Dateistruktur (also alle neuen oder zu verändernden Dateien inkl. kurzer Erläuterung ihrer Funktion)
- Implementierungsplan mit einer Abfolge von Schritten, deren Titel jeweils mit "Schritt X (LLM/Mensch): Y" aufgeführt ist, wobei X die Nummer des Schritts ist, LLM/Mensch zum Ausdruck bringt, wer zuständig ist (soviel wie möglich durch das LLM implementieren lassen) und Y die Bezeichnung des Schritts ist. Schreibe hier noch keinen Code, sondern schreibe konkrete Anforderungen/Ziele/Tipps pro Funktionalität, die dann bei der Implementation gebaut werden soll.
- Testdaten-Anpassungen (falls das Datenmodell geändert wird, beschreibe welche Anpassungen an `lib/services/testDataService.ts` und `prisma/seed.ts` erforderlich sind, um die neuen Felder/Entitäten in den Testdaten abzubilden)
- Automatisiertes Testing (was kann das LLM selbstständig testen)
- Manuelles Testing (was muss der Mensch wie testen)

## Fragen an den Auftraggeber
1. Überlege Dir, welche Fragen an den Auftraggeber gestellt werden müssen sei es zu den identifizierten Anforderungen oder allgemein, um das Konzept zu verfeinern oder bei Unklarheit, welche Variante zu empfehlen ist respektive um Annahmen zu validieren
2. Nummeriere und strukturiere die Fragen.
3. Stelle die Fragen an den Auftraggeber, indem Du diese am Ende des Konzepts als Kapitel "Fragen an den Auftraggeber" aufschreibst.

## Zusammenfassung
Gib im Chat eine Zusammenfassung aus zum erstellten Konzept

# Featurebeschreibung
<Featurebeschreibung>