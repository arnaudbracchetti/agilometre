---
status: accepted
---

# Sollicitation : agrégat racine distinct de la Campagne, et Échéance jamais persistée

Design complet : [docs/design/agregat-campagne-de-pouls.md](../design/agregat-campagne-de-pouls.md).

Premier réflexe en session `/ddd` : `CampagnePouls` racine, `Sollicitation` entité enfant. La
lecture se défend - une Sollicitation naît d'une Campagne et n'existe pas sans elle - et elle rendait
gratuits en mémoire les invariants d'unicité d'un envoi.

Le volume et le profil d'écriture l'écartent, exactement comme ils ont sorti `TourDeVote` de
`Session` ([ADR-0010](0010-verrouillage-selection-a-ouverture-session.md) et
[agregat-tour-de-vote.md](../design/agregat-tour-de-vote.md) §1). Une Campagne d'un an sur 8 Membres
à deux envois par semaine, c'est ~800 Sollicitations sous la racine ; surtout, la route publique de
réponse résout un Jeton et n'a **aucune raison de charger la configuration de la Campagne** pour
écrire une Réponse.

**Décision.** Deux agrégats racines indépendants :

- **`CampagnePouls`** - détient sa configuration et son **Panel** (Sélection copiée figée,
  ADR-0009). Taille constante dans le temps. Ne détient aucun historique.
- **`Sollicitation`** - référence `campagneId` par identité, jamais l'agrégat chargé. Porte ses
  **N Questions** (l'annexe §4 pose « un Jeton = une Sollicitation = N Questions = une soumission
  unique » ; le squelette d'init avait un `questionId` singulier, corrigé).

**L'Échéance n'est pas persistée.** Elle reste ce que le glossaire en dit, « un instant d'envoi » :
un Value Object calculé par le rythme hebdomadaire. Une table `Echeance` a été envisagée puis
écartée - son seul rôle aurait été de porter un instant déjà déductible du rythme, et de servir de
verrou.

Sa trace est `Sollicitation.envoyeeLe`, **écrite avec l'instant d'échéance calculé et non avec
`now()`** : toutes les Sollicitations d'un même envoi partagent alors exactement la même valeur.
L'anti-doublon devient `WHERE campagneId = ? AND envoyeeLe = e`, doublé d'un
`@@unique([campagneId, membreId, envoyeeLe])` contre deux réveils concurrents de l'ordonnanceur ; le
taux « sur la dernière échéance » et l'historique des échéances (annexe §6) deviennent un
`GROUP BY envoyeeLe`. Rien à ajouter au modèle.

`expireLe` reste stocké, parce que ce n'est pas un état dérivable mais l'instantané d'une décision :
l'échéance suivante figée au moment de l'envoi, qu'un changement de rythme ultérieur ne déplace pas.
Il est vérifié à la résolution du Jeton, **jamais par un balayage de fond** - même mécanisme que
`JetonCompte`, dont la garde vit dans un UPDATE conditionnel atomique.

**Conséquences.**

- L'invariant « une seule Sollicitation par Membre et par échéance », gratuit si Sollicitation avait
  été une entité enfant, est porté par l'index unique partiel plus la garde du use case - même
  répartition que « `code` unique parmi les Sessions OUVERTE ».
- Sur une Équipe sans Membre, un envoi ne produit aucune ligne : la garde ne trouve rien et
  l'ordonnanceur retentera à chaque réveil jusqu'à la fin de la fenêtre de tolérance. Zéro email,
  donc sans conséquence, mais c'est un comportement à connaître.
- `Reponse` n'est pas touchée : ADR-0001 est ratifié, aucun champ ne s'y ajoute.
