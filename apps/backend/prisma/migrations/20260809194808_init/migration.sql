-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COACH', 'MANAGER', 'DIRECTION');

-- CreateEnum
CREATE TYPE "OrigineReponse" AS ENUM ('SESSION', 'POULS');

-- CreateEnum
CREATE TYPE "StatutSession" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entite" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Entite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membre" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "equipeId" TEXT NOT NULL,
    "motDePasseHash" TEXT,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutSession" NOT NULL DEFAULT 'OUVERTE',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDeVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ouvertLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clotureLe" TIMESTAMP(3),

    CONSTRAINT "TourDeVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampagnePouls" (
    "id" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "rythmeJours" INTEGER NOT NULL,
    "questionsParEnvoi" INTEGER NOT NULL DEFAULT 1,
    "dateFin" TIMESTAMP(3),

    CONSTRAINT "CampagnePouls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sollicitation" (
    "id" TEXT NOT NULL,
    "campagneId" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "envoyeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "honoreeLe" TIMESTAMP(3),

    CONSTRAINT "Sollicitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reponse" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL,
    "equipeId" TEXT NOT NULL,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origine" "OrigineReponse" NOT NULL,
    "tourId" TEXT,

    CONSTRAINT "Reponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membre_email_key" ON "Membre"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sollicitation_tokenHash_key" ON "Sollicitation"("tokenHash");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourDeVote" ADD CONSTRAINT "TourDeVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampagnePouls" ADD CONSTRAINT "CampagnePouls_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sollicitation" ADD CONSTRAINT "Sollicitation_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "CampagnePouls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reponse" ADD CONSTRAINT "Reponse_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourDeVote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
