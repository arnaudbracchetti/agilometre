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
   projection affiche uniquement le compteur de participation, jamais le contenu.
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
- Contenu par état :
  - **Salle d'attente** (avant la première Question) : Code de session, nombre de devices déjà
    connectés.
  - **Discussion** : Question courante + 4 Options, aucun Tour ouvert.
  - **Vote** : compteur de participation uniquement (« 6 sur 8 ») — jamais le contenu de la
    Question ni les votes en cours (PRD §7 étape 5).
  - **Clôture** : histogramme de répartition + Palier de la Question.
  - **Synthèse** : vue par thème une fois toutes les Questions traitées ou sautées.
- Synchronisation avec le Coach par sondage HTTP toutes les 2 secondes (PRD §10) — pas de
  websocket.

## Écran participant

- Accessible **sans compte**, via saisie du Code puis obtention du Jeton (voir ci-dessus).
- Volontairement pauvre en contenu, à tout moment hors vote actif : écran d'attente neutre
  (« Le coach anime la discussion » / « Vote enregistré, résultats à l'écran »).
- Affiche la Question + 4 Options **uniquement** pendant qu'un Tour est ouvert, pour voter.
- Ne montre **jamais** l'histogramme ni le contenu en dehors du vote lui-même — la règle « rien
  du contenu » du PRD §7 étape 5 est étendue par symétrie à la phase de discussion et au résultat,
  pas seulement au vote en cours.

## Compteur de participation

- **Device-based, pas Équipe-based** : le dénominateur est le nombre de Jetons émis depuis
  l'ouverture de la Session (devices ayant rejoint), pas l'effectif `Equipe.membres`. Compromis
  assumé : un Membre présent sur deux devices est compté deux fois ; deux Membres partageant un
  device n'en comptent qu'un.
- **Monotone croissant** : jamais décrémenté, même si un device devient inactif ou ferme son
  onglet — pas de détection de présence, cohérent avec le choix de polling simple (PRD §10).
- Sur un Tour donné, le numérateur est le nombre de Jetons distincts ayant soumis un vote sur ce
  Tour (un revote ne compte pas deux fois).

## Hors périmètre de cette annexe

- Modélisation formelle de l'agrégat (`Session.ouvrir()`, `TourDeVote` comme entité enfant,
  invariants de séquencement, représentation du Jeton et de la Question sautée) — objet d'une
  session `/ddd` dédiée.
- Support de stockage du compteur de participation en direct, du Jeton de session et de la Note
  de séance (table dédiée vs champ sur une entité existante).
- Forme exacte du contrat de polling (endpoints, payloads) pour les 3 écrans.
- Contenu détaillé de l'écran de synthèse par thème (PRD §7 étape 8, PRD §9 « Profil par thème »).
- Mécanisme technique d'unicité du Code parmi les Sessions ouvertes (contrainte applicative vs
  base de données).
