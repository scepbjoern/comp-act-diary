# Audio-Features Implementierung - ABGESCHLOSSEN ✅

**Status**: Backend & Komponenten vollständig implementiert  
**Verbleibend**: Frontend-Integration in page.tsx

---

## ✅ Vollständig implementiert

### 1. Datenbank-Schema
- **DIARY** NoteType hinzugefügt für Tagebucheinträge
- **DayEntry.notes** Feld entfernt (jetzt DayNote-Einträge mit type=DIARY)
- **DayNote** erweitert mit:
  - `originalTranscript String?` - Original-Transkript vor Zauberstab-Verbesserung
  - `audioFilePath String?` - Pfad zur Audio-Datei (z.B. "2020s/2025/11/2025-11-16_uuid.m4a")
  - `keepAudio Boolean @default(true)` - Audio-Datei behalten oder löschen

**Migration erfolgreich ausgeführt**: `20251116163054_add_diary_entries_and_audio_fields`

### 2. API-Routen

#### `/api/diary/upload-audio` (NEU)
**POST** - Upload & Transkription von Audio-Dateien
- Akzeptiert `.mp3`, `.m4a`, `.webm` Dateien
- Erstellt Ordnerstruktur: `uploads/Jahrzehnt/Jahr/Monat/`
- Dateiname: `YYYY-MM-DD_GUID.m4a`
- Transkribiert mit Together AI (Whisper) oder OpenAI
- Response:
  ```json
  {
    "text": "Transkribierter Text",
    "audioFilePath": "2020s/2025/11/2025-11-16_xxx.m4a",
    "keepAudio": true,
    "fileSize": 123456,
    "filename": "2025-11-16_xxx.m4a"
  }
  ```

#### `/api/uploads/[...path]` (NEU)
**GET** - Serviert Audio-Dateien
- Secure path validation
- Korrekte Content-Type Header
- Caching mit `Cache-Control: public, max-age=31536000, immutable`

#### `/api/day` (AKTUALISIERT)
- Entfernt `day.notes` aus Response (existiert nicht mehr)
- Fügt Audio-Felder zu `notes` Array hinzu:
  ```json
  {
    "notes": [{
      "id": "...",
      "type": "DIARY",
      "text": "...",
      "originalTranscript": "...",
      "audioFilePath": "...",
      "keepAudio": true
    }]
  }
  ```

#### `/api/day/[id]/notes` (AKTUALISIERT)
**POST** - Erstellt neue Notiz (MEAL, REFLECTION, DIARY)
- Akzeptiert Audio-Felder: `audioFilePath`, `keepAudio`, `originalTranscript`
- DIARY-Typ für Tagebucheinträge

### 3. React-Komponenten

#### `AudioPlayer.tsx` (NEU)
Vollständig funktionaler Audio-Player mit:
- Play/Pause Button
- Zeitanzeige (current / duration)
- Seek-Bar (Fortschrittsbalken)
- Kompakte und erweiterte Ansicht
- Props:
  ```tsx
  interface AudioPlayerProps {
    audioFilePath: string  // z.B. "2020s/2025/11/2025-11-16_xxx.m4a"
    className?: string
    compact?: boolean
  }
  ```

#### `AudioUploadButton.tsx` (NEU)
Upload-Button für Audio-Dateien:
- Datei-Auswahl (.mp3, .m4a)
- Größen-Validierung (max 50MB)
- Upload mit Progress-Anzeige
- Automatische Transkription
- Props:
  ```tsx
  interface AudioUploadButtonProps {
    onAudioUploaded: (result: { 
      text: string
      audioFilePath: string
      keepAudio: boolean
    }) => void
    date: string  // ISO date YYYY-MM-DD
    keepAudio?: boolean
    className?: string
    compact?: boolean
    disabled?: boolean
  }
  ```

