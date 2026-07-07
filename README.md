# CompACT Diary

<p align="center">
  <img src="public/icons/logo_192.avif" alt="CompACT Diary Logo" width="96" height="96">
</p>

<p align="center">
  <strong>Set. Track. Reflect. Act.</strong><br>
  Mobile-first PWA für ACT-inspiriertes Tagebuch, Reflexion und persönliche Entwicklung.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#documentation">Dokumentation</a>
</p>

<p align="center">
  <a href="https://github.com/scepbjoern/comp-act-diary/actions/workflows/ci.yml"><img src="https://github.com/scepbjoern/comp-act-diary/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

---

## Features

### 📓 Tagebuch & Journal
- **Tägliche Einträge** mit Text, Symptom-Tracking und Gewohnheiten
- **Spracheingabe** mit KI-Transkription (Whisper, Deepgram, GPT-4o)
- **Fotos & Medien** direkt von Kamera oder Galerie
- **KI-Tageszusammenfassung** automatisch generiert

### 🧘 ACT & Reflexion
- **ACT Coach** – KI-gestütztes Coaching mit anpassbaren Methoden
- **Wochen- & Monatsreflexionen** für strukturierte Rückblicke
- **Werte & Ziele** – in Entwicklung

### 📊 Auswertungen
- **Wochenansicht** mit Trends und Sparklines
- **Phasenansicht** für Vergleiche über Zeit
- **Gesamtansicht** für langfristige Entwicklung
- **Export** als CSV oder PDF (mit optionalen Fotos)

### 👥 Personen & Orte
- **PRM (Personal Relationship Management)** für Kontakte
- **Orte-Verwaltung** mit Karte und Geocoding
- **Standortverfolgung** via OwnTracks/Tasker

### ✅ Aufgaben & Organisation
- **Task-Management** mit Prioritäten und Typen
- **Lesezeichen** für wichtige Links
- **Kalender-Integration** via Webhooks

### 🤖 KI-Features
- **Bildgenerierung** (DALL-E 3, Flux)
- **Texterkennung (OCR)** aus Bildern und PDFs
- **Textverbesserung** mit KI

### 🔧 Weitere Features
- **PWA** – installierbar auf allen Geräten
- **Dark/Light Mode**
- **Passcode-Schutz**
- **Integriertes Hilfe-System** unter `/help`

---

## Tech Stack

| Kategorie | Technologie |
|-----------|-------------|
| **Framework** | Next.js 15 (App Router) |
| **Frontend** | React 19, TypeScript |
| **Styling** | Tailwind CSS, daisyUI |
| **Icons** | Tabler Icons |
| **Datenbank** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js |
| **KI** | Vercel AI SDK, Together.ai, OpenAI |
| **PWA** | Service Worker, Web Manifest |
| **Testing** | Vitest |

---

## Voraussetzungen

- **Node.js** v18+
- **PostgreSQL** Datenbank
- **FFmpeg** für Audio-Chunking (lange Aufnahmen)
  ```bash
  # Windows
  winget install ffmpeg
  
  # macOS
  brew install ffmpeg
  
  # Linux
  sudo apt install ffmpeg
  ```

---

## Installation

### 1. Repository klonen
```bash
git clone https://github.com/your-username/comp-act-diary.git
cd comp-act-diary
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
```

Bearbeite `.env` und setze mindestens:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/compactdiary"
NEXTAUTH_SECRET="your-secret-key"
```

Für KI-Features (optional):
```env
OPENAI_API_KEY="sk-..."
TOGETHER_API_KEY="..."
```

### 4. Datenbank einrichten
```bash
npx prisma generate
npx prisma db push
npm run seed  # Demo-User + Standard-Gewohnheiten
```

### 5. Development Server starten
```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

---

## Usage

### Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Development Server |
| `npm run build` | Production Build |
| `npm run start` | Production Server |
| `npm run test` | Vitest Tests |
| `npm run seed` | Demo-Daten laden |
| `npm run lint` | ESLint |

### Docker

```bash
# Mit Docker Compose
docker-compose -f deploy/docker-compose.yml up -d
```

---

## Dokumentation

| Dokument | Beschreibung |
|----------|--------------|
| [Coding Guidelines](docs/coding-guidelines/00-README.md) | Entwicklungs-Standards |
| [Datenmodell](docs/data-model-architecture.md) | Prisma Schema Dokumentation |
| [Feature-Konzepte](docs/concepts/) | Geplante Features |
| [Setup & Testing](docs/setup-and-testing_docs/) | Operations-Dokumentation |

### In-App Hilfe

Das integrierte Hilfe-System ist unter `/help` erreichbar und bietet:
- Schritt-für-Schritt-Anleitungen
- Technische Dokumentation
- Suchfunktion

---

## Projektstruktur

```
comp-act-diary/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── help/              # Hilfe-System
│   └── [feature]/         # Feature-Seiten
├── components/
│   ├── features/          # Feature-spezifische Komponenten
│   ├── layout/            # Layout-Komponenten
│   └── ui/                # UI-Komponenten
├── lib/                   # Utilities & Services
├── hooks/                 # React Hooks
├── prisma/                # Datenbank-Schema
├── docs/                  # Dokumentation
└── public/                # Static Assets
```

---

## Lizenz

Dieses Projekt ist privat. Alle Rechte vorbehalten.