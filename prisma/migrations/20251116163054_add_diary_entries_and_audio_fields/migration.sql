/*
  Warnings:

  - You are about to drop the column `notes` on the `DayEntry` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."NoteType" ADD VALUE 'DIARY';

-- AlterTable
ALTER TABLE "public"."DayEntry" DROP COLUMN "notes";
