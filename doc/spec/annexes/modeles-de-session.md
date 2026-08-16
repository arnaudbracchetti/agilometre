# Spécification fonctionnelle — Modèles de session

Complète le [PRD](../PRD-maturite-agile.md) sur un point qu'il pose comme central sans le détailler :
« la sélection des questions au moment de créer une session est une fonction centrale, pas un
confort » (§4). Ce document précise comment le Coach compose cette sélection en pratique, à
travers trois écrans. Vocabulaire : voir [CONTEXT.md](../../../CONTEXT.md) (Modèle de session,
Sélection, Session). Décisions structurantes : [ADR-0008](../../../docs/adr/0008-modele-session-bibliotheque-globale.md),
[ADR-0009](../../../docs/adr/0009-selection-session-copie-figee.md).

## Vue d'ensemble du parcours

1. **Bibliothèque de modèles de session** — le Coach retrouve ou crée un Modèle.
2. **Composer un modèle** (écran double-liste) — le Coach construit la Sélection de Questions du
   Modèle.
3. **Créer une session** — le Coach choisit une Équipe, une date, et un Modèle existant ; la
   Sélection du Modèle est copiée dans la nouvelle Session.

Le même écran double-liste (2) est réutilisé pour ajuster la Sélection d'une Session déjà créée,
tant qu'aucun Tour de vote n'a été ouvert.

## Écran 1 — Bibliothèque de modèles de session

Liste globale, non filtrée par Équipe (cf. ADR-0008).

- **Colonnes par ligne** : nom du Modèle, nombre de Questions, Thèmes couverts, date de dernière
  modification.
- **Actions** : créer un nouveau Modèle (→ écran 2, vide), modifier un Modèle existant (→ écran 2,
  pré-rempli), dupliquer, supprimer.
- La suppression est toujours possible, y compris pour un Modèle déjà utilisé par une ou plusieurs
  Sessions : aucune vérification d'usage préalable (cf. ADR-0009).

## Écran 2 — Composer un modèle (double-liste)

Deux panneaux côte à côte.

**Panneau gauche — arbre du Référentiel**, groupé par Thème :

- Chaque Thème affiche un compteur « restantes/total » (ex. `3/11`).
- Un Thème vidé de toutes ses Questions reste visible, grisé, plutôt que de disparaître — cible
  stable pour un retour en arrière.
- Les Questions archivées du Référentiel n'apparaissent jamais dans cet écran.
- Affichage compact par défaut (libellé de la Question seul), dépliable via un chevron pour voir
  les 4 Options de réponse.
- Pas de recherche texte en V1 (le Référentiel ne compte que 11 Questions sur 1 Thème aujourd'hui ;
  à prévoir pour une V2 quand il grossira vers 60-120 Questions, PRD §4).

**Panneau droit — Sélection**, liste **plate et réordonnable** :

- **Pas de hiérarchie par Thème** — contrainte volontaire, pour permettre d'entrelacer l'ordre
  entre Thèmes (ex. Question 1 du Thème 1, puis Question 1 du Thème 2, puis Question 2 du
  Thème 1). L'ordre de cette liste correspond à l'ordre de présentation des Tours de vote pendant
  la séance.
- Chaque Question porte un **tag coloré par Thème** comme seul repère de regroupement.
- **Exigence ergonomique explicite** : la couleur du tag doit être rigoureusement identique à la
  couleur du Thème affichée dans l'arbre de gauche — c'est le seul rappel visuel de provenance
  côté droit, il doit être fiable au premier coup d'œil. À traiter comme une contrainte de palette
  partagée entre les deux panneaux, pas comme un détail cosmétique secondaire.
- Pas de garde-fou strict sur le nombre de Questions sélectionnées — un compteur informatif
  suffit (« X questions sélectionnées »).

**Interaction :**

- **Sémantique de déplacement**, pas de copie : une Question n'existe qu'à un seul endroit dans
  l'IHM à la fois. La glisser vers la droite la retire du panneau gauche ; la retirer de la
  Sélection la fait réapparaître à sa position d'origine dans son Thème, à gauche.
- **Drag & drop** comme interaction principale, complété par des **boutons de transfert** entre
  les deux panneaux (accessibilité, simplicité).
- **Ajouter un Thème entier** : se fait en glissant le nœud du Thème lui-même (pas une case à
  cocher) — toutes ses Questions actives basculent d'un coup vers la Sélection, à la position du
  dépôt.
- **Dépôt à position libre** dans la Sélection (pas systématiquement en fin de liste), avec un
  guide visuel indiquant où la Question va s'insérer.

**Réemploi pour une Session existante :** avant l'ouverture de la séance (génération du Code de
session), ce même écran s'applique à la Sélection d'une Session (déjà créée, copiée depuis un
Modèle) pour l'ajuster librement. Dès l'ouverture, la Session bascule en mode **« sautée
seule »** — le Coach peut marquer une Question restante comme sautée, mais ne peut plus en
ajouter ni en retirer. Ce mode dégradé est un comportement différent de l'écran double-liste
complet ; spécifié dans
[deroulement-session-animee.md](deroulement-session-animee.md) (écran de pilotage de
séance en direct).

## Écran 3 — Créer une session

- **Formulaire** : Équipe, date, choix d'un Modèle dans la bibliothèque.
- **Aperçu en lecture seule** de la Sélection du Modèle choisi avant validation — filet de sécurité
  pour confirmer le bon choix.
- À la validation : copie figée de la Sélection (contenu et ordre des Questions) dans la nouvelle
  Session (cf. ADR-0009).

## Hors périmètre (V1)

- **Historique « déjà traité avec cette Équipe »** — le PRD (§4) le présente actuellement comme une
  fonction centrale de la sélection ; sa formulation devra être assouplie pour refléter ce choix
  (à faire séparément, en concertation).
- **Recherche texte dans le Référentiel** — reportée à une V2, quand le Référentiel dépassera le
  seul Axe 1 actuel.
- **Écran de pilotage de séance en direct** (mode « sautée seule », Tours de vote, projection) —
  détaillé dans [deroulement-session-animee.md](deroulement-session-animee.md), pas ici.
- **Modélisation formelle du domaine** (agrégats `Session`, `Modèle de session` : invariants,
  persistance, API de lecture du Référentiel) — à traiter via une session `/ddd` dédiée, en
  s'appuyant sur ce document, `CONTEXT.md` et les ADR ci-dessus.