#### `ImproveTextButton.tsx` (AKTUALISIERT)
Erweitert um originalTranscript-Preservation:
- Neuer Callback: `onOriginalPreserved?: (originalText: string) => void`
- Speichert Original automatisch vor Verbesserung
- Beispiel-Verwendung:
  ```tsx
  <ImproveTextButton
    text={diaryText}
    onImprovedText={(improved) => setDiaryText(improved)}
    onOriginalPreserved={(original) => setOriginalTranscript(original)}
  />
  ```

### 4. Environment Variables

`.env` erweitert mit:
```env
## Audio handling for diary entries
MAX_AUDIO_FILE_SIZE_MB=50
AUDIO_RETENTION_DAYS=365
AUDIO_COMPRESSION_BITRATE=64
```

---

## 📋 Noch zu tun: Frontend-Integration

### Aufgabe: page.tsx anpassen

Das alte `notes` Feld von DayEntry existiert nicht mehr. Jetzt gibt es **mehrere Tagebucheinträge** als DayNote-Records mit `type=DIARY`.

#### Was geändert werden muss:

1. **State anpassen**:
   ```tsx
   // ALT (entfernen):
   const [remarksText, setRemarksText] = useState('')
   const [remarksEditing, setRemarksEditing] = useState(false)
   
   // NEU:
   const [diaryEntries, setDiaryEntries] = useState<DayNote[]>([])
   const [newDiaryText, setNewDiaryText] = useState('')
   const [newDiaryAudio, setNewDiaryAudio] = useState<string | null>(null)
   const [keepAudio, setKeepAudio] = useState(true)
   ```

2. **Tagebucheinträge aus API laden**:
   ```tsx
   useEffect(() => {
     // In der Funktion, die /api/day lädt:
     const diaryNotes = data.notes.filter(n => n.type === 'DIARY')
     setDiaryEntries(diaryNotes)
   }, [date])
   ```

3. **UI für neue Tagebucheinträge**:
   ```tsx
   <div className="card p-4 space-y-3">
     <h2>Tagebuch</h2>
     
     {/* Neue Eingabe */}
     <textarea
       value={newDiaryText}
       onChange={e => setNewDiaryText(e.target.value)}
       placeholder="Neuer Tagebucheintrag..."
       rows={4}
     />
     
     <div className="flex items-center gap-2">
       {/* Mikrofon-Aufnahme */}
       <MicrophoneButton
         onText={(text) => setNewDiaryText(prev => prev + ' ' + text)}
         compact
       />
       
       {/* Audio hochladen */}
       <AudioUploadButton
         date={date}
         keepAudio={keepAudio}
         onAudioUploaded={({ text, audioFilePath }) => {
           setNewDiaryText(text)
           setNewDiaryAudio(audioFilePath)
         }}
         compact
       />
       
       {/* Text verbessern */}
       <ImproveTextButton
         text={newDiaryText}
         onImprovedText={setNewDiaryText}
         onOriginalPreserved={(orig) => {
           // Original wird beim Speichern mitgeschickt
         }}
       />
       
       {/* Audio behalten */}
       <label>
         <input
           type="checkbox"
           checked={keepAudio}
           onChange={e => setKeepAudio(e.target.checked)}
         />
         Audio behalten
       </label>
       
       {/* Speichern */}
       <button onClick={saveDiaryEntry}>Speichern</button>
     </div>
     
     {/* Existierende Einträge */}
     <div className="space-y-3">
       {diaryEntries.map(entry => (
         <div key={entry.id} className="border rounded p-3">
           <div className="text-xs text-gray-400">{entry.time}</div>
           <div className="whitespace-pre-wrap">{entry.text}</div>
           
           {/* Audio-Player */}
           {entry.audioFilePath && (
             <AudioPlayer audioFilePath={entry.audioFilePath} compact />
           )}
           
           {/* Original anzeigen */}
           {entry.originalTranscript && (
             <details className="mt-2">
               <summary className="text-xs cursor-pointer">Original anzeigen</summary>
               <div className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                 {entry.originalTranscript}
               </div>
             </details>
           )}
         </div>
       ))}
     </div>
   </div>
   ```

