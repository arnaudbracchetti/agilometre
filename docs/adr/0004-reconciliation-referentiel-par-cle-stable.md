---
status: accepted
---

# Réconciliation du Référentiel par Clé stable, archivage plutôt que suppression, aperçu/application séparés

Le Référentiel (Thèmes, Questions, Options) n'est pas figé pour toujours comme le laisse entendre
le PRD (§4 : "importé une fois au déploiement, figé ensuite") - il est ré-importable dans le
temps depuis un fichier YAML, à la demande explicite d'un opérateur. On a tranché trois points
de fond, liés entre eux, pour ce mécanisme (design complet : [docs/design/agregat-referentiel.md](../design/agregat-referentiel.md)) :

1. **Réconciliation par Clé stable.** Chaque Thème/Question porte dans le YAML un identifiant
   métier fourni par l'auteur du fichier (pas généré). C'est ce qui permet de reconnaître "la
   même" entité d'un import à l'autre malgré un changement de libellé ou de Thème - un
   appariement par contenu (libellé) aurait traité toute reformulation comme une nouvelle entité,
   perdant le lien vers les Réponses déjà enregistrées.

2. **Archivage, jamais suppression physique.** Un Thème ou une Question qui disparaît du YAML est
   marqué retiré (`retireLe`/`retireeLe`), pas supprimé - une Réponse déjà enregistrée doit
   toujours pouvoir résoudre son Thème/sa Question d'origine. La réapparition d'une Clé stable
   archivée la réactive, sans créer de doublon.

3. **`previewImport` et `applyImport` séparés, partageant le même calcul de diff.** Aucune
   application automatique au démarrage du serveur : un opérateur obtient d'abord un `ChangeSet`
   (aperçu détaillé + synthèse chiffrée, sans écriture), le relit, puis déclenche `applyImport`
   séparément. Les deux use cases appellent la même méthode de domaine pour calculer les
   changements, afin que l'aperçu prédise fidèlement ce que l'application va faire - c'est cette
   revue humaine qui sert de garde-fou contre un import mal formé ou tronqué, plutôt qu'un seuil
   automatique.

**Conséquence.** Le format du fichier d'import doit porter une Clé stable par Thème et par
Question dès le départ - une contrainte sur le fournisseur du fichier, pas seulement un détail
d'implémentation interne. Le déclenchement de `previewImport`/`applyImport` en production (CLI,
endpoint admin, script de déploiement) reste à trancher à l'Epic Déploiement & ops (#12) ; pour le
développement, les deux opérations sont exposées via deux endpoints HTTP temporaires.
