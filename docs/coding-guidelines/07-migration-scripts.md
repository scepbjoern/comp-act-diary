# Migration Scripts Guidelines

## Purpose
Migration scripts ensure data consistency when schema or business logic changes. They run in both development and Docker (TEST/PROD) environments.

## File Location
- **Path:** `scripts/`
- **Naming:** `migrate-{feature-name}.ts`
- **Example:** `scripts/migrate-journal-entries.ts`

## Automatic Bundle Approach (Recommended)

All scripts in `scripts/` are **automatically bundled with esbuild** during build. This solves all dependency and path resolution issues in Docker.

### How It Works

1. **Write TypeScript** files in `scripts/` with normal imports (including `@/` path aliases)
2. **Run `npm run build`** (or `npm run build:scripts` standalone)
3. **All `.ts` files** are automatically bundled to `.bundled.js`
4. **Deploy bundled files** to Docker
5. **Run with node** (no tsx needed!)

### Advantages

✅ **Fully automatic:** All scripts bundled on every build  
✅ **Zero configuration:** Just add a `.ts` file to `scripts/`  
✅ All dependencies bundled (including `zod`, `lib/` services, etc.)  
✅ No path resolution issues (`@/` aliases work)  
✅ No external dependencies needed in Docker  
✅ Fast execution (pre-compiled JavaScript)  
✅ Works identically in development and production

### Setup in package.json

```json
{
  "scripts": {
    "prebuild": "node scripts/build-scripts.js",
    "build": "next build",
    "build:scripts": "node scripts/build-scripts.js"
  },
  "devDependencies": {
    "esbuild": "^0.24.2"
  }
}
```

The `prebuild` hook automatically bundles all scripts before each build. You can also manually bundle with `npm run build:scripts`.

### scripts/build-scripts.js

This helper script automatically finds and bundles all `.ts` files in the `scripts/` directory:

- Scans for all `.ts` files (excluding `.d.ts` and `.bundled.ts`)
- Bundles each file separately with esbuild
- Creates `{name}.bundled.js` for each `{name}.ts`
- Marks `@prisma/client` as external (must use runtime client)
- Reports success/failure for each script

**Result:** Any new script you add is automatically bundled on the next build.

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

## Running Scripts

### Local Development

**Option 1: Direct TypeScript execution (tsx)**
```bash
npx tsx scripts/migrate-journal-entries.ts --dry-run
npx tsx scripts/migrate-journal-entries.ts
```

**Option 2: Test bundled version**
```bash
# Bundle all scripts
npm run build:scripts

# Run bundled version
node scripts/migrate-journal-entries.bundled.js --dry-run
node scripts/migrate-journal-entries.bundled.js
```

### Docker (TEST/PROD)

**Step 1: Bundle and deploy**
```bash
# Bundle all scripts automatically
npm run build

# Commit bundled files
git add scripts/*.bundled.js
git commit -m "build: bundle production scripts"
git push origin main
```

**Step 2: Deploy to server**
```bash
cd /opt/stacks/comp-act-diary-test  # or comp-act-diary for PROD
git pull origin main
cd deploy
docker compose up -d --build app
```

**Step 3: Run any script**
```bash
# Example: journal migration
docker compose exec app node scripts/migrate-journal-entries.bundled.js --dry-run
docker compose exec app node scripts/migrate-journal-entries.bundled.js

# Example: timebox registration
docker compose exec app node scripts/register-timeboxes-as-entities.bundled.js

# Example: Diarium import
docker compose exec app node scripts/import-diarium.bundled.js
```

**Note:** All bundled `.js` files run with plain `node` - no `tsx`, TypeScript, or other dependencies needed!

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

### Bundle fails during build
```bash
npm run build:scripts
```

**Common issues:**
- ❌ **Syntax errors in TypeScript:** Fix in source `.ts` file
- ❌ **Missing imports:** Add to TypeScript file, rebuild
- ❌ **TypeScript errors:** Run `npm run lint` to check
- ❌ **esbuild not installed:** Run `npm install`

The bundle script reports which files failed - fix those and rerun.

### Script fails in Docker
```bash
docker compose exec app node scripts/{script-name}.bundled.js
```

**Common issues:**
- ❌ **Bundle missing:** Run `npm run build` locally, commit `*.bundled.js`
- ❌ **Forgot to deploy:** `git pull` on server, `docker compose up -d --build app`
- ❌ **Prisma connection error:** Check DATABASE_URL in .env
- ❌ **Permission errors:** Scripts run as `node` user in container

### Bundle file is outdated
Bundles are automatically rebuilt on every `npm run build`. If you changed a TypeScript source:

```bash
npm run build:scripts  # or npm run build
git add scripts/*.bundled.js
git commit -m "build: update script bundles"
git push
```

### Adding a new script
Just create a new `.ts` file in `scripts/`:

```bash
# 1. Create script
echo "console.log('Hello')" > scripts/my-new-script.ts

# 2. Bundle automatically
npm run build:scripts

# 3. Commit both files
git add scripts/my-new-script.ts scripts/my-new-script.bundled.js
git commit -m "feat: add my-new-script"

# 4. Deploy
git push
```

The bundle is created automatically - no configuration needed!

### Testing locally before deployment
```bash
# Bundle all scripts
npm run build:scripts

# Test bundled version locally (mimics production)
node scripts/migrate-journal-entries.bundled.js --dry-run

# If successful, commit and deploy
git add scripts/*.bundled.js
git commit -m "build: update script bundles"
git push
```

## References
- [Docker Operations Guide](../setup-and-testing_docs/DOCKER_OPERATIONS.md)
- [Tech Stack](./01-tech-stack.md)
- [Database Schema](../../prisma/schema.prisma)
