# Spécification fonctionnelle - Campagne de pouls

> **État : cadrage produit tranché, conception en cours.** Ce document porte les décisions arrêtées
> à l'ouverture de la [carte Campagne de pouls #67](https://github.com/arnaudbracchetti/agilometre/issues/67).
> Les blocs **« À trancher »** signalent ce qui reste ouvert et renvoient au ticket qui le résout ;
> ils disparaîtront avec ce bandeau quand la carte atteindra sa destination.

Complète le [PRD](../PRD-maturite-agile.md) §8 (parcours du pouls), §4 (modèle de domaine), §5
(anonymat) et §6 (fenêtres d'agrégation). Le pouls est le second dispositif de collecte : là où la
[séance animée](deroulement-session-animee.md) réunit l'Équipe pour quelques Questions travaillées en
profondeur, le pouls prélève quelques Réponses régulièrement sans mobiliser personne. Les deux
alimentent le même moteur de scoring. Vocabulaire : [CONTEXT.md](../../../CONTEXT.md), section
Pouls. C'est le critère de succès n°1 du produit (PRD §11) : un dispositif récurrent qui s'essouffle
au bout de six semaines n'a produit aucune valeur.

## 1. La Campagne

Une **Campagne de pouls** est attachée à une Équipe. **Au plus une active par Équipe** : un Membre
ne doit jamais recevoir deux sollicitations concurrentes issues de deux configurations différentes.

**Cycle de vie explicite** : brouillon → active ⇄ suspendue → terminée. La suspension existe pour
les périodes où solliciter n'a pas de sens (congés, réorganisation) sans perdre la configuration ni
l'historique. Le passage en `terminée` est définitif, et il survient **uniquement sur geste du
Coach**.

**Ce qui se configure :**

| Paramètre | Valeur |
|---|---|
| Panel de Questions | la Sélection d'un **Modèle de collecte**, copiée figée à la création |
| Rythme | des jours de la semaine cochés + une heure d'envoi, motif répété chaque semaine |
| Questions par envoi | un entier, **saisie libre sans plafond** |

**Ni date de début, ni date de fin.** L'activation fait foi, et la terminaison est un geste du
Coach. Une date de début serait un second état concurrent du statut, avec le risque classique d'une
Campagne « active » qui n'envoie rien parce que sa date n'est pas atteinte ; une date de fin
produisait la symétrie du même défaut - une Campagne `active` en base, sa date dépassée, qui
continue d'envoyer tant que rien ne l'a régularisée. Arrêter temporairement, c'est **suspendre** ;
arrêter définitivement, c'est **terminer**
([ADR-0026](../../../docs/adr/0026-abandon-date-de-fin-campagne-pouls.md)).

**Le panel est une copie figée**, exactement comme la Sélection d'une Session
([ADR-0009](../../../docs/adr/0009-selection-session-copie-figee.md)) : supprimer le Modèle de
collecte source n'a aucun effet sur les Campagnes qui en sont issues. C'est ce qui fait disparaître
le paramètre « thèmes actifs » qu'annonçaient les premières versions du PRD §8 - **divergence
assumée** : le Modèle de collecte exprime déjà le périmètre voulu, question par question, avec un
écran de composition qui existe et que le Coach connaît déjà. Un second mécanisme de filtrage par
Thème, réservé au pouls, aurait fait deux façons de dire la même chose.

**Le nombre de Questions par envoi n'est pas plafonné.** C'est la responsabilité du Coach de rester
dans le mini-sondage ; l'application ne l'infantilise pas. Corollaire à l'exécution : le nombre
effectivement tiré est `min(demandé, disponibles)`, un panel plus petit que le nombre demandé ne
provoque pas d'erreur.

**Tranché** ([#68](https://github.com/arnaudbracchetti/agilometre/issues/68)) : `CampagnePouls` est
une racine qui ne détient que sa configuration et son Panel ; le statut est une colonne à quatre
valeurs, et « au plus une active par Équipe » est porté à la fois par une garde applicative et par un
index unique partiel en base. Le renommage `ModeleSession` → `Modèle de collecte` est complet,
jusqu'à la table, en carte dédiée exécutée avant les cartes du Pouls
([ADR-0027](../../../docs/adr/0027-perimetre-renommage-modele-de-collecte.md)). Conception complète :
[agregat-campagne-de-pouls.md](../../../docs/design/agregat-campagne-de-pouls.md).

## 2. Les échéances

Un **ordonnanceur in-process** (`@nestjs/schedule`, déjà câblé dans l'application) déclenche les
envois. Pas de file de messages, pas de service externe : la contrainte de déploiement on-premise en
mono-conteneur (PRD §10) l'exclut, et le volume ne le justifie pas.

**Une échéance manquée est perdue, jamais rattrapée.** Application arrêtée, SMTP indisponible,
serveur redémarré : l'échéance passe. Concrètement, l'ordonnanceur n'envoie que si l'échéance est
encore dans une **fenêtre de tolérance** courte ; au-delà, il ne fait rien. C'est ce qui rend la
règle exécutable plutôt que déclarative - sans elle, un serveur rallumé après trois jours
rattraperait tout d'un coup. Le rattrapage supposerait de distinguer une vraie panne d'une
coupure normale, et ferait arriver trois sollicitations d'un coup dans la boîte d'un Membre - ce qui
dessert le critère de succès n°1 bien plus qu'un tour sauté.

**Le périmètre est l'Équipe entière**, évaluée à l'instant de l'échéance, sans opt-out. Un Membre
ajouté entre deux échéances entre au tirage suivant avec un cycle vierge. Un Membre retiré de
l'Équipe cesse d'être sollicité ; ses Sollicitations passées restent en base, et les Réponses qu'il a
produites restent dans le réservoir - elles n'ont jamais porté son identité (PRD §5).

## 3. Le tirage

Trois règles, appliquées dans cet ordre, **indépendamment pour chaque Membre** :

1. **Exclure** les Questions déjà posées à ce Membre dans son **cycle courant**. Un cycle est un
   balayage complet du panel par ce Membre ; une fois le panel épuisé, le cycle repart à zéro et
   toutes les Questions redeviennent éligibles.
2. Parmi les restantes, **garder les moins posées dans l'Équipe** sur ce cycle. Priorité douce,
   jamais exclusion dure : si toutes les Questions éligibles ont déjà été posées à des coéquipiers,
   le tirage a quand même lieu.
3. **Départager au hasard.**

L'ordre compte, et il dit la priorité : ne jamais reposer la même Question à la même personne prime
sur la répartition dans l'Équipe. La règle 2 fait ensuite converger l'Équipe vers une couverture
homogène du panel, ce qui est l'objectif du dispositif - balayer le référentiel régulièrement, pas
faire voir tous les Thèmes à chacun.

**Rien n'est persisté du tirage.** Ni curseur, ni cycle, ni compteur : tout se déduit de
l'historique `Sollicitation(membreId, questionId, envoyeeLe)`, qui existe déjà et que l'anonymat
autorise explicitement à conserver (PRD §5). Un état de tirage persisté serait une seconde source de
vérité, à réparer à chaque ajout de Membre ou modification de panel.

**Cas limites** : un panel plus petit que l'effectif produit mécaniquement des doublons entre
Membres à une même échéance - c'est acceptable, la règle 2 les répartit au mieux. Une Question
archivée par un ré-import du Référentiel sort du panel ; le cycle se poursuit sans elle, sans
invalider les Sollicitations déjà émises.

## 4. La Sollicitation et la Réponse

Un email par Membre, portant un lien à **Jeton unique**. Un Jeton = une Sollicitation = N Questions
= **une soumission unique**, en une transaction. Il n'existe pas de Sollicitation partiellement
honorée : soit l'envoi entier reçoit sa réponse, soit rien.

**Le Jeton est à usage unique et la Réponse n'est pas modifiable après validation.** Ce n'est pas un
arbitrage d'ergonomie mais une conséquence directe de l'anonymat structurel : permettre la
correction supposerait de retrouver *sa* Réponse, donc de persister le lien Membre ↔ Réponse que le
PRD §5 et l'[ADR-0001](../../../docs/adr/0001-contrat-anonymat-reponse.md) interdisent. L'ADR décrit
le mécanisme exact : résoudre le Jeton vers sa Sollicitation, puis dans **une seule transaction**
insérer la Réponse - sans `membreId` ni référence au Jeton - et poser `honoreeLe`. L'anti-rejeu est
le `WHERE honoreeLe IS NULL` de cette même transaction.

**Le Jeton expire à l'échéance suivante.** La justification a changé avec l'abandon de la fenêtre
glissante (§5 ci-dessous) : ce n'est plus l'agrégation qu'on protège - une Réponse tardive tomberait
de toute façon dans la même Période de calcul - c'est **la lisibilité du taux de participation**, qui
n'a de sens que rapporté à une échéance donnée.

**Trois états d'échec distincts** sur la page publique - Jeton inconnu, Jeton expiré, Sollicitation
déjà honorée - dont **aucun ne révèle l'Équipe ni la Question**. Quelqu'un qui a déjà répondu mérite
mieux qu'un « lien invalide ».

**Pas de relances en v1.** La trace nécessaire (`Sollicitation` non honorée) est conservée de toute
façon : les ajouter plus tard ne demandera aucune migration.

**Throttling** : la page publique reste sous le `ThrottlerGuard` global, **sans exonération** -
contrairement aux routes de polling d'une séance en direct
([ADR-0012](../../../docs/adr/0012-exoneration-throttler-routes-polling.md)), dont la fréquence était
justifiée par le direct. Rien ici ne justifie un débit soutenu.

> **À trancher** - contenu du gabarit markdown, forme de la page de réponse, formulation des trois
> états d'échec et de l'écran de remerciement :
> [#70](https://github.com/arnaudbracchetti/agilometre/issues/70).

## 5. Consolidation dans le temps

**Une seule mécanique temporelle pour tout le produit : la Période de calcul.** Les Réponses
d'origine Pouls tombent dans les mêmes Périodes calendaires que celles des Sessions et s'y mélangent
sans distinction d'origine.

La « fenêtre glissante configurable » annoncée par les premières versions du PRD est **abandonnée**.
Deux découpages temporels concurrents auraient produit deux Paliers différents pour la même Équipe au
même instant, sans qu'aucun ne soit plus légitime que l'autre - et auraient rendu incomparables deux
Équipes dont l'une pratique le pouls et l'autre non, ce qui contredit la raison d'être des Périodes
alignées. Cette décision **ferme un point ouvert du PRD §12**.

Le raccordement au moteur passe par le port « source de Réponses scorables »
([ADR-0018](../../../docs/adr/0018-scoring-port-source-de-reponses-scorables.md)), qui reçoit une
liste plate de `{questionId, niveau}` et ignore tout de l'origine. La source Pouls est une **requête
directe portée par `reponse/`**, sans traversée d'agrégat, composée avec la source Session existante.
**`pouls/` n'intervient pas dans le scoring** : il produit des Sollicitations, tire des Questions et
consomme des Jetons - il ne porte aucune règle sur la lecture des Réponses.

**Effectif minimal de la lecture fine** : Moyenne et Dispersion ne sont calculées qu'au-delà d'un
nombre minimal de Réponses sur la Question, réglable au niveau de l'instance ; en deçà, l'effectif
est affiché à la place. Le pouls rend ce cas nominal (une Question tirée pour une seule personne),
mais la règle vaut pour toutes les Portées, Sessions comprises - voir
[annexe Moteur de scoring](moteur-de-scoring.md).

> **À trancher** - lisibilité de la composition d'un Palier, écran d'une Période sans Session,
> reformulation des gardes qui ne consultent aujourd'hui que les Sessions closes, et emplacement du
> composite : [#71](https://github.com/arnaudbracchetti/agilometre/issues/71).

## 6. Suivi du dispositif

Le **taux de participation** se lit à deux échelles, et les deux sont nécessaires :

- **sur la Période de calcul affichée** - comparable d'une Période à l'autre, c'est la mesure du
  critère de succès n°1 (PRD §11) ;
- **sur la dernière échéance** - la santé immédiate du dispositif. Un effondrement à zéro y désigne
  une panne d'envoi (SMTP tombé, ordonnanceur arrêté), pas un désengagement de l'Équipe. La lecture
  périodique, elle, lisserait la panne pendant des semaines.

L'écran qui les porte est l'écran **« Collecte d'informations »** : l'actuel écran Sessions, révisé,
avec l'arbre de l'organisation à gauche et deux onglets à droite - Sessions et Campagnes de pouls -
qui réagissent tous deux à la sélection dans l'arbre. Sur une Équipe : la configuration de sa
Campagne, la prochaine échéance, les deux taux, l'historique des échéances. Sur une Entité : la liste
de ses Équipes avec l'état de leur Campagne et leur taux, en lecture seule, « aucune Campagne »
affiché explicitement.

**« Collecte d'informations » n'est qu'un libellé de rubrique d'interface** : il n'a aucune existence
dans le modèle de domaine. Le terme du domaine reste **Campagne de pouls**, et il reste visible comme
tel dans l'écran.

> **À trancher** - contenu exact des deux onglets à chaque niveau de sélection, ce qui est modifiable
> et ce qui est en lecture seule, gestes de cycle de vie :
> [#69](https://github.com/arnaudbracchetti/agilometre/issues/69).

## 7. Hors périmètre

- **Nouvelles vues de restitution propres au Pouls**, au-delà du taux de participation : restent à
  l'Epic Restitutions par rôle ([#11](https://github.com/arnaudbracchetti/agilometre/issues/11)).
  Rendre les écrans de restitution **existants** justes en présence d'une Campagne est, en revanche,
  bien dans le périmètre (§5).
- **Rattrapage d'une échéance manquée** : écarté, pas différé (§2).
- **Lien de désinscription** dans l'email : l'Équipe est le périmètre, il n'y a pas d'opt-out
  individuel en v1.
- **Relances** : différées, sans dette de migration (§4).
