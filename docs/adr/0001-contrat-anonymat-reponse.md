---
status: accepted
---

# Contrat d'anonymat Réponse/Sollicitation : jeton comme seul pointeur, jamais persisté

Le schéma actuel (`apps/backend/prisma/schema.prisma`) n'a aucune clé étrangère entre `Reponse`
et `Membre`, ni entre `Reponse` et `Sollicitation` — conformément au PRD §5, qui interdit tout
lien membre ↔ réponse. Cette forme est ratifiée comme le contrat d'anonymat définitif : aucun
champ supplémentaire n'y sera ajouté pour renforcer l'anonymat au niveau du schéma. Le risque de
corrélation par petit effectif (une équipe réduite où une seule réponse suffirait à deviner
l'auteur) est délibérément traité en aval — agrégation temporelle et restriction d'affichage
(PRD §5) — plutôt que par un verrou dans le modèle de données.

**Mécanisme de rapprochement.** Le `tokenHash` d'une `Sollicitation` est l'unique pointeur vers
elle. À la réception d'une réponse au pouls, l'application résout le jeton → `Sollicitation`
(qui porte `membreId` et `questionId`), puis dans une seule transaction : insère la `Reponse`
(sans `membreId` ni référence au jeton) et met à jour `Sollicitation.honoreeLe = now()`. Il n'y a
jamais de rapprochement a posteriori par membre+question — le lien passe uniquement par le jeton,
au moment précis où il est sur le point d'être écarté.

**Protection contre le rejeu.** La mise à jour de `honoreeLe` est conditionnée par
`WHERE honoreeLe IS NULL` dans la transaction, plutôt que par un champ dédié de type
"jeton consommé" : un rejeu du même jeton après un premier honorage ne peut plus modifier
`Sollicitation` ni produire une seconde `Reponse` associée par erreur.

**Hors périmètre de cette décision.** Le comptage de participation en direct pendant une séance
animée (PRD §7, "6 sur 8") repose sur un mécanisme distinct, jamais lié à `Reponse`, à trancher au
démarrage de l'Epic Session animée.
