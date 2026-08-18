-- AlterEnum
-- Ajout de PREPAREE ne suffit pas : OUVERTE n'avait jusqu'ici jamais eu de sens différent de
-- "pas encore clôturée" (docs/design/agregat-session.md) — les lignes existantes remigrent donc
-- vers PREPAREE, CLOTUREE ne bouge pas. Postgres ne permet pas de remapper des données via un
-- simple ALTER TYPE ADD VALUE, d'où le patron create-new-type/swap.
CREATE TYPE "StatutSession_new" AS ENUM ('PREPAREE', 'OUVERTE', 'CLOTUREE');
ALTER TABLE "Session" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Session" ALTER COLUMN "statut" TYPE "StatutSession_new" USING (
  CASE "statut"::text WHEN 'OUVERTE' THEN 'PREPAREE' ELSE "statut"::text END
)::"StatutSession_new";
DROP TYPE "StatutSession";
ALTER TYPE "StatutSession_new" RENAME TO "StatutSession";
ALTER TABLE "Session" ALTER COLUMN "statut" SET DEFAULT 'PREPAREE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "code" TEXT,
ADD COLUMN     "indexCourant" INTEGER NOT NULL DEFAULT -1;

-- CreateTable
CREATE TABLE "SessionQuestionSautee" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "SessionQuestionSautee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionQuestionSautee_sessionId_questionId_key" ON "SessionQuestionSautee"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "SessionQuestionSautee" ADD CONSTRAINT "SessionQuestionSautee_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariant "code unique parmi les Sessions OUVERTE" (docs/design/agregat-tour-de-vote.md §2) —
-- index partiel, non représentable dans schema.prisma (même limitation que Entite.nom).
CREATE UNIQUE INDEX "Session_code_ouverte_key" ON "Session" ("code") WHERE "statut" = 'OUVERTE';
