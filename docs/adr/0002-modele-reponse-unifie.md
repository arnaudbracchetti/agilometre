---
status: accepted
---

# Modèle Réponse unifié Session/Pouls (pas de séparation par origine)

Le schéma actuel (`apps/backend/prisma/schema.prisma`) porte un seul modèle `Reponse` pour les
deux origines (`origine: SESSION | POULS`), plutôt que deux modèles distincts. Cette forme est
ratifiée comme définitive : elle transcrit directement le PRD §4 ("question, niveau choisi (1 à
4), équipe, horodatage, origine, et pour une session le numéro de tour"), et une séparation en
deux modèles dupliquerait `questionId`/`niveau`/`equipeId`/`horodatage` sans gain, puisque le
côté pouls ne porte aucun champ supplémentaire (conformément à [ADR 0001](0001-contrat-anonymat-reponse.md), qui interdit tout lien vers `Sollicitation`). Un modèle unique permet aussi la
"vue consolidée d'une équipe : les deux sources réunies" (PRD §6) par un simple scan de table,
sans UNION.

**Champ conditionnel à l'origine.** `tour`/`tourId` (`TourDeVote?`) n'est renseigné que pour
`origine = SESSION`. Le schéma ne porte aucune contrainte empêchant une ligne `POULS` d'avoir
`tourId` renseigné, ou une ligne `SESSION` de l'avoir à null : cet invariant est délibérément
laissé au niveau du domaine (agrégat riche `Reponse`, validé à la construction/persistance), pas
imposé par une contrainte `CHECK` en base — cohérent avec l'approche DDD du projet (CLAUDE.md).
Sa conception précise (validation, éventuelle modélisation en sous-types côté domaine malgré une
table unique) est différée à la session `/ddd` de l'Epic qui implémentera `Reponse`.

**Hors périmètre de cette décision.** L'ajout d'un type TS `Reponse` dans `packages/shared` est
différé au même Epic — `packages/shared` existe pour éviter la dérive du calcul de scoring entre
vues par rôle (CLAUDE.md), pas pour refléter chaque entité systématiquement.
