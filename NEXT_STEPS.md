# CompACT Diary - Nächste Schritte

## Sofort erforderlich: Database Migration

Die Prisma Schema wurde aktualisiert. Führe die Migration aus:

```bash
# 1. Generiere Prisma Client neu
npx prisma generate

# 2. Erstelle und führe Migration aus
npx prisma migrate dev --name add_audio_fields_to_day_note

# 3. (Optional) Prisma Studio zum Testen
npx prisma studio
```

## App testen

```bash
# Development Server starten
npm run dev
```

### Was testen:
1. **Branding**: "CompACT Diary" wird überall angezeigt
2. **Startseite**: 
   - Slogan "Set. Track. Reflect. Act." sichtbar
   - "Tagebuch"-Sektion ist da (ehem. "Bemerkungen")
   - "Darmkur-Tagebuch" ist zuklappbar und standardmäßig geschlossen
3. **Navigation**: Links-Menü hat "Darmkur"-Untermenü mit allen Darmkur-PDFs
4. **Funktionalität**: Alle bestehenden Features funktionieren weiterhin

## Audio-Features implementieren (ToDo)

### Benötigte Komponenten:

#### 1. Uploads-Ordner anlegen
```bash
mkdir -p uploads
```

#### 2. FileUploadButton Komponente erstellen
Neue Komponente `components/AudioUploadButton.tsx`:
- Accept `.m4a`, `.mp3` files
- Upload zu API route
- Zeige Upload-Progress

#### 3. API Route für Audio-Upload
Datei: `app/api/audio-upload/route.ts` (NEU)
- Empfange Audio-Datei
- Erstelle Ordnerstruktur: `uploads/Jahrzehnt/Jahr/Monat/`
- Speichere als: `YYYY-MM-DD_GUID.m4a`
- Sende an Transkriptionsdienst
- Speichere in DB:
  ```typescript
  {
    text: transcribedText,
    audioFilePath: 'uploads/2020s/2025/11/2025-11-16_xxx.m4a',
    keepAudio: true, // aus UI Toggle
    originalTranscript: null // erst bei Zauberstab-Nutzung
  }
  ```
- Wenn `keepAudio === false`: lösche Datei nach Transkription

#### 4. Audio-Player UI
In `app/page.tsx` (Tagebuch-Sektion):
```tsx
{day?.notes && day.audioFilePath && (
  <div className="mt-2">
    <audio controls src={day.audioFilePath} className="w-full" />
  </div>
)}
```

#### 5. Zauberstab-Verbesserung anpassen
In `components/ImproveTextButton.tsx` oder `app/api/improve-text/route.ts`:
- BEVOR Text verbessert wird: Speichere aktuellen Text in `originalTranscript`
- Dann: Aktualisiere `text` mit verbessertem Text
- UI: Zeige "Original anzeigen"-Button wenn `originalTranscript` existiert

#### 6. Checkbox "Audio behalten" hinzufügen
Im Tagebuch-Bereich, bei Audio-Upload:
```tsx
<label>
  <input 
    type="checkbox" 
    checked={keepAudioState} 
    onChange={e => setKeepAudioState(e.target.checked)}
  />
  Audiodatei behalten
</label>
```

## Code-Referenzen

### Existierende relevante Dateien:
- `components/MicrophoneButton.tsx` - Recording-Logik (anpassen)
- `app/api/transcribe/route.ts` - Transkription (erweitern)
- `components/ImproveTextButton.tsx` - Zauberstab (originalTranscript speichern)

### Zu erstellende Dateien:
- `components/AudioUploadButton.tsx` (NEU)
- `app/api/audio-upload/route.ts` (NEU)
- `components/AudioPlayer.tsx` (optional, NEU)

## Hilfreiche Libraries

```bash
# Falls noch nicht installiert:
npm install uuid  # für GUID-Generierung
npm install mime-types  # für File-Type validation
```

## Environment Variables prüfen

In `.env`:
```env
# Transkriptionsdienst
TOGETHER_API_KEY=your_key_here

# Optional hinzufügen:
UPLOADS_DIR=./uploads
MAX_AUDIO_FILE_SIZE_MB=50
```

## Fragen & Offene Punkte

1. **Transkriptionsdienst**: Welcher wird genutzt? (Together AI, Whisper, etc.)
2. **Audio-Format**: .m4a als Standard OK? (effizient für Sprache)
3. **Speicher-Limits**: Maximale Dateigröße? Automatische Cleanup-Strategie?
4. **Mehrsprachigkeit**: Nur Deutsch oder auch andere Sprachen transkribieren?

## Troubleshooting

### "Module not found" Errors
```bash
npm install
npx prisma generate
```

### Database connection issues
Prüfe `DATABASE_URL` in `.env`

### TypeScript Errors
```bash
npm run build
# Behebe Typ-Fehler vor Deployment
```

---

Bei Fragen zum Code oder zur Architektur: Siehe `MIGRATION_NOTES.md` für Details zu allen Änderungen.
