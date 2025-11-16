-- AlterTable
ALTER TABLE "public"."DayNote" ADD COLUMN     "audioFilePath" TEXT,
ADD COLUMN     "keepAudio" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "originalTranscript" TEXT;
