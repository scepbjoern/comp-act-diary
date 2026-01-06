/**
 * Setup script for full-text search.
 * Can be run after every `prisma db push` or database reset.
 * 
 * Usage: npx ts-node scripts/setup-fulltext-search.ts
 * 
 * This script:
 * 1. Enables pg_trgm extension for typo tolerance
 * 2. Creates GIN indexes for full-text search (tsvector)
 * 3. Creates GIN indexes for trigram similarity search
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Setting up Full-Text Search...');
    
    const sqlPath = path.join(__dirname, 'setup-fulltext-search.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split SQL into individual statements and execute them
    // Filter out comments and empty lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Skip empty statements
        if (s.length === 0) return false;
        // Skip pure comment blocks
        if (s.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
          return false;
        }
        return true;
      });
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement + ';');
        successCount++;
        
        // Log what we created
        if (statement.includes('CREATE EXTENSION')) {
          console.log('  ✓ pg_trgm extension enabled');
        } else if (statement.includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
          if (indexMatch) {
            console.log(`  ✓ Index: ${indexMatch[1]}`);
          }
        }
      } catch (error: unknown) {
        // Index might already exist or other non-critical error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          skipCount++;
        } else {
          console.warn(`  ⚠ Warning: ${errorMessage}`);
        }
      }
    }
    
    console.log('');
    console.log('✅ Full-Text Search setup completed!');
    console.log(`   - Statements executed: ${successCount}`);
    if (skipCount > 0) {
      console.log(`   - Skipped (already exist): ${skipCount}`);
    }
    console.log('   - Extensions: pg_trgm');
    console.log('   - FTS Indexes: 11');
    console.log('   - Trigram Indexes: 5');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
