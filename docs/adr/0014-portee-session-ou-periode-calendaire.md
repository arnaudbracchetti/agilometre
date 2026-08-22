---
status: accepted
---

# Portée du scoring : une Session isolée, ou une Période calendaire - jamais une fenêtre glissante

Le moteur de scoring (Epic #10) doit restituer aussi bien le résultat d'une séance qu'une vue
synthétique d'Équipe avec historique. Ces deux besoins n'ont pas le même rapport au temps.

**Décision.** Deux modes de Portée, exclusifs : **Session** (le résultat d'une séance donnée, hors
toute notion de période) et **périodique** (Équipe ou Entité, sur une **Période de calcul**
calendaire contiguë, de durée fixée pour toute l'instance et **alignée sur le calendrier pour
toutes les Équipes**). La vue synthétique affiche la Période en cours, signalée comme telle.

**Alternative écartée.** Une fenêtre glissante recalculée en continu (terme employé par le PRD §6,
mais uniquement à propos du Pouls) donnerait une Tendance sans points discrets comparables, et des
bornes ancrées par Équipe (ex. sur sa première Session) empêcheraient le Mur de badges et
l'agrégation Entité de comparer des Équipes sur le même intervalle. L'exigence d'anonymat du PRD §5
("jamais une Réponse isolée à une date") reste satisfaite par une Période calendaire commune - à
reconcilier avec la fenêtre glissante du Pouls lors du `/grill-with-docs` de l'Epic #9.
