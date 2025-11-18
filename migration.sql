-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Phase" AS ENUM ('PHASE_1', 'PHASE_2', 'PHASE_3');

-- CreateEnum
CREATE TYPE "public"."CareCategory" AS ENUM ('SANFT', 'MEDIUM', 'INTENSIV');

-- CreateEnum
CREATE TYPE "public"."SymptomType" AS ENUM ('BESCHWERDEFREIHEIT', 'ENERGIE', 'STIMMUNG', 'SCHLAF', 'ENTSPANNUNG', 'HEISSHUNGERFREIHEIT', 'BEWEGUNG');

-- CreateEnum
CREATE TYPE "public"."NoteType" AS ENUM ('MEAL', 'REFLECTION', 'DIARY');

-- CreateEnum
CREATE TYPE "public"."ReflectionKind" AS ENUM ('WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "public"."HabitIcon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "HabitIcon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileImageUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSettings" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "timeFormat24h" BOOLEAN NOT NULL DEFAULT true,
    "weekStart" TEXT NOT NULL DEFAULT 'mon',
    "autosaveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autosaveIntervalSec" INTEGER NOT NULL DEFAULT 5,
    "transcriptionModel" TEXT NOT NULL DEFAULT 'gpt-4o-transcribe',
    "summaryModel" TEXT NOT NULL DEFAULT 'openai/gpt-oss-120b',
    "summaryPrompt" TEXT NOT NULL DEFAULT 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"',

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" "public"."Phase" NOT NULL,
    "careCategory" "public"."CareCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DaySummary" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sources" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DaySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SymptomScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "type" "public"."SymptomType" NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "SymptomScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoolScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "bristol" INTEGER NOT NULL,

    CONSTRAINT "StoolScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HabitTick" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HabitTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayNote" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "type" "public"."NoteType" NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keepAudio" BOOLEAN NOT NULL DEFAULT true,
    "originalTranscript" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "audioFileId" TEXT,

    CONSTRAINT "DayNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "public"."DailyReflectionFields" (
    "id" TEXT NOT NULL,
    "dayNoteId" TEXT NOT NULL,
    "changed" TEXT,
    "gratitude" TEXT,
    "vows" TEXT,

    CONSTRAINT "DailyReflectionFields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "public"."ReflectionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed" TEXT,
    "gratitude" TEXT,
    "vows" TEXT,
    "remarks" TEXT,
    "weightKg" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSymptom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,

    CONSTRAINT "UserSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SymptomIcon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."SymptomType" NOT NULL,
    "icon" TEXT,

    CONSTRAINT "SymptomIcon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSymptomScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "userSymptomId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "UserSymptomScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitIcon_userId_habitId_key" ON "public"."HabitIcon"("userId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DayEntry_userId_date_key" ON "public"."DayEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DaySummary_dayEntryId_key" ON "public"."DaySummary"("dayEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomScore_dayEntryId_type_key" ON "public"."SymptomScore"("dayEntryId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StoolScore_dayEntryId_key" ON "public"."StoolScore"("dayEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitTick_dayEntryId_habitId_key" ON "public"."HabitTick"("dayEntryId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "DayNote_audioFileId_key" ON "public"."DayNote"("audioFileId");

-- CreateIndex
CREATE INDEX "DayNote_type_dayEntryId_idx" ON "public"."DayNote"("type", "dayEntryId");

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
CREATE INDEX "Reflection_userId_createdAt_idx" ON "public"."Reflection"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserLink_userId_createdAt_idx" ON "public"."UserLink"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSymptom_userId_sortIndex_idx" ON "public"."UserSymptom"("userId", "sortIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomIcon_userId_type_key" ON "public"."SymptomIcon"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserSymptomScore_dayEntryId_userSymptomId_key" ON "public"."UserSymptomScore"("dayEntryId", "userSymptomId");

-- CreateIndex
CREATE INDEX "ChatMethod_userId_idx" ON "public"."ChatMethod"("userId");

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayEntry" ADD CONSTRAINT "DayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DaySummary" ADD CONSTRAINT "DaySummary_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomScore" ADD CONSTRAINT "SymptomScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoolScore" ADD CONSTRAINT "StoolScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitTick" ADD CONSTRAINT "HabitTick_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitTick" ADD CONSTRAINT "HabitTick_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayNote" ADD CONSTRAINT "DayNote_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "public"."AudioFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayNote" ADD CONSTRAINT "DayNote_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."ChatMethod" ADD CONSTRAINT "ChatMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

