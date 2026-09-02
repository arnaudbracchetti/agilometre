---
status: accepted
---

# Comptes Membre d'équipe en périmètre - suivi de l'ADR 0007

[ADR-0007](0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md) documentait un écart assumé
entre le modèle de données (qui porte `Membre.utilisateurId` dès sa conception) et le périmètre
fonctionnel v1 du PRD (§10), qui limitait les comptes locaux à Coach, Manager et Direction - rien
pour Membre d'équipe, pas même pour consulter les résultats de son équipe.

La session `/grill-with-docs` du 2026-08-30 sur la carte [#27](https://github.com/arnaudbracchetti/agilometre/issues/27)
referme cet écart dans l'autre sens : le Membre d'équipe reçoit un compte dès cette itération.

**Décision.** Un Utilisateur peut porter le Rôle Membre d'équipe et se connecter, pour consulter les
résultats des Équipes où il est référencé comme Membre. Le champ anticipé par l'ADR 0007 est désormais
exploité : rattachement automatique par email, liaison manuelle, propagation descendante des
informations du compte vers le Membre - voir [annexe Gestion des droits](../../doc/spec/annexes/gestion-des-droits.md).

**Raison.** Un Membre qui vote en séance et au pouls sans jamais pouvoir consulter le résultat de son
équipe menace directement le critère de succès n°1 du produit (PRD §11, taux de réponse au pouls
dans la durée) - voter sans retour affaiblit l'adhésion dans la durée.

**Ce qui reste inchangé.** Le PRD §10 lui-même reste corrigé pour refléter cette décision (voir sa
mise à jour) plutôt que de rester en écart documenté uniquement par un ADR, contrairement à ce que
faisait l'ADR 0007 - l'écart n'était alors qu'un décalage de calendrier entre le modèle et le
produit ; celui-ci est une décision fonctionnelle durable, qui mérite d'être lisible directement dans
la spec. L'ADR 0007 reste `accepted` : il documente toujours pourquoi le champ existait par
anticipation avant que cette décision ne soit prise.

**Conséquence.** Le Manager d'équipe, lui, reste hors périmètre - non pas par écart au PRD, mais par
absence de porteur identifié chez les clients à ce jour. Sa valeur d'enum et son invariant
Rôle/Habilitation restent portés par le domaine, sans qu'aucun compte ne soit créable avec.
