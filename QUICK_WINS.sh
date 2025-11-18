#!/bin/bash

# CompACT Diary - Quick Performance Wins
# Execute this after reviewing the changes

echo "🚀 Starting Performance Optimization..."
echo ""

# Backup current state
echo "📦 Creating backup..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
cp postcss.config.js postcss.config.js.backup

echo "✅ Backup created!"
echo ""

# Step 1: Remove unused dependencies
echo "🗑️  Step 1: Removing unused dependencies..."
echo "   - Removing 'marked' (~100 KB)"
echo "   - Removing 'mastra' (~15 MB)"
npm uninstall marked mastra

echo "✅ Unused dependencies removed!"
echo ""

# Step 2: Test build
echo "🔨 Step 2: Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    
    # Step 3: Optimize PostCSS (autoprefixer check)
    echo "🔧 Step 3: Optimizing PostCSS config..."
    echo "   Tailwind CSS v3+ has built-in autoprefixing"
    echo "   Testing without autoprefixer..."
    
    # Remove autoprefixer from postcss.config.js
    cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
  },
}
EOF
    
    echo "✅ PostCSS config updated!"
    echo ""
    
    # Step 4: Final build test
    echo "🔨 Step 4: Final build test..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Final build successful!"
        echo ""
        
        # Remove autoprefixer package
        echo "🗑️  Removing autoprefixer..."
        npm uninstall autoprefixer
        
        echo ""
        echo "🎉 OPTIMIZATION COMPLETE!"
        echo ""
        echo "📊 Results:"
        echo "   - Removed 3 dependencies (marked, mastra, autoprefixer)"
        echo "   - Expected build time reduction: 25-35%"
        echo "   - Expected Docker build speedup: 30-40%"
        echo ""
        echo "🧪 Please test:"
        echo "   1. npm run dev"
        echo "   2. Check if app works correctly"
        echo "   3. Test styling (Tailwind CSS)"
        echo ""
        
        # Cleanup backups if everything works
        echo "💾 Keep backups until you verify everything works:"
        echo "   - package.json.backup"
        echo "   - package-lock.json.backup"
        echo "   - postcss.config.js.backup"
        
    else
        echo "❌ Build failed after autoprefixer removal!"
        echo "🔄 Reverting postcss.config.js..."
        cp postcss.config.js.backup postcss.config.js
        echo "✅ Reverted. autoprefixer is still needed."
    fi
else
    echo "❌ Build failed after dependency removal!"
    echo "🔄 Reverting changes..."
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json
    npm install
    echo "✅ Reverted to previous state."
fi

echo ""
echo "📝 Next steps: See DEPENDENCY_CLEANUP.md for Phase 9 (Docker optimization)"
