-- Filet de sécurité contre les doublons de nom d'Entité (comparaison insensible à la casse) :
-- la garde principale vit côté applicatif (use cases CreerEntite/RenommerEntite, via
-- EntiteRepository.trouverParNom), cet index protège contre une race condition entre deux
-- écritures concurrentes. Index fonctionnel sur LOWER(nom), non représentable dans
-- schema.prisma (pas d'index d'expression natif) — voir docs/design/agregat-organisation.md.
CREATE UNIQUE INDEX "entite_nom_unique_ci" ON "Entite" (LOWER(nom));
