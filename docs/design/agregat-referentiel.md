# Agrégat Référentiel

Design issu de la session `/ddd` + `/grill-with-docs` sur la carte
[#5](https://github.com/arnaudbracchetti/agilometre/issues/5). Vocabulaire : voir `CONTEXT.md`,
section Référentiel.

## Contexte

Le PRD (§4, §10) décrit le Référentiel comme "importé une fois au déploiement, figé ensuite,
jamais modifié depuis l'application". En creusant, ce n'est vrai qu'au sens strict : le Référentiel
est en réalité ré-importable dans le temps depuis un fichier YAML, à la demande d'un opérateur
(jamais automatiquement au démarrage du serveur). Voir [ADR 0004](../adr/0004-reconciliation-referentiel-par-cle-stable.md)
pour la décision de fond que ça implique.

## 1. Structure de l'agrégat

Un seul agrégat, racine `Référentiel` (instance singleton — jamais plus d'un Référentiel) :

- **`Référentiel`** (racine) : id, `derniereMajLe`, liste de `Thème`.
  Expose `themesActifs()` (filtre les Thèmes/Questions archivés — évite que chaque consommateur
  ré-implémente ce filtre).
- **`Thème`** (entité enfant) : id = Clé stable du YAML, libellé, `retireLe: Date | null`,
  liste de `Question`.
- **`Question`** (entité enfant) : id = Clé stable, libellé, `themeId` **réaffectable**
  (le Thème est un attribut mutable de la Question, pas une frontière de suppression — si un
  Thème disparaît, ses Questions survivantes sont réaffectées, pas archivées avec lui),
  `retireeLe: Date | null`, liste d'`Option`.
- **`Option`** (Value Object, pas d'identité propre) : libellé, `Niveau`. Remplacée en bloc à
  chaque mise à jour de sa Question — aucun besoin observé de tracer une Option individuellement
  à travers les imports.
- **`Niveau`** (Value Object) : entier borné, aujourd'hui 1 à N.

Le nombre d'Options requis par Question (aujourd'hui 4, Niveaux 1..4 sans trou ni doublon) est
une règle **centralisée** dans une seule méthode de validation sur `Question` — jamais un `4`
écrit en dur ailleurs, pour ne pas avoir à tout réécrire si la règle change.

## 2. Invariants

| Invariant | Portée |
|---|---|
| Une Question porte le nombre d'Options requis, Niveaux 1..N sans trou ni doublon | `Question` |
| L'id d'une Question/d'un Thème est sa Clé stable YAML, inchangée tant qu'elle réapparaît | `Référentiel` (réconciliation) |
| Un Thème/une Question retiré(e) est archivé(e), jamais supprimé(e) physiquement | `Thème` / `Question` |
| Une Clé stable réapparue après archivage = réactivation, pas une nouvelle entité | `Référentiel` (réconciliation) |
| `applyImport` refuse de s'exécuter si le YAML est invalide | Use case `ApplyImport`, avant tout appel domaine |

## 3. Opérations

| Opération | Commande/Requête | Charge l'agrégat ? | Use case ou méthode de domaine | Racine ou enfant |
|---|---|---|---|---|
| `previewImport(yaml)` | Requête (aucune écriture) | Oui | Use case | Racine |
| `applyImport(yaml)` | Commande | Oui | Use case | Racine |
| `referentiel.calculerChangements(yamlParsé)` | Pure | — | Méthode de domaine, **partagée** par les deux use cases ci-dessus | Racine |
| `referentiel.appliquerChangements(changeSet)` | Mutation en mémoire | — | Méthode de domaine (appelée uniquement par `applyImport`) | Racine, délègue à chaque enfant concerné |
| `question.reaffecterVers(themeId)` / `.retirer()` / `.reactiver()` / `.mettreAJourLibelleEtOptions(...)` | Mutation d'un champ propre | — | Méthode d'entité | **Enfant** (`Question`) |
| `theme.retirer()` / `.reactiver()` / `.mettreAJourLibelle(...)` | idem | — | Méthode d'entité | **Enfant** (`Thème`) |
| `referentiel.themesActifs()` | Lecture sur agrégat déjà chargé | Oui (déjà en mémoire) | Méthode de domaine, appelée par les Epics Session/Campagne de pouls | Racine |

**Point clé** : `previewImport` et `applyImport` partagent la même méthode
`calculerChangements` — c'est ce qui garantit que l'aperçu prédit fidèlement ce que
l'application va faire, condition nécessaire à une revue humaine fiable avant mutation.

`previewImport` retourne un résultat typé à deux cas : `Invalide(erreurs)` si le YAML est mal
formé (clé dupliquée, mauvais nombre d'Options, Niveaux hors bornes ou dupliqués, clé manquante),
ou `Valide(ChangeSet)`. Le `ChangeSet` porte à la fois le détail complet (avant/après par item)
et une synthèse chiffrée (nombre de créations, réaffectations, archivages, réactivations).

Aucune garde automatique (ex. seuil de % d'archivages à rejeter) : la revue humaine du
`ChangeSet` avant `applyImport` est la garde-fou.

## 4. Interface de repository

Singleton — pas de `findById` :

```
interface ReferentielRepository {
  charger(): Referentiel             // agrégat complet, y compris archivés ; vide si jamais importé
  sauvegarder(r: Referentiel): void  // appelé uniquement par ApplyImport
}
```

Le parsing du fichier YAML brut (validation structurelle) est un adapter d'infrastructure séparé,
en amont des use cases, qui réutilise les mêmes règles de validation que `Question`/`Niveau`
pour ne pas dupliquer l'invariant.

## 5. Inversion de dépendance

Le domaine (`Référentiel`, `Thème`, `Question`, `Option`, `Niveau`) ne dépend d'aucun framework
ni de Prisma. `ReferentielRepository` est défini dans le domaine, implémenté dans
`apps/backend/src/referentiel/infrastructure/` avec Prisma.

## Notes et améliorations différées

- **Chargement de l'agrégat complet pour la consommation** (Session, Campagne de pouls) plutôt
  qu'un read model séparé filtré aux actifs — choix simple pour démarrer. Deux optimisations
  possibles plus tard, sans changer la forme du domaine : chargement différé des items archivés,
  cache en mémoire du Référentiel invalidé à chaque nouvel import.
- **Déclenchement de `previewImport`/`applyImport` en production** : différé à l'Epic Déploiement
  & ops (#12). Pour le développement, les deux opérations sont exposées via deux endpoints HTTP
  temporaires, avec un script shell wrapper pour les enchaîner.
- **Historique de formulation** : un changement de libellé (Question/Option) est une mise à jour
  en place, sans versionner l'ancien texte — `Reponse.niveau` est déjà un entier recopié au
  moment de la réponse (pas une FK vers `Option`), donc un changement de mapping niveau↔libellé
  n'alter pas rétroactivement les Réponses déjà enregistrées. À réexaminer seulement si un besoin
  produit explicite apparaît.