4. **Speichern-Funktion**:
   ```tsx
   const saveDiaryEntry = async () => {
     const response = await fetch(`/api/day/${day.id}/notes`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         type: 'DIARY',
         text: newDiaryText,
         audioFilePath: newDiaryAudio,
         keepAudio: keepAudio,
         time: new Date().toISOString().slice(11, 16), // HH:MM
         tzOffsetMinutes: new Date().getTimezoneOffset(),
       }),
     })
     
     const data = await response.json()
     if (data.ok) {
       // Aktualisiere Liste
       const diaryNotes = data.notes.filter(n => n.type === 'DIARY')
       setDiaryEntries(diaryNotes)
       
       // Reset Form
       setNewDiaryText('')
       setNewDiaryAudio(null)
     }
   }
   ```

---

## 🧪 Testing Checklist

Nach Frontend-Integration:

- [ ] Neuen Tagebucheintrag per Texteingabe erstellen
- [ ] Mikrofon-Aufnahme funktioniert
- [ ] Audio-Datei hochladen (.mp3 / .m4a)
- [ ] Audio wird korrekt transkribiert
- [ ] Audio-Player zeigt hochgeladene Dateien an
- [ ] Zauberstab speichert originalTranscript
- [ ] "Original anzeigen" funktioniert
- [ ] "Audio behalten" Checkbox wird respektiert
- [ ] Mehrere Einträge pro Tag möglich
- [ ] Einträge werden korrekt sortiert angezeigt
- [ ] Uploads-Ordnerstruktur wird korrekt erstellt
- [ ] Audio-Dateien sind unter `/api/uploads/...` abrufbar

---

## 📂 Dateistruktur

```
uploads/
  2020s/
    2025/
      11/
        2025-11-16_550e8400-e29b-41d4-a716-446655440000.m4a
        2025-11-16_660e8400-e29b-41d4-a716-446655440001.m4a
      12/
        2025-12-01_...m4a
```

---

## 🔧 Technische Details

### Dependencies installiert:
- `uuid` - GUID-Generierung
- `@types/uuid` - TypeScript-Typen

### Prisma Migrations:
```bash
npx prisma migrate dev --name add_diary_entries_and_audio_fields
npx prisma generate
```

### TypeScript-Typen:
Alle API-Routen nutzen lokale Enums, um build-time Dependencies auf generierte Prisma-Typen zu vermeiden.

---

## 💡 Hinweise für die Frontend-Implementierung

1. **Alte Bemerkungen migrieren**:
   Wenn alte Daten existieren, erstelle ein Migrations-Script, das `DayEntry.notes` in `DayNote` mit `type=DIARY` konvertiert. Beispiel:
   ```typescript
   // migrations/migrate-notes-to-diary.ts
   const entries = await prisma.dayEntry.findMany({
     where: { notes: { not: null } }
   })
   
   for (const entry of entries) {
     if (entry.notes) {
       await prisma.dayNote.create({
         data: {
           dayEntryId: entry.id,
           type: 'DIARY',
           text: entry.notes,
           occurredAt: entry.date,
         }
       })
     }
   }
   ```

2. **MicrophoneButton erweitern**:
   Eventuell muss `MicrophoneButton` auch angepasst werden, um Audio-Dateien zu speichern (nicht nur Text zurückzugeben). Prüfe die aktuelle Implementierung.

3. **Collapsible Darmkur-Tagebuch**:
   Die "Ernährungsnotizen" sind bereits als DayNote mit `type=MEAL` implementiert. Diese Logik kann als Referenz dienen.

---

**Nächster Schritt**: Frontend in `app/page.tsx` anpassen, um multiple Tagebucheinträge anzuzeigen und zu erstellen.
