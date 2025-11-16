# Migration: fairment-darmkur-app → CompACT Diary

**Date:** 16.11.2024  
**Status:** Core restructuring completed

## ✅ Completed Changes

### 1. Branding & Naming
- **package.json**: Renamed from `fairment-darmkur-app` to `compact-diary`
- **README.md**: Updated with CompACT Diary branding and description
- **manifest.webmanifest**: Updated app name to "CompACT Diary" and short name to "CompACT"
- **app/layout.tsx**: 
  - Updated metadata title to "CompACT Diary"
  - Updated description to ACT-focused messaging
  - Changed visible header text to "CompACT Diary"
  - Updated GitHub link to comp-act-diary

### 2. PRD Documentation
- **docs/PRD.md**: Restructured with two main sections:
  - **CompACT Diary – Überblick**: New section describing the vision, ACT focus, and current features
  - **Historie / Vorherige Version: Fairment Darmkur-App**: Original content preserved under historic section
  - Documents the transformation from specialized Darmkur app to general ACT-inspired diary

### 3. Navigation (SiteNav)
- **components/SiteNav.tsx**: 
  - Created "Darmkur" submenu in the "Links" dropdown
  - Moved all Darmkur-specific links (Ernährungstabelle, Darmguide, etc.) into collapsible Darmkur submenu
  - Works on both desktop and mobile navigation
  - Keeps main navigation clean for future ACT features

### 4. Homepage Restructuring (app/page.tsx)
- **App Branding Header**: Added prominent "CompACT Diary" title with slogan "Set. Track. Reflect. Act." at page top
- **Tagebuch Section**: 
  - Renamed "Bemerkungen" → "Tagebuch"
  - Moved directly after calendar widget
  - Updated icon and placeholder text to reflect general journaling purpose
- **Collapsible Darmkur-Tagebuch Section**:
  - Created collapsible card wrapping all Darmkur-specific features
  - Defaults to collapsed state (`darmkurCollapsed: true`)
  - Contains:
    - Tages-Einstellungen (Phase & Kategorie)
    - Symptome (standard + custom)
    - Stuhl (Bristol scale)
    - Gewohnheiten (habits)
    - Ernährungsnotizen
  - "Tag zurücksetzen" remains outside as separate section

### 5. Database Schema (Prisma)
- **schema.prisma**: Added audio handling fields to `DayNote` model:
  - `originalTranscript String?` - Stores unimproved transcribed text
  - `audioFilePath String?` - Path to audio file in uploads folder
  - `keepAudio Boolean @default(true)` - Whether to retain audio file after transcription

## 🔄 Pending Implementation

### Audio Handling Features (Point 4 from requirements)

#### A. Uploads Folder Structure
- Create `uploads/` directory with structure: `Jahrzehnt/Jahr/Monat/`
  - Example: `uploads/2020s/2025/11/`
- Filename format: `YYYY-MM-DD_GUID.m4a`
  - Example: `2025-11-16_550e8400-e29b-41d4-a716-446655440000.m4a`
- Default audio format: `.m4a` (AAC for efficient voice recording)

#### B. Audio Upload & Transcription
**Current State:**
- `MicrophoneButton` component records audio and sends to `/api/transcribe`
- Only transcribed text is kept, audio is discarded

**Required Changes:**
1. **File Upload Component**:
   - Add file input to accept `.m4a` and `.mp3` files
   - Handle file upload alongside microphone recording
   
2. **API Route Updates** (`/api/transcribe` or new `/api/audio-upload`):
   - Save uploaded/recorded audio to structured uploads folder
   - Generate GUID for unique filename
   - Create year/month folders if they don't exist
   - Store `audioFilePath` in database
   - Implement "keep audio" option:
     - If `keepAudio === false`: delete file after successful transcription
     - If `keepAudio === true`: retain file and path in DB

3. **UI for Audio Playback**:
   - Show audio player when `audioFilePath` exists
   - Add toggle/checkbox for "Audiodatei behalten" option
   - Display audio file info (duration, file size)

