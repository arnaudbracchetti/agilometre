---
status: accepted
---

# ETag calculé sur la réponse, plutôt qu'un compteur de révision dans le domaine

Les trois écrans de la séance animée se synchronisent par sondage HTTP (PRD §10), le plus souvent
sans que rien n'ait changé — le Coach agit toutes les quelques minutes. Il faut donc un moyen de
répondre « inchangé » sans retransmettre l'état complet.

**Décision.** Chaque point de lecture renvoie un **ETag calculé à partir de sa propre réponse**
(mécanisme HTTP standard, largement pris en charge par Express sous NestJS) ; un client qui
represente un ETag identique reçoit `304 Not Modified` sans corps. **Aucun numéro de révision
n'est stocké**, ni sur `Session`, ni ailleurs.

**Pourquoi pas un compteur de révision.** L'option initialement envisagée était deux compteurs
portés par `Session` — l'un pour le déroulement, l'autre pour les votes — afin que l'écran
participant, qui n'affiche jamais le Compteur de participation, ne soit pas réveillé à chaque
vote des autres. Deux problèmes :

1. **Il aurait cassé la frontière d'agrégat.** `TourDeVote` a été sorti de `Session`
   ([agregat-tour-de-vote.md](../design/agregat-tour-de-vote.md) §1) précisément pour qu'un vote
   ne charge pas la Session entière. Un compteur « votes » porté par `Session` aurait forcé
   chaque vote à charger **et** sauver la Session, annulant ce bénéfice et créant de la
   contention sur une seule ligne quand toute la salle vote en même temps.
2. **La règle aurait dû être maintenue à la main.** Incrémenter le mauvais compteur — ou oublier
   d'incrémenter à l'ouverture d'un Tour — n'aurait rien cassé de visible : les écrans auraient
   continué de fonctionner, simplement plus bavards ou en retard. Un bug silencieux par
   construction.

Avec l'ETag, la propriété recherchée **découle du contenu de chaque vue** au lieu d'être une
règle à tenir : le Compteur de participation n'apparaît pas dans la charge utile du participant,
donc celle-ci reste identique octet pour octet pendant qu'on vote autour de lui, donc son ETag
ne bouge pas. Rien à incrémenter, rien à oublier.

**Le compromis assumé.** Un compteur stocké aurait permis de répondre 304 après une lecture
minuscule, sans construire la réponse ; l'ETag oblige à la construire puis à la jeter si elle est
inchangée. L'économie porte donc sur la bande passante, pas sur les requêtes en base — sans
importance à l'échelle visée (~5 req/s par séance, requêtes indexées, déploiement on-premise).
