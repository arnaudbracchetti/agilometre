# Agrégats Session animée

Design issu de la session `/ddd` sur l'Epic [Session animée #29](https://github.com/arnaudbracchetti/agilometre/issues/29),
en continuité de la réflexion `/grill-me` documentée dans
[doc/spec/modeles-de-session.md](../../doc/spec/modeles-de-session.md). Vocabulaire : voir
`CONTEXT.md`, section Session animée.

## Contexte

Le PRD (§4) et l'Epic #29 évoquaient une sélection de Thèmes/Questions faite directement au
moment de créer une Session. En creusant (session `/grill-me` puis `/ddd`), ça s'est révélé
insuffisant : composer une sélection question par question à chaque Session serait trop coûteux
pour le Coach vu la taille du Référentiel à terme (60-120 Questions, PRD §4). Un nouveau concept
— **Modèle de session** — a émergé : une sélection nommée et réutilisable, indépendante de toute
Équipe (ADR-0008), dont une Session reçoit une copie figée à sa création (ADR-0009).

Cette session `/ddd` couvre la relation Modèle ↔ Sélection ↔ Session. Le déroulé d'un Tour de
vote proprement dit (ouverture/clôture, comptage, revote) reste hors périmètre — c'est l'objet de
l'Epic [Vote en séance #30](https://github.com/arnaudbracchetti/agilometre/issues/30) et d'une
session `/ddd` dédiée à venir, comme anticipé par les ADR 0001/0002 et l'Epic #29 lui-même.

## 1. Structure des agrégats

Deux agrégats racines, indépendants, reliés uniquement par une copie de valeur (jamais une
référence vivante) :

- **`ModèleSession`** (racine) : id, `nom` (non vide), `Sélection`. Bibliothèque globale, sans
  rattachement à une Équipe (ADR-0008). Librement supprimable, y compris déjà utilisé (ADR-0009).
