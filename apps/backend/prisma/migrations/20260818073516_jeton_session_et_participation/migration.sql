-- CreateTable
CREATE TABLE "JetonSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "tourId" TEXT NOT NULL,
    "jetonId" TEXT NOT NULL,
    "reponseId" TEXT NOT NULL,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("tourId","jetonId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participation_reponseId_key" ON "Participation"("reponseId");

-- CreateIndex
CREATE INDEX "TourDeVote_sessionId_clotureLe_idx" ON "TourDeVote"("sessionId", "clotureLe");

-- AddForeignKey
ALTER TABLE "JetonSession" ADD CONSTRAINT "JetonSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourDeVote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_jetonId_fkey" FOREIGN KEY ("jetonId") REFERENCES "JetonSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "Reponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
