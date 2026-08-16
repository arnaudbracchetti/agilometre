/*
  Warnings:

  - Added the required column `modeleSessionId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "ordre" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "modeleSessionId" TEXT NOT NULL,
ADD COLUMN     "verrouillee" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SessionSelectionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "SessionSelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionSelectionItem_sessionId_idx" ON "SessionSelectionItem"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionSelectionItem" ADD CONSTRAINT "SessionSelectionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
