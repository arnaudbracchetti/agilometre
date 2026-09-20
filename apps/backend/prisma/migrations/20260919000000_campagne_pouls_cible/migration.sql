-- CreateEnum
CREATE TYPE "StatutCampagne" AS ENUM ('BROUILLON', 'ACTIVE', 'SUSPENDUE', 'TERMINEE');

-- DropForeignKey
ALTER TABLE "Sollicitation" DROP CONSTRAINT "Sollicitation_campagneId_fkey";

-- AlterTable
ALTER TABLE "CampagnePouls" DROP COLUMN "dateFin",
DROP COLUMN "rythmeJours",
ADD COLUMN     "heureEnvoi" INTEGER NOT NULL,
ADD COLUMN     "joursEnvoi" INTEGER[],
ADD COLUMN     "modeleCollecteId" TEXT NOT NULL,
ADD COLUMN     "statut" "StatutCampagne" NOT NULL DEFAULT 'BROUILLON',
ALTER COLUMN "questionsParEnvoi" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Sollicitation" DROP COLUMN "questionId",
ALTER COLUMN "envoyeeLe" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CampagnePanelItem" (
    "id" TEXT NOT NULL,
    "campagneId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "CampagnePanelItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SollicitationQuestion" (
    "sollicitationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "SollicitationQuestion_pkey" PRIMARY KEY ("sollicitationId","questionId")
);

-- CreateIndex
CREATE INDEX "CampagnePanelItem_campagneId_idx" ON "CampagnePanelItem"("campagneId");

-- CreateIndex
CREATE INDEX "Sollicitation_campagneId_envoyeeLe_idx" ON "Sollicitation"("campagneId", "envoyeeLe");

-- CreateIndex
CREATE UNIQUE INDEX "Sollicitation_campagneId_membreId_envoyeeLe_key" ON "Sollicitation"("campagneId", "membreId", "envoyeeLe");

-- AddForeignKey
ALTER TABLE "CampagnePanelItem" ADD CONSTRAINT "CampagnePanelItem_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "CampagnePouls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sollicitation" ADD CONSTRAINT "Sollicitation_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "CampagnePouls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SollicitationQuestion" ADD CONSTRAINT "SollicitationQuestion_sollicitationId_fkey" FOREIGN KEY ("sollicitationId") REFERENCES "Sollicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

