/*
  Warnings:

  - You are about to drop the column `motDePasseHash` on the `Membre` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Membre` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Membre" DROP CONSTRAINT "Membre_equipeId_fkey";

-- DropIndex
DROP INDEX "Membre_email_key";

-- AlterTable
ALTER TABLE "Membre" DROP COLUMN "motDePasseHash",
DROP COLUMN "role",
ADD COLUMN     "utilisateurId" TEXT;

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Filet de sécurité contre les doublons de nom d'Équipe (comparaison insensible à la casse,
-- globale à l'Organisation) : la garde principale vit côté applicatif (use cases
-- CreerEquipe/RenommerEquipe, via EquipeRepository.trouverParNom), cet index protège contre une
-- race condition entre deux écritures concurrentes. Index fonctionnel sur LOWER(nom), non
-- représentable dans schema.prisma — même pattern que entite_nom_unique_ci.
CREATE UNIQUE INDEX "equipe_nom_unique_ci" ON "Equipe" (LOWER(nom));
