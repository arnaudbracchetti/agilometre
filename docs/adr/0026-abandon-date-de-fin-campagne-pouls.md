---
status: accepted
---

# Une Campagne de pouls n'a pas de date de fin : le Coach la termine

Le cadrage d'ouverture de la carte [#67](https://github.com/arnaudbracchetti/agilometre/issues/67)
donnait à la Campagne une **date de fin optionnelle**, et posait que le passage en `terminée`
survenait « sur geste du Coach ou automatiquement au franchissement de la date de fin ».

Deux chemins vers le même état final, c'est un second état concurrent du statut - précisément ce que
l'absence de date de **début** avait déjà écarté (annexe §1 : « une date de début serait un second
état concurrent du statut, avec le risque classique d'une Campagne active qui n'envoie rien »). La
date de fin réintroduisait la symétrie du problème : une Campagne `ACTIVE` en base dont la date est
passée, qui continue d'envoyer tant que l'ordonnanceur ne l'a pas régularisée, et qui ment donc sur
son propre statut après une coupure. Le contourner demandait une garde dérivée `estActive(maintenant)`
doublant le statut stocké.

**Décision.** La date de fin est **supprimée du produit**, pas rendue dérivable. Le cycle de vie
reste `brouillon → active ⇄ suspendue → terminée`, et la terminaison est un **geste du Coach**,
unique et explicite. Le statut stocké est alors la seule vérité, sans garde additionnelle et sans
état concurrent à réconcilier.

Cette forme supprime le problème au lieu de le gérer. Elle vaut aussi par ce qu'elle retire de
l'interface : un champ de moins à configurer, à expliquer et à afficher, pour une échéance qui
n'était de toute façon pas obligatoire et dont l'intérêt réel n'était pas établi.

**Conséquences.**

- `CampagnePouls` n'a pas de colonne `dateFin` - le squelette d'init en avait une, jamais utilisée.
- L'ordonnanceur ne bascule **aucun** statut : il envoie, c'est tout. Il n'a aucune écriture à faire
  sur la Campagne.
- Une Campagne qu'on veut arrêter temporairement se **suspend** ; celle qu'on veut arrêter
  définitivement se **termine**. La suspension couvrait déjà les congés et les réorganisations, qui
  étaient l'usage réel invoqué pour la date de fin.
- PRD §4 et §8, l'annexe Campagne de pouls §1, `CONTEXT.md` (définition de **Campagne de pouls**) et
  le ticket [#69](https://github.com/arnaudbracchetti/agilometre/issues/69) sont amendés en
  conséquence.
- Rien n'interdit d'ajouter une date de fin plus tard : elle ne laisse aucune dette de migration,
  puisqu'elle n'est ni écrite ni lue.
