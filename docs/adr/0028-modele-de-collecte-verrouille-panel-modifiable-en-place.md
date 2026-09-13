---
status: accepted
---

# Modèle de collecte verrouillé après création, Panel modifiable en place

Le ticket [#69](https://github.com/arnaudbracchetti/agilometre/issues/69) de la carte
[Cartographie : Campagne de pouls #67](https://github.com/arnaudbracchetti/agilometre/issues/67)
tranchait entre autres ce que l'écran « Collecte d'informations » permet de modifier une fois une
Campagne créée. Le prototype comparé (`/prototype/collecte-informations`, branche
`prototype/collecte-informations`) exposait initialement un remplacement du Modèle source en cours
de route, ce que [docs/design/agregat-campagne-de-pouls.md](../design/agregat-campagne-de-pouls.md)
§3 signalait explicitement comme un point ouvert (« effet sur le cycle courant des Membres »).

**Décision.** Le Modèle de collecte source d'une Campagne est **verrouillé après création** :
aucune opération ne permet de le remplacer une fois la Campagne créée. Pour utiliser un autre
Modèle, le Coach **termine** la Campagne en cours et en **crée une nouvelle** - qui copie une
Sélection figée de ce nouveau Modèle, exactement comme à la création initiale
([ADR-0009](0009-selection-session-copie-figee.md)).

Le Panel (la Sélection copiée) reste en revanche **modifiable en place** après création,
indépendamment du Modèle source : ajout, retrait et réordonnancement de Questions sont permis tant
que la Campagne n'est pas Terminée, via un écran dédié (sur le patron de
`sessions/ajustement-page`, réutilisant le `SelectionEditor` partagé). Rien de nouveau ici : c'est
exactement le traitement déjà appliqué à la Sélection d'une Session.

**Ajouter ou retirer une Question du Panel réinitialise le cycle de tirage de tous les Membres de
l'Équipe** - repart de zéro, comme si aucune Question n'avait encore été posée dans ce cycle. Un
simple réordonnancement, qui ne change pas le contenu, ne réinitialise rien. Puisque le Cycle est
entièrement dérivé de l'historique des Sollicitations plutôt que persisté
([docs/design/agregat-campagne-de-pouls.md](../design/agregat-campagne-de-pouls.md) §4), cette
réinitialisation devra ignorer l'historique antérieur à la modification du Panel lors de
l'implémentation du tirage - un détail d'implémentation, pas une décision de conception
supplémentaire.

**Au plus une Campagne non-Terminée par Équipe** : le bouton « Créer une Campagne » n'est actif que
si l'Équipe n'a aucune Campagne, ou que la précédente est Terminée. Cette règle est plus stricte que
le seul « au plus une ACTIVE » déjà posé (conception de l'agrégat §2) : elle interdit aussi la
coexistence d'une Brouillon ou d'une Suspendue avec une tentative de recréation.

**Conséquences.**

- Le Modèle de collecte source (`modeleCollecteId`) reste un scalaire nu sans opération de
  remplacement - aucune commande « changer le Modèle » à concevoir ni implémenter.
- L'écran de modification de la Campagne (rythme, nombre de Questions par envoi, Panel) est un
  écran séparé, pas des champs édités en ligne sur la fiche.
- L'implémentation du tirage devra pouvoir ignorer l'historique des Sollicitations antérieur à la
  dernière modification du contenu du Panel (ajout/retrait) - à concevoir dans la carte
  d'implémentation du tirage, pas ici.
- La garde applicative « au plus une active » (repository + index unique partiel, conception de
  l'agrégat §6) devra être élargie ou doublée d'une garde à la création couvrant aussi Brouillon et
  Suspendue.

**Alternatives écartées.**

- **Permettre le changement de Modèle en cours de route** : rouvrait la question déjà tranchée pour
  la Sélection d'une Session (copie figée, jamais un lien vivant) et posait un problème neuf sans
  bénéfice net - terminer puis recréer couvre le même besoin sans code supplémentaire.
- **Ne pas réinitialiser le cycle au changement de contenu du Panel** : aurait laissé des Questions
  retirées peser sur l'exclusion, et de nouvelles Questions moins posées que les anciennes - un
  déséquilibre que la remise à zéro évite simplement.
