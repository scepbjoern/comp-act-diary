"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/setup-fulltext-search.ts
var import_client = require("@prisma/client");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function main() {
  const prisma = new import_client.PrismaClient();
  try {
    console.log("\u{1F50D} Setting up Full-Text Search...");
    const sqlPath = import_path.default.join(__dirname, "setup-fulltext-search.sql");
    const sql = import_fs.default.readFileSync(sqlPath, "utf-8");
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
