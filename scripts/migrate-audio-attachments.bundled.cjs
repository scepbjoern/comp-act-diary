"use strict";

// scripts/migrate-audio-attachments.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
function minutesDiff(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1e3 * 60);
}
function progress(current, total) {
  const percent = Math.round(current / total * 100);
  const bar = "\u2588".repeat(Math.floor(percent / 5)) + "\u2591".repeat(20 - Math.floor(percent / 5));
  return `[${bar}] ${percent}% (${current}/${total})`;
}
async function migrate(options) {
  const stats = {
    totalEntries: 0,
    entriesWithAudio: 0,
    orphanedAssetsFound: 0,
    attachmentsCreated: 0,
    skippedAssets: 0,
    errors: []
  };
  console.log("Starting Audio-MediaAttachment migration...");
  console.log(`Options: dryRun=${options.dryRun}`);
  console.log("");
  const entries = await prisma.journalEntry.findMany({
    where: {
      deletedAt: null,
      occurredAt: { not: null }
      // Only entries with occurredAt can be matched
    },
    orderBy: { occurredAt: "asc" }
  });
  stats.totalEntries = entries.length;
  console.log(`Found ${entries.length} entries with occurredAt to process`);
  console.log("");
  const allAudioAssets = await prisma.mediaAsset.findMany({
    where: {
      mimeType: { startsWith: "audio/" }
    },
    include: {
      attachments: true
    }
  });
  const orphanedAssets = allAudioAssets.filter((asset) => asset.attachments.length === 0);
  console.log(`Total audio assets: ${allAudioAssets.length}`);
  console.log(`Orphaned audio assets (no attachments): ${orphanedAssets.length}`);
  console.log("");
  if (orphanedAssets.length === 0) {
    console.log("No orphaned audio assets found. Nothing to migrate.");
    return stats;
  }
  stats.orphanedAssetsFound = orphanedAssets.length;
  const TIME_WINDOW_MINUTES = 5;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (i % 10 === 0) {
      console.log(`\r${progress(i, entries.length)} - Processing entry ${entry.id.slice(0, 8)}...`);
    }
    if (!entry.occurredAt) continue;
    const matchingAssets = orphanedAssets.filter((asset) => {
      if (asset.userId !== entry.userId) return false;
      if (!asset.capturedAt) return false;
      const timeDiff = minutesDiff(asset.capturedAt, entry.occurredAt);
      return timeDiff <= TIME_WINDOW_MINUTES;
    });
    if (matchingAssets.length > 0) {
      stats.entriesWithAudio++;
      for (const asset of matchingAssets) {
        try {
          const stillOrphaned = await prisma.mediaAttachment.findFirst({
            where: { assetId: asset.id }
          });
          if (stillOrphaned) {
            stats.skippedAssets++;
            continue;
          }
          if (options.dryRun) {
            console.log(`
  [DRY-RUN] Would create MediaAttachment:`);
            console.log(`    Asset: ${asset.id} (${asset.mimeType})`);
            console.log(`    Entry: ${entry.id}`);
            console.log(`    Time diff: ${minutesDiff(asset.capturedAt, entry.occurredAt).toFixed(2)} min`);
          } else {
            await prisma.$transaction(async (tx) => {
              await tx.mediaAttachment.create({
                data: {
                  entityId: entry.id,
                  userId: entry.userId,
                  assetId: asset.id,
                  timeBoxId: entry.timeBoxId,
                  role: "ATTACHMENT",
                  displayOrder: 0
                }
              });
            });
            console.log(`
  Created MediaAttachment for asset ${asset.id.slice(0, 8)} -> entry ${entry.id.slice(0, 8)}`);
          }
          stats.attachmentsCreated++;
          const idx = orphanedAssets.findIndex((a) => a.id === asset.id);
          if (idx > -1) {
            orphanedAssets.splice(idx, 1);
          }
        } catch (error) {
          const msg = `Error creating attachment for asset ${asset.id}: ${error}`;
          stats.errors.push(msg);
          console.error(`
  ${msg}`);
        }
      }
    }
  }
  console.log("\n");
  if (orphanedAssets.length > 0) {
    console.log(`
${orphanedAssets.length} orphaned audio assets could not be matched to any entry:`);
    orphanedAssets.slice(0, 10).forEach((asset) => {
      console.log(`  - ${asset.id} (capturedAt: ${asset.capturedAt}, user: ${asset.userId.slice(0, 8)})`);
    });
    if (orphanedAssets.length > 10) {
      console.log(`  ... and ${orphanedAssets.length - 10} more`);
    }
  }
  return stats;
}
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes("--execute")
  };
  if (options.dryRun) {
    console.log("=".repeat(60));
    console.log("DRY RUN MODE - No changes will be made");
    console.log("=".repeat(60));
    console.log("");
  } else {
    console.log("=".repeat(60));
    console.log("EXECUTE MODE - Changes WILL be applied!");
    console.log("=".repeat(60));
    console.log("");
    console.log("\u26A0\uFE0F  WARNING: This will modify the database.");
    console.log("   Make sure you have a backup before proceeding.");
    console.log("");
  }
  try {
    const stats = await migrate(options);
    console.log("");
    console.log("=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`Entries processed:        ${stats.totalEntries}`);
    console.log(`Entries with audio:       ${stats.entriesWithAudio}`);
    console.log(`Orphaned assets found:    ${stats.orphanedAssetsFound}`);
    console.log(`Attachments created:      ${stats.attachmentsCreated}`);
    console.log(`Assets skipped:           ${stats.skippedAssets}`);
    if (stats.errors.length > 0) {
      console.log(`Errors:                   ${stats.errors.length}`);
      stats.errors.forEach((e) => console.log(`  - ${e}`));
    } else {
      console.log("No errors occurred.");
    }
    if (options.dryRun) {
      console.log("");
      console.log("This was a dry run. Run with --execute to apply changes.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
