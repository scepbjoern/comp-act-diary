-- AlterTable
ALTER TABLE "public"."DayNote" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "public"."UserSettings" ADD COLUMN     "summaryModel" TEXT NOT NULL DEFAULT 'openai/gpt-oss-120b',
ADD COLUMN     "summaryPrompt" TEXT NOT NULL DEFAULT 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"',
ADD COLUMN     "transcriptionModel" TEXT NOT NULL DEFAULT 'gpt-4o-transcribe';

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

-- CreateIndex
CREATE UNIQUE INDEX "DaySummary_dayEntryId_key" ON "public"."DaySummary"("dayEntryId");

-- AddForeignKey
ALTER TABLE "public"."DaySummary" ADD CONSTRAINT "DaySummary_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
