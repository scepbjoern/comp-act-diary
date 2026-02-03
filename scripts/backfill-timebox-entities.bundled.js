// scripts/backfill-timebox-entities.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
async function backfillTimeBoxEntities() {
  console.log("Starting backfill of TimeBox entities...");
  try {
    const timeBoxes = await prisma.timeBox.findMany({
      select: {
        id: true,
        userId: true
      }
    });
    console.log(`Found ${timeBoxes.length} TimeBox records. Checking for missing Entities...`);
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < timeBoxes.length; i += CHUNK_SIZE) {
      const chunk = timeBoxes.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (tb) => {
          try {
            const existingEntity = await prisma.entity.findUnique({
              where: { id: tb.id }
            });
            if (!existingEntity) {
              await prisma.entity.create({
                data: {
                  id: tb.id,
                  userId: tb.userId,
                  type: "TIMEBOX"
                }
              });
              createdCount++;
            } else {
              skippedCount++;
            }
          } catch (err) {
            console.error(`
Failed to create Entity for TimeBox ${tb.id}:`, err);
            errorCount++;
          }
        })
      );
      if ((i + CHUNK_SIZE) % 500 === 0 || i + CHUNK_SIZE >= timeBoxes.length) {
        console.log(`Processed ${Math.min(i + CHUNK_SIZE, timeBoxes.length)}/${timeBoxes.length}`);
      }
    }
    console.log("\n--- Backfill Complete ---");
    console.log(`Total TimeBoxes: ${timeBoxes.length}`);
    console.log(`Entities Created: ${createdCount}`);
    console.log(`Already Existed:  ${skippedCount}`);
    console.log(`Errors:           ${errorCount}`);
  } catch (error) {
    console.error("Fatal error during backfill:", error);
  } finally {
    await prisma.$disconnect();
  }
}
backfillTimeBoxEntities();
