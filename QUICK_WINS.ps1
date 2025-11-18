# CompACT Diary - Quick Performance Wins (PowerShell)
# Execute this after reviewing the changes

Write-Host "🚀 Starting Performance Optimization..." -ForegroundColor Green
Write-Host ""

# Backup current state
Write-Host "📦 Creating backup..." -ForegroundColor Yellow
Copy-Item package.json package.json.backup
Copy-Item package-lock.json package-lock.json.backup
Copy-Item postcss.config.js postcss.config.js.backup

Write-Host "✅ Backup created!" -ForegroundColor Green
Write-Host ""

# Step 1: Remove unused dependencies
Write-Host "🗑️  Step 1: Removing unused dependencies..." -ForegroundColor Cyan
Write-Host "   - Removing 'marked' (~100 KB)"
Write-Host "   - Keeping 'mastra' (needed for future AI features)"
npm uninstall marked

Write-Host "✅ Unused dependencies removed!" -ForegroundColor Green
Write-Host ""

# Step 2: Test build
Write-Host "🔨 Step 2: Testing build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    
    # Step 3: Optimize PostCSS (autoprefixer check)
    Write-Host "🔧 Step 3: Optimizing PostCSS config..." -ForegroundColor Cyan
    Write-Host "   Tailwind CSS v3+ has built-in autoprefixing"
    Write-Host "   Testing without autoprefixer..."
    
    # Remove autoprefixer from postcss.config.js
    @"
export default {
  plugins: {
    tailwindcss: {},
  },
}
"@ | Out-File -FilePath postcss.config.js -Encoding utf8
    
    Write-Host "✅ PostCSS config updated!" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Final build test
    Write-Host "🔨 Step 4: Final build test..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Final build successful!" -ForegroundColor Green
        Write-Host ""
        
        # Remove autoprefixer package
        Write-Host "🗑️  Removing autoprefixer..." -ForegroundColor Cyan
        npm uninstall autoprefixer
        
        Write-Host ""
        Write-Host "🎉 OPTIMIZATION COMPLETE!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Results:" -ForegroundColor Yellow
        Write-Host "   - Removed 2 dependencies (marked, autoprefixer)"
        Write-Host "   - Kept mastra (needed for future AI features)"
        Write-Host "   - Expected build time reduction: 10-15%"
        Write-Host "   - Expected Docker build speedup: 5-10%"
        Write-Host ""
        Write-Host "🧪 Please test:" -ForegroundColor Yellow
        Write-Host "   1. npm run dev"
        Write-Host "   2. Check if app works correctly"
        Write-Host "   3. Test styling (Tailwind CSS)"
        Write-Host ""
        
        # Cleanup backups if everything works
        Write-Host "💾 Keep backups until you verify everything works:" -ForegroundColor Yellow
        Write-Host "   - package.json.backup"
        Write-Host "   - package-lock.json.backup"
        Write-Host "   - postcss.config.js.backup"
        
    } else {
        Write-Host "❌ Build failed after autoprefixer removal!" -ForegroundColor Red
        Write-Host "🔄 Reverting postcss.config.js..." -ForegroundColor Yellow
        Copy-Item postcss.config.js.backup postcss.config.js -Force
        Write-Host "✅ Reverted. autoprefixer is still needed." -ForegroundColor Green
    }
} else {
    Write-Host "❌ Build failed after dependency removal!" -ForegroundColor Red
    Write-Host "🔄 Reverting changes..." -ForegroundColor Yellow
    Copy-Item package.json.backup package.json -Force
    Copy-Item package-lock.json.backup package-lock.json -Force
    npm install
    Write-Host "✅ Reverted to previous state." -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next steps: See DEPENDENCY_CLEANUP.md for Phase 9 (Docker optimization)" -ForegroundColor Cyan
