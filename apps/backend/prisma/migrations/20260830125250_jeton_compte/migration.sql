-- CreateTable
CREATE TABLE "JetonCompte" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "consommeLe" TIMESTAMP(3),

    CONSTRAINT "JetonCompte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JetonCompte_tokenHash_key" ON "JetonCompte"("tokenHash");

-- AddForeignKey
ALTER TABLE "JetonCompte" ADD CONSTRAINT "JetonCompte_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
