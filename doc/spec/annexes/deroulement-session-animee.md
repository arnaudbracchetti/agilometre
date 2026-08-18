# Annexe au PRD — Déroulement de la Session animée (vote en direct)

Détaille le parcours « séance animée » que le [PRD](../PRD-maturite-agile.md) décrit à un niveau
narratif (§5 Anonymat, §7 Parcours, §9 Restitutions, §10 Contraintes techniques). Complète
[modeles-de-session.md](modeles-de-session.md), qui couvre la préparation d'une Session
(sélection de questions) et renvoie explicitement l'écran de pilotage de séance en direct à un
document séparé (§"Hors périmètre", ligne 96-97) — c'est cette annexe. Vocabulaire : voir
[CONTEXT.md](../../../CONTEXT.md) ; les termes nouveaux introduits ici (Jeton de session, Question
sautée, Écran de pilotage/projection/participant) restent à intégrer au glossaire lors d'une
prochaine session `/domain-modeling`.

Ce document couvre le *comportement* attendu, issu d'un grilling de clarification — pas la
conception d'agrégat. La modélisation formelle (`Session` étendue, `TourDeVote`, jeton) reste à
faire via une session `/ddd` dédiée (Epic #30 « Vote en séance »).

## Vue d'ensemble du parcours

1. **Ouverture** — le Coach ouvre une Session déjà préparée. Un Code de session est généré ; la
   Sélection se verrouille définitivement.
2. **Salle d'attente** — l'écran de projection affiche le Code et le nombre de devices déjà
   connectés. Le Coach lance la première Question quand il est prêt.
3. **Discussion** — la Question courante et ses 4 Options s'affichent en projection ; aucun Tour
   de vote n'est encore ouvert.
4. **Vote** — le Coach ouvre un Tour de vote ; les participants votent depuis leur device ; la
   projection garde la Question et ses Options affichées et ajoute le compteur de participation
   — seule la répartition des votes en cours reste cachée.
5. **Clôture** — le Coach clôt le Tour ; l'histogramme et le Palier s'affichent en projection.
   Le Coach peut rouvrir un nouveau Tour sur la même Question (revote) ou passer à la Question
   suivante.
6. **Question suivante** — dès que le Coach avance, la Question précédente devient définitive
   (plus de nouveau Tour possible dessus).
7. **Synthèse** — une fois toutes les Questions traitées ou sautées, écran de synthèse par thème.
8. **Clôture finale** — le Coach termine la Session explicitement ; elle passe à `CLOTUREE`.

## Ouverture de la séance

- Le Coach déclenche l'ouverture depuis l'écran de préparation existant (`/sessions/:id`). Un
  **Code de session** court, numérique, est généré et affiché sur l'écran de projection — voir
  [CONTEXT.md](../../../CONTEXT.md) (« Code (de session) »).
- Le Code est **unique parmi les Sessions actuellement `OUVERTE`** sur l'instance (plusieurs
  Coachs peuvent animer des Sessions en parallèle) ; en cas de collision, un nouveau Code est
  régénéré. Deux Sessions closes à des dates différentes peuvent avoir eu le même Code.
- L'ouverture **verrouille immédiatement la Sélection** (`Session.verrouillee = true`), avant
  même l'ouverture du premier Tour de vote. Ceci précise et remplace la règle énoncée dans
  [modeles-de-session.md:74-77](modeles-de-session.md), qui plaçait ce verrouillage au premier
  Tour — décision affinée par ce grilling, la Sélection ne doit plus bouger dès que des
  participants peuvent commencer à rejoindre.
- Une Session `OUVERTE` sans activité ne connaît **aucune expiration automatique** — seule une
  action explicite du Coach la fait progresser ou la clôture.

## Jointure d'un participant

- Le participant (smartphone ou PC, en salle ou à distance) saisit le Code sur un écran dédié,
  sans compte ni mot de passe.
