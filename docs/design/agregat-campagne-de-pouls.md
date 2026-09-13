# Agrégats Campagne de pouls

Design issu de la session `/ddd` sur la carte
[Bornage de l'agrégat Campagne de pouls #68](https://github.com/arnaudbracchetti/agilometre/issues/68),
ticket de la carte [Cartographie : Campagne de pouls #67](https://github.com/arnaudbracchetti/agilometre/issues/67).
Cadrage fonctionnel : [annexe Campagne de pouls](../../doc/spec/annexes/campagne-de-pouls.md) et
PRD §4, §5, §6, §8. Vocabulaire : `CONTEXT.md`, section Pouls.

Décisions structurantes déjà posées, respectées ici et non rediscutées :
[ADR-0001](../adr/0001-contrat-anonymat-reponse.md) (anonymat Réponse/Sollicitation),
[ADR-0002](../adr/0002-modele-reponse-unifie.md) (Réponse unifiée),
[ADR-0009](../adr/0009-selection-session-copie-figee.md) (Sélection copiée figée),
[ADR-0014](../adr/0014-portee-session-ou-periode-calendaire.md) (Portée périodique),
[ADR-0018](../adr/0018-scoring-port-source-de-reponses-scorables.md) (port source de Réponses
scorables). Décisions prises par cette session :
[ADR-0025](../adr/0025-sollicitation-agregat-racine-distinct.md),
[ADR-0026](../adr/0026-abandon-date-de-fin-campagne-pouls.md),
[ADR-0027](../adr/0027-perimetre-renommage-modele-de-collecte.md).

**§1 et §2 amendés** par la résolution du ticket
[#69](https://github.com/arnaudbracchetti/agilometre/issues/69) (écran « Collecte
d'informations ») : [ADR-0028](../adr/0028-modele-de-collecte-verrouille-panel-modifiable-en-place.md)
(Modèle de collecte verrouillé après création, Panel modifiable en place).

## Contexte

Le squelette Prisma `CampagnePouls` / `Sollicitation` existe depuis la migration d'init
(`20260809194808_init`) et **n'a jamais évolué depuis** : aucun code TypeScript ne le référence, il
précède toutes les décisions de cadrage du Pouls. Il est repris, pas préservé.

Trois manques y étaient invisibles tant que le module n'existait pas :

- `Sollicitation.questionId` est **singulier**, alors que l'annexe §4 pose « un Jeton = une
  Sollicitation = N Questions = une soumission unique » ;
- rien ne regroupe les Sollicitations d'un même envoi, alors que l'annexe §6 exige un taux de
  participation « sur la dernière échéance » distinct du taux sur la Période ;
- `rythmeJours: Int` ne porte pas le rythme hebdomadaire retenu (jours cochés + heure), et
  `dateFin` est supprimée du produit (ADR-0026).

## 1. Structure des agrégats

Trois racines indépendantes, plus un objet de domaine pur. Aucune imbrication : le lien passe
toujours par une référence d'identité ou par une copie de valeur, jamais par un agrégat détenu.

**`ModeleCollecte`** (racine, **déplacée** depuis `session/` vers son propre module
`modele-collecte/`) : `id`, `nom` (non vide), `Selection`. Inchangée sur le fond. Elle sert
désormais les deux dispositifs de collecte, ce qui lui retire toute raison de vivre dans `session/`
(ADR-0027). Le VO `Selection` déménage avec elle et est importé par `session/` comme par `pouls/`.

**`CampagnePouls`** (racine, `pouls/domain/campagne-pouls.ts`) :

- `id`, `equipeId`
- `statut: StatutCampagne` (`BROUILLON | ACTIVE | SUSPENDUE | TERMINEE`)
- `modeleCollecteId: string` - scalaire nu, traçabilité seule, **aucune clé étrangère**. Exactement
  le traitement de `Session.modeleSessionId` (ADR-0009) : supprimer le Modèle source n'a aucun
  effet sur les Campagnes qui en sont issues.
- `panel: Selection` - copie figée de la Sélection du Modèle à la création. Le même VO que celui
  qu'utilise `Session`, en **composition**, jamais en référence partagée.
- `rythme: RythmeHebdomadaire` (VO)
- `questionsParEnvoi: number` - entier positif, **sans plafond** (annexe §1)

Ne détient **ni Sollicitation ni historique** : sa taille est constante dans le temps.

**`Sollicitation`** (racine, **pas** une entité de `CampagnePouls`) : `id`, `campagneId` (référence
par identité), `membreId`, `tokenHash` (unique), `envoyeeLe`, `expireLe`, `honoreeLe: Date | null`,
et ses **N `questionId`**. Sortie de la Campagne délibérément, pour la raison exacte qui a sorti
`TourDeVote` de `Session` ([agregat-tour-de-vote.md](agregat-tour-de-vote.md) §1) : les profils
d'écriture sont incompatibles. Une Campagne d'un an sur 8 Membres à deux envois par semaine, c'est
~800 Sollicitations, et la route publique de réponse résout un Jeton sans aucune raison de charger
la configuration de la Campagne. Voir [ADR-0025](../adr/0025-sollicitation-agregat-racine-distinct.md).

**`RythmeHebdomadaire`** (VO) : `joursEnvoi: number[]` (1 à 7, non vide, sans doublon) et
`heureEnvoi: number` (minutes depuis minuit, 0 à 1439). Porte le calcul des instants d'échéance,
seul endroit du système où il vit. Heure **locale du serveur** : le déploiement est on-premise, une
instance par client, un seul fuseau pertinent par déploiement - hypothèse écrite, pas subie.

**`TirageDeQuestions`** (objet de domaine pur, méthode statique `executer`) : les trois règles de
l'annexe §3. Aucun état, aucune dépendance, aucune persistance. Voir §4.

### L'Échéance n'est pas persistée

`CONTEXT.md` définit l'Échéance comme « un instant d'envoi ». Elle le reste : un **Value Object
calculé par `RythmeHebdomadaire`**, jamais une table, jamais une colonne dédiée.

Sa trace est `Sollicitation.envoyeeLe`, à condition de **ne pas l'écrire avec `now()` mais avec
l'instant d'échéance calculé**. Toutes les Sollicitations d'un même envoi portent alors exactement
la même valeur, et trois besoins en découlent sans rien ajouter au modèle :

| Besoin | Mécanisme |
|---|---|
| Ne pas renvoyer un envoi déjà parti | `WHERE campagneId = ? AND envoyeeLe = e`, doublé de `@@unique([campagneId, membreId, envoyeeLe])` contre deux réveils concurrents |
| Taux de participation sur la dernière échéance (annexe §6) | `GROUP BY envoyeeLe`, dernière valeur |
| Historique des échéances (annexe §6, écran de la carte #69) | `GROUP BY envoyeeLe` |

`expireLe` reste stocké : c'est l'échéance **suivante**, calculée à l'envoi et figée là, ce qui la
protège d'un changement de rythme ultérieur. Ce n'est donc pas un état dérivable, mais l'instantané
d'une décision - même raisonnement que `JetonCompte.expireLe`.

**Conséquence à connaître** : sur une Équipe sans Membre, un envoi ne produit aucune ligne, donc la
garde ne trouve rien et l'ordonnanceur retentera à chaque réveil jusqu'à ce que la fenêtre de
tolérance (§5) soit dépassée. Sans conséquence - zéro email - mais c'est un comportement à
connaître, pas à découvrir.

### Ce qui n'est pas figé

Le **panel de Membres ne l'est pas** : l'annexe §2 pose « le périmètre est l'Équipe entière,
évaluée à l'instant de l'échéance ». Un Membre ajouté entre deux échéances entre au tirage suivant
avec un cycle vierge ; un Membre retiré cesse d'être sollicité. Aucun mécanisme nouveau à inventer
de ce côté.

**Le contenu du Panel non plus** ([ADR-0028](../adr/0028-modele-de-collecte-verrouille-panel-modifiable-en-place.md)) :
seule la copie depuis le `ModeleCollecte` source est figée à la création (ADR-0009) - le Panel
obtenu reste ensuite modifiable en place (ajout, retrait, réordonnancement de Questions), tant que
la Campagne n'est pas `TERMINEE`. Le `ModeleCollecte` source, lui, reste verrouillé : aucune
opération ne permet de le remplacer après création. Ajouter ou retirer une Question du Panel
réinitialise le cycle de tirage de tous les Membres ; réordonner seul ne réinitialise rien.

## 2. Invariants

| Invariant | Portée |
|---|---|
| `questionsParEnvoi` est un entier strictement positif, sans plafond (annexe §1) | `CampagnePouls` |
| `joursEnvoi` non vide, valeurs entre 1 et 7, sans doublon ; `heureEnvoi` entre 0 et 1439 | `RythmeHebdomadaire` (VO) |
| Une même Question n'apparaît jamais deux fois dans le Panel ; l'ordre est conservé | `Selection` (VO) |
| Un Panel vide est valide (un Modèle de collecte sans Question l'est déjà) | `CampagnePouls` |
| `activer()` refusé si `statut ≠ BROUILLON` et `≠ SUSPENDUE` ; `suspendre()` refusé si `≠ ACTIVE` ; `terminer()` refusé si `= TERMINEE` | `CampagnePouls` |
| `TERMINEE` est définitif : plus aucune transition, plus aucun envoi | `CampagnePouls` |
| **Au plus une Campagne `ACTIVE` par Équipe** | Repository (garde applicative) **et** index unique partiel en base - voir §6 |
| **Au plus une Campagne non-`TERMINEE` par Équipe** - la création d'une nouvelle Campagne est refusée tant qu'une précédente existe et n'est pas `TERMINEE` (ADR-0028) | Use case de création (garde applicative - l'index unique partiel en base ne couvre aujourd'hui que `ACTIVE`, à élargir à l'implémentation) |
| Le Modèle de collecte source d'une Campagne n'est jamais remplacé après création (ADR-0028) | `CampagnePouls` - aucune opération de changement de Modèle |
| La suppression d'un `ModeleCollecte` n'a aucun effet sur les Campagnes issues de lui | Structurel : `modeleCollecteId` est un scalaire nu, sans FK (ADR-0009) |
| Une Question archivée au Référentiel disparaît des lectures du Panel sans en être retirée physiquement | Résolu à la lecture, le Référentiel passé en paramètre - identique à `Session` |
| Une Sollicitation porte **au moins une** Question | `Sollicitation` |
| `honoreeLe` ne passe de `null` à une date qu'une seule fois | `SollicitationRepository.honorerSiValide` (UPDATE conditionnel `WHERE honoreeLe IS NULL`, ADR-0001) - jamais un check puis un write séparés |
| Un Jeton expiré ou déjà honoré ne produit aucune Réponse | idem, même transaction |
| La `Reponse` écrite ne porte **ni `membreId` ni référence au Jeton** | `Reponse` (inchangée, ADR-0001) |
| Le nombre de Questions tirées vaut `min(questionsParEnvoi, disponibles)` - un Panel plus petit n'est pas une erreur | `TirageDeQuestions` |

`Reponse` n'est **pas modifiée** par cette conception : ADR-0001 est ratifié, aucun champ ne s'y
ajoute. Une Réponse d'origine Pouls ne porte que `questionId`, `niveau`, `equipeId`, `horodatage`
et `origine = POULS`, avec `tourId = null`.

## 3. Opérations

**`CampagnePouls`**

| Opération | Commande/Requête | Portée |
|---|---|---|
| Créer (Équipe, Modèle de collecte, rythme, nombre par envoi) | Commande | Use case - copie la `Selection` du `ModeleCollecte` (traverse deux agrégats), puis `CampagnePouls.creer` |
| Modifier la configuration (rythme, nombre par envoi) | Commande | Racine |
| Modifier le Panel (ajouter / retirer / réordonner des Questions) | Commande | Racine - ajouter ou retirer réinitialise le cycle de tirage de tous les Membres, réordonner seul ne réinitialise rien (ADR-0028) |
| Activer / Suspendre / Reprendre / Terminer | Commande | Racine - la garde « au plus une active » est vérifiée par le use case via le repository avant `activer()` |
| Supprimer | Commande | Use case |

**`Sollicitation`**

| Opération | Commande/Requête | Portée |
|---|---|---|
| Émettre (une par Membre, à une échéance) | Commande | Use case `DeclencherEcheances` - voir §5 |
| Résoudre un Jeton (page publique) | Requête | Read model dédié : Questions et libellés, **sans charger la Campagne** |
| Honorer (écrire la Réponse, poser `honoreeLe`) | Commande | Repository, en **une seule transaction** (ADR-0001) |
| Taux de participation sur la dernière échéance | Requête | Read model dédié (`GROUP BY envoyeeLe`) |
| Historique des échéances | Requête | Read model dédié |
| Historique pour le tirage | Requête | Read model dédié - voir §4 |

## 4. Le tirage

`TirageDeQuestions.executer(...)` - classe pure à méthode statique, `pouls/domain/`. Applique les
trois règles de l'annexe §3, **dans l'ordre et indépendamment pour chaque Membre** : exclure les
Questions du cycle courant du Membre, garder les moins posées dans l'Équipe sur ce cycle, départager
au hasard.

**Rien n'est persisté du tirage** : ni curseur, ni cycle, ni compteur. Tout se déduit de
l'historique `(membreId, questionId)` des Sollicitations, ce que l'anonymat autorise explicitement
(PRD §5). C'est le même principe que le Cycle au glossaire, que `Session.progression()` et que
`Session.estVerrouillee()` - ce codebase dérive plutôt qu'il ne stocke.

Entrée de la méthode :

- le `panel: Selection` (Questions actives seulement, le Référentiel ayant été appliqué en amont) ;
- l'historique de la Campagne, `{ membreId, questionId }[]`, fourni par un **read model dédié**, pas
  par un repository d'agrégat - précédent `EtatToursQuery` (`session/domain/etat-tours.query.ts`) ;
- le `membreId` visé et `questionsParEnvoi` ;
- une **fonction de mélange** passée en paramètre, seule couture nécessaire au départage aléatoire.

Cette fonction est le seul point de non-déterminisme, et elle est un paramètre plutôt qu'un port :
c'est la convention du projet pour ce genre de dépendance (`TourDeVote.voter(..., horodatage)`,
`new Date()` appelé à la frontière du use case). Un test passe l'identité et obtient un tirage
entièrement déterministe, sans mock.

**Pas de port Horloge**, pas de générateur d'id abstrait : ce backend n'en a aucun, et cette
conception n'introduit pas d'exception.

## 5. L'ordonnanceur

`ScheduleModule.forRoot()` est déjà câblé dans `app.module.ts` et **aucun `@Cron` n'existe encore** :
les échéances du Pouls sont le premier ordonnancement du projet.

L'ordonnanceur est de l'**infrastructure** (`pouls/infrastructure/`). Il ne porte aucune règle : il
se réveille et appelle `DeclencherEcheances.executer(maintenant)` en lui passant l'instant. À chaque
réveil, pour chaque Campagne `ACTIVE` :

1. calculer, via `RythmeHebdomadaire`, le dernier instant d'échéance `e` inférieur ou égal à
   `maintenant` ;
2. si `maintenant - e` dépasse la **fenêtre de tolérance**, ne rien faire : c'est la règle
   « une échéance manquée est perdue, jamais rattrapée » (annexe §2), et c'est ce qui la rend
   concrète plutôt que déclarative ;
3. sinon, si aucune Sollicitation n'existe pour `(campagneId, e)`, tirer et émettre.

Application arrêtée, SMTP indisponible, serveur redémarré : l'échéance passe. Aucun rattrapage,
aucune file, aucun service externe - la contrainte de déploiement on-premise mono-conteneur
(PRD §10) l'exclut et le volume ne le justifie pas.

L'email passe par le port **`MailSender` existant** (`mail/domain/mail-sender.ts`) avec une nouvelle
`CleTemplateEmail` et un gabarit versionné `pouls.sollicitation.md`, validé au démarrage par
`valider-templates-email.ts` comme les autres. Le **contenu** du gabarit appartient à la carte
[#70](https://github.com/arnaudbracchetti/agilometre/issues/70), pas à cette conception.

Comme pour `emettre-jeton-compte.ts`, un échec SMTP ne doit pas faire échouer le geste métier ni
interrompre la boucle sur les autres Membres.

## 6. Forme Prisma cible

Écrite ici pour être exécutable ; la migration elle-même appartient aux cartes d'implémentation.

```prisma
enum StatutCampagne {
  BROUILLON
  ACTIVE
  SUSPENDUE
  TERMINEE
}

// Au plus une Campagne ACTIVE par Équipe : garde applicative dans le use case (via le repository),
// doublée d'un index unique partiel écrit à la main dans la migration - non représentable ici, même
// limitation que Session_code_ouverte_key :
//   CREATE UNIQUE INDEX "CampagnePouls_equipe_active_key"
//     ON "CampagnePouls" ("equipeId") WHERE "statut" = 'ACTIVE';
// `modeleCollecteId` est un scalaire nu, sans relation Prisma ni FK (ADR-0009) : le Panel ci-dessous
// est une copie figée, la suppression du Modèle source n'a aucun effet.
// Pas de dateFin : la terminaison est un geste du Coach, jamais une date (ADR-0026).
model CampagnePouls {
  id                String                  @id @default(uuid())
  equipe            Equipe                  @relation(fields: [equipeId], references: [id])
  equipeId          String
  statut            StatutCampagne          @default(BROUILLON)
  modeleCollecteId  String
  joursEnvoi        Int[]
  heureEnvoi        Int
  questionsParEnvoi Int
  panel             CampagnePanelItem[]
  sollicitations    Sollicitation[]
}

// Copie figée de la Sélection du Modèle de collecte (ADR-0009) - même patron que
// SessionSelectionItem. `questionId` en chaîne simple : Référentiel et Pouls sont des bounded
// contexts séparés.
model CampagnePanelItem {
  id         String        @id @default(uuid())
  campagne   CampagnePouls @relation(fields: [campagneId], references: [id], onDelete: Cascade)
  campagneId String
  questionId String
  ordre      Int

  @@index([campagneId])
}

// `envoyeeLe` porte l'instant d'Échéance calculé par le rythme, PAS l'instant réel d'écriture :
// toutes les Sollicitations d'un même envoi partagent exactement la même valeur. C'est ce qui rend
// l'Échéance lisible sans la persister (docs/design/agregat-campagne-de-pouls.md §1).
// L'unique partiel sur (campagneId, membreId, envoyeeLe) est la garantie anti-doublon contre deux
// réveils concurrents de l'ordonnanceur.
// `expireLe` est l'échéance suivante, figée à l'envoi : un changement de rythme ultérieur ne la
// déplace pas. Vérifié à la résolution du Jeton, jamais par un balayage de fond.
// Aucun lien vers Reponse, jamais (ADR-0001).
model Sollicitation {
  id         String                  @id @default(uuid())
  campagne   CampagnePouls           @relation(fields: [campagneId], references: [id], onDelete: Cascade)
  campagneId String
  membreId   String
  tokenHash  String                  @unique
  envoyeeLe  DateTime
  expireLe   DateTime
  honoreeLe  DateTime?
  questions  SollicitationQuestion[]

  @@unique([campagneId, membreId, envoyeeLe])
  @@index([campagneId, envoyeeLe])
}

// Les N Questions d'une Sollicitation (annexe §4 : un Jeton = une Sollicitation = N Questions =
// une soumission unique). Corrige le `questionId` singulier du squelette d'init.
model SollicitationQuestion {
  sollicitation   Sollicitation @relation(fields: [sollicitationId], references: [id], onDelete: Cascade)
  sollicitationId String
  questionId      String
  ordre           Int

  @@id([sollicitationId, questionId])
}
```

`membreId` reste **sans clé étrangère** vers `Membre`, comme dans le squelette : un Membre est
supprimé en cascade avec son Équipe, et l'historique des Sollicitations doit lui survivre - c'est
lui qui porte le cycle, et il n'a jamais porté d'identité au sens du PRD §5.

`joursEnvoi Int[]` est la seule colonne tableau du schéma. Elle l'assume : au plus 7 petits entiers
d'un domaine fixe, toujours lus et écrits en bloc avec la Campagne, jamais interrogés seuls.
L'alternative (une table enfant, comme `SessionQuestionSautee`) coûterait un `deleteMany` +
`createMany` à chaque sauvegarde pour ce qui est conceptuellement un seul attribut.

## 7. Interfaces de repository et de query

```
interface CampagnePoulsRepository {
  findById(id: string): Promise<CampagnePouls | null>
  findParEquipe(equipeId: string): Promise<CampagnePouls | null>
  listerActives(): Promise<CampagnePouls[]>          // consommé par l'ordonnanceur
  existeActivePourEquipe(equipeId: string): Promise<boolean>
  save(campagne: CampagnePouls): Promise<void>
  remove(id: string): Promise<void>
}

interface SollicitationRepository {
  emettre(sollicitations: Sollicitation[]): Promise<void>   // un envoi, une transaction
  trouverParJeton(tokenHash: string): Promise<Sollicitation | null>
  existePourEcheance(campagneId: string, echeance: Date): Promise<boolean>
  /**
   * Écrit les Réponses et pose honoreeLe dans UNE seule transaction, sous
   * WHERE honoreeLe IS NULL (ADR-0001). Rend false si le Jeton était déjà honoré ou expiré -
   * jamais un check puis un write séparés, qui seraient racy.
   */
  honorerSiValide(tokenHash: string, reponses: Reponse[], maintenant: Date): Promise<boolean>
}

// Read model du tirage : l'historique brut, sans hydrater aucun agrégat.
interface HistoriqueTirageQuery {
  listerHistoriqueDeLaCampagne(campagneId: string): Promise<{ membreId: string; questionId: string }[]>
}

// Read models de restitution (annexe §6) - alimentent l'écran de la carte #69.
interface ParticipationPoulsQuery {
  tauxDerniereEcheance(campagneId: string): Promise<{ echeance: Date; envoyees: number; honorees: number } | null>
  historiqueEcheances(campagneId: string): Promise<{ echeance: Date; envoyees: number; honorees: number }[]>
}

// Résolution de la page publique, sans charger la Campagne.
interface SollicitationPubliqueQuery {
  resoudre(tokenHash: string): Promise<QuestionARepondre[] | null>
  // QuestionARepondre : { questionId, libelle, options: { libelle, niveau }[] }
}
```

## 8. Frontière avec le scoring

**`pouls/` n'intervient pas dans le scoring.** Il produit des Sollicitations, tire des Questions et
consomme des Jetons ; il ne porte aucune règle sur la lecture des Réponses (annexe §5).

La source de Réponses scorables d'origine Pouls est une **requête directe portée par `reponse/`**,
sans traversée d'agrégat : il n'y a rien à filtrer côté Pouls, contrairement à la source Session où
vit la règle « seul le dernier Tour clos compte ». Cela **diverge de la lettre de l'ADR-0018**
(« `pouls/` en fournira une autre implémentation ») ; un addendum y est posé.

L'emplacement du composite des deux sources et la reformulation des gardes qui ne consultent
aujourd'hui que les Sessions closes appartiennent à la carte
[#71](https://github.com/arnaudbracchetti/agilometre/issues/71), pas à cette conception.

## 9. Renommage Modèle de collecte

Tranché par [ADR-0027](../adr/0027-perimetre-renommage-modele-de-collecte.md) : renommage complet
(base avec un vrai `ALTER TABLE`, routes API, fichiers et dossiers, libellés), `ModeleCollecte`
extrait dans son propre module `modele-collecte/`, en **carte dédiée exécutée avant** les cartes de
la Campagne.

L'ordre compte : `CampagnePouls` ne référence pas encore `ModeleSession` en base. Renommer d'abord
évite d'ajouter une troisième référence à renommer ensuite.
