# User Guide: env-lazy-und-docker-secrets

## Überblick

Dieses Feature sorgt dafür, dass Secrets (wie API-Schlüssel und Datenbank-URLs) nicht mehr während des Docker-Builds in die Image-Layer eingebrannt werden. Zudem laufen Next.js-Builds und Tests ohne lokale Konfigurationen (`.env`). Der Server bricht den Start bei fehlenden Pflicht-Umgebungsvariablen zur Laufzeit kontrolliert ab.

## Rollen

| Rolle | Kann dieses Feature nutzen? | Rechte / Einschränkungen |
|---|---|---|
| Administrator / Operator | Ja | Verwaltet die Bereitstellung des Docker-Containers und die Zuweisung von Laufzeit-Umgebungsvariablen. |
| Endnutzer | Nein | Rein technisches Feature ohne Auswirkung auf die Tagebuch-Bedienung. |

## Voraussetzungen

- Zugriff auf das Deployment-System (Docker Compose, Portainer, o.ä.).
- Konfigurierte Umgebungsvariablen zur **Laufzeit**.

## Schritt-für-Schritt

Da es sich um ein rein infrastrukturelles Feature handelt, gibt es keine Benutzeroberfläche.
So prüfen Sie das veränderte Verhalten bei der Bereitstellung:
1. Erstellen Sie das Docker-Image ohne Angabe von Secret-Build-Args (`docker build -t compact-diary .`).
2. Starten Sie das Image. Wenn die Umgebungsvariablen zur Laufzeit fehlen, bricht die App mit einer detaillierten Fehlermeldung ab.
3. Stellen Sie die Variablen zur Laufzeit über das Compose-File bereit. Der Container startet erfolgreich.

## Typische Fälle

- **Pflicht-Variable fehlt zur Laufzeit:** Der Container bricht beim Start ab und loggt eine Liste der fehlenden Schlüssel in der Konsole.
- **Optionaler Mapbox-Token fehlt:** Der Container startet erfolgreich. Kartenbezogene Fehler werden erst bei deren Aufruf zur Laufzeit abgefangen.

## Hinweise für die Demo

- Zeigen Sie das Fehlschlagen des Server-Starts bei entfernter `.env`-Datei durch `npm run dev`.
- Demonstrieren Sie, dass nach dem Anlegen einer korrekten `.env`-Datei die `/instrumentation` kompiliert wird und der Start gelingt.

## Bekannte Einschränkungen

- Keine bekannt.
