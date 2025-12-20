@data-model-architecture.md
@web
Als nächstes geht es darum die...

...

Deine Aufgabe nun ist, einerseits die Recherche zu machen, in meiner Datenmodellarchitektur, in der Google People API, in Tutorials etc., um herauszufinden, was alles schon da ist, wie man es typischerweise macht und als nächstes dann zu prüfen, welche Anpassungen am Datenmodell sind vermutlich sinnvoll, dann einen Vorschlag zu machen für die API-Routen im Hintergrund, einen Vorschlag zu machen für Frontend-Erweiterungen und Anpassungen und natürlich auch für die Synchronisation.

Überlege dir dabei auch ständig, welche Fragen du an mich noch hast, die ich beantworten muss, damit du deine Überlegungen vervollständigen kannst und zu einem guten Konzept kommst. Dieses Konzept lege bitte im docs-Verzeichnis ab. Im Minimum soll das Konzept folgende Komponenten enthalten:
- Inhaltsverzeichnis
- Geplante Features
- Architekturübersicht als ASCII-Art
- Erläuterung der in der Architekturübersicht eingeführten Komponenten inkl. externer Anbieter, Datenbank, Backend und Frontend
- Datenmodell inkl. Aufführen, welche Entitäten betroffen sind, wo noch Anpassungen vorzunehmen sind, usw.)
- Services, Libraries und API-Routen
- UX (Komponenten und Screens)
- Allenfalls neue Dependencies in package.json
- Dateistruktur (also alle neuen oder zu verändernden Dateien inkl. kurzer Erläuterung ihrer Funktion)
- Implementierungsplan mit einer Abfolge von Schritten, deren Titel jeweils mit "Schritt X (LLM/Mensch): Y" aufgeführt ist, wobei X die Nummer des Schritts ist, LLM/Mensch zum Ausdruck bringt, wer zuständig ist (soviel wie möglich durch das LLM implementieren lassen) und Y die Bezeichnung des Schritts ist
- Automatisiertes Testing (was kann das LLM selbstständig testen)
- Manuelles Testing (was muss der Mensch wie testen)

Schreibe im Implementierungsplan noch keinen Code, sondern schreibe konkrete Anforderungen/Ziele/Tipps pro Funktionalität, die dann bei der Implementation gebaut werden soll.

Bevor Du anfängst, lies Dir nochmals die @local-rules.md durch. Lass Dir für alles so viel Zeit, wie Du brauchst - sei also gründlich und wäge Alternativen ab, bevor Du Dich für eine als Vorschlag entscheidest.