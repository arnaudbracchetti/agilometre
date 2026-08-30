---
status: accepted
---

# Guards fail-closed pour la capacité et le périmètre, plutôt que des appels manuels

Deux points d'application distincts protègent une route : la capacité (quel Rôle peut atteindre cet
écran/action, table statique) et le périmètre (quelle ressource précise, dépendant de la donnée -
voir [politique-des-droits.md](../design/agregat-politique-des-droits.md)). Pour le premier, un guard global
fail-closed (`AuthGuard`) ne faisait pas débat : toute route exige un compte par défaut, une route
nouvelle est protégée sans que personne y pense. Pour le second (le contrôle de périmètre par
ressource, ex. `PerimetreUtilisateur.peutVoirEntite`), deux options restaient ouvertes : un appel
manuel en première ligne de chaque use case concerné, ou un guard dédié appliquant le même principe
fail-closed que l'`AuthGuard`.

**Décision** : un guard dédié, `PerimetreGuard`, lisant un décorateur `@Perimetre('entite' |
'equipe')` et le paramètre `:id` de la route, appelé **avant** le contrôleur - enregistré
globalement (`APP_GUARD`, comme `AuthGuard`/`ThrottlerGuard`), no-op si `@Perimetre(...)` est absent
sur la route.

**Raison.** Un appel manuel reproduit, côté périmètre, exactement le risque que la carte de
capacités (ADR 0022) cherche à éliminer côté statique : rien n'empêche un développeur pressé
d'oublier ce garde-fou sur une nouvelle route, et personne ne le remarque avant un incident - le
symptôme que la session `/grill-me` du 2026-08-30 a explicitement identifié comme à éviter. Un guard
appliqué par construction rend cet oubli visible (une route `:id` sans `@Perimetre(...)` alors
qu'elle le devrait est un défaut de configuration détectable par le test décrit ci-dessous, pas un
trou silencieux).

**Conséquence directe : un seul test, pas des tests dispersés.** `DiscoveryService` + `Reflector`
(`@nestjs/core`, disponibles en NestJS 11) permettent de parcourir les routes réellement enregistrées
et de lire leurs métadonnées `@Requiert`/`@Perimetre`. Un unique test e2e matriciel croise ces routes
avec la carte de capacités et attend `200`/`403` par (route, Rôle) - remplace des tests de permission
qui, sans ce mécanisme, se seraient dispersés au fil des cartes dans chaque fichier de contrôleur.
Ajouter un écran protégé n'ajoute alors aucun test à écrire : posé `@Requiert(...)`/`@Perimetre(...)`,
il est couvert automatiquement.

**Limite assumée.** Le guard de périmètre ne couvre que les routes à ressource unique (un `:id`). Le
filtrage d'une liste (« ne renvoyer que les Entités habilitées ») reste un appel direct à
`PerimetreUtilisateur` dans le use case concerné - un guard ne peut pas filtrer une collection qu'il
ne voit pas encore au moment où il s'exécute.
