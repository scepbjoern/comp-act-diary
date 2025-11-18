# 🐳 Docker Build Guide - Mit Umgebungsvariablen

## Problem gelöst: Build Args für Next.js

**Problem:** Next.js benötigt während des Builds Zugriff auf Umgebungsvariablen (z.B. OPENAI_API_KEY) um API Routes zu validieren.

**Lösung:** Die Dockerfile wurde angepasst um Build Args zu akzeptieren, die aus Ihrer `.env` Datei gelesen werden.

---

## ✅ Ihre .env Datei

**Behalten Sie Ihre `.env` Datei genau so wie sie ist!**

```
# Ihre .env bleibt unverändert:
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
TOGETHERAI_API_KEY="..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
# ... etc
```

**Wichtig:** Die `.env` Datei ist bereits in `.dockerignore` ausgeschlossen und wird NICHT ins Docker Image kopiert (Sicherheit!).

---

## 🚀 Docker Build Ausführen

### **Option 1: Mit Helper-Script (Empfohlen)**

```powershell
# Einfach das Script ausführen:
.\docker-build.ps1
```

Das Script:
- ✅ Liest automatisch Ihre `.env` Datei
- ✅ Übergibt alle Variablen als Build Args
- ✅ Baut das Docker Image
- ✅ Zeigt Image-Info nach erfolgreichem Build

---

### **Option 2: Manuell mit --env-file**

Leider unterstützt `docker build` NICHT direkt `--env-file`, daher müssen Sie entweder:

**A) Alle Args manuell übergeben:**

```powershell
docker build -t comp-act-diary:latest `
  --build-arg OPENAI_API_KEY="sk-..." `
  --build-arg TOGETHERAI_API_KEY="..." `
  --build-arg DATABASE_URL="postgresql://..." `
  --build-arg NEXTAUTH_URL="http://localhost:3000" `
  --build-arg NEXTAUTH_SECRET="..." `
  .
```

**B) Oder das Helper-Script nutzen (siehe Option 1)**

---

### **Option 3: Mit docker-compose (für PortTainer)**

Erstellen Sie `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - OPENAI_API_KEY=${OPENAI_API_KEY}
        - TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY}
        - DATABASE_URL=${DATABASE_URL}
        - NEXTAUTH_URL=${NEXTAUTH_URL}
        - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./uploads:/app/uploads
```

Dann:

```powershell
# Build & Start
docker-compose up --build
```

---

## 🔒 Sicherheit

### **Build Args vs Runtime Environment:**

**Build Args (während Docker Build):**
- Werden NUR während des Builds benötigt
- Ermöglichen Next.js Build mit API Validierung
- Werden NICHT im finalen Image gespeichert

**Runtime Environment (wenn Container läuft):**
- Werden über `--env-file` oder `environment:` übergeben
- Sind die tatsächlichen Secrets für die laufende App
- Können unterschiedlich sein (z.B. lokale vs. Production Keys)

### **Best Practice:**

```powershell
# Build mit .env (Development Keys ok)
.\docker-build.ps1

# Run mit Production .env
docker run -p 3000:3000 --env-file .env.production comp-act-diary:latest
```

---

## 📝 Für PortTainer Deployment

### **Wichtig:** PortTainer braucht die Environment Variables!

**Option A: In PortTainer Stack definieren**

```yaml
# docker-compose.yml in PortTainer
version: '3.8'
services:
  app:
    image: your-registry/comp-act-diary:latest
    environment:
      # Hier die Production Secrets eintragen:
      - DATABASE_URL=postgresql://prod-db/...
      - OPENAI_API_KEY=sk-prod-key...
      - TOGETHERAI_API_KEY=prod-key...
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=prod-secret...
```

**Option B: PortTainer Environment Variables**

1. Stack → Edit Stack
2. Scroll to "Environment Variables" section
3. Füge jede Variable einzeln hinzu:
   - Name: `DATABASE_URL`
   - Value: `postgresql://...`
   - etc.

