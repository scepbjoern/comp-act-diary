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
CREATE INDEX "ChatMethod_userId_idx" ON "public"."ChatMethod"("userId");

-- AddForeignKey
ALTER TABLE "public"."ChatMethod" ADD CONSTRAINT "ChatMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
