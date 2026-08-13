---
status: accepted
---

# Nettoyage des Habilitations orphelines dans la même transaction que la suppression

Quand une Équipe ou une Entité est supprimée, les Habilitations d'Utilisateurs (Manager, Direction)
qui la référencent doivent être nettoyées - sans quoi un Utilisateur garderait un droit d'accès
pointant vers une Équipe/Entité qui n'existe plus. Ce nettoyage touche l'agrégat Utilisateur depuis
un use case dont l'agrégat principal est Équipe ou Entité ([ADR 0005](0005-organisation-trois-agregats-separes.md)),
ce qui contredit la règle DDD habituelle "une transaction ne touche qu'un agrégat".

**Décision** : le nettoyage se fait de façon synchrone, dans la même transaction Postgres que la
suppression - le use case charge les Utilisateurs concernés
(`UtilisateurRepository.trouverParHabilitation(...)`), retire leurs Habilitations orphelines, et
sauvegarde le tout avant de committer. C'est une déviation assumée de la règle "un agrégat par
transaction", pour deux raisons : le projet n'a aujourd'hui aucune infrastructure d'événements de
domaine (aucun agrégat existant n'en publie, en introduire une pour ce seul besoin serait
disproportionné), et le sujet - un droit d'accès - rend une fenêtre d'incohérence, même courte,
plus gênante qu'une transaction un peu plus large.

**Conséquence.** Si une infrastructure d'événements de domaine apparaît un jour pour d'autres
raisons, ce nettoyage est un candidat naturel à migrer vers un modèle éventuellement cohérent
(événement `ÉquipeSupprimée`/`EntitéSupprimée` consommé par un handler dédié).
