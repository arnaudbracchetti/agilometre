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

**Addendum (conception de l'Epic #9, carte #67).** La réconciliation annoncée ci-dessus est tranchée :
il n'y a **rien à réconcilier**, la fenêtre glissante du Pouls est abandonnée comme concept. Les
Réponses d'origine Pouls entrent dans les mêmes Périodes de calcul que celles des Sessions et s'y
mélangent sans distinction d'origine. Deux découpages temporels concurrents auraient produit deux
Paliers différents pour la même Équipe au même instant, et auraient rendu incomparables deux Équipes
dont l'une pratique le pouls et l'autre non - exactement ce que l'alignement calendaire ci-dessus
vise à empêcher. Cette décision étend donc la portée de cet ADR au Pouls, sans en amender le fond.
Voir PRD §6 et [annexe Campagne de pouls](../../doc/spec/annexes/campagne-de-pouls.md) §5.
