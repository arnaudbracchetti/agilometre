-- Défaut 0 explicite (plutôt que le rejet par défaut de Prisma sur colonne requise sans valeur) :
-- ce schéma est déployé on-premise chez chaque client (CLAUDE.md), potentiellement avec un
-- Référentiel déjà importé — un DEFAULT permet à la migration de s'appliquer sans backfill manuel
-- préalable. Un ré-import du Référentiel après migration restaure un ordre correct par Thème
-- (prisma-referentiel.repository.ts assigne `ordre` depuis la position dans le fichier importé).
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ModeleSession" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionItem" (
    "id" TEXT NOT NULL,
    "modeleSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "SelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SelectionItem_modeleSessionId_idx" ON "SelectionItem"("modeleSessionId");

-- AddForeignKey
ALTER TABLE "SelectionItem" ADD CONSTRAINT "SelectionItem_modeleSessionId_fkey" FOREIGN KEY ("modeleSessionId") REFERENCES "ModeleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
