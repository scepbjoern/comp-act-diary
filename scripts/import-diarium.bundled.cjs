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

// scripts/import-diarium.ts
var import_client = require("@prisma/client");
var fs = __toESM(require("fs"), 1);
var prisma = new import_client.PrismaClient();
function htmlToText(html) {
  if (!html) return "";
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<\/li>/gi, "\n").replace(/<li>/gi, "- ").replace(/<\/?[ou]l>/gi, "").replace(/<strong>/gi, "**").replace(/<\/strong>/gi, "**").replace(/<b>/gi, "**").replace(/<\/b>/gi, "**").replace(/<em>/gi, "*").replace(/<\/em>/gi, "*").replace(/<i>/gi, "*").replace(/<\/i>/gi, "*").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
}
function getLocalDate(isoDate) {
  const date = new Date(isoDate);
  return date.toISOString().split("T")[0];
}
function getDayBounds(localDate, _timezone = "Europe/Zurich") {
  const startAt = /* @__PURE__ */ new Date(`${localDate}T00:00:00.000Z`);
  const endAt = /* @__PURE__ */ new Date(`${localDate}T23:59:59.999Z`);
  return { startAt, endAt };
}
function convertRating(diariumRating) {
  if (!diariumRating || diariumRating < 1 || diariumRating > 5) return null;
  return diariumRating * 2;
}
function parseWeather(weatherStr) {
  if (!weatherStr) return null;
  const tempMatch = weatherStr.match(/(-?\d+)°C/);
  const temp = tempMatch ? parseInt(tempMatch[1]) : null;
  const condition = weatherStr.replace(/^-?\d+°C,?\s*/, "").replace(/\.$/, "").trim();
  return {
    temperature: temp,
    condition: condition || null,
    raw: weatherStr
  };
}
function parseTrackerValue(trackerStr) {
  const weightMatch = trackerStr.match(/Gewicht:\s*([\d,.]+)/i);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(",", "."));
    return { type: "weight", value: isNaN(value) ? null : value };
  }
  const stepsMatch = trackerStr.match(/Schritte:\s*([\d,.]+)/i);
  if (stepsMatch) {
    let stepsStr = stepsMatch[1];
    stepsStr = stepsStr.replace(/[.,]/g, "");
    const value = parseInt(stepsStr);
    return { type: "steps", value: isNaN(value) ? null : value };
  }
  return { type: null, value: null };
}
async function importDiarium(jsonPath, dryRun = false) {
  console.log(`
\u{1F4E5} Lade Diarium-Export: ${jsonPath}`);
  console.log(`   Modus: ${dryRun ? "DRY-RUN (keine \xC4nderungen)" : "LIVE-IMPORT"}`);
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const entries = JSON.parse(jsonContent);
  console.log(`   Gefundene Eintr\xE4ge: ${entries.length}`);
  let user = await prisma.user.findFirst({ where: { username: "bjoerns" } });
  if (!user) {
    user = await prisma.user.findFirst({ where: { username: "demo" } });
  }
  if (!user) {
    user = await prisma.user.findFirst();
  }
  if (!user) {
    console.error("\u274C Kein User gefunden. Bitte zuerst einen User anlegen.");
    process.exit(1);
  }
  console.log(`   User: ${user.username} (${user.id})`);
  const diaryType = await prisma.journalEntryType.findFirst({
    where: { code: "daily_note" }
  });
  if (!diaryType) {
    console.error('\u274C JournalEntryType "daily_note" nicht gefunden. Bitte zuerst das Schema initialisieren.');
    process.exit(1);
  }
  console.log(`   JournalEntryType: ${diaryType.name} (${diaryType.id})`);
  const stats = {
    timeBoxesCreated: 0,
    timeBoxesExisted: 0,
    dayEntriesCreated: 0,
    dayEntriesUpdated: 0,
    journalEntriesCreated: 0,
    journalEntriesSkipped: 0,
    taxonomiesCreated: 0,
    taggingsCreated: 0,
    contactsCreated: 0,
    interactionsCreated: 0,
    locationsCreated: 0,
    locationVisitsCreated: 0,
    measurementsCreated: 0,
    errors: 0
  };
  const locationCache = /* @__PURE__ */ new Map();
  const existingLocations = await prisma.location.findMany({
    where: { userId: user.id }
  });
  for (const loc of existingLocations) {
    if (loc.lat && loc.lng) {
      const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
      locationCache.set(key, loc.id);
    }
  }
  let weightMetric = await prisma.metricDefinition.findFirst({
    where: { code: "body_weight", userId: null }
  });
  if (!weightMetric) {
    weightMetric = await prisma.metricDefinition.findFirst({
      where: { code: "body_weight", userId: user.id }
    });
  }
  if (!weightMetric) {
    console.log(`   \u26A0\uFE0F MetricDefinition 'body_weight' nicht gefunden - Gewicht wird nicht importiert`);
  }
  let stepsMetric = await prisma.metricDefinition.findFirst({
    where: { code: "steps", userId: null }
  });
  if (!stepsMetric) {
    stepsMetric = await prisma.metricDefinition.findFirst({
      where: { code: "steps", userId: user.id }
    });
  }
  if (!stepsMetric && !dryRun) {
    stepsMetric = await prisma.metricDefinition.create({
      data: {
        userId: user.id,
        code: "steps",
        name: "Schritte",
        unit: "Schritte",
        dataType: "NUMERIC",
        category: "fitness",
        icon: "\u{1F45F}"
      }
    });
    console.log(`   MetricDefinition 'steps' erstellt`);
  }
  const taxonomyCache = /* @__PURE__ */ new Map();
  const contactCache = /* @__PURE__ */ new Map();
  const existingTaxonomies = await prisma.taxonomy.findMany({
    where: { userId: user.id, kind: import_client.TaxonomyKind.TAG }
  });
  for (const t of existingTaxonomies) {
    taxonomyCache.set(t.shortName.toLowerCase(), t.id);
  }
  const existingContacts = await prisma.contact.findMany({
    where: { userId: user.id }
  });
  for (const c of existingContacts) {
    contactCache.set(c.name.toLowerCase(), c.id);
  }
  console.log(`   Existierende Tags: ${taxonomyCache.size}`);
  console.log(`   Existierende Kontakte: ${contactCache.size}`);
  console.log("\n\u{1F504} Starte Import...\n");
  const entriesByDay = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const localDate = getLocalDate(entry.date);
    if (!entriesByDay.has(localDate)) {
      entriesByDay.set(localDate, []);
    }
    entriesByDay.get(localDate).push(entry);
  }
  console.log(`   Tage mit Eintr\xE4gen: ${entriesByDay.size}`);
  let processed = 0;
  for (const [localDate, dayEntries] of entriesByDay) {
    processed++;
    if (processed % 50 === 0) {
      console.log(`   ... ${processed}/${entriesByDay.size} Tage verarbeitet`);
    }
    try {
      const { startAt, endAt } = getDayBounds(localDate);
      let timeBox = await prisma.timeBox.findFirst({
        where: {
          userId: user.id,
          kind: import_client.TimeBoxKind.DAY,
          localDate
        }
      });
      if (!timeBox && !dryRun) {
        timeBox = await prisma.timeBox.create({
          data: {
            userId: user.id,
            kind: import_client.TimeBoxKind.DAY,
            startAt,
            endAt,
            localDate,
            timezone: "Europe/Zurich"
          }
        });
        stats.timeBoxesCreated++;
      } else if (timeBox) {
        stats.timeBoxesExisted++;
      }
      const bestRating = dayEntries.map((e) => convertRating(e.rating)).filter((r) => r !== null).sort((a, b) => (b ?? 0) - (a ?? 0))[0] ?? null;
      const weatherEntry = dayEntries.find((e) => e.weather);
      const weather = parseWeather(weatherEntry?.weather);
      if (timeBox) {
        let dayEntry = await prisma.dayEntry.findFirst({
          where: { timeBoxId: timeBox.id }
        });
        if (!dayEntry && !dryRun) {
          dayEntry = await prisma.dayEntry.create({
            data: {
              userId: user.id,
              timeBoxId: timeBox.id,
              dayRating: bestRating,
              weather: weather ?? import_client.Prisma.JsonNull
            }
          });
          stats.dayEntriesCreated++;
        } else if (dayEntry && !dryRun) {
          if (bestRating && !dayEntry.dayRating || weather && !dayEntry.weather) {
            await prisma.dayEntry.update({
              where: { id: dayEntry.id },
              data: {
                dayRating: bestRating ?? dayEntry.dayRating,
                weather: weather ? weather : void 0
              }
            });
            stats.dayEntriesUpdated++;
          }
        }
      }
      for (const entry of dayEntries) {
        const content = htmlToText(entry.html);
        if (!content || content.length < 3) {
          stats.journalEntriesSkipped++;
          continue;
        }
        const title = entry.heading?.trim() || localDate;
        if (timeBox) {
          const existingEntry = await prisma.journalEntry.findFirst({
            where: {
              userId: user.id,
              timeBoxId: timeBox.id,
              title,
              content: { startsWith: content.substring(0, 100) }
            }
          });
          if (existingEntry) {
            stats.journalEntriesSkipped++;
            continue;
          }
        }
        if (!dryRun && timeBox) {
          const entity = await prisma.entity.create({
            data: {
              userId: user.id,
              type: "JOURNAL_ENTRY"
            }
          });
          const journalEntry = await prisma.journalEntry.create({
            data: {
              id: entity.id,
              userId: user.id,
              typeId: diaryType.id,
              timeBoxId: timeBox.id,
              title,
              content,
              createdAt: new Date(entry.date)
            }
          });
          stats.journalEntriesCreated++;
          if (entry.tags && entry.tags.length > 0) {
            for (const tagName of entry.tags) {
              const tagKey = tagName.toLowerCase();
              let taxonomyId = taxonomyCache.get(tagKey);
              if (!taxonomyId) {
                const taxonomy = await prisma.taxonomy.create({
                  data: {
                    userId: user.id,
                    slug: slugify(tagName) + "-" + Date.now().toString(36).slice(-4),
                    shortName: tagName,
                    kind: import_client.TaxonomyKind.TAG,
                    origin: import_client.TaxonomyOrigin.IMPORT
                  }
                });
                taxonomyId = taxonomy.id;
                taxonomyCache.set(tagKey, taxonomyId);
                stats.taxonomiesCreated++;
              }
              await prisma.tagging.create({
                data: {
                  taxonomyId,
                  entityId: entity.id,
                  userId: user.id,
                  source: import_client.TaggingSource.IMPORT
                }
              }).catch(() => {
              });
              stats.taggingsCreated++;
            }
          }
          if (entry.people && entry.people.length > 0) {
            for (const personName of entry.people) {
              const personKey = personName.toLowerCase();
              let contactId = contactCache.get(personKey);
              if (!contactId) {
                const contact = await prisma.contact.create({
                  data: {
                    userId: user.id,
                    slug: slugify(personName) + "-" + Date.now().toString(36).slice(-4),
                    name: personName
                  }
                });
                contactId = contact.id;
                contactCache.set(personKey, contactId);
                stats.contactsCreated++;
              }
              await prisma.interaction.create({
                data: {
                  userId: user.id,
                  contactId,
                  timeBoxId: timeBox.id,
                  kind: "GENERAL",
                  notes: `Erw\xE4hnt in: ${title || localDate}`,
                  occurredAt: new Date(entry.date)
                }
              }).catch(() => {
              });
              stats.interactionsCreated++;
            }
          }
          if (entry.location && entry.location.length === 2) {
            const [lat, lng] = entry.location;
            const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
            let locationId = locationCache.get(locationKey);
            if (!locationId) {
              const location = await prisma.location.create({
                data: {
                  userId: user.id,
                  slug: `loc-${locationKey.replace(/[.,]/g, "-")}-${Date.now().toString(36).slice(-4)}`,
                  name: `Import ${localDate}`,
                  lat,
                  lng
                }
              });
              locationId = location.id;
              locationCache.set(locationKey, locationId);
              stats.locationsCreated++;
            }
            await prisma.locationVisit.create({
              data: {
                userId: user.id,
                locationId,
                timeBoxId: timeBox.id,
                journalEntryId: journalEntry.id,
                arrivedAt: new Date(entry.date)
              }
            }).catch(() => {
            });
            stats.locationVisitsCreated++;
          }
          if (entry.tracker && entry.tracker.length > 0 && timeBox) {
            for (const trackerStr of entry.tracker) {
              const { type, value } = parseTrackerValue(trackerStr);
              if (type === "weight" && value !== null && weightMetric) {
                const existingMeasurement = await prisma.measurement.findFirst({
                  where: {
                    userId: user.id,
                    metricId: weightMetric.id,
                    timeBoxId: timeBox.id
                  }
                });
                if (!existingMeasurement) {
                  await prisma.measurement.create({
                    data: {
                      userId: user.id,
                      metricId: weightMetric.id,
                      timeBoxId: timeBox.id,
                      valueNum: value,
                      source: import_client.MeasurementSource.IMPORT,
                      occurredAt: new Date(entry.date)
                    }
                  });
                  stats.measurementsCreated++;
                }
              }
              if (type === "steps" && value !== null && stepsMetric) {
                const existingMeasurement = await prisma.measurement.findFirst({
                  where: {
                    userId: user.id,
                    metricId: stepsMetric.id,
                    timeBoxId: timeBox.id
                  }
                });
                if (!existingMeasurement) {
                  await prisma.measurement.create({
                    data: {
                      userId: user.id,
                      metricId: stepsMetric.id,
                      timeBoxId: timeBox.id,
                      valueNum: value,
                      source: import_client.MeasurementSource.IMPORT,
                      occurredAt: new Date(entry.date)
                    }
                  });
                  stats.measurementsCreated++;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`   \u274C Fehler bei ${localDate}:`, error);
      stats.errors++;
    }
  }
  console.log("\n" + "=".repeat(50));
  console.log("\u{1F4CA} IMPORT-ZUSAMMENFASSUNG");
  console.log("=".repeat(50));
  console.log(`   TimeBoxes erstellt:     ${stats.timeBoxesCreated}`);
  console.log(`   TimeBoxes existierten:  ${stats.timeBoxesExisted}`);
  console.log(`   DayEntries erstellt:    ${stats.dayEntriesCreated}`);
  console.log(`   DayEntries aktualisiert:${stats.dayEntriesUpdated}`);
  console.log(`   JournalEntries erstellt:${stats.journalEntriesCreated}`);
  console.log(`   JournalEntries \xFCbersp.: ${stats.journalEntriesSkipped}`);
  console.log(`   Tags erstellt:          ${stats.taxonomiesCreated}`);
  console.log(`   Taggings erstellt:      ${stats.taggingsCreated}`);
  console.log(`   Kontakte erstellt:      ${stats.contactsCreated}`);
  console.log(`   Interaktionen erstellt: ${stats.interactionsCreated}`);
  console.log(`   Locations erstellt:     ${stats.locationsCreated}`);
  console.log(`   Location-Besuche erst.: ${stats.locationVisitsCreated}`);
  console.log(`   Messungen erstellt:     ${stats.measurementsCreated}`);
  console.log(`   Fehler:                 ${stats.errors}`);
  console.log("=".repeat(50));
  if (dryRun) {
    console.log("\n\u26A0\uFE0F  DRY-RUN: Keine \xC4nderungen wurden vorgenommen.");
    console.log("   F\xFChre den Befehl ohne --dry-run aus, um den Import durchzuf\xFChren.");
  } else {
    console.log("\n\u2705 Import abgeschlossen!");
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Verwendung: npx ts-node scripts/import-diarium.ts <path-to-json> [--dry-run]");
    console.log("");
    console.log("Beispiel:");
    console.log("  npx ts-node scripts/import-diarium.ts uploads/temp/Diarium_2022-04-13_2024-12-25.json --dry-run");
    console.log("  npx ts-node scripts/import-diarium.ts uploads/temp/Diarium_2022-04-13_2024-12-25.json");
    process.exit(1);
  }
  const jsonPath = args[0];
  const dryRun = args.includes("--dry-run");
  if (!fs.existsSync(jsonPath)) {
    console.error(`\u274C Datei nicht gefunden: ${jsonPath}`);
    process.exit(1);
  }
  try {
    await importDiarium(jsonPath, dryRun);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(console.error);
