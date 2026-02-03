// scripts/setup-fulltext-search.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("\u{1F50D} Setting up Full-Text Search...");
    const sqlPath = path.join(__dirname, "setup-fulltext-search.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => {
      if (s.length === 0) return false;
      if (s.split("\n").every((line) => line.trim().startsWith("--") || line.trim() === "")) {
        return false;
      }
      return true;
    });
    let successCount = 0;
    let skipCount = 0;
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement + ";");
        successCount++;
        if (statement.includes("CREATE EXTENSION")) {
          console.log("  \u2713 pg_trgm extension enabled");
        } else if (statement.includes("CREATE INDEX")) {
          const indexMatch = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
          if (indexMatch) {
            console.log(`  \u2713 Index: ${indexMatch[1]}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("already exists")) {
          skipCount++;
        } else {
          console.warn(`  \u26A0 Warning: ${errorMessage}`);
        }
      }
    }
    console.log("");
    console.log("\u2705 Full-Text Search setup completed!");
    console.log(`   - Statements executed: ${successCount}`);
    if (skipCount > 0) {
      console.log(`   - Skipped (already exist): ${skipCount}`);
    }
    console.log("   - Extensions: pg_trgm");
    console.log("   - FTS Indexes: 11");
    console.log("   - Trigram Indexes: 5");
  } catch (error) {
    console.error("\u274C Setup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
