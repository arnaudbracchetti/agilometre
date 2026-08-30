-- Filet de sécurité contre les doublons d'email de compte (comparaison insensible à la casse) :
-- la garde principale vit côté applicatif (UtilisateurRepository.trouverParEmail), cet index
-- protège contre une race condition entre deux écritures concurrentes. Index fonctionnel sur
-- LOWER(email), non représentable dans schema.prisma (pas d'index d'expression natif) — même
-- patron que entite_nom_unique_ci, voir docs/design/agregat-politique-des-droits.md.
CREATE UNIQUE INDEX "utilisateur_email_unique_ci" ON "Utilisateur" (LOWER(email));