---

## 🧪 Testing

### **1. Lokaler Build Test:**

```powershell
# Build
.\docker-build.ps1

# Check Image Size (sollte ~350-400 MB sein)
docker images comp-act-diary:latest

# Test Run
docker run -p 3000:3000 --env-file .env comp-act-diary:latest

# Browser: http://localhost:3000
```

### **2. Validierung:**

Checken Sie:
- ✅ Container startet ohne Fehler
- ✅ App läuft unter http://localhost:3000
- ✅ Login funktioniert (Database Connection ok)
- ✅ OpenAI Features funktionieren (API Key ok)
- ✅ Keine "Missing credentials" Errors

---

## ⚠️ Troubleshooting

### **Problem: "Missing credentials" während Build**

**Ursache:** Build Args nicht übergeben oder .env nicht gefunden

**Lösung:**
```powershell
# 1. Prüfe ob .env existiert
Test-Path .env  # Muss True sein

# 2. Nutze docker-build.ps1 Script
.\docker-build.ps1

# 3. Falls Manual: Alle Args einzeln übergeben
docker build --build-arg OPENAI_API_KEY="sk-..." ...
```

---

### **Problem: "Missing credentials" während Runtime**

**Ursache:** Container läuft ohne Environment Variables

**Lösung:**
```powershell
# FALSCH:
docker run -p 3000:3000 comp-act-diary:latest

# RICHTIG:
docker run -p 3000:3000 --env-file .env comp-act-diary:latest
```

---

### **Problem: Build erfolgreich, aber App startet nicht**

**Check 1: Logs ansehen**
```powershell
docker logs <container_id>
```

**Check 2: Environment Variables im Container**
```powershell
docker exec <container_id> env | grep OPENAI
```

**Check 3: Database Connection**
```powershell
# Ist DATABASE_URL korrekt gesetzt?
# Kann Container die DB erreichen?
```

---

## 📊 Erwartete Build-Zeit

Mit den neuen Build Args:

| Phase | Zeit | Notizen |
|-------|------|---------|
| **deps stage** | ~2-3 Min | Cached bei zweitem Build |
| **build stage** | ~15-20s | Next.js Build |
| **runtime stage** | ~10-15s | Kopieren & Setup |
| **TOTAL (erst)** | ~3-4 Min | Mit Dependencies |
| **TOTAL (cached)** | ~30-45s | Nur Build-Stage ⚡ |

---

## 🎯 Nächste Schritte

1. ✅ **Testen Sie lokalen Build:**
   ```powershell
   .\docker-build.ps1
   ```

2. ✅ **Validieren Sie die App:**
   ```powershell
   docker run -p 3000:3000 --env-file .env comp-act-diary:latest
   ```

3. ✅ **Bei Erfolg: Git Commit & Push:**
   ```powershell
   git add .
   git commit -m "fix: Add build args for Next.js environment variables"
   git push
   ```

4. ✅ **PortTainer Deployment:**
   - Environment Variables in Stack definieren
   - Pull and Redeploy

---

## 📚 Zusammenfassung

**Was geändert wurde:**
- ✅ Dockerfile: Build Args für Umgebungsvariablen
- ✅ docker-build.ps1: Helper-Script für einfachen Build
- ✅ Build funktioniert jetzt mit .env Datei

**Ihre .env Datei:**
- ✅ Bleibt unverändert
- ✅ Wird automatisch vom Script gelesen
- ✅ Wird NICHT ins Docker Image kopiert (Sicherheit!)

**Build Process:**
```
.env → docker-build.ps1 → --build-arg's → Dockerfile → Next.js Build ✅
```

**Runtime Process:**
```
.env → --env-file → Docker Container → Running App ✅
```

---

Jetzt können Sie `.\docker-build.ps1` ausführen! 🚀
