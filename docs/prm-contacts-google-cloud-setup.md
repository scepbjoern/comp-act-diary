# PRM Google Contacts – Google Cloud Console Setup (Schritt 4)

Dieses Dokument beschreibt Schritt für Schritt, wie du in der Google Cloud Console alles einrichtest, damit der PRM-Teil der App via OAuth 2.0 auf **Google Contacts** (Google People API) zugreifen kann.

**Ziel:** Du erhältst am Ende `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET`, trägst diese in deine lokale `.env` ein und hast die korrekten Redirect URIs / Scopes konfiguriert.

---

## 0. Voraussetzungen

- Du bist in der Google Cloud Console eingeloggt: https://console.cloud.google.com/
- Du kennst deine Redirect URI(s):
  - Development: `http://localhost:3000/api/sync/google-contacts/callback`
  - Production (später): `https://your-domain.com/api/sync/google-contacts/callback`

---

## 1. Google Cloud Projekt erstellen oder auswählen

1. Öffne die Google Cloud Console: https://console.cloud.google.com/
2. Wähle oben in der Projekt-Auswahl ein bestehendes Projekt aus **oder** erstelle ein neues:
   - **New Project**
   - Name z.B. `comp-act-diary-prm`
   - **Create**
3. Stelle sicher, dass du im richtigen Projekt bist (oben links sichtbar).

---

## 2. People API aktivieren

1. Öffne die API Library: https://console.developers.google.com/apis/library
2. Suche nach **"People API"**
3. Öffne **Google People API**
4. Klicke **Enable**

**Typischer Fehler:** Wenn später "API not enabled" kommt, war oft das falsche Projekt aktiv.

---

## 3. OAuth Consent Screen konfigurieren (Google Auth platform)

Google hat die Oberfläche umgestellt – die relevanten Bereiche heissen jetzt typischerweise **Branding**, **Audience** und **Data Access**.

### 3.1 Branding / App Information

1. Öffne **Branding**:
   - https://console.cloud.google.com/auth/branding
2. Falls du "Google Auth platform not configured yet" siehst:
   - Klicke **Get Started**
3. Unter **App Information**:
   - **App name**: z.B. `Comp-Act Diary (PRM)`
   - **User support email**: deine E-Mail-Adresse
4. **Next**

### 3.2 Audience (User Type)

1. Unter **Audience**:
   - Für private Tests meistens **External**
2. **Next**

### 3.3 Contact Information + Finish

1. **Contact Information**:
   - Trage eine E-Mail-Adresse ein, um Benachrichtigungen zu erhalten
2. **Next**
3. Unter **Finish**:
   - User Data Policy akzeptieren
   - **Continue**

### 3.4 Test Users (wichtig bei "External")

Wenn du **External** gewählt hast, musst du für den Testbetrieb Test-User hinzufügen:

1. Öffne **Audience**:
   - https://console.cloud.google.com/auth/audience
2. Unter **Test users** → **Add users**
3. Trage deine Google-Mailadresse ein (und ggf. weitere Tester)
4. **Save**

**Ohne Test Users** blockiert Google den Zugriff oft oder zeigt sehr restriktive Warnseiten.

---

## 4. Scopes konfigurieren (Contacts)

1. Öffne **Data Access (Scopes)**:
   - https://console.cloud.google.com/auth/scopes
2. Klicke **Add or Remove Scopes**
3. Füge den Scope hinzu:
   - `https://www.googleapis.com/auth/contacts`
4. **Save**

Hinweis: Dieser Scope wird oft als "sensitive" klassifiziert. Für Tests im Test-Mode reicht das in der Regel, solange du nur Test Users verwendest.

---

## 5. OAuth Client erstellen (Credentials)

1. Öffne die Clients-Seite:
   - https://console.developers.google.com/auth/clients
2. Klicke **Create Client**
3. Wähle **Web application**
4. Vergib einen Namen, z.B. `comp-act-diary-local`

### 5.1 Authorized redirect URIs

Füge **exakt** folgende URI hinzu (muss 1:1 übereinstimmen):

- `http://localhost:3000/api/sync/google-contacts/callback`

Optional für später:

- `https://your-domain.com/api/sync/google-contacts/callback`

5. **Create**

Danach siehst du:

- **Client ID**
- **Client secret**

Kopiere beides (das Secret wird je nach UI/Policy nicht immer beliebig oft angezeigt).

---

## 6. Lokale `.env` befüllen

In deiner lokalen `.env` (Root) setzt du:

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/sync/google-contacts/callback
```

Wichtig:

- Keine Secrets committen.
- `GOOGLE_REDIRECT_URI` muss identisch sein zur Redirect URI aus der Cloud Console.

---

## 7. Typische Stolpersteine / Troubleshooting

### 7.1 `redirect_uri_mismatch`

- Ursache: Redirect URI stimmt nicht exakt (Schema `http` vs `https`, Port, Pfad, Slash am Ende).
- Fix: In Google Cloud Console exakt dieselbe URI eintragen, die deine App verwendet.

### 7.2 Kein Refresh Token

Für Sync braucht man i.d.R. **offline access**. In OAuth ist das der Parameter:

- `access_type=offline`

In der Praxis kann es sein, dass Google den Refresh Token nicht erneut ausgibt, wenn der User schon mal zugestimmt hat.

- Typischer Workaround: zusätzlich einmalig `prompt=consent` verwenden.
- Alternative: Zugriff der App unter https://myaccount.google.com/permissions entfernen und erneut autorisieren.

### 7.3 "App not verified"

- Für Test Mode normal.
- Du kannst in der Warnseite via "Advanced" fortfahren (sofern du als Test User eingetragen bist).

---

## Referenzen

- OAuth 2.0 Web Server Flow (Google):
  - https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth Consent Screen Konfiguration:
  - https://developers.google.com/workspace/guides/configure-oauth-consent