- **`Session`** (racine, squelette Prisma déjà existant) : id, `equipeId`, `date`, `statut`
  (`OUVERTE`/`CLOTUREE`), `modeleSessionId: string` (**obligatoire** — une Session est toujours
  créée à partir d'une Équipe et d'un Modèle, invariant validé par `Session.creer` ; le caractère
  « informatif » évoqué initialement porte sur l'absence d'intégrité référentielle forte — la
  valeur elle-même n'est jamais optionnelle, aucune lecture croisée, aucune contrainte de clé
  étrangère si le Modèle source est supprimé ensuite), `Sélection`. Expose `estVerrouillee(): boolean`
  — implémentation initiale sur un simple
  attribut, remplaçable plus tard par un calcul dérivé des Tours de vote réels sans changer le
  contrat public. `TourDeVote` (déjà au schéma Prisma) reste hors modélisation domaine à ce
  stade (Epic #30).

- **`Sélection`** (Value Object, pas d'agrégat, pas d'identité, pas de repository) : liste
  ordonnée de `QuestionId`. Réutilisée en composition par `ModèleSession` et par `Session` — deux
  instances indépendantes construites à partir de la même classe, jamais une référence partagée.
  C'est ce qui matérialise concrètement la "copie figée" de l'ADR-0009 : au niveau code, pas
  seulement au niveau discours.

**Relation Modèle → Session** : un use case (pas une méthode de domaine, puisque ça traverse deux
agrégats) charge le `ModèleSession` choisi, copie sa `Sélection` (nouvelle instance, mêmes
`QuestionId`, même ordre), puis construit la nouvelle `Session` avec cette copie et
`modeleSessionId` renseigné pour traçabilité. Aucune étape suivante ne relit le `ModèleSession`
d'origine.

## 2. Invariants

| Invariant | Portée |
|---|---|
| `ModèleSession.nom` est non vide | `ModèleSession` |
| Une même Question n'apparaît jamais deux fois dans une Sélection | `Sélection` (VO) |
| L'ordre des Questions dans une Sélection est significatif et conservé | `Sélection` (VO) |
| Une Sélection vide (0 Question) est valide, pour un Modèle comme pour une Session | `ModèleSession` / `Session` |
| Une Question archivée dans le Référentiel disparaît des méthodes de lecture d'une Sélection, sans en être retirée physiquement (réactivable si la Question réapparaît) | Résolu à la lecture : le Référentiel est passé en paramètre de la méthode de lecture, jamais stocké par référence |
| Une fois `Session.estVerrouillee()` vrai, ajouter et réordonner sont rejetés (erreur de domaine) ; retirer reste toujours permis | `Session` |
| La suppression d'un `ModèleSession` n'a aucun effet sur les `Session` déjà créées, même si `modeleSessionId` les référence encore | Structurel — `modeleSessionId` est une donnée simple, pas une clé étrangère à intégrité forte au niveau domaine |
| Équipe, Date, Modèle source et la Session elle-même (suppression) restent modifiables tant qu'aucune réponse n'a été reçue **et** que la Session n'est pas clôturée ; au-delà, rejetées — garde exposée publiquement via `Session.estModifiable()` (`!estVerrouillee() && statut !== 'CLOTUREE'`), volontairement plus large que celle des Questions ci-dessus qui ne teste que `estVerrouillee()`. `modifierInfos`/`changerModele` s'appuient dessus en interne (`SessionNonModifiableError` si refusé) ; `SupprimerSession` (use case) l'appelle directement, sans mutation à faire en cas de succès | `Session` |
| Changer le Modèle source d'une `Session` réinitialise entièrement sa Sélection avec une copie figée de la Sélection du nouveau Modèle (jamais une fusion avec la Sélection précédente) | `Session` (remplacement), Use case (copie depuis `ModèleSession`) |

## 3. Opérations

**`ModèleSession`**

| Opération | Commande/Requête | Racine ou VO |
|---|---|---|
| Créer (nom) | Commande | Racine |
| Renommer | Commande | Racine |
| Ajouter une Question / un Thème entier (à une position) | Commande | Racine → Sélection |
| Retirer une Question | Commande | Racine → Sélection |
| Réordonner (déplacer une Question à une position) | Commande | Racine → Sélection |
| Dupliquer | Commande | Use case (nouvelle racine, copie de la Sélection) |
| Supprimer | Commande | Use case (pas de vérification d'usage, ADR-0009) |
| Lister (bibliothèque : nom, nb Questions actives, Thèmes couverts, dernière modification) | Requête | Read model dédié (jointure avec Référentiel) |
| Détail enrichi (`selectionEnrichie(referentiel)` → `Question[]` filtrées actives) | Requête | Racine, Référentiel en paramètre |

**`Session`** (périmètre Sélection uniquement)

| Opération | Commande/Requête | Racine ou VO |
|---|---|---|
| Créer (equipeId, date, modeleSessionId) — copie la Sélection du Modèle | Commande | Use case (lit `ModèleSession`, écrit `Session`) |
| Ajouter une Question / un Thème entier | Commande, rejetée si `estVerrouillee()` | Racine (garde) → Sélection |
| Retirer une Question | Commande, toujours permise | Racine → Sélection |
| Réordonner | Commande, rejetée si `estVerrouillee()` | Racine (garde) → Sélection |
| Modifier Équipe et Date (`modifierInfos`) | Commande, rejetée si verrouillée ou clôturée | Use case (vérifie l'Équipe cible), Racine (garde + remplacement) |
| Changer le Modèle source (`changerModele`) — réinitialise la Sélection | Commande, rejetée si verrouillée ou clôturée | Use case (lit le nouveau `ModèleSession`, copie sa Sélection), Racine (garde + remplacement) |
| Supprimer | Commande, rejetée si verrouillée ou clôturée | Use case (`estModifiable()`, puis `repository.remove`) |
| Détail enrichi (`selectionEnrichie(referentiel)`) | Requête | Racine, Référentiel en paramètre |
| `estVerrouillee()` | Requête pure | Racine |
| `estModifiable()` | Requête pure | Racine |

## 4. Interface de repository

```
interface ModeleSessionRepository {
  findById(id: string): ModeleSession | null
  save(modele: ModeleSession): void
  remove(id: string): void
}

interface SessionRepository {
  findById(id: string): Session | null
  save(session: Session): void
  remove(id: string): void
}
```

La liste de la bibliothèque de Modèles (avec comptage actif de Questions) est un **read model
séparé** — une requête directe joignant les deux tables, pas une méthode de ces repositories, qui
ne chargent que l'agrégat complet.

## 5. Inversion de dépendance

`ModèleSession`, `Session`, `Sélection` ne dépendent d'aucun framework ni de Prisma. Les deux
interfaces de repository sont définies dans le domaine (`apps/backend/src/session/domain/`),
implémentées dans `apps/backend/src/session/infrastructure/` avec Prisma. Le rejet d'un
ajout/réordonnancement sur une Session verrouillée est une erreur de domaine (`Result` échec,
même pattern que `Question.mettreAJourLibelleEtOptions`), traduite en erreur HTTP à la frontière
use case/contrôleur (jamais un `catch` aveugle).

## Notes et améliorations différées

- **Tour de vote, Reponse, comptage de participation, clôture** : explicitement hors périmètre de
  cette session `/ddd` (voir Contexte) — à traiter dans une session `/ddd` dédiée à l'Epic
  [Vote en séance #30](https://github.com/arnaudbracchetti/agilometre/issues/30), en s'appuyant
  sur `Session.estVerrouillee()` comme seul point de contact avec ce présent design.
- **Historique "déjà traité avec cette Équipe"** — question ouverte listée par l'Epic #29
  lui-même, explicitement reportée hors V1 pendant la session `/grill-me` (voir
  [doc/spec/modeles-de-session.md](../../doc/spec/modeles-de-session.md)).
- **Recherche texte dans le Référentiel** (écran double-liste) — reportée à une V2, quand le
  Référentiel dépassera le seul Axe 1 actuel.
- **`enum Role`/guard d'autorisation Coach** sur `Session` : hors périmètre, comme déjà noté par
  l'Epic #29 (stub jusqu'à l'intégration avec #27).
