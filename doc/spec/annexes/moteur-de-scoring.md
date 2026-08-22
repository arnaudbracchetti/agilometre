# Spécification fonctionnelle — Moteur de scoring

Complète le [PRD](../PRD-maturite-agile.md) §6 sur un point qu'il pose comme central sans le
détailler entièrement : le calcul du Palier et du Taux d'approche est une fonction unique, mais les
restitutions qui l'exploitent recouvrent en réalité deux besoins distincts — une lecture volontairement
grossière pour comparer des Équipes entre elles, et une lecture fine pour qu'une Équipe sache où
progresser. Ce document précise ces deux niveaux de lecture, les écrans qui les portent, et les
règles temporelles qui les encadrent. Vocabulaire : voir [CONTEXT.md](../../../CONTEXT.md), section
Scoring (Palier, Taux d'approche, Portée, Période de calcul, Lecture fine, Moyenne, Dispersion,
Tendance, Mur de badges). Décisions structurantes : [ADR-0003](../../../docs/adr/0003-emplacement-calcul-scoring.md)
(calcul backend uniquement, pas de persistance), [ADR-0014](../../../docs/adr/0014-portee-session-ou-periode-calendaire.md)
à [ADR-0019](../../../docs/adr/0019-regles-de-calcul-concentrees-recalcul-retroactif-assume.md).

## Vue d'ensemble : deux modes de Portée, exclusifs

- **Portée Session** — le résultat d'une séance donnée, hors de toute notion de période. C'est ce
  que le Coach et l'Équipe consultent juste après la séance : la synthèse de fin de Session.
- **Portée périodique** — la vue synthétique d'une Équipe ou d'une Entité, agrégée sur une **Période
  de calcul** calendaire. C'est ce qui alimente le Profil par thème, la Tendance et le Mur de
  badges.

Une restitution ne mélange jamais les deux : une vue en Portée périodique ne redescend jamais au
détail d'une Session précise, et réciproquement.

## Deux niveaux de lecture, dans chaque Portée

- **Lecture macro** — le Palier, le Taux d'approche et la Marge avant descente (PRD §6), à grain
  Thème, Équipe ou Entité - jamais au grain Question, où l'effectif d'un seul Tour de vote est trop
  restreint pour qu'un seuil de validation soit informatif (ADR-0016). C'est aussi le Badge : même
  donnée, autre habillage (CONTEXT.md). Granularité volontairement grossière : elle permet
  l'émulation entre Équipes sans classement fin. Taux d'approche et Marge avant descente restent
  deux indicateurs séparés plutôt qu'un seul chiffre composite montée/descente : ils portent sur
  deux populations de Réponses différentes (ADR-0020).
- **Lecture fine** — réservée au grain **Question**, jamais agrégée au-dessus. Pour chaque Question
  de la Portée courante : la Moyenne des Niveaux, un indicateur de Dispersion (l'accord ou le
  désaccord de l'Équipe, restitué en trois crans de consensus — fort / modéré / faible plutôt qu'une
  valeur brute), et un drill-down vers la répartition en pourcentage par Niveau. Elle permet de
  trier les Questions par score le plus faible ou par dispersion la plus forte, pour que le Coach et
  l'Équipe sachent concrètement où se concentrer.

La lecture fine utilise toujours la même Portée que le Palier qu'elle détaille — jamais de Palier
trimestriel affiché au-dessus d'une Moyenne calculée sur la seule dernière Session.

## Écran — Résultat de fin de Session

Prolonge l'écran de synthèse existant (`sessions/synthese-page`) : Palier par Thème de la Session
qui vient de se dérouler, avec lecture fine par Question en drill-down. Portée Session : les
Réponses portant sur une Question ou un Thème depuis archivé du Référentiel restent incluses — c'est
le compte-rendu d'une séance qui a réellement eu lieu (ADR-0015).

## Écran — Profil par thème d'une Équipe (radar)

Un axe par Thème du Référentiel actuel, portant son Palier et la jauge d'approche du Palier suivant,
sur la Période de calcul en cours. Un Thème sans aucune Réponse sur la Période **garde son axe**,
marqué « non évalué » — un radar dont le nombre de branches change d'une Équipe ou d'une Période à
l'autre cesse d'être comparable visuellement.

## Écran — Synthèse d'une Équipe (badge, niveau, tendance simplifiée)

