/*
  Warnings:

  - You are about to drop the column `audioFilePath` on the `DayNote` table. All the data in the column will be lost.
  - You are about to drop the `DayNotePhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReflectionFields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReflectionPhoto` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[audioFileId]` on the table `DayNote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `DayNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Reflection` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."DayEntry" DROP CONSTRAINT "DayEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DayNote" DROP CONSTRAINT "DayNote_dayEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DayNotePhoto" DROP CONSTRAINT "DayNotePhoto_dayNoteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Habit" DROP CONSTRAINT "Habit_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HabitIcon" DROP CONSTRAINT "HabitIcon_habitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HabitIcon" DROP CONSTRAINT "HabitIcon_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HabitTick" DROP CONSTRAINT "HabitTick_dayEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HabitTick" DROP CONSTRAINT "HabitTick_habitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reflection" DROP CONSTRAINT "Reflection_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReflectionFields" DROP CONSTRAINT "ReflectionFields_dayNoteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReflectionPhoto" DROP CONSTRAINT "ReflectionPhoto_reflectionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoolScore" DROP CONSTRAINT "StoolScore_dayEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SymptomIcon" DROP CONSTRAINT "SymptomIcon_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SymptomScore" DROP CONSTRAINT "SymptomScore_dayEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserLink" DROP CONSTRAINT "UserLink_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSettings" DROP CONSTRAINT "UserSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSymptom" DROP CONSTRAINT "UserSymptom_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSymptomScore" DROP CONSTRAINT "UserSymptomScore_dayEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSymptomScore" DROP CONSTRAINT "UserSymptomScore_userSymptomId_fkey";

-- Step 1: Add updatedAt as nullable first
ALTER TABLE "public"."DayNote" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "public"."Reflection" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Step 2: Set default values for existing rows
UPDATE "public"."DayNote" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "public"."Reflection" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Step 3: Make updatedAt NOT NULL
ALTER TABLE "public"."DayNote" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "public"."Reflection" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Step 4: Create new media tables
CREATE TABLE "public"."AudioFile" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PhotoFile" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayNoteId" TEXT,
    "reflectionId" TEXT,

    CONSTRAINT "PhotoFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DailyReflectionFields" (
    "id" TEXT NOT NULL,
    "dayNoteId" TEXT NOT NULL,
    "changed" TEXT,
    "gratitude" TEXT,
    "vows" TEXT,

    CONSTRAINT "DailyReflectionFields_pkey" PRIMARY KEY ("id")
);

-- Step 5: Add audioFileId column to DayNote
ALTER TABLE "public"."DayNote" ADD COLUMN "audioFileId" TEXT;

-- Step 6: Migrate audio files
INSERT INTO "public"."AudioFile" ("id", "filePath", "fileName", "mimeType", "sizeBytes", "uploadedAt")
SELECT 
    gen_random_uuid(),
    "audioFilePath",
    substring("audioFilePath" from '[^/]+$'),
    CASE 
        WHEN "audioFilePath" LIKE '%.webm' THEN 'audio/webm'
        WHEN "audioFilePath" LIKE '%.m4a' THEN 'audio/m4a'
        WHEN "audioFilePath" LIKE '%.mp3' THEN 'audio/mpeg'
        ELSE 'audio/webm'
    END,
    0,  -- Size unknown, will be 0
    "createdAt"
FROM "public"."DayNote"
WHERE "audioFilePath" IS NOT NULL;

-- Step 7: Link DayNote to AudioFile
UPDATE "public"."DayNote" dn
SET "audioFileId" = af."id"
FROM "public"."AudioFile" af
WHERE dn."audioFilePath" = af."filePath";

-- Step 8: Migrate photos from DayNotePhoto
INSERT INTO "public"."PhotoFile" ("id", "filePath", "fileName", "mimeType", "sizeBytes", "dayNoteId", "uploadedAt")
SELECT 
    dnp."id",
    dnp."url",
    substring(dnp."url" from '[^/]+$'),
    CASE 
        WHEN dnp."url" LIKE '%.jpg' OR dnp."url" LIKE '%.jpeg' THEN 'image/jpeg'
        WHEN dnp."url" LIKE '%.png' THEN 'image/png'
        WHEN dnp."url" LIKE '%.webp' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    0,  -- Size unknown
    dnp."dayNoteId",
    CURRENT_TIMESTAMP
FROM "public"."DayNotePhoto" dnp;

-- Step 9: Migrate photos from ReflectionPhoto
INSERT INTO "public"."PhotoFile" ("id", "filePath", "fileName", "mimeType", "sizeBytes", "reflectionId", "uploadedAt")
SELECT 
    rp."id",
    rp."url",
    substring(rp."url" from '[^/]+$'),
    CASE 
        WHEN rp."url" LIKE '%.jpg' OR rp."url" LIKE '%.jpeg' THEN 'image/jpeg'
        WHEN rp."url" LIKE '%.png' THEN 'image/png'
        WHEN rp."url" LIKE '%.webp' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    0,  -- Size unknown
    rp."reflectionId",
    CURRENT_TIMESTAMP
FROM "public"."ReflectionPhoto" rp;

-- Step 10: Migrate ReflectionFields to DailyReflectionFields
INSERT INTO "public"."DailyReflectionFields" ("id", "dayNoteId", "changed", "gratitude", "vows")
SELECT "id", "dayNoteId", "changed", "gratitude", "vows"
FROM "public"."ReflectionFields";

-- Step 11: Drop old audioFilePath column
ALTER TABLE "public"."DayNote" DROP COLUMN "audioFilePath";

-- Step 12: Drop old tables
-- DropTable
DROP TABLE "public"."DayNotePhoto";

-- DropTable
DROP TABLE "public"."ReflectionFields";

-- DropTable
DROP TABLE "public"."ReflectionPhoto";

-- Step 13: Create indexes
-- CreateIndex
CREATE UNIQUE INDEX "AudioFile_filePath_key" ON "public"."AudioFile"("filePath");

-- CreateIndex
CREATE INDEX "AudioFile_filePath_idx" ON "public"."AudioFile"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoFile_filePath_key" ON "public"."PhotoFile"("filePath");

-- CreateIndex
CREATE INDEX "PhotoFile_filePath_idx" ON "public"."PhotoFile"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReflectionFields_dayNoteId_key" ON "public"."DailyReflectionFields"("dayNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "DayNote_audioFileId_key" ON "public"."DayNote"("audioFileId");

-- CreateIndex
CREATE INDEX "DayNote_type_dayEntryId_idx" ON "public"."DayNote"("type", "dayEntryId");

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayEntry" ADD CONSTRAINT "DayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomScore" ADD CONSTRAINT "SymptomScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoolScore" ADD CONSTRAINT "StoolScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitTick" ADD CONSTRAINT "HabitTick_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitTick" ADD CONSTRAINT "HabitTick_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayNote" ADD CONSTRAINT "DayNote_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayNote" ADD CONSTRAINT "DayNote_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "public"."AudioFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoFile" ADD CONSTRAINT "PhotoFile_dayNoteId_fkey" FOREIGN KEY ("dayNoteId") REFERENCES "public"."DayNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoFile" ADD CONSTRAINT "PhotoFile_reflectionId_fkey" FOREIGN KEY ("reflectionId") REFERENCES "public"."Reflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyReflectionFields" ADD CONSTRAINT "DailyReflectionFields_dayNoteId_fkey" FOREIGN KEY ("dayNoteId") REFERENCES "public"."DayNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reflection" ADD CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLink" ADD CONSTRAINT "UserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSymptom" ADD CONSTRAINT "UserSymptom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomIcon" ADD CONSTRAINT "SymptomIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSymptomScore" ADD CONSTRAINT "UserSymptomScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSymptomScore" ADD CONSTRAINT "UserSymptomScore_userSymptomId_fkey" FOREIGN KEY ("userSymptomId") REFERENCES "public"."UserSymptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
