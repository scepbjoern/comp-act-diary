"use strict";

// scripts/register-timeboxes-as-entities.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
async function registerTimeBoxesAsEntities() {
  console.log("Starting migration of existing TimeBoxes to Entities...");
  try {
    const timeBoxesWithoutEntities = await prisma.timeBox.findMany({
      where: {
        // Find TimeBoxes where no Entity with the same ID exists
        NOT: {
          id: {
            in: await prisma.entity.findMany({
              where: { type: "TIMEBOX" },
              select: { id: true }
            }).then((entities) => entities.map((e) => e.id))
          }
        }
      }
    });
    console.log(`Found ${timeBoxesWithoutEntities.length} TimeBoxes without Entity records`);
    if (timeBoxesWithoutEntities.length === 0) {
      console.log("All TimeBoxes are already registered as Entities. Nothing to do.");
      return;
    }
    const createdEntities = await prisma.$transaction(
      timeBoxesWithoutEntities.map(
        (timeBox) => prisma.entity.create({
          data: {
            id: timeBox.id,
            userId: timeBox.userId,
            type: "TIMEBOX"
          }
        })
      )
    );
    console.log(`Successfully created ${createdEntities.length} Entity records`);
    const summary = timeBoxesWithoutEntities.reduce((acc, tb) => {
      acc[tb.kind] = (acc[tb.kind] || 0) + 1;
      return acc;
    }, {});
    console.log("\nMigration summary by TimeBox type:");
    Object.entries(summary).forEach(([kind, count]) => {
      console.log(`  ${kind}: ${count} records`);
    });
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
registerTimeBoxesAsEntities().then(() => {
  console.log("\n\u2705 Migration completed successfully!");
  process.exit(0);
}).catch((error) => {
  console.error("\n\u274C Migration failed!");
  console.error(error);
  process.exit(1);
});
