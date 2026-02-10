"use strict";

// scripts/sync-system-types.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
var SYSTEM_TYPES = [
  { code: "daily_note", name: "Tagesnotiz", icon: "\u{1F4DD}", bgColorClass: "bg-blue-100 dark:bg-blue-900/30" },
  { code: "reflection_week", name: "Wochenreflexion", icon: "\u{1F4C5}", bgColorClass: "bg-purple-100 dark:bg-purple-900/30" },
  { code: "reflection_month", name: "Monatsreflexion", icon: "\u{1F4C6}", bgColorClass: "bg-purple-100 dark:bg-purple-900/30" },
  { code: "diary", name: "Allgemein", icon: "\u{1F4DD}", bgColorClass: "bg-green-100 dark:bg-green-900/30" }
];
async function main() {
  for (const t of SYSTEM_TYPES) {
    const existing = await prisma.journalEntryType.findFirst({
      where: { code: t.code, userId: null }
    });
    if (existing) {
      await prisma.journalEntryType.update({
        where: { id: existing.id },
        data: { name: t.name, icon: t.icon, bgColorClass: t.bgColorClass }
      });
      console.log(`Updated: ${t.code} \u2192 ${t.name} (${t.icon})`);
    } else {
      await prisma.journalEntryType.create({
        data: { code: t.code, name: t.name, icon: t.icon, bgColorClass: t.bgColorClass }
      });
      console.log(`Created: ${t.code} \u2192 ${t.name}`);
    }
  }
  console.log("Done.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
