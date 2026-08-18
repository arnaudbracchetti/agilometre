# Agrégats Tour de vote (Epic #30)

Design issu de la session `/ddd` sur l'Epic [Vote en séance #30](https://github.com/arnaudbracchetti/agilometre/issues/30),
en continuité de [agregat-session.md](agregat-session.md) (Epic #29) et de la session `/grill-me`
documentée dans [doc/spec/annexes/deroulement-session-animee.md](../../doc/spec/annexes/deroulement-session-animee.md).
Vocabulaire : `CONTEXT.md`, section Session animée. Décisions structurantes :
[ADR-0001](../adr/0001-contrat-anonymat-reponse.md), [ADR-0002](../adr/0002-modele-reponse-unifie.md),
[ADR-0010](../adr/0010-verrouillage-selection-a-ouverture-session.md),
[ADR-0011](../adr/0011-jeton-de-session-scope-session-jamais-lie-a-reponse.md).

## Contexte

`agregat-session.md` couvrait la relation Modèle ↔ Sélection ↔ Session (préparation d'une
séance) et renvoyait explicitement le déroulé d'un Tour de vote — ouverture/clôture, comptage,
revote, clôture de la Session — à cette session `/ddd` dédiée. ADR-0001 laissait de son côté le
mécanisme de comptage de participation en direct "à trancher au démarrage de l'Epic" ; ADR-0011
l'a depuis tranché au niveau comportemental (portée du Jeton de session). Cette session couvre la
traduction de ces décisions en agrégats, entités et invariants.

## 1. Structure des agrégats

**`Session`** (racine existante, étendue) :

- `statut` passe de 2 à **3 valeurs** : `PREPAREE | OUVERTE | CLOTUREE`. `creer()` produit
  désormais `PREPAREE` (au lieu de `OUVERTE`) — les Sessions déjà en base migrent vers
  `PREPAREE` par défaut, `OUVERTE` n'ayant jusqu'ici jamais eu de sens différent de "pas encore
  clôturée".
- Nouveaux champs : `code: string | null` (renseigné seulement à partir de `OUVERTE`),
  `questionsSautees: Set<QuestionId>`, `indexCourant: number` (position dans la Sélection,
  démarre à **-1** : salle d'attente, aucune Question courante).
- Nouvelles méthodes : `ouvrir(code)` (→ `OUVERTE`, `verrouillee = true` — ADR-0010),
  `sauter(questionId)`, `passerQuestionSuivante()`, `terminer()` (→ `CLOTUREE`).
- **Ne possède pas** `TourDeVote` comme entité enfant, malgré ce que la relation Prisma
  `Session.tours` pouvait suggérer — voir plus bas pourquoi.
- Le statut de chaque Question du déroulement (à venir / courante / traitée / sautée) n'est pas
  stocké par item : **traitée** et **courante** se dérivent de `indexCourant` combiné à
  l'existence d'un Tour clos pour cette Question (résolu par une requête, pas par l'agrégat) ;
  seule **sautée** est un état stocké (`questionsSautees`), parce que rien d'autre ne permet de
  le déduire.

**`TourDeVote`** (nouvelle racine, **pas** un enfant de `Session`) : `id`, `sessionId` (référence
par identité, jamais l'agrégat `Session` chargé), `questionId`, `numero`, `ouvertLe`,
`clotureLe: Date | null`. Sorti de `Session` délibérément : les opérations du Coach (rythme
humain, peu fréquentes) et le vote des participants (rythme potentiellement élevé, une écriture
par participant et par revote) n'ont pas le même profil — charger toute la Sélection et
l'historique des Tours passés à chaque vote aurait été disproportionné. L'invariant "un seul
Tour ouvert par Session à la fois", qui aurait été gratuit avec `TourDeVote` en enfant de
`Session`, se vérifie donc via le repository plutôt qu'en mémoire (voir §2).

**`Participation`** (entité enfant de `TourDeVote`) : `jetonId`, `reponseId`. Le mécanisme qui
permet de détecter un revote et d'alimenter le Compteur de participation, sans jamais faire
porter cette information par `Reponse`. Purgée intégralement à la clôture du Tour — elle ne
survit jamais à son Tour.

**`Reponse`** (racine minimale, déjà existante côté schéma) : confirmée comme son propre agrégat
— cycle de vie indépendant, invariants auto-portés (`niveau` 1 à 4), pas de FK vers `Membre` ni
`Sollicitation` (ADR-0001). Reste **strictement immuable** (CONTEXT.md) : un revote ne modifie
jamais une `Reponse` existante — il en crée une nouvelle et supprime l'ancienne, `Participation`
étant repointée sur la nouvelle. La mutabilité vit entièrement dans `Participation`, jamais dans
`Reponse`.

**`JetonSession`** : un enregistrement anonyme minimal (`id`, `sessionId`), pas un agrégat riche
— aucun invariant au-delà de "rattaché à une Session `OUVERTE` au moment de l'émission", aucun
comportement propre.

## 2. Invariants

| Invariant | Portée |
|---|---|
| `verrouillee` passe à `true` exactement à `ouvrir()`, jamais avant, jamais remis à `false` (ADR-0010) | `Session` |
| `ouvrir()` refusé si `statut ≠ PREPAREE` ; `terminer()` refusé si `statut ≠ OUVERTE` | `Session` |
| `sauter(questionId)` refusé si la Question n'est pas dans la Sélection, déjà traitée, ou déjà sautée | `Session` |
| `passerQuestionSuivante()` refusé tant que l'item courant n'a ni Tour clos ni marquage Sautée — depuis `indexCourant = -1` (salle d'attente), ce premier appel est explicitement autorisé, il n'y a alors aucun item courant à résoudre | `Session` |
| `indexCourant` ne recule jamais ; en avançant, saute automatiquement les items déjà Sautés | `Session` |
| Une fois `CLOTUREE`, plus aucune mutation | `Session` |
| `numero` strictement croissant pour une même Question au sein d'une Session (revote) | `TourDeVote` |
| `clore()` refusé si déjà clos | `TourDeVote` |
| Un seul `TourDeVote` non clos par Session à la fois — vérifié par `trouverOuvertPour(sessionId)` avant d'en ouvrir un nouveau, jamais par l'agrégat lui-même (il ne voit pas ses "frères") | Repository `TourDeVote` |
| Une seule `Participation` par Jeton au sein d'un Tour ; un revote supprime l'ancienne `Reponse` pointée, en crée une nouvelle, et repointe `Participation.reponseId` | `TourDeVote` |
| Les `Participation` d'un Tour sont purgées à sa clôture, sans exception | `TourDeVote` |
| `Reponse` est immuable : jamais de mise à jour, seulement création/suppression ; `niveau` entre 1 et 4 ; jamais de référence au Jeton ni au Membre (ADR-0001/0011) ; `tourId` renseigné seulement si `origine = SESSION` (ADR-0002) | `Reponse` |
| Un `JetonSession` n'est émis que pour une Session `OUVERTE` | `JetonSession` |
| `code` unique parmi les Sessions actuellement `OUVERTE` — vérifié par le repository, pas par l'agrégat ; recommandé de le doubler d'un index unique partiel en base (`WHERE statut = 'OUVERTE'`) | Repository `Session` |

## 3. Opérations

**`Session`** (nouvelles, en plus des opérations de Sélection déjà couvertes par agregat-session.md)

| Opération | Commande/Requête | Portée |
|---|---|---|
| Ouvrir (verrouillage, `PREPAREE → OUVERTE`) | Commande | Racine — le besoin de Code est porté par `Session` elle-même, réclamé à un port `GenerateurDeCode` (interface du domaine, `generer(): Promise<string>` garanti unique parmi les Sessions OUVERTE). `ouvrir()` prend `0` paramètre ; le use case ne fait que charger la Session et sauvegarder — carte #34, écart assumé vis-à-vis de la conception initiale ci-dessous |
| Sauter une Question | Commande | Racine + use case (clôt le Tour ouvert éventuel via `TourDeVoteRepository`) |
| Passer à la Question suivante | Commande | Racine |
| Terminer prématurément | Commande | Use case (boucle `sauter` sur le reste via la Racine) |
| Terminer la séance (`OUVERTE → CLOTUREE`) | Commande | Racine |
| Progression (à venir/courante/traitée/sautée par item) | Requête | Read model dédié — pas l'agrégat complet à chaque poll 2s |

**`TourDeVote`**

| Opération | Commande/Requête | Portée |
|---|---|---|
| Ouvrir un Tour (`numero` = dernier + 1 pour cette Question) | Commande | Use case (lit `Session` pour la Question courante ; vérifie via repository qu'aucun Tour n'est déjà ouvert ; crée le `TourDeVote`) |
| Clore | Commande | Racine |
| Voter (créer/repointer une `Participation`, créer/supprimer la `Reponse` associée) | Commande | Racine → `Participation` ; use case résout le Tour via `trouverOuvertPour(sessionId)` à partir du Jeton — jamais un `tourId` fourni par le client |
| Compteur de participation (Participations du Tour / Jetons émis pour la Session) | Requête | Read model dédié |

**`Reponse`** et **`JetonSession`** : couvertes ci-dessus (créer/supprimer via voter ; émettre à
la jointure par Code). Aucune opération supplémentaire.

## 4. Interface de repository

```
interface SessionRepository {
  findById(id: string): Session | null
  findByCode(code: string): Session | null
  existeCodeOuvert(code: string): boolean
  save(session: Session): void
  remove(id: string): void
}

// Port du domaine (carte #34) : Session le détient directement (constructeur), le réclame dans
// ouvrir(). L'unicité parmi les Sessions OUVERTE fait partie du contrat, pas de l'appelant —
// c'est pourquoi existeCodeOuvert ci-dessus n'est plus consommé que par l'adaptateur
// (CryptoGenerateurDeCode), jamais directement par le use case Ouvrir.
interface GenerateurDeCode {
  generer(): Promise<string>
}

interface TourDeVoteRepository {
  findById(id: string): TourDeVote | null
  trouverOuvertPour(sessionId: string): TourDeVote | null
  save(tourDeVote: TourDeVote): void
}

interface ReponseRepository {
  findById(id: string): Reponse | null
  save(reponse: Reponse): void
  remove(id: string): void
}

interface JetonSessionRepository {
  emettre(sessionId: string): JetonSession
  findById(id: string): JetonSession | null
  compterPour(sessionId: string): number
}

interface EtatToursQuery {
  pour(sessionId: string): EtatTour[]        // { tourId, questionId, numero, clos }
}

interface RepartitionTourQuery {
  pour(tourIds: string[]): RepartitionTour[] // { tourId, comptesParNiveau }
}
```

Les lectures fréquentes (progression pour le pilotage/projection, compteur de participation par
Tour) passent par des **read models dédiés**, pas par ces repositories d'agrégats — même
principe que `session-liste.query.ts` déjà dans le code.

## 5. Lectures de synchronisation des écrans

Les trois écrans se synchronisent par sondage HTTP (voir
[l'annexe](../../doc/spec/annexes/deroulement-session-animee.md), « Synchronisation des écrans »).
Point notable de cette conception : **la synchronisation n'ajoute rien au modèle persisté** — ni
compteur de révision, ni compteur de participation stocké.

- La détection de « rien n'a changé » repose sur un **ETag calculé à partir de la réponse
  elle-même** (mécanisme HTTP standard, largement pris en charge par Express), pas sur un champ
  de domaine. L'écran participant reste silencieux pendant que les autres votent parce que le
  Compteur de participation n'apparaît pas dans **sa** charge utile — la propriété découle du
  contenu de chaque vue, elle n'est pas une règle à maintenir. Voir
  [ADR-0013](../adr/0013-etag-plutot-que-compteur-de-revision.md).
- Le Compteur de participation est le nombre de `Participation` du Tour ouvert, déjà porté par
  l'agrégat `TourDeVote` — rien à stocker en plus.

**`Session.progression(tours): Progression`** — méthode de lecture pure sur la racine, qui dérive
le statut de chaque Question de la Sélection (`A_VENIR | COURANTE | TRAITEE | SAUTEE`) à partir de
`indexCourant`, `questionsSautees` et de l'état des Tours. Elle reçoit ces derniers **en
paramètre** (`EtatTour[]`), jamais en référence détenue : `TourDeVote` est un agrégat voisin.
`Progression` est un Value Object (liste ordonnée `(questionId, statut)`).

C'est le **seul** endroit où vit cette dérivation : `passerQuestionSuivante()` s'appuie dessus
pour sa garde, et les lectures pilotage/projection l'appellent pour leur affichage — jamais deux
implémentations divergentes de la même règle. Ces deux lectures sont donc des **requêtes
hybrides** : elles chargent l'agrégat `Session` pour lui demander son verdict, sans jamais le
sauvegarder.

| Lecture | Charge | Détail |
|---|---|---|
| **Participant** (1 s) | `TourDeVote` seul | Le Guard résout le Jeton en `sessionId` ; `trouverOuvertPour(sessionId)` ; `TourDeVote.voteDe(jetonId)` donne la `Participation`, dont la `Reponse` pointée fournit le Niveau déjà voté (pas de dénormalisation : le Niveau n'existe qu'à un seul endroit). **Ne charge jamais `Session`** — c'est ce qui permet de tenir 1 s par device. |
| **Projection** (2 s) | `Session` + `EtatToursQuery` | `progression(tours)` → Question courante ; compteurs ; répartition du dernier Tour clos |
| **Pilotage** (2 s) | `Session` + `EtatToursQuery` | idem, plus la progression complète et l'historique des Tours clos (`RepartitionTourQuery`) |

`EtatToursQuery` reste volontairement léger : il ne renvoie que `{ tourId, questionId, numero,
clos }`, sans hydrater les agrégats `TourDeVote` complets (avec leurs `Participation`) à chaque
sondage. Il ne porte **aucune règle** — il alimente celle qui vit dans `Session`.

## 6. Inversion de dépendance

`Session`, `TourDeVote`, `Participation`, `Reponse`, `JetonSession` ne dépendent d'aucun
framework ni de Prisma. Les quatre interfaces de repository sont définies dans le domaine
(`apps/backend/src/session/domain/`), implémentées dans
`apps/backend/src/session/infrastructure/` avec Prisma. Toute opération refusée par un invariant
(Session non `OUVERTE`, Tour déjà clos, Question déjà traitée...) est une erreur de domaine
(`Result` échec), traduite en erreur HTTP à la frontière use case/contrôleur — jamais un `catch`
aveugle.

`Session.ouvrir()` (carte #34) est la seule méthode de domaine asynchrone du projet : elle
réclame son Code au port `GenerateurDeCode`, qui a besoin d'I/O pour garantir l'unicité. Ce port
est injecté au constructeur de `Session` (via `creer`/`reconstituer`, symétriquement), implémenté
par `CryptoGenerateurDeCode` (`apps/backend/src/session/infrastructure/`) — la seule technique
(tirage aléatoire, format à 4 chiffres, vérification en base) que le domaine ne connaît jamais.

## Notes et améliorations différées

- **Structure JSON exacte des charges utiles** des 3 écrans : détail d'implémentation. Les
  lectures, leurs sources et leur découpage sont fixés au §5.
- **Écran de synthèse par thème** (PRD §7 étape 8, PRD §9) : contenu hors périmètre de cette
  session.
- **Note de séance par Question** : envisagée pendant le grilling initial, **retirée de la V1**
  pendant cette session `/ddd` — aucune structure prévue pour elle.
- **Détection de présence / expiration** : explicitement écartées (ADR-0011) — le Compteur de
  participation reste monotone, sans timeout à concevoir.