**Version 1**, volontairement simple : le Badge de synthèse de l'Équipe (Palier global — même calcul
que le Score global du PRD §6, tous Thèmes confondus), son Niveau affiché en clair, et une **flèche
de tendance** à trois états (montante / stable / descendante) obtenue en comparant le Palier global
de la Période en cours à celui de la Période de calcul précédente. Pas de Palier précédent
disponible (première Période de l'Équipe) → pas de flèche.

*Hors périmètre pour cette version* : le graphique détaillé (Palier en escalier + courbe du Taux
d'approche, point par Période, trous inclus) envisagé par le PRD §9 sous le nom de Tendance reste
possible en évolution ultérieure, mais n'est pas construit par cette Epic - la comparaison à deux
points (Période en cours vs précédente) suffit au besoin exprimé.

## Écran — Vue Entité

Le même écran que la Synthèse d'Équipe ci-dessus, au grain Entité : Badge de synthèse, Niveau et
flèche de tendance agrégés sur l'ensemble des Équipes de l'Entité. **Pas de détail par Équipe** et
pas de lecture fine à ce grain (ADR-0017) : ce niveau mélangerait des contextes hétérogènes sans
désigner d'action concrète. La comparaison Équipe par Équipe est le rôle de l'écran suivant.

## Écran — Mur de badges (vue Coach)

Les Badges de plusieurs Équipes côte à côte, sans classement chiffré — la comparaison inter-Équipes
que le PRD §9 accorde au Coach. **Divergence assumée par rapport au PRD** : celui-ci l'accordait
aussi à la Direction ; ADR-0017 restreint ce niveau de détail au Coach, la Direction s'en tenant à
la synthèse déjà agrégée de son Entité.

## Règles temporelles

- La durée d'une Période de calcul est un réglage **d'instance**, jamais par Équipe — comme le
  Seuil de Palier, pour que deux Équipes du même client restent comparables.
- Les Périodes sont **calendaires et alignées** sur le même calendrier pour toutes les Équipes d'une
  instance — condition pour que deux badges côte à côte parlent du même intervalle.
- La vue synthétique affiche la Période **en cours**, signalée comme telle, plutôt que d'attendre sa
  clôture : une Équipe qui vient de vivre sa Session doit voir un résultat immédiatement, pas des
  semaines plus tard.

## Évolution des règles de calcul

Le seuil X, la règle du Palier, la Moyenne, l'écart-type et les seuils des trois crans de Dispersion
sont amenés à évoluer avec l'usage (PRD §12 laisse d'ailleurs la valeur par défaut de X ouverte).
Aucun résultat n'est persisté (ADR-0003) ; modifier une règle **recalcule rétroactivement tout
l'historique** — un Palier affiché pour une Session passée peut donc changer après une évolution de
configuration. C'est un effet attendu (ADR-0019), pas une anomalie : il garantit qu'une Tendance
compare toujours des points calculés avec les mêmes règles.

## Hors périmètre (Epic #10)

- **Palier au grain Question** — écarté (ADR-0016) : un seuil de validation n'est pas informatif sur
  l'effectif d'un seul Tour de vote. L'écran de projection n'est pas modifié par cette Epic ; PRD
  §7.6 (qui annonçait un "palier de la question" à la clôture d'un Tour) reste sans réponse pour
  l'instant.
- **Graphique de Tendance détaillé** (Palier en escalier + courbe du Taux d'approche, point par
  Période) — la Synthèse d'Équipe/Entité livre une comparaison à deux points (flèche montante /
  stable / descendante) ; le graphique complet envisagé par le PRD §9 reste une évolution possible,
  non construite ici.
- **Matrice de droits par Rôle** — tous les écrans ci-dessus sont accessibles à tous en V1 ; la
  restriction par Rôle (PRD §9) est le sujet de l'Epic #11 Restitutions par rôle.
- **Origine Pouls** — seule l'origine Session alimente le moteur pour l'instant ; la fenêtre glissante
  du Pouls et sa réconciliation avec les Périodes de calcul sont à trancher lors du
  `/grill-with-docs` de l'Epic #9 Campagne de pouls.
- **Bornage fin de l'agrégat Réponse** — extrait de `session/` par cette Epic vers un module
  `reponse/` autonome, mais son bornage complet reste porté par l'Epic #7 Réponse & anonymat, dont
  le périmètre s'en trouve d'autant réduit.