#### C. "Zauberstab" (Text Improvement) with Original Preservation
**Current State:**
- `ImproveTextButton` component improves text via `/api/improve-text`
- Improved text replaces original, no preservation

**Required Changes:**
1. **When Zauberstab is used**:
   - Store current text in `originalTranscript` field before improvement
   - Update `text` field with improved version
   
2. **UI Changes**:
   - Add "Original anzeigen" / "Originaltranskript anzeigen" button/link
   - Show both improved and original text (collapsible or side-by-side)
   - Clear visual distinction between versions

#### D. Database Migration
```bash
npx prisma migrate dev --name add_audio_fields_to_day_note
npx prisma generate
```

### Additional Considerations

#### Environment Variables
Consider adding to `.env`:
```
UPLOADS_DIR=./uploads
MAX_AUDIO_FILE_SIZE_MB=50
AUDIO_RETENTION_DAYS=365
```

#### File Management
- Implement cleanup job for old audio files (if space becomes issue)
- Add file size limits and validation
- Handle upload errors gracefully

#### API Routes to Update/Create
1. `/api/transcribe` - Add audio file saving logic
2. `/api/notes/[noteId]` - Return audioFilePath in responses
3. `/api/audio/[filepath]` - Serve audio files (if not serving directly from uploads)
4. `/api/improve-text` - Save originalTranscript before improvement

## 📋 Testing Checklist

### Before Production Deployment
- [ ] Run Prisma migration: `npx prisma migrate dev`
- [ ] Test collapsible Darmkur section opens/closes correctly
- [ ] Verify Tagebuch section saves and displays text properly
- [ ] Test Darmkur submenu navigation (desktop & mobile)
- [ ] Confirm all existing Darmkur functionality still works
- [ ] Test with existing data (no data loss from restructuring)
- [ ] Verify PWA manifest updates correctly
- [ ] Check mobile responsiveness of new layout

### After Audio Features Implementation
- [ ] Test microphone recording saves audio file
- [ ] Test file upload accepts .m4a and .mp3 files
- [ ] Verify uploads folder structure is created correctly
- [ ] Test "keep audio" toggle functionality
- [ ] Confirm audio playback works
- [ ] Test Zauberstab preserves original transcript
- [ ] Verify original transcript display toggle
- [ ] Test audio file deletion when keepAudio=false
- [ ] Check file size limits and error handling

## 🎯 Future ACT Features (Not Yet Implemented)

Based on the PRD, these features should be added incrementally:
- **Werte (Values) Definition**: UI for defining personal values
- **Ziele (Goals) Setting**: Goal tracking aligned with values
- **Committed Actions**: Track actions in alignment with values
- **ACT-spezifische Übungen**: Acceptance & Commitment Therapy exercises
- **Enhanced Reflexionen**: More structured reflection prompts

## 📝 Notes

### Code Quality
- Some indentation inconsistencies remain in `app/page.tsx` from the complex restructuring
- Consider refactoring large page component into smaller sub-components
- Audio handling logic should be modular for reuse

### User Experience
- Collapsible Darmkur section defaults to closed - users familiar with old app may need guidance
- Consider adding a one-time tooltip or help text explaining the new structure
- Audio features will add significant value for on-the-go journaling

### Performance
- Audio files can grow large - monitor uploads folder size
- Consider implementing audio compression on upload
- Lazy-load audio player component for better initial page load

## 🔗 Related Files Modified

- `/package.json`
- `/README.md`
- `/docs/PRD.md`
- `/public/manifest.webmanifest`
- `/app/layout.tsx`
- `/app/page.tsx`
- `/components/SiteNav.tsx`
- `/prisma/schema.prisma`

---

**Next Steps:**
1. Run database migration
2. Implement audio upload and storage functionality
3. Update transcription API to save audio files
4. Implement Zauberstab original transcript preservation
5. Add audio playback UI
6. Test thoroughly with real usage scenarios
