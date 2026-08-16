---
status: accepted
---

# Jeton de session : portée toute la Session, jamais lié durablement à une Réponse

[ADR-0001](0001-contrat-anonymat-reponse.md) laissait explicitement en suspens le mécanisme de
comptage de participation en direct ("6 sur 8", PRD §7), à trancher au démarrage de l'Epic
Session animée. Décision : un device qui rejoint via le Code reçoit un Jeton de session anonyme
valable pour **toute la durée de la Session**, pas renouvelé à chaque Tour de vote, et persistant
côté navigateur (un rechargement de page le réutilise). Le Compteur de participation ("X sur Y")
est **device-based** — Y est le nombre de Jetons émis depuis l'ouverture, pas l'effectif de
l'Équipe — et **monotone croissant** : jamais décrémenté, même si un device devient inactif.

**Alternatives écartées.** Un jeton renouvelé par Tour aurait permis de garantir qu'un
participant ne vote que sur les Tours auxquels il a explicitement rejoint, au prix d'une
re-saisie du Code à gérer côté IHM à chaque question. Une détection de présence (décrément du
compteur après un délai d'inactivité) aurait rapproché le compteur de la réalité de la salle, au
prix d'une logique de timeout et d'un polling plus fréquent — jugé disproportionné face à la
tolérance explicite du PRD §10 ("deux secondes de latence sur un compteur de votes sont
invisibles en atelier"). Les deux options ont été écartées au profit de la simplicité.

**Anonymat.** Comme pour le Jeton de Sollicitation ([ADR-0001](0001-contrat-anonymat-reponse.md)),
aucune table ne conserve durablement de lien Jeton de session ↔ Réponse : la `Reponse` reste sans
référence au device qui l'a produite. Le Jeton de session doit néanmoins permettre de détecter un
double vote *au sein d'un même Tour* pendant que celui-ci est ouvert (pour autoriser le revote
sans le compter deux fois) — ce rapprochement est nécessairement temporaire et scellé au Tour en
cours, jamais persisté au-delà de sa clôture.

**Hors périmètre de cette décision.** Le support de stockage exact du Compteur de participation
(table éphémère, mémoire process) est laissé à la session `/ddd` dédiée à cet Epic.
