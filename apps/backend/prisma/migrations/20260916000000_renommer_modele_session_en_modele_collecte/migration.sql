-- Renommage ModeleSession -> ModeleCollecte (ADR-0027) : un vrai `ALTER TABLE ... RENAME`,
-- écrit à la main (Prisma ne génère pas de rename fiable seul). Pas de `@@map` — le renommage va
-- jusqu'au nom de table. Les migrations historiques précédentes ne sont pas renommées.
ALTER TABLE "ModeleSession" RENAME TO "ModeleCollecte";
ALTER TABLE "ModeleCollecte" RENAME CONSTRAINT "ModeleSession_pkey" TO "ModeleCollecte_pkey";

ALTER TABLE "SelectionItem" RENAME COLUMN "modeleSessionId" TO "modeleCollecteId";
ALTER INDEX "SelectionItem_modeleSessionId_idx" RENAME TO "SelectionItem_modeleCollecteId_idx";
ALTER TABLE "SelectionItem" RENAME CONSTRAINT "SelectionItem_modeleSessionId_fkey" TO "SelectionItem_modeleCollecteId_fkey";

ALTER TABLE "Session" RENAME COLUMN "modeleSessionId" TO "modeleCollecteId";
