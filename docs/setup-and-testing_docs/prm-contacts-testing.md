# PRM & Kontakte - Testdokumentation

Dieses Dokument beschreibt die manuellen Testfälle für das PRM-Modul mit Google Contacts Synchronisation.

*Erstellt: Dezember 2024*

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Google OAuth Flow](#2-google-oauth-flow)
3. [Kontakt-Synchronisation](#3-kontakt-synchronisation)
4. [Kontakt CRUD](#4-kontakt-crud)
5. [Beziehungen](#5-beziehungen)
6. [Interaktionen](#6-interaktionen)
7. [Tasks](#7-tasks)
8. [Journal-Erwähnungen](#8-journal-erwähnungen)
9. [Benachrichtigungen](#9-benachrichtigungen)
10. [Social Network Graph](#10-social-network-graph)
11. [Edge Cases](#11-edge-cases)
12. [Performance](#12-performance)

---

## 1. Voraussetzungen

### 1.1 Google Cloud Console

- [ ] Google Cloud Projekt existiert
- [ ] People API ist aktiviert
- [ ] OAuth 2.0 Client-ID erstellt (Web-Anwendung)
- [ ] Authorized redirect URIs konfiguriert:
  - `http://localhost:3000/api/sync/google-contacts/callback`
- [ ] OAuth Consent Screen konfiguriert
- [ ] Scope `https://www.googleapis.com/auth/contacts` hinzugefügt

### 1.2 Lokale Umgebung

- [ ] `.env` enthält:
  ```
  GOOGLE_CLIENT_ID=<your-client-id>
  GOOGLE_CLIENT_SECRET=<your-client-secret>
  GOOGLE_REDIRECT_URI=http://localhost:3000/api/sync/google-contacts/callback
  ```
- [ ] `npm run dev` läuft ohne Fehler
- [ ] Datenbank ist synchronisiert (`npm prisma db push`)
- [ ] Seed-Daten geladen (`npm prisma db seed`)

### 1.3 Google Account

- [ ] Test-Account mit mindestens 5 Kontakten in Google Contacts
- [ ] Verschiedene Kontakte vorbereiten:
  - Kontakt mit allen Feldern (Name, E-Mail privat/work, Telefon, Adresse, Firma, Geburtstag)
  - Kontakt mit minimalem Datensatz (nur Name)
  - Kontakt in einer Gruppe/Label
  - Kontakt mit Profilbild

---

## 2. Google OAuth Flow

### Test 2.1: OAuth-Verbindung herstellen

**Schritte:**
1. Navigiere zu `/prm` oder `/settings`
2. Klicke auf "Mit Google verbinden"
3. Melde dich bei Google an
4. Erteile Berechtigungen für Kontakte
5. Warte auf Redirect zurück zur App

**Erwartetes Ergebnis:**
- [ ] Redirect zur Google-Anmeldeseite erfolgt
- [ ] Nach Anmeldung Consent-Screen erscheint
- [ ] Nach Zustimmung Redirect zurück zur App
- [ ] Status zeigt "Verbunden" an
- [ ] In der DB: `SyncProvider` Eintrag mit `provider=GOOGLE_CONTACTS`
- [ ] `credentialsEncrypted` enthält verschlüsselte Tokens

### Test 2.2: Token Refresh

**Schritte:**
1. Verbindung zu Google ist aktiv
2. Warte >1 Stunde (Access Token läuft ab) ODER
3. Manuell in DB: `expires_at` auf vergangenen Zeitpunkt setzen
4. Führe Sync aus

**Erwartetes Ergebnis:**
- [ ] Sync funktioniert trotz abgelaufenem Access Token
- [ ] Neuer Access Token wird automatisch geholt
- [ ] `credentialsEncrypted` in DB aktualisiert

### Test 2.3: Verbindung trennen

**Schritte:**
1. Navigiere zu Settings oder Sync-Status
2. Klicke auf "Verbindung trennen"
3. Bestätige Dialog

**Erwartetes Ergebnis:**
- [ ] `SyncProvider` Eintrag gelöscht oder `isActive=false`
- [ ] Status zeigt "Nicht verbunden"
- [ ] Lokale Kontakte bleiben erhalten

### Test 2.4: Fehlerhafter OAuth-Flow

**Schritte:**
1. Starte OAuth-Flow
2. Bei Google: Zugriff verweigern

**Erwartetes Ergebnis:**
- [ ] App zeigt Fehlermeldung "Zugriff verweigert"
- [ ] Kein SyncProvider-Eintrag erstellt
- [ ] Benutzer kann erneut versuchen

---

## 3. Kontakt-Synchronisation

### Test 3.1: Initial Sync (leere lokale DB)

**Vorbereitung:**
- Keine lokalen Kontakte vorhanden
- 5+ Kontakte in Google Contacts

**Schritte:**
1. Verbindung zu Google herstellen
2. Klicke auf "Jetzt synchronisieren"
3. Warte auf Abschluss

**Erwartetes Ergebnis:**
- [ ] Alle Google-Kontakte werden importiert
- [ ] Felder korrekt gemappt:
  - `name` = displayName
  - `givenName`, `familyName` korrekt
  - `emailPrivate` = erste E-Mail mit type home/other
  - `emailWork` = erste E-Mail mit type work
  - `phonePrivate` = mobile/home
  - `phoneWork` = work
  - `addressHome`, `addressWork` formatiert
  - `company`, `jobTitle` vom ersten Organization
  - `birthday` korrekt konvertiert
- [ ] `googleResourceName` und `googleEtag` gesetzt
- [ ] Profilbilder heruntergeladen (MediaAsset + MediaAttachment)
- [ ] Contact Groups als Taggings mit TaxonomyKind=CONTACT_GROUP

### Test 3.2: Incremental Sync

**Vorbereitung:**
- Initial Sync durchgeführt
- `syncToken` in SyncProvider gespeichert

**Schritte:**
1. In Google Contacts: Einen Kontakt bearbeiten (z.B. Telefonnummer ändern)
2. In App: "Jetzt synchronisieren" klicken

**Erwartetes Ergebnis:**
- [ ] Nur geänderter Kontakt wird aktualisiert
- [ ] Änderung in lokaler DB sichtbar
- [ ] Nicht geänderte Kontakte unverändert
- [ ] SyncRun zeigt `itemsUpdated: 1`

### Test 3.3: Bidirektionaler Sync (App → Google)

**Schritte:**
1. Lokalen Kontakt bearbeiten (z.B. E-Mail ändern)
2. Speichern
3. "Jetzt synchronisieren"
4. In Google Contacts prüfen

**Erwartetes Ergebnis:**
- [ ] Änderung in Google Contacts sichtbar
- [ ] `googleEtag` aktualisiert

### Test 3.4: Neuen Kontakt in App erstellen

**Schritte:**
1. In App: Neuen Kontakt erstellen
2. Felder ausfüllen
3. Speichern
4. Synchronisieren

**Erwartetes Ergebnis:**
- [ ] Kontakt in Google Contacts erstellt
- [ ] `googleResourceName` in lokaler DB gesetzt
- [ ] Alle Felder korrekt übertragen

### Test 3.5: Kontakt in Google löschen

**Schritte:**
1. Kontakt in Google Contacts löschen
2. In App synchronisieren

**Erwartetes Ergebnis:**
- [ ] Kontakt bleibt in App erhalten (NICHT gelöscht)
- [ ] `googleResourceName` wird auf NULL gesetzt
- [ ] Optional: Kontakt als "nicht mehr in Google" markiert
- [ ] Notification: "Kontakt X wurde in Google gelöscht"

### Test 3.6: Konfliktauflösung

**Schritte:**
1. Kontakt in App UND in Google gleichzeitig ändern (verschiedene Felder oder gleiche)
2. Synchronisieren

**Erwartetes Ergebnis:**
- [ ] Last-Write-Wins wird angewendet
- [ ] Notification erstellt: "Sync-Konflikt bei Kontakt X"
- [ ] Benutzer kann Notification archivieren

### Test 3.7: Sync Token abgelaufen

**Vorbereitung:**
- `syncToken` manuell auf ungültigen Wert setzen ODER
- 7+ Tage warten

**Schritte:**
1. Synchronisieren

**Erwartetes Ergebnis:**
- [ ] HTTP 410 wird erkannt
- [ ] Full Sync wird automatisch durchgeführt
- [ ] Neuer `syncToken` gespeichert

### Test 3.8: Initiales Matching (bestehende Kontakte)

**Vorbereitung:**
- Lokale Kontakte vorhanden (ohne Google-Verbindung)
- Einige davon auch in Google (gleiches Name + Geburtsdatum)

**Schritte:**
1. Google-Verbindung herstellen
2. Synchronisieren

**Erwartetes Ergebnis:**
- [ ] Automatisches Matching bei eindeutiger Übereinstimmung (Name + Vorname + Geburtsdatum)
- [ ] Bei Mehrdeutigkeiten: Notification zur manuellen Zuordnung
- [ ] Nicht gematchte Google-Kontakte werden neu angelegt

---

## 4. Kontakt CRUD

### Test 4.1: Kontakt erstellen

**Schritte:**
1. Navigiere zu `/prm/new`
2. Fülle alle Felder aus:
   - Name, Vorname, Nachname
   - E-Mail privat und geschäftlich
   - Telefon privat und geschäftlich
   - Adressen
   - Firma, Position
   - Geburtstag
   - Notizen
3. Speichern

**Erwartetes Ergebnis:**
- [ ] Kontakt in DB erstellt
- [ ] `slug` automatisch generiert
- [ ] Redirect zu Kontaktdetails
- [ ] Alle Felder korrekt gespeichert

### Test 4.2: Kontakt bearbeiten

**Schritte:**
1. Kontaktdetails öffnen
2. "Bearbeiten" klicken
3. Felder ändern
4. Speichern

**Erwartetes Ergebnis:**
- [ ] Änderungen gespeichert
- [ ] `updatedAt` aktualisiert
- [ ] Redirect zu Details

### Test 4.3: Kontakt löschen

**Schritte:**
1. Kontaktdetails öffnen
2. "Löschen" klicken
3. Bestätigen

**Erwartetes Ergebnis:**
- [ ] Kontakt aus DB gelöscht (oder archiviert)
- [ ] Zugehörige Daten (Interactions, Tasks) gelöscht (Cascade)
- [ ] Redirect zur Liste

### Test 4.4: Kontaktliste filtern

**Schritte:**
1. `/prm` öffnen
2. Filter nach:
   - Favoriten
   - Labels/Gruppen
   - Archiviert

**Erwartetes Ergebnis:**
- [ ] Liste zeigt nur passende Kontakte
- [ ] Pagination funktioniert mit Filter

### Test 4.5: Kontaktsuche

**Schritte:**
1. Suchfeld nutzen
2. Nach Name, E-Mail, Firma suchen

**Erwartetes Ergebnis:**
- [ ] Ergebnisse enthalten Suchbegriff
- [ ] Suche ist case-insensitive
- [ ] Partielle Matches funktionieren

---

## 5. Beziehungen

### Test 5.1: Beziehung erstellen

**Schritte:**
1. Kontaktdetails öffnen
2. "Beziehung hinzufügen" klicken
3. Anderen Kontakt auswählen (Autocomplete)
4. Beziehungstyp wählen (z.B. "Ehepartner")
5. Speichern

**Erwartetes Ergebnis:**
- [ ] `PersonRelation` erstellt
- [ ] Beziehung in beiden Kontaktdetails sichtbar
- [ ] Korrekte Darstellung (A ist Ehepartner von B)

### Test 5.2: Beziehung löschen

**Schritte:**
1. Beziehung in Kontaktdetails finden
2. Löschen klicken

**Erwartetes Ergebnis:**
- [ ] `PersonRelation` gelöscht
- [ ] In beiden Kontaktdetails nicht mehr sichtbar

---

## 6. Interaktionen

### Test 6.1: Interaktion erstellen

**Schritte:**
1. Kontaktdetails öffnen
2. "Interaktion hinzufügen"
3. Typ wählen (Telefonat, Treffen, E-Mail, etc.)
4. Notizen eingeben
5. Datum/Zeit setzen
6. Speichern

**Erwartetes Ergebnis:**
- [ ] `Interaction` erstellt
- [ ] In Kontaktdetails sichtbar
- [ ] Optional: Mit TimeBox verknüpft

### Test 6.2: Interaktionen in Tagebuch

**Schritte:**
1. Im Tagebuch neue Interaktion erfassen
2. Kontakt auswählen

**Erwartetes Ergebnis:**
- [ ] Interaktion mit `timeBoxId` verknüpft
- [ ] In Kontaktdetails sichtbar
- [ ] Im Tagebuch sichtbar

---

## 7. Tasks

### Test 7.1: Task erstellen

**Schritte:**
1. Kontaktdetails öffnen
2. "Aufgabe hinzufügen"
3. Titel eingeben: "Anrufen wegen Projekt"
4. Fälligkeitsdatum setzen
5. Speichern

**Erwartetes Ergebnis:**
- [ ] `Task` erstellt mit `status=PENDING`
- [ ] In Kontaktdetails sichtbar
- [ ] In Kontaktliste als Indikator

### Test 7.2: Task erledigen

**Schritte:**
1. Task-Checkbox anklicken

**Erwartetes Ergebnis:**
- [ ] `status=COMPLETED`
- [ ] `completedAt` gesetzt
- [ ] Visuell als erledigt dargestellt

### Test 7.3: Task löschen

**Schritte:**
1. Task löschen

**Erwartetes Ergebnis:**
- [ ] Task aus DB gelöscht

---

## 8. Journal-Erwähnungen

### Test 8.1: Person erwähnen

**Schritte:**
1. Journal-Eintrag erstellen/bearbeiten
2. `@` tippen
3. Aus Autocomplete Kontakt wählen (z.B. `@max-mustermann`)
4. Eintrag speichern

**Erwartetes Ergebnis:**
- [ ] `Interaction` mit `kind=MENTION` erstellt
- [ ] `journalEntryId` verknüpft
- [ ] In Kontaktdetails unter "Erwähnungen" sichtbar

### Test 8.2: Erwähnungen in Kontaktdetails

**Schritte:**
1. Kontaktdetails öffnen
2. Sektion "Erwähnungen in Journal-Einträgen" prüfen

**Erwartetes Ergebnis:**
- [ ] Alle Journal-Einträge mit @-Erwähnung aufgelistet
- [ ] Klick öffnet Journal-Eintrag

---

## 9. Benachrichtigungen

### Test 9.1: Notification bei Sync-Konflikt

**Vorbereitung:**
- Konflikt provozieren (siehe Test 3.6)

**Erwartetes Ergebnis:**
- [ ] Notification erstellt mit `type=SYNC_CONFLICT`
- [ ] In NotificationBanner/Bell sichtbar
- [ ] Badge zeigt Anzahl ungelesener

### Test 9.2: Notification archivieren

**Schritte:**
1. Notification-Banner öffnen
2. "Archivieren" klicken

**Erwartetes Ergebnis:**
- [ ] `archivedAt` gesetzt
- [ ] Notification verschwindet aus Liste
- [ ] Badge-Zähler aktualisiert

### Test 9.3: Notification bei Match-Anfrage

**Vorbereitung:**
- Initiales Matching mit mehrdeutigen Kontakten

**Erwartetes Ergebnis:**
- [ ] Notification mit `type=CONTACT_MATCH_REQUIRED`
- [ ] Enthält Informationen zur Zuordnung

---

## 10. Social Network Graph

### Test 10.1: Graph anzeigen

**Schritte:**
1. Navigiere zu `/prm/network`

**Erwartetes Ergebnis:**
- [ ] Force-Graph wird gerendert
- [ ] Alle Kontakte als Nodes
- [ ] Beziehungen als Edges
- [ ] Verschiedene Linientypen für verschiedene Beziehungen

### Test 10.2: Kontakt zentrieren

**Schritte:**
1. Im Dropdown einen Kontakt auswählen
2. ODER auf Node klicken

**Erwartetes Ergebnis:**
- [ ] Ausgewählter Kontakt wird zentriert
- [ ] Verbundene Kontakte gruppieren sich um ihn
- [ ] Animation beim Zentrieren

### Test 10.3: Navigation

**Schritte:**
1. Zoom mit Mausrad
2. Pan durch Drag
3. Klick auf Node

**Erwartetes Ergebnis:**
- [ ] Zoom funktioniert
- [ ] Pan funktioniert
- [ ] Klick zeigt Kontaktdetails oder öffnet Modal

---

## 11. Edge Cases

### Test 11.1: Sehr langer Name

**Schritte:**
1. Kontakt mit 100+ Zeichen Namen erstellen

**Erwartetes Ergebnis:**
- [ ] Name wird gespeichert
- [ ] UI bricht nicht
- [ ] Truncation wo nötig

### Test 11.2: Sonderzeichen in Feldern

**Schritte:**
1. Kontakt mit Sonderzeichen: `<script>`, `"quotes"`, `'apostrophe'`, `emoji 🎉`

**Erwartetes Ergebnis:**
- [ ] Korrekt gespeichert (kein XSS)
- [ ] Korrekt angezeigt

### Test 11.3: Leere Pflichtfelder

**Schritte:**
1. Kontakt ohne Namen speichern

**Erwartetes Ergebnis:**
- [ ] Validierungsfehler
- [ ] Fehlermeldung bei Name-Feld

### Test 11.4: Doppelter Slug

**Schritte:**
1. Zwei Kontakte mit gleichem Namen erstellen

**Erwartetes Ergebnis:**
- [ ] Slug wird eindeutig gemacht (z.B. `max-mustermann-2`)

### Test 11.5: Netzwerkfehler bei Sync

**Schritte:**
1. Netzwerk deaktivieren
2. Sync starten

**Erwartetes Ergebnis:**
- [ ] Timeout-Fehler wird angezeigt
- [ ] SyncRun mit `status=FAILED`
- [ ] Möglichkeit zum Retry

### Test 11.6: Rate Limit

**Schritte:**
1. Viele schnelle Sync-Anfragen

**Erwartetes Ergebnis:**
- [ ] 429-Fehler wird abgefangen
- [ ] Benutzer wird informiert
- [ ] Retry nach Wartezeit

---

## 12. Performance

### Test 12.1: Viele Kontakte

**Vorbereitung:**
- 500+ Kontakte in Google

**Schritte:**
1. Initial Sync durchführen
2. Kontaktliste öffnen

**Erwartetes Ergebnis:**
- [ ] Sync dauert <60 Sekunden
- [ ] Liste lädt in <2 Sekunden
- [ ] Pagination funktioniert
- [ ] Virtuelles Scrolling (wenn implementiert)

### Test 12.2: Graph mit vielen Nodes

**Vorbereitung:**
- 100+ Kontakte mit Beziehungen

**Schritte:**
1. Social Network Graph öffnen

**Erwartetes Ergebnis:**
- [ ] Graph wird gerendert
- [ ] Interaktion bleibt flüssig
- [ ] Browser friert nicht ein

---

## Checkliste für Release

- [ ] Alle Tests in Abschnitt 2 (OAuth) bestanden
- [ ] Alle Tests in Abschnitt 3 (Sync) bestanden
- [ ] Alle Tests in Abschnitt 4 (CRUD) bestanden
- [ ] Alle Tests in Abschnitt 5-9 (Features) bestanden
- [ ] Alle Tests in Abschnitt 10 (Graph) bestanden
- [ ] Wichtige Edge Cases (11.1-11.6) geprüft
- [ ] Performance akzeptabel

---

*Dieses Dokument wird bei Änderungen am PRM-Modul aktualisiert.*
