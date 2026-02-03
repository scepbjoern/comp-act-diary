#!/usr/bin/env node
/**
 * Automatic script bundler for production deployment
 * 
 * Bundles all TypeScript scripts in scripts/ directory with esbuild.
 * Each .ts file becomes a standalone .bundled.js file with all dependencies.
 * 
 * Usage: node scripts/build-scripts.js
 * Called automatically during: npm run build
 */

import { build } from 'esbuild'
import { readdir } from 'fs/promises'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const scriptsDir = __dirname

async function bundleScripts() {
  console.log('🔨 Bundling production scripts...')
  
  // Find all .ts files in scripts/ (excluding build-scripts.js itself)
  const files = await readdir(scriptsDir)
  const tsFiles = files.filter(f => 
    f.endsWith('.ts') && 
    !f.endsWith('.d.ts') &&
    !f.includes('.bundled.')
  )

  if (tsFiles.length === 0) {
    console.log('⚠️  No TypeScript files found in scripts/')
    return
  }

  console.log(`📦 Found ${tsFiles.length} script(s) to bundle:`)
  tsFiles.forEach(f => console.log(`   - ${f}`))
  console.log('')

  // Bundle each script separately
  const results = await Promise.allSettled(
    tsFiles.map(async (file) => {
      const entryPoint = join(scriptsDir, file)
      const outfile = join(scriptsDir, file.replace('.ts', '.bundled.js'))
      
      await build({
        entryPoints: [entryPoint],
        bundle: true,
        platform: 'node',
        format: 'cjs', // Changed from 'esm' to support dynamic requires
        outfile,
        external: ['@prisma/client'], // Prisma must use runtime client
        minify: false, // Keep readable for debugging
        sourcemap: false,
        logLevel: 'error',
      })

      return { file, outfile: basename(outfile) }
    })
  )

  // Report results
  console.log('📋 Bundle results:')
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`   ✅ ${tsFiles[i]} → ${result.value.outfile}`)
    } else {
      console.error(`   ❌ ${tsFiles[i]} failed:`, result.reason.message)
    }
  })

  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log('')
  console.log(`✨ Bundled ${successful}/${tsFiles.length} script(s)`)
  
  if (failed > 0) {
    console.error(`⚠️  ${failed} script(s) failed to bundle`)
    process.exit(1)
  }
}

bundleScripts().catch(err => {
  console.error('❌ Bundle process failed:', err)
  process.exit(1)
})
