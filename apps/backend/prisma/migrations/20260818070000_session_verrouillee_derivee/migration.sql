-- AlterTable
-- verrouillee est désormais dérivée de statut (Session.estVerrouillee()), plus sa propre colonne.
ALTER TABLE "Session" DROP COLUMN "verrouillee";
