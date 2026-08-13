-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "retireeLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "retireLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Referentiel" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "derniereMajLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referentiel_pkey" PRIMARY KEY ("id")
);
