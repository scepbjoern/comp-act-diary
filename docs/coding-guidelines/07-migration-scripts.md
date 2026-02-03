# Migration Scripts Guidelines

## Purpose
Migration scripts ensure data consistency when schema or business logic changes. They run in both development and Docker (TEST/PROD) environments.

## File Location
- **Path:** `scripts/`
- **Naming:** `migrate-{feature-name}.ts`
- **Example:** `scripts/migrate-journal-entries.ts`

## Docker Compatibility Requirements

### 1. Import Paths (ESM)
Migration scripts run with `tsx` in Docker containers using ESM.

**Required:**
- Use `.js` extension for local imports
- Example: `import { getService } from '../lib/services/myService.js'`

**Why:** Node.js ESM requires explicit file extensions in Docker

### 2. Dependencies in Docker
Scripts can use:
- ✅ `@prisma/client` - Always available
- ✅ `lib/` services - Copied to Docker image (see Dockerfile line 143)
- ✅ All `node_modules` - Available via build stage
- ❌ Development-only packages not in production dependencies

**IMPORTANT:** Files in `lib/` that are imported by scripts **MUST use relative imports**, not `@/` path aliases:
```typescript
// ❌ BAD - Will fail in Docker
import { getPrisma } from '@/lib/core/prisma'

// ✅ GOOD - Works in Docker
import { getPrisma } from '../core/prisma.js'
```

Reason: `tsx` in Docker doesn't resolve TypeScript path aliases (`@/`). Use relative paths with `.js` extensions.

### 3. Dockerfile Setup
The `lib/` directory is copied into the Docker image:

```dockerfile
COPY --from=build --chown=node:node /app/lib ./lib
```

If you add new directories needed by scripts, update the Dockerfile accordingly.

## Script Structure

### Minimal Template

```typescript
/**
 * scripts/migrate-{feature}.ts
 * Brief description of what this migration does.
 * 
 * Run with: npx tsx scripts/migrate-{feature}.ts
 * 
 * Options:
 * --dry-run: Preview changes without applying them
 */

import { PrismaClient } from '@prisma/client'
import { someService } from '../lib/services/someService.js' // Note .js extension

const prisma = new PrismaClient()

interface MigrationStats {
  total: number
  updated: number
  errors: string[]
}

interface MigrationOptions {
  dryRun: boolean
}

async function migrate(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = { total: 0, updated: 0, errors: [] }
  
  console.log('Starting migration...')
  console.log(`Options: dryRun=${options.dryRun}`)
  console.log('')

  // Your migration logic here
  
  return stats
}

async function main() {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
  }

  if (options.dryRun) {
    console.log('='.repeat(60))
    console.log('DRY RUN MODE - No changes will be made')
    console.log('='.repeat(60))
    console.log('')
  }

  try {
    const stats = await migrate(options)

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Complete')
    console.log('='.repeat(60))
    console.log(`Total processed: ${stats.total}`)
    console.log(`Updated: ${stats.updated}`)
    
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach((e) => console.log(`  - ${e}`))
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
```

## Running in Docker

### Local Development
```bash
npx tsx scripts/migrate-{feature}.ts --dry-run
npx tsx scripts/migrate-{feature}.ts
```

### Docker (TEST)
```bash
cd /opt/stacks/comp-act-diary-test/deploy
docker compose exec app npx tsx scripts/migrate-{feature}.ts --dry-run
docker compose exec app npx tsx scripts/migrate-{feature}.ts
```

### Docker (PROD)
```bash
cd /opt/stacks/comp-act-diary/deploy
docker compose exec app npx tsx scripts/migrate-{feature}.ts --dry-run
docker compose exec app npx tsx scripts/migrate-{feature}.ts
```

## Deployment Workflow

1. **Develop locally** with `--dry-run`
2. **Test locally** without dry-run on dev database
3. **Deploy to TEST**:
   ```bash
   cd /opt/stacks/comp-act-diary-test
   git pull origin main
   cd deploy
   docker compose up -d --build app
   docker compose exec app npx tsx scripts/migrate-{feature}.ts --dry-run
   docker compose exec app npx tsx scripts/migrate-{feature}.ts
   ```
4. **Verify results** in TEST environment
5. **Deploy to PROD** following same steps

## Best Practices

### Always Include
- ✅ `--dry-run` option for safe testing
- ✅ Comprehensive error handling with `try/catch`
- ✅ Clear console output (progress, stats, errors)
- ✅ Statistics tracking (total, updated, errors)
- ✅ Proper Prisma client cleanup (`$disconnect()`)

### Safety
- ✅ Test with `--dry-run` first
- ✅ Run on TEST environment before PROD
- ✅ Use transactions for atomicity when possible
- ✅ Log all changes for traceability
- ❌ Never auto-run destructive operations

### Performance
- ✅ Batch operations when processing many records
- ✅ Use `findMany` with pagination for large datasets
- ✅ Add progress indicators for long-running scripts
- ❌ Avoid N+1 queries

## Common Patterns

### Safe Update Pattern
```typescript
for (const record of records) {
  try {
    if (options.dryRun) {
      console.log(`[DRY-RUN] Would update ${record.id}`)
    } else {
      await prisma.model.update({
        where: { id: record.id },
        data: { /* updates */ },
      })
      console.log(`Updated ${record.id}`)
    }
    stats.updated++
  } catch (error) {
    const msg = `Error updating ${record.id}: ${error}`
    stats.errors.push(msg)
    console.error(msg)
  }
}
```

### Transaction Pattern
```typescript
if (!options.dryRun) {
  await prisma.$transaction(async (tx) => {
    // Multiple related operations
    await tx.model1.update(/* ... */)
    await tx.model2.create(/* ... */)
  })
}
```

## Troubleshooting

### "Cannot find module" in Docker
- ✅ Check import path has `.js` extension
- ✅ Verify `lib/` is copied in Dockerfile
- ✅ Rebuild Docker image: `docker compose up -d --build app`

### Script works locally but fails in Docker
- ✅ Check for development-only dependencies
- ✅ Verify all imports use `.js` extensions
- ✅ Test in Docker container shell: `docker compose exec app sh`

### Permission errors
- ✅ Ensure script is executed as `node` user in container
- ✅ Check file permissions in Docker image

## References
- [Docker Operations Guide](../setup-and-testing_docs/DOCKER_OPERATIONS.md)
- [Tech Stack](./01-tech-stack.md)
- [Database Schema](../../prisma/schema.prisma)
