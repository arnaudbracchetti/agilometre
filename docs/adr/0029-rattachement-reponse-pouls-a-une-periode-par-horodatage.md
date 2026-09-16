---
status: accepted
---

# Une Réponse de Pouls est rattachée à une Période par son horodatage, jamais par l'échéance de sa Sollicitation

L'ADR-0014 (addendum) fait entrer les Réponses d'origine Pouls dans les mêmes Périodes de calcul que
celles des Sessions. Reste à dire **quel instant** décide de la Période d'une Réponse de Pouls. Pour
une Session, c'est la date de la séance qui borne la Période, jamais l'horodatage des Réponses
elles-mêmes. Le Pouls n'a pas de séance : l'analogue naturel serait l'échéance de la Sollicitation,
c'est-à-dire la date à laquelle le Membre a été sollicité.

**Décision.** Une Réponse d'origine Pouls appartient à la Période de calcul qui contient son
**horodatage**, l'instant où le Membre a répondu. Une Sollicitation envoyée le 30 juin et honorée le
2 juillet compte donc pour la Période de juillet, pas celle de juin.

**Alternative écartée, et pourquoi elle est inatteignable.** Rattacher par `Sollicitation.envoyeeLe`
serait plus proche de l'intention du Coach (« le pouls de juin »), mais l'ADR-0001 interdit toute
référence entre une Réponse et la Sollicitation qui l'a produite : le lien n'existe pas en base et ne
peut pas exister sans rompre le contrat d'anonymat. L'horodatage de la Réponse n'est donc pas le
meilleur candidat parmi plusieurs, c'est le **seul atteignable**. Ce point est écrit ici précisément
parce que le code ne le montre pas : un lecteur qui voit deux origines bornées par deux horodatages
différents conclura à un oubli et proposera de « corriger » en passant par la Sollicitation.

**Conséquence assumée.** Une réponse tardive migre vers la Période suivante au lieu d'être perdue,
ce qui est le comportement souhaitable : l'alternative (la rattacher rétroactivement à une Période
déjà restituée) modifierait un Palier déjà lu par un Manager ou une Direction. Le décalage reste
borné par l'expiration du Jeton.
