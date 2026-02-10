/**
 * scripts/sync-system-types.ts
 * One-off script to sync system JournalEntryType records (name, icon, bgColorClass).
 * Run with: npx tsx scripts/sync-system-types.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_TYPES = [
  { code: 'daily_note', name: 'Tagesnotiz', icon: '📝', bgColorClass: 'bg-blue-100 dark:bg-blue-900/30' },
  { code: 'reflection_week', name: 'Wochenreflexion', icon: '📅', bgColorClass: 'bg-purple-100 dark:bg-purple-900/30' },
  { code: 'reflection_month', name: 'Monatsreflexion', icon: '📆', bgColorClass: 'bg-purple-100 dark:bg-purple-900/30' },
  { code: 'diary', name: 'Allgemein', icon: '📝', bgColorClass: 'bg-green-100 dark:bg-green-900/30' },
]

async function main() {
  for (const t of SYSTEM_TYPES) {
    const existing = await prisma.journalEntryType.findFirst({
      where: { code: t.code, userId: null },
    })
    if (existing) {
      await prisma.journalEntryType.update({
        where: { id: existing.id },
        data: { name: t.name, icon: t.icon, bgColorClass: t.bgColorClass },
      })
      console.log(`Updated: ${t.code} → ${t.name} (${t.icon})`)
    } else {
      await prisma.journalEntryType.create({
        data: { code: t.code, name: t.name, icon: t.icon, bgColorClass: t.bgColorClass },
      })
      console.log(`Created: ${t.code} → ${t.name}`)
    }
  }
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
