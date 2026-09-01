-- AlterTable
ALTER TABLE "Membre" ADD COLUMN     "prenom" TEXT;

-- CreateIndex
CREATE INDEX "Membre_utilisateurId_idx" ON "Membre"("utilisateurId");

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
