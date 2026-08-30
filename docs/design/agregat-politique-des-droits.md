# Politique de droits

Design issu de la session `/grill-with-docs` du 2026-08-30 (carte
[#27](https://github.com/arnaudbracchetti/agilometre/issues/27)), affiné par une session `/grill-me`
du même jour sur la question : comment centraliser la connaissance des droits pour éviter qu'elle ne
se disperse dans les contrôleurs, les use cases et les composants Angular. Vocabulaire fonctionnel :
voir [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md) (rôles, périmètres, cycle
de vie des comptes). Ce document-ci porte le **comment** : la mécanique technique et son
application, pas le **quoi** (fonctionnel).

## Contexte

Quatre pièces suffiraient à protéger l'application (`AuthGuard` global, `@Public()`, un décorateur de
rôle, un service de périmètre), mais rien dans une conception aussi minimale n'empêche mécaniquement
la dispersion que ce document cherche justement à éviter : un développeur pressé peut lister les
Rôles autorisés en clair sur chaque route (`@Roles(Role.COACH, Role.DIRECTION)`), et deux routes
protégeant le même droit peuvent diverger avec le temps sans que rien ne le signale. De même, un
contrôle de périmètre par ressource (« cette Direction voit-elle cette Entité ? ») appelé à la main
en tête de chaque use case peut être oublié sur une nouvelle route sans qu'aucun test générique ne le
détecte.

Ce document décrit un mécanisme conçu pour que ces deux oublis deviennent structurellement
impossibles, ou au moins visibles automatiquement par un test unique.

## 1. Deux natures de connaissance, deux mécanismes séparés

- **Statique** : quel Rôle a accès à quel écran/action. Ne dépend que du Rôle, jamais de la donnée.
- **Dynamique** : à quelle ressource précise (quelle Entité, quelle Équipe) - dépend forcément de la
  base (Habilitations, roster).

Ces deux natures ne sont **jamais fusionnées** dans une seule abstraction de policy (voir
[ADR 0022](../adr/0022-capacites-statiques-plutot-que-moteur-de-regles-generique.md)) : le statique
est une table qu'on relit d'un coup d'œil, le dynamique est nécessairement une requête. Les fusionner
résoudrait un problème de duplication qu'on n'a pas côté ressource (un seul appelant par route), au
prix d'un concept plus lourd à comprendre pour tout le monde.

## 2. Statique - carte de capacités partagée

### Structure

```
// packages/shared/src/capacites.ts
export type Capacite =
  | 'gererComptes'
  | 'gererOrganisation'
  | 'voirProfilEntite'
  | 'voirProfilEquipe'
  | 'voirSyntheseSession'
  | 'voirMurDeBadges'
  | 'gererSessions'
  | 'gererModelesSession'
  | 'gererCampagnesPouls'
  // ... une entrée par ligne de la matrice écran/rôle de gestion-des-droits.md

export const CAPACITES: Record<Capacite, Role[]> = {
  gererComptes: [Role.Coach],
  gererOrganisation: [Role.Coach],
  voirProfilEntite: [Role.Coach, Role.Direction],
  voirProfilEquipe: [Role.Coach, Role.Membre],
  voirSyntheseSession: [Role.Coach, Role.Membre],
  voirMurDeBadges: [Role.Coach],
  gererSessions: [Role.Coach],
  gererModelesSession: [Role.Coach],
  gererCampagnesPouls: [Role.Coach],
}
```

Même patron que `packages/shared/src/roles.ts` : **un seul objet, deux consommateurs** (backend et
frontend). C'est le rôle que ce package joue déjà pour éviter la dérive de calcul de score entre les
vues Coach/Manager/Direction (`CLAUDE.md`) - la même garantie, appliquée cette fois aux droits plutôt
qu'au scoring.

### Consommation backend

- **`@Requiert('capacité')`** (`apps/backend/src/auth/decorators/requiert.decorator.ts`), posé sur
  chaque route protégée via `SetMetadata('capacite', capacite)`. La route nomme *quoi* elle protège,
  la carte partagée sait *qui* - jamais l'inverse.
- **`@Public()`** (`apps/backend/src/auth/decorators/public.decorator.ts`), posé sur les seules
  routes ouvertes : login, invitation, mot de passe oublié, parcours participants (qui gardent leur
  propre `JetonParticipantGuard`, inchangé), écran d'accueil.
- **`AuthGuard`** (`apps/backend/src/auth/guards/auth.guard.ts`), enregistré globalement via
  `APP_GUARD` dans `app.module.ts` (même patron que `ThrottlerGuard`, déjà en place), **fail-closed** :
  toute route exige un compte valide par défaut. Vérifie le JWT, laisse passer si `@Public()` est
  présent (lu via `Reflector`), sinon lit `@Requiert(...)` et consulte `CAPACITES[capacite]`.

### Consommation frontend

- **`DroitsService`** (`apps/frontend/src/app/auth/droits.service.ts`) : `peut(capacité: Capacite):
  boolean`, importe directement `CAPACITES` depuis `packages/shared` (comme `Role` déjà) et compare
  au Rôle de l'utilisateur connu après connexion. Aucun aller-retour réseau : la carte ne dépend que
  du Rôle, déjà en possession du client.
- **`*aDroit="'capacité'"`** (directive structurelle) : pur raccourci syntaxique sur `DroitsService`,
  sans logique propre - la logique n'existe qu'à un seul endroit.
- **`canActivate`** de route et filtrage de `liensNav` (`app-shell.ts`) appellent ce même service,
  jamais une resaisie de la règle.

## 3. Dynamique - guard de périmètre

- **`PerimetreUtilisateur`** (service de domaine) : `peutVoirEquipe(utilisateur, id)` /
  `peutVoirEntite(utilisateur, id)`. Pour un `Coach`, toujours vrai. Pour une `Direction`, selon ses
  Habilitations. Pour un `Membre d'équipe`, selon les rosters où il figure.
- **`@Perimetre('entite' | 'equipe')`** + **`PerimetreGuard`**
  (`apps/backend/src/auth/guards/perimetre.guard.ts`) : lit le `:id` de la route et appelle
  `PerimetreUtilisateur` **avant** que le contrôleur ne s'exécute, plutôt qu'un appel manuel en tête
  de chaque use case. Même philosophie fail-closed que l'`AuthGuard` : une route à périmètre qui
  oublie son décorateur est un bug de configuration visible (le guard ne trouve pas de contrôle à
  faire, donc laisse passer - à couvrir par le test matriciel, voir section 4), pas un oubli
  silencieux découvert en production. Enregistré globalement (`APP_GUARD`), no-op si `@Perimetre(...)`
  absent.
- **Limite assumée : ce guard ne couvre que les routes à ressource unique** (un `:id`). Le filtrage
  d'une **liste** (ex. « ne renvoyer que les Entités habilitées à une Direction ») ne peut pas passer
  par un guard qui ne voit qu'une route entrante, pas la collection que le contrôleur s'apprête à
  renvoyer : cette forme de filtrage reste un appel direct à `PerimetreUtilisateur` dans le use case
  concerné (ex. `ListerEntites`).

Voir [ADR 0023](../adr/0023-guards-fail-closed-plutot-quappels-manuels.md) sur pourquoi ce guard
existe plutôt qu'un appel manuel dans chaque use case.

## 4. Un seul test, pas des tests dispersés

`DiscoveryService` + `Reflector` (`@nestjs/core`, disponibles depuis longtemps, confirmés présents
dans ce projet en NestJS 11) permettent de parcourir **toutes les routes réellement enregistrées** de
l'application et de lire leurs métadonnées `@Requiert`/`@Perimetre` posées par le code - pas une
resaisie parallèle des routes protégées.

Un unique test e2e matriciel (`apps/backend/test/droits.e2e-spec.ts`) :

1. énumère les routes via `DiscoveryService` ;
2. pour chaque route portant `@Requiert('capacité')`, lit `CAPACITES[capacité]` ;
3. pour chaque Rôle de l'application, appelle la route authentifié avec ce Rôle et attend `200` si le
   Rôle figure dans `CAPACITES[capacité]`, `403` sinon ;
4. vérifie qu'aucune route protégée par le domaine (hors `@Public()`) n'est dépourvue de
   `@Requiert(...)` - sans quoi elle serait accessible à tout Rôle authentifié par défaut ;
5. vérifie que chaque capacité de `CAPACITES` a une ligne correspondante dans la matrice Markdown de
   `gestion-des-droits.md` - une assertion de cohérence, pas une génération automatique du fichier.

Ajouter un écran protégé n'ajoute alors **aucun test à écrire** : posé `@Requiert(...)`, il est
couvert automatiquement par ce test unique. Le test unitaire de `PerimetreUtilisateur` reste séparé
(cas par ressource, pas « peut-il atteindre la route »).

## 5. Ce qui n'est délibérément pas fait

- **Pas de moteur de règles générique** (CASL, OPA, `can(action, sujet, conditions)`) : aucune
  capacité de cette itération ne dépend d'autre chose que du Rôle. Un moteur générique résoudrait un
  problème qu'on n'a pas, pour 4 Rôles et une douzaine d'écrans (ADR 0022).
- **Pas de fusion capacité/périmètre** dans une seule abstraction de policy (section 1).
- **Pas d'endpoint dédié `/api/moi/droits`** : le front calcule ses capacités localement à partir du
  Rôle déjà connu, sans aller-retour réseau supplémentaire - la carte ne dépend que du Rôle.
