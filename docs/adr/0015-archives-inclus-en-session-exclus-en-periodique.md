---
status: accepted
---

# Réponses archivées : incluses en Portée Session, exclues en Portée périodique

`Question.retireeLe` et `Theme.retireLe` archivent sans supprimer - CONTEXT.md le justifie déjà par
"préserve la lisibilité des Réponses déjà enregistrées". Reste à trancher si ces Réponses comptent
encore dans un Palier.

**Décision.** Cela dépend du mode de Portée (ADR-0014). En Portée **Session**, elles sont incluses :
c'est le compte-rendu d'une séance qui a réellement eu lieu, l'amputer d'une Question depuis
archivée le rendrait faux. En Portée **périodique** (radar, Mur de badges, Tendance, Entité), elles
sont exclues : ce mode décrit la maturité *actuelle* au regard du Référentiel actuel, et un badge
sur un Thème qui n'existe plus serait du bruit qui empêcherait de comparer deux Équipes sur le même
jeu de Thèmes.
