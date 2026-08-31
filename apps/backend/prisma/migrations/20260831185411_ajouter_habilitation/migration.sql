-- CreateTable
CREATE TABLE "Habilitation" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "entiteId" TEXT,
    "equipeId" TEXT,

    CONSTRAINT "Habilitation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Habilitation" ADD CONSTRAINT "Habilitation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
