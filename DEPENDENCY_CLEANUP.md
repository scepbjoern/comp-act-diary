# Dependency Cleanup Plan

## Phase 8: Dependencies Audit & Cleanup

### ✅ Identifizierte ungenutzte Dependencies:

1. **`marked` (15.0.4)** - ~100 KB
   - Status: ❌ NICHT VERWENDET
   - Grund: Sie nutzen bereits `remark-parse` + `remark-rehype` + `rehype-stringify`
   - Aktion: Kann sicher entfernt werden
   - Command: `npm uninstall marked`

2. **`mastra` (0.18.1)** - ~15 MB (!)
   - Status: ❌ NICHT VERWENDET
   - Grund: Großes AI/ML Framework, keine Imports im Code gefunden
   - Aktion: Kann sicher entfernt werden
   - Impact: **MASSIVE Build-Zeit Reduktion**
   - Command: `npm uninstall mastra`

3. **`autoprefixer` (10.4.19)** - ~300 KB
   - Status: ⚠️ PRÜFEN
   - Grund: TailwindCSS hat eingebautes Autoprefixing (seit v3.0)
   - Aktion: Prüfen ob noch in `postcss.config.js` verwendet
   - Command: Falls nicht genutzt → `npm uninstall autoprefixer`

### 📊 Erwartete Verbesserungen:

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| **Dependencies** | 62 | ~59-60 | -3 bis -4 |
| **node_modules Size** | ~800 MB | ~780 MB | **-20 MB** |
| **npm install Zeit** | ~3-5 Min | ~2-4 Min | **-20-30%** |
| **Docker Build Zeit** | ~8-12 Min | ~6-9 Min | **-25-35%** |

### 🔧 Ausführungsschritte:

```bash
# 1. Backup package.json
cp package.json package.json.backup

# 2. Entferne ungenutzte Dependencies
npm uninstall marked mastra

# 3. Teste Build
npm run build

# 4. Falls erfolgreich, prüfe autoprefixer
# Checke ob autoprefixer in postcss.config.js verwendet wird
# Falls nein:
npm uninstall autoprefixer

# 5. Final Build Test
npm run build
npm run dev
```

### ⚠️ Risiko-Assessment:

- **marked**: ✅ SICHER (wird nicht verwendet)
- **mastra**: ✅ SICHER (wird nicht verwendet)
- **autoprefixer**: ⚠️ VORSICHT (Tailwind könnte es benötigen)

### 🎯 Nächste Optimierungen (Optional):

4. **Prüfe `@mdxeditor/editor` Plugins**
   - Werden alle Plugins genutzt?
   - Alternative: Nur benötigte Plugins importieren

5. **Prüfe `recharts` Nutzung**
   - ~500 KB Library
   - Falls nur für kleine Charts: Alternativen wie `chart.js` (~150 KB)

6. **Prüfe `date-fns` vs native Date**
   - Werden alle date-fns Funktionen genutzt?
   - Tree-shaking aktiviert?

---

## Phase 9: Docker Build Optimization (NACH Cleanup)

### Option A: Layer Caching verbessern

```dockerfile
# VORHER (current):
COPY . .
RUN npm ci

# NACHHER (optimiert):
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
```

### Option B: Multi-Stage Build mit Cache

```dockerfile
# Build Stage mit Cache
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Runtime Stage (kleiner)
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
CMD ["npm", "start"]
```

Erwartete Verbesserung: **-40-50% Docker Image Size**

---

## Phase 10: Next.js Build Optimization

```javascript
// next.config.js Optimierungen
module.exports = {
  compiler: {
    // Remove console in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Production optimizations
  swcMinify: true,
  reactStrictMode: true,
  // Reduce server trace size
  output: 'standalone',
}
```

Erwartete Verbesserung: **-10-15% Build Zeit**

---

## Zusammenfassung:

### Geschätzte Gesamtverbesserung:

- **Build-Zeit:** -30-40% (von ~8-12 Min auf ~5-7 Min)
- **Image Size:** -40-50% (von ~1.2 GB auf ~600-700 MB)
- **Deploy-Zeit:** -35-45% (schnellerer Pull/Push)
- **Memory Usage:** -15-20% (weniger Dependencies)

### Empfohlene Reihenfolge:

1. ✅ **JETZT:** Dependencies entfernen (marked, mastra)
2. ✅ **DANN:** Build testen & validieren
3. ✅ **DANACH:** Dockerfile optimieren
4. ✅ **OPTIONAL:** Next.js Config optimieren