- En échange, le serveur émet un **Jeton de session** anonyme : il authentifie le device pour
  toute la durée de la Session (pas renouvelé par Tour), sans jamais être lié à une identité
  (pas de choix de nom, pas de lien vers un Membre du roster de l'Équipe).
- Le Jeton est **persistant côté navigateur** (stockage local) : un rechargement de page le
  réutilise automatiquement, sans repasser par la saisie du Code.
- Un participant qui rejoint après l'ouverture d'un Tour peut voter sur ce Tour tant qu'il n'est
  pas clos — aucune pénalité liée au moment de connexion.
- Le Jeton (et le Code) sont invalidés à la clôture finale de la Session (`CLOTUREE`).
- Aucune table ne conserve durablement de lien Jeton ↔ Réponse, conformément au contrat
  d'anonymat de [ADR-0001](../../../docs/adr/0001-contrat-anonymat-reponse.md) : ce Jeton de
  session est un mécanisme distinct du Jeton de Sollicitation utilisé pour le Pouls.

## Déroulé d'une Question — Tour de vote

- Un seul Tour de vote ouvert à la fois pour toute la Session (séquencement strict, pas de
  Tours parallèles sur des Questions différentes).
- Le Coach ouvre le Tour quand il le décide (fin de la discussion). Chaque device connecté peut
  alors voter une des 4 Options.
- **Revote autorisé pendant que le Tour est ouvert** : une nouvelle soumission avec le même
  Jeton remplace la précédente pour ce Tour (pas de trace des versions intermédiaires).
- Le Coach peut **clore le Tour à tout moment**, sans attendre que tous les devices connectés
  aient voté — le compteur de participation est indicatif, pas un verrou bloquant la clôture.
- Après clôture, l'histogramme et le Palier de la Question s'affichent en projection.
- **Revote sur la même Question** (PRD §7 étape 7) : le Coach peut rouvrir un nouveau Tour sur
  la Question courante après discussion, tant qu'il n'est pas passé à la Question suivante. Tous
  les Tours sont conservés en base ; seul le dernier compte pour le score (cf. définition « Tour
  de vote » dans CONTEXT.md).
- Dès que le Coach passe à la Question suivante, la Question précédente devient **définitive** :
  plus aucun nouveau Tour possible dessus, y compris depuis l'écran de synthèse final.

## Question sautée

- Une fois la Sélection verrouillée (dès l'ouverture), plus aucun ajout, retrait ou
  réorganisation n'est possible sur la Sélection elle-même.
- La seule action encore permise sur une Question restante (pas encore traitée) est de la
  **marquer « sautée »** — par exemple par manque de temps.
- Une Question sautée reste visible dans la Session et son historique (trace qu'elle était
  prévue), mais n'attend plus de résultat et est **exclue du score global de la Session**.
- Le « mode annulation seule » mentionné dans
  [modeles-de-session.md](modeles-de-session.md) désigne ce marquage — pas une annulation
  globale de la Session, qui n'existe pas dans cet Epic.
- **Terminer la séance prématurément** (action du Coach, à tout moment) marque automatiquement
  toutes les Questions restantes comme sautées et amène directement à l'écran de synthèse — pas
  besoin de les sauter une à une.
- Dans la synthèse et toute restitution, une Question sautée **apparaît explicitement** comme
  non évaluée (état visuel distinct), plutôt que de disparaître silencieusement.

## Écran de pilotage (Coach)

Poste du Coach, authentifié avec son compte. Fonctionnalités, au-delà de l'affichage projeté :

- **Vue d'ensemble de la progression** : liste complète de la Sélection, en permanence visible,
  avec le statut de chaque Question (à venir / en cours / traitée / sautée).
- **Contrôles de Tour** : ouvrir / clore un Tour de vote sur la Question en cours, à tout moment.
- **Marquer une Question restante comme sautée**.
- **Terminer la séance prématurément** (voir ci-dessus).
- **Terminer la séance** (clôture finale, `CLOTUREE`) depuis l'écran de synthèse.
- **Historique en direct** : consultation, à tout moment pendant la séance (pas seulement à la
  synthèse finale), de l'histogramme des Tours déjà clos sur les Questions précédentes.
- **Ouvrir l'écran de projection** dans un nouvel onglet (lien direct, voir ci-dessous).

Hors périmètre V1 : prise de notes libres par le Coach pendant la séance — écartée pour l'instant.

Après `CLOTUREE`, ce même écran bascule en **lecture seule** sur la même URL : mêmes
informations (progression, Tours, notes), plus aucun contrôle actif. Pas d'écran de consultation
séparé.

## Écran de projection

- Accessible **sans compte**, via une **URL dédiée à la Session**, ouverte manuellement ou
  depuis l'écran de pilotage (bouton dédié). Destinée au vidéoprojecteur de la salle, sur un
  poste éventuellement distinct de celui du Coach.
- Devient **inaccessible dès que la Session passe à `CLOTUREE`** — même règle de validité que le
  Code et le Jeton participant.
- Le Code de session reste affiché **en permanence**, quel que soit l'état — y compris une fois
  les Questions lancées — pour qu'un retardataire puisse toujours rejoindre. Contenu par état,
  en plus du Code :
  - **Salle d'attente** (avant la première Question) : nombre de devices déjà connectés.
  - **Discussion** : Question courante + 4 Options (avec leur lettre A/B/C/D), aucun Tour ouvert.
  - **Vote** : **même contenu que la Discussion** (Question + 4 Options) **plus** le Compteur de
    participation (« 6 sur 8 ») à côté. Ce qui reste caché pendant le vote, ce n'est **pas** la
    Question — c'est la **répartition des votes en cours** (PRD §7 étape 5 : le résultat, pas le
    contenu, reste invisible tant que le Tour n'est pas clos).
  - **Clôture** : histogramme de répartition + Palier de la Question.
  - **Synthèse** : vue par thème une fois toutes les Questions traitées ou sautées.
- Synchronisation avec le Coach par sondage HTTP toutes les 2 secondes (PRD §10) — pas de
  websocket.

## Écran participant

**Rejoindre.** Le participant saisit le Code sur un écran dédié, sans compte ni mot de passe
(voir « Jointure d'un participant » ci-dessus).
- Code invalide, faute de frappe, ou Session pas encore `OUVERTE`/déjà `CLOTUREE` : message
  d'erreur inline sous le champ de saisie, sans changer d'écran — nouvelle saisie immédiate.
- Un device déjà rejoint (Jeton en stockage local) peut saisir un **nouveau** Code pour rejoindre
  une autre Session : le nouveau Jeton remplace l'ancien, qui est invalidé et sort du Compteur de
  participation de la Session quittée (ADR-0011, addendum carte #37) — mais reste sans effet sur
  la Session cible tant que la nouvelle jointure n'a pas explicitement réussi.
- **Reconnexion après déconnexion sauvage** : un device qui revient (réseau rétabli) avec un
  Jeton toujours en stockage local, alors que sa Session s'est entretemps clôturée, se voit
  rejeté par le serveur dès la requête suivante — traité exactement comme un Code invalide, avec
  le même écran d'erreur. Pas de purge active du Jeton à la clôture : c'est la vérification du
  statut de la Session à chaque requête qui le rend inopérant.

**États.** Deux états seulement, selon qu'un Tour est ouvert sur la Question courante ou non :
- **Hors vote** (avant l'ouverture du Tour, ou après sa clôture) : écran d'attente neutre
  (« Le coach anime la discussion » / « Vote enregistré, résultats à l'écran »). Ne montre
  **jamais** l'histogramme ni la répartition — ça reste réservé à la projection.
- **Vote** (Tour ouvert) : les 4 Options s'affichent, actives pendant toute la durée du Tour.

**Voter — responsive, sans biais de Niveau.**
- **PC** : 4 gros boutons affichant à la fois une lettre (A/B/C/D) et le libellé texte complet
  de l'Option.
- **Mobile** : 4 gros boutons affichant **uniquement** la lettre (A/B/C/D), sans libellé —
  priorité à la taille de la cible tactile sur petit écran. Le texte reste consultable via
  l'écran de projection (accessible sans compte par lien direct, y compris à distance dans un
  second onglet).
- **Ordre des lettres fixe** : A/B/C/D suivent l'ordre des Options tel que stocké dans le
  Référentiel (pas de mélange par Question/Tour/participant) — plus simple à suivre à l'oral en
  salle, au prix d'un risque assumé qu'un participant assidu associe au fil de la séance une
  lettre à un Niveau (déjà atténué par le fait que le Niveau lui-même n'est jamais affiché).
- **Revote** : les 4 Options restent actives tant que le Tour est ouvert — pas de bascule vers
  l'écran d'attente après le premier vote. L'Option choisie est mise en évidence par une mention
  (« vote pris en compte ») ; taper une autre Option la remplace immédiatement.
- **Compteur de participation** : réservé à l'écran de projection, ne s'affiche jamais sur
  l'écran participant (ni PC ni mobile), même à distance.

## Compteur de participation

- **Device-based, pas Équipe-based** : le dénominateur est le nombre de Jetons émis depuis
  l'ouverture de la Session (devices ayant rejoint), pas l'effectif `Equipe.membres`. Compromis
  assumé : un Membre présent sur deux devices est compté deux fois ; deux Membres partageant un
  device n'en comptent qu'un.
- **Monotone croissant** : jamais décrémenté pour une déconnexion passive (device inactif, onglet
  fermé) — pas de détection de présence, cohérent avec le choix de polling simple (PRD §10).
  Exception : un changement **explicite** de Session (« Rejoindre une autre séance ») décrémente
  le compteur de la Session quittée, puisque le device signale lui-même son départ (ADR-0011,
  addendum carte #37) — ce n'est pas une inférence de présence.
- Sur un Tour donné, le numérateur est le nombre de Jetons distincts ayant soumis un vote sur ce
  Tour (un revote ne compte pas deux fois).

## Synchronisation des écrans

Les trois écrans se synchronisent par **sondage HTTP**, jamais par websocket (PRD §10 —
robustesse derrière les proxies d'entreprise dont on ne maîtrise pas la configuration).

**Volumétrie.** Une séance type (« 6 sur 8 ») génère environ 5 requêtes/seconde tous écrans
confondus ; même une dizaine de séances en parallèle restent négligeables pour un process Node
avec des requêtes indexées. Le déploiement étant on-premise, une instance par client, la charge
n'est pas un facteur limitant.

**Un point de lecture par écran**, jamais un point partagé dont le contenu varierait selon
l'appelant : chaque réponse ne contient que ce que son écran a le droit de voir, aucune règle de
confidentialité n'est déléguée au client.

| Écran | Point de lecture | Accès | Rythme |
|---|---|---|---|
| Participant | `GET /api/participant/moi` | `Authorization: Bearer <Jeton de session>` | **1 s** |
| Projection | `GET /api/projection/:sessionId` | public (UUID non devinable) | 2 s |
| Pilotage | `GET /api/sessions/:id/pilotage` | Coach (non protégé en l'état, voir ci-dessous) | 2 s |

Le rythme du participant est volontairement plus rapide : c'est le seul écran où la latence est
directement ressentie (voir le vote s'ouvrir ou se couper). Le serveur y renvoie toujours le
libellé complet des Options — c'est le front qui n'affiche que la lettre sur mobile (adaptation
d'affichage, pas une variante de contenu).

**Éviter de retransmettre un état inchangé.** Chaque réponse porte une empreinte de son propre
contenu (ETag, mécanisme HTTP standard) ; au sondage suivant, le client la représente et reçoit
une réponse vide si rien n'a changé — ce qui est le cas la plupart du temps, le Coach agissant
toutes les quelques minutes.

Conséquence utile : l'écran participant reste silencieux pendant tout un Tour de vote, même
quand les autres votent, **parce que le Compteur de participation n'apparaît pas dans sa charge
utile** — son contenu est identique, donc son empreinte aussi. Projection et pilotage, eux,
affichent ce compteur : leur contenu change à chaque vote, donc ils reçoivent bien la mise à
jour. Cette propriété découle du contenu de chaque vue, elle n'est pas une règle à maintenir.
Voir [ADR-0013](../../../docs/adr/0013-etag-plutot-que-compteur-de-revision.md).

**Limitation de débit.** Les points de lecture live sont exonérés du garde-fou global de débit :
en salle, tous les devices sortent derrière une même IP publique (NAT d'entreprise), et un
comptage par IP les bloquerait en pleine séance. Ce sont des lectures seules, sans impact métier
en cas d'abus. Voir [ADR-0012](../../../docs/adr/0012-exoneration-throttler-routes-polling.md).

**Erreurs.**
- Jeton invalide, ou rattaché à une Session qui n'est plus `OUVERTE` (y compris reconnexion
  tardive) : toute route participant est rejetée, sans distinguer la cause. Le front bascule sur
  l'écran de saisie du Code.
- Code inconnu ou expiré à la jointure : erreur reprise dans le message inline sous le champ.

**Robustesse côté client.**
- Échec de sondage : après quelques échecs consécutifs, un bandeau discret « connexion perdue »
  apparaît **sans effacer l'écran en cours** (le participant garde ses boutons de vote visibles) ;
  le sondage continue et le bandeau disparaît dès la première réponse reçue. Un vote tenté hors
  ligne affiche une erreur explicite.
- Le sondage **s'arrête définitivement** dès qu'une réponse indique que la Session est
  `CLOTUREE`, sur les trois écrans — évite un sondage perpétuel sur des onglets oubliés ouverts.
- Pas de mise en pause quand l'onglet passe en arrière-plan, ni de ralentissement progressif
  après échecs : écartés pour garder le mécanisme simple. *Limite connue* : les navigateurs
  brident de toute façon les minuteurs des onglets en arrière-plan (jusqu'à une fois par minute),
  donc un participant qui bascule sur une autre application verra l'ouverture du vote avec du
  retard, quel que soit l'intervalle configuré.

**Authentification du Coach : hors périmètre.** Aucune authentification n'existe encore dans
l'application (aucune route n'est protégée aujourd'hui). L'écran de pilotage reste donc ouvert
en l'état ; la protection viendra s'y greffer plus tard sans changer la forme des données
échangées.

## Hors périmètre de cette annexe

- Modélisation formelle des agrégats (`Session.ouvrir()`, `TourDeVote`, `Participation`,
  invariants de séquencement, représentation du Jeton et de la Question sautée) — traitée depuis
  dans [docs/design/agregat-tour-de-vote.md](../../../docs/design/agregat-tour-de-vote.md).
- Forme exacte des charges utiles échangées à chaque sondage (structure JSON champ par champ) —
  les points de lecture, rythmes et règles sont fixés ci-dessus, le détail des DTO relève de
  l'implémentation.
- Contenu détaillé de l'écran de synthèse par thème (PRD §7 étape 8, PRD §9 « Profil par thème »).
- Mécanisme technique d'unicité du Code parmi les Sessions ouvertes (contrainte applicative vs
  base de données).
