-- Add originalTranscript column to JournalEntry
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "originalTranscript" TEXT;
