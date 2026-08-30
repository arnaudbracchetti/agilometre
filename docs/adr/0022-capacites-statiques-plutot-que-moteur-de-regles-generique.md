---
status: accepted
---

# Carte de capacités statique dans packages/shared, plutôt qu'un moteur de règles générique

L'application a besoin d'une connaissance centralisée de « quel Rôle a accès à quel écran/action »
(la matrice écran/rôle de [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md)),
pour éviter que cette connaissance ne se disperse en `@Roles(...)` listés en clair sur chaque route,
divergents avec le temps sans que rien ne le signale.

Deux familles de solutions étaient possibles : un moteur de règles générique et déclaratif façon
CASL/OPA (`can(action, sujet, conditions)`, extensible à des conditions arbitraires), ou une carte
statique unique (`{ [capacité]: Rôle[] }`) ne portant que les cas réellement rencontrés.

**Décision** : une carte statique unique, `packages/shared/src/capacites.ts`, sur le même patron que
`packages/shared/src/roles.ts` déjà en place - un seul objet, importé tel quel par le backend (pour
ses guards) et le frontend (pour gater son IHM), sans re-saisie de la règle d'un côté ou de l'autre.
`packages/shared` joue ici exactement le rôle qu'il joue déjà pour empêcher la dérive de calcul de
score entre les vues Coach/Manager/Direction (`CLAUDE.md`).

**Raison du rejet du moteur générique.** Aucune capacité de cette itération ne dépend d'autre chose
que du Rôle porteur du compte - pas de condition combinatoire, pas de règle par ressource au niveau
statique (le périmètre par ressource est un mécanisme volontairement séparé, voir
[politique-des-droits.md](../design/agregat-politique-des-droits.md) section 1). Un moteur générique
résoudrait un problème qu'on n'a pas, pour 4 Rôles et une douzaine d'écrans : la complexité
d'apprentissage et de maintenance d'un DSL de règles n'est pas justifiée par le besoin réel.

**Conséquence.** Si une capacité future dépend un jour d'autre chose que du Rôle (une condition sur
la donnée, par exemple), elle sort du périmètre de cette carte statique et rejoint le mécanisme de
périmètre par ressource (`PerimetreUtilisateur`) plutôt que de forcer la carte à porter des
conditions qu'elle n'a pas été conçue pour exprimer - à réexaminer si ce cas se présente.
