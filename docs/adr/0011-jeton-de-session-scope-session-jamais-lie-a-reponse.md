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

## Addendum — carte #37 : décrément explicite lors d'un changement de Session

La monotonie ci-dessus visait la **déconnexion passive** (onglet fermé, inactivité) : sans
détection de présence, rien ne permet de distinguer un device réellement parti d'un device
temporairement silencieux, donc rien ne doit décrémenter. Un **changement explicite de Session**
("Rejoindre une autre séance", `doc/spec/annexes/deroulement-session-animee.md`, "Jointure d'un
participant") est un cas différent : le device signale lui-même, de façon certaine, qu'il quitte
la Session d'origine — ce n'est plus une inférence de présence, c'est une action du client.

Décision : ce cas précis **sort le Jeton quitté du compteur de sa Session d'origine**. Le
mécanisme reste minimal et n'introduit aucune détection de présence :
- `JetonSession` gagne un champ `remplaceLe: Date | null`, renseigné uniquement par ce cas ;
  `compterPour` ne compte que les Jetons où `remplaceLe IS NULL`.
- Le client transmet le Jeton qu'il quitte (`jetonPrecedent`, lu depuis son storage local) à
  `POST /api/participant/rejoindre` ; le serveur invalide ce Jeton **seulement après confirmation**
  de la nouvelle jointure — un Code invalide ou une Session close entre-temps ne doit jamais faire
  perdre sa place au device dans la Session qu'il quittait.
- Toute autre voie de sortie (onglet fermé, inactivité, timeout) reste **sans effet** sur le
  compteur, exactement comme décidé ci-dessus — la monotonie n'est donc pas abandonnée, seulement
  précisée : elle protège contre l'absence de signal, pas contre un signal explicite du client.
