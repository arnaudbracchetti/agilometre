# Spécification fonctionnelle - Gestion des comptes, rôles et droits d'accès

Complète le [PRD](../PRD-maturite-agile.md) §9 (Restitutions et droits) et §10 (Authentification),
qui posent l'existence de comptes locaux et d'une restriction d'affichage par Rôle sans détailler ni
le cycle de vie de ces comptes ni le mécanisme qui applique la restriction. Ce document précise les
deux. Vocabulaire : voir [CONTEXT.md](../../CONTEXT.md), section Organisation (Entité, Équipe,
Membre, Utilisateur, Habilitation, Rôle). Décisions structurantes :
[ADR-0005](../../docs/adr/0005-organisation-trois-agregats-separes.md) (trois agrégats séparés),
[ADR-0006](../../docs/adr/0006-organisation-nettoyage-habilitations-meme-transaction.md) (nettoyage
transactionnel des Habilitations orphelines), [ADR-0007](../../docs/adr/0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md)
et son suivi (comptes Membre d'équipe en périmètre), [ADR-0017](../../docs/adr/0017-mur-de-badges-cote-coach-pas-direction.md)
(Mur de badges Coach seul).

Issu de la session `/grill-with-docs` du 2026-08-30 sur la carte
[#27](https://github.com/arnaudbracchetti/agilometre/issues/27).

## Rôles livrés dans cette itération

Le PRD §2 nomme quatre Rôles. Trois reçoivent un compte dans cette itération : **Coach**,
**Direction**, **Membre d'équipe**. Le quatrième, **Manager d'équipe**, garde sa valeur dans l'enum
`Rôle` mais **aucun compte ne peut être créé avec** - ni compte fantôme sans porteur identifié chez
les clients, ni connexion débouchant sur un écran vide. Sa spécification (Habilitation sur des
Équipes, vue de tendance d'équipe) reste à faire lors d'une itération future.

Le PRD §9 emploie aussi le terme « manager » de façon informelle pour l'un et l'autre rôle ;
`Direction` est le terme retenu au glossaire pour le rôle à portée Entité - « Management » est à
éviter, voir `CONTEXT.md`.

## Périmètre d'accès par Rôle

| Rôle | Portée | Mécanisme |
|---|---|---|
| Coach | Transversale, toute l'Organisation | Aucune Habilitation - l'accès découle du Rôle seul |
| Direction | Une ou plusieurs Entités | Habilitation portant `entiteId` |
| Membre d'équipe | Une ou plusieurs Équipes | **Dérivée du roster**, aucune Habilitation |
| Manager d'équipe (différé) | Une ou plusieurs Équipes | Habilitation portant `équipeId` (invariant porté par le domaine, non exploité) |

Un `Utilisateur` porte un **Rôle unique**, et peut cumuler **plusieurs Habilitations** de la même
nature (une Direction habilitée sur les Entités Vente et Développement industriel, par exemple).

**Le périmètre d'un Membre d'équipe n'est jamais porté par une Habilitation.** Il est déduit des
lignes `Membre` du roster qui référencent son `utilisateurId` : il voit les Équipes où il figure au
roster, point. Donner en plus une Habilitation `équipeId` aux comptes Membre créerait deux sources de
vérité pour la même question (« cette personne voit-elle cette Équipe ? ») qui divergeraient dès
qu'on la retire du roster sans penser à retirer l'Habilitation. Corollaire assumé : retirer quelqu'un
d'un roster lui coupe l'accès à cette Équipe, immédiatement et sans geste d'administration séparé.

**Pas de seuil bloquant** sur les Entités ne comptant qu'une seule Équipe, où l'agrégat de l'Entité
*est* de fait le Palier de cette Équipe unique - la Direction y aperçoit donc un résultat d'équipe
sans jamais l'avoir demandé. Le PRD §5 exclut explicitement les seuils bloquants de répondants comme
mécanisme de protection de l'anonymat, et la Direction ne voit dans tous les cas que des Paliers,
jamais la répartition brute ni le détail par Question. Fuite réelle mais bornée, assumée plutôt que
corrigée par un seuil qui produirait des écrans « données insuffisantes » chez les petits clients.

## Cycle de vie d'un compte

### Création

**Le Coach crée tous les comptes et pose toutes les Habilitations.** Aucun autre Rôle ne crée de
compte : une Direction ou un Membre d'équipe qui pourrait créer des comptes pourrait s'auto-élargir
son propre périmètre. Il n'y a pas de Rôle administrateur distinct du Coach - son accès étant déjà
transversal, un Rôle Admin supplémentaire n'ajouterait aucun droit qu'il n'a pas déjà.

**Amorçage.** Avant qu'aucun compte n'existe, un premier Coach doit pouvoir se créer. Ce premier
compte naît d'une **commande d'amorçage explicite**, exécutée hors du cycle de démarrage normal du
serveur - jamais d'un seed automatique au boot, qui recréerait silencieusement un compte connu à
chaque redémarrage.

**Comptes Membre d'équipe : à la demande, jamais en masse.** Un Membre du roster n'a jamais eu besoin
de compte pour répondre à une Session ou un Pouls (Code, Jeton - voir CONTEXT.md). Créer un compte ne
sert donc qu'à consulter les résultats, et reste au choix du Coach ligne par ligne : pas d'invitation
en masse sur tout un roster. `Membre.utilisateurId` reste `null`-able par conception - un roster peut
mélanger des personnes avec et sans compte indéfiniment.

### Identifiant

**L'email est l'identifiant de connexion**, unique sur toute l'instance, comparaison insensible à la
casse - même patron que `Entité.nom` et `Équipe.nom` (garde en use case, filet de sécurité par index
unique fonctionnel en base sur `LOWER(email)`).

### Rattachement automatique d'un Membre à un Utilisateur

Le PRD ne prévoyait pas de compte pour ce Rôle ; cette itération l'introduit avec un mécanisme
d'appariement automatique par email, pour éviter le geste manuel à deux temps (créer le compte, puis
aller le lier depuis chaque ligne de roster) qui produirait des comptes orphelins.

- **Deux déclenchements, et deux seulement** : la création d'un `Utilisateur` (on cherche et lie les
  lignes `Membre` de même email, dans tous les rosters où elles apparaissent), et l'ajout d'un
  `Membre` à un roster (on cherche et lie l'`Utilisateur` de même email s'il existe).
- **Jamais rejoué ensuite.** L'email n'est un critère d'appariement qu'au moment de la liaison ;
  passé ce moment, c'est `Membre.utilisateurId` qui fait foi. Modifier l'email d'un compte ne délie
  et ne relie rien automatiquement - sans quoi un simple changement d'adresse professionnelle
  romprait tous les accès d'un coup.
- Au rattachement, les valeurs de l'`Utilisateur` (voir *Propagation descendante* ci-dessous)
  écrasent celles qui avaient été saisies sur la ligne de roster.

Deux effets de bord assumés : ajouter quelqu'un à un roster lui accorde silencieusement un accès si
son email correspond à un compte existant (symétrique du retrait, qui le coupe) ; une boîte email
générique présente dans plusieurs rosters (`equipe-x@client.fr`) rattacherait un unique compte à
toutes ces Équipes d'un coup.

### Propagation descendante sur le Membre lié

Une fois qu'un `Membre` est lié à un `Utilisateur`, **le compte fait autorité** : prénom, nom et
email sont **reportés du compte vers la ligne de roster**, qui devient **lecture seule** - on ne
modifie plus prénom, nom ou email d'un `Membre` lié qu'en modifiant le compte.

Ce choix - propagation plutôt qu'une simple éclipse à l'affichage qui aurait laissé les valeurs du
`Membre` inertes en base - a été retenu parce que `Membre.email` reste ainsi **toujours à jour et
faisant autorité** pour tout ce qui le consomme, notamment la génération des Sollicitations de pouls
(qui continue de lire `Membre.email` sans traverser vers l'agrégat `Utilisateur`) :

- l'invariant d'unicité d'email au sein d'un roster (« deux Membres d'une même Équipe ne partagent
  pas le même email ») reste **local à `Équipe`**, sans devenir un contrôle sur un email calculé à la
  volée depuis un autre agrégat ;
- le **déliage** n'a rien à recopier : les valeurs du `Membre` sont déjà à jour, il redevient
  simplement éditable.

**Mécanique.**

- Modifier prénom, nom ou email d'un `Utilisateur` **écrit, dans la même transaction**, sur les N
  agrégats `Équipe` où il figure au roster - écriture cross-agrégat assumée, même exception que
  l'[ADR-0006](../../docs/adr/0006-organisation-nettoyage-habilitations-meme-transaction.md).
- **Garde de collision** : si le nouvel email créerait un doublon dans l'un des rosters concernés,
  la modification est **rejetée en bloc** - aucune des N lignes n'est modifiée. Pas de propagation
  partielle qui laisserait certains rosters à jour et d'autres non.
- `Membre` gagne un champ `prenom` optionnel pour recevoir la propagation ; il reste `null` pour une
  personne sans compte, dont `nom` et `email` suffisent à l'identifier à l'écran.

### Habilitations

Une Habilitation attache un `Utilisateur` Direction à une ou plusieurs Entités. Invariants portés par
le domaine (`Utilisateur.ajouterHabilitation()`) : cohérence stricte avec le Rôle (`entiteId` seul si
`DIRECTION`, aucune Habilitation si `COACH` ni si `MEMBRE`), rejet des doublons. Changer le Rôle d'un
`Utilisateur` est rejeté si les Habilitations existantes deviennent incohérentes avec le nouveau Rôle
- pas de vidage silencieux, l'opérateur retire d'abord explicitement les Habilitations.

Supprimer une Équipe ou une Entité nettoie, dans la même transaction, les Habilitations orphelines
qui la référencent (ADR-0006).

### Désactivation

**Réversible, jamais de suppression.** Un compte désactivé ne peut plus se connecter mais reste
consultable - c'est ce qui permet d'auditer qui avait accès à quoi, dans un produit dont l'argument
de vente est la protection de l'anonymat. La suppression définitive d'un compte relève du RGPD et
mérite sa propre décision, hors périmètre de cette itération.

## Authentification

**Mot de passe local**, pas de lien magique sans mot de passe : un Coach qui anime une séance en
salle doit pouvoir se connecter immédiatement, sans dépendre de la latence ou de l'antispam du relais
SMTP du client.

**Un seul mécanisme de jeton** sert à la fois l'invitation initiale et la réinitialisation de mot de
passe : usage unique, expiration à 7 jours. Ce jeton est distinct du `Jeton de session` (Session
animée, anonyme, portée toute la Session) et du `Jeton` de Sollicitation (Pouls, usage unique et
nominatif) - voir CONTEXT.md pour le terme retenu au glossaire.

**Mot de passe oublié en libre-service**, obligatoire dès cette itération et fonctionnel pour
n'importe quel compte, **activé ou non** : c'est le remplacement direct du renvoi d'invitation.

**Pas de fonction de renvoi d'invitation.** Un lien perdu ou expiré se récupère par le même écran de
libre-service, plutôt que par une action du Coach sur le compte d'autrui - un seul endpoint, et le
Coach ne déclenche jamais rien concernant le mot de passe de quelqu'un d'autre. Une adresse inconnue
produit la même réponse qu'une adresse connue, pour ne pas transformer l'écran en oracle d'existence
de comptes.

**Le Coach n'a aucun pouvoir sur le mot de passe d'autrui.** Il ne réinitialise que le sien. Chemin de
secours pour quelqu'un qui ne reçoit plus ses emails : le Coach corrige **l'email** du compte (dont
il reste responsable), la personne se débloque ensuite elle-même via le libre-service.

**Session de 12 heures, à renouvellement glissant.** Pas d'expiration agressive : une séance projetée
dure une à deux heures, et un jeton qui expire au milieu d'un Tour de vote, écran devant l'équipe, est
le pire échec possible pour ce produit. Instance mono-client on-premise : la menace ne justifie pas le
risque d'une déconnexion en pleine animation.

## Application des droits à l'exécution

Quatre pièces, volontairement minimales :

1. **`AuthGuard` JWT global**, posé une fois (`APP_GUARD`), **fail-closed** : toute route exige un
   compte valide par défaut. Une route nouvelle est donc protégée sans que personne ait à y penser.
2. **`@Public()`** sur les seules routes ouvertes : login, invitation, mot de passe oublié, les
   parcours participants existants (qui gardent leur `JetonParticipantGuard` propre, inchangé), et
   l'écran d'accueil, vitrine publique de l'instance portant le point d'entrée « Se connecter ».
3. **`@Roles(...)`**, lu par ce même guard - un guard, pas deux mécanismes séparés.
4. **Un service `PerimetreUtilisateur`** (`peutVoirEquipe(id)` / `peutVoirEntite(id)`), appelé par
   les contrôleurs qui reçoivent un identifiant d'Équipe ou d'Entité.

**Pas de read model dupliqué par Rôle, pas de DTO à amputer en sortie.** La restriction de détail
existe déjà par construction : `apps/backend/src/session/entite-profil.controller.ts` et
`equipe-profil.controller.ts` sont deux routes distinctes, portant deux DTO distincts -
`ProfilEntiteDto` ne porte pas `themes`, là où `ProfilEquipeDto` porte `themes` et
`evolutionsParTheme`. Une Direction n'atteint simplement jamais la route équipe ; elle ne peut donc
pas en voir le détail, sans qu'aucun filtrage de champ soit nécessaire.

**La restriction porte aussi sur la structure de la navigation, pas seulement sur les routes
atteignables.** L'arbre de navigation Entité → Équipe affiché à une Direction doit être **réduit à
ses Entités habilitées et non dépliable** : aucune Équipe n'y apparaît, ni par expansion ni par
recherche. Il ne suffit pas qu'une Direction ne puisse pas *ouvrir* le profil d'une Équipe - elle ne
doit pas en apercevoir le nom. La garantie est côté serveur (l'endpoint qui alimente l'arbre filtre
par périmètre) ; le comportement front n'en est que le reflet.

## Matrice écran / Rôle

Écrans existants ou à construire par les tranches de l'Epic [#27](https://github.com/arnaudbracchetti/agilometre/issues/27),
croisés avec les trois Rôles porteurs de compte. Le Manager d'équipe n'apparaît pas : aucun compte
n'étant créable avec ce Rôle, aucun écran ne lui est pour l'instant destiné.

| Écran | Coach | Direction | Membre d'équipe |
|---|---|---|---|
| Accueil (public) | Accessible | Accessible | Accessible |
| Se connecter / Mot de passe oublié (public) | Accessible | Accessible | Accessible |
| Mon compte (changer son mot de passe) | Accessible | Accessible | Accessible |
| Comptes (créer, modifier, désactiver, Habilitations) | Total | Aucun accès | Aucun accès |
| Organisation (CRUD Entité/Équipe, gestion du roster) | Total | Aucun accès | Aucun accès |
| Arbre de navigation Entité → Équipe | Total, dépliable | Réduit à ses Entités habilitées, non dépliable, aucune Équipe visible | N/A - pas d'arbre, une liste "mes Équipes" |
| Profil d'une Entité (Palier agrégé, tendance) | Total | Restreint à ses Entités habilitées | Aucun accès |
| Profil d'une Équipe (Palier par Thème, lecture fine) | Total, sur toute l'Organisation | Aucun accès (détail d'Équipe hors de sa portée) | Restreint à ses Équipes (roster) |
| Synthèse de fin de Session | Total | Aucun accès | Restreint à ses Équipes, toutes les Sessions sans filtre de participation |
| Mur de badges (comparaison inter-Équipes) | Total | Aucun accès (ADR-0017) | Aucun accès |
| Sessions (bibliothèque, pilotage, synthèse) | Total | Aucun accès | Aucun accès (lecture seule via le profil d'Équipe) |
| Modèles de session | Total | Aucun accès | Aucun accès |
| Campagnes de pouls (configuration) | Total | Aucun accès | Aucun accès |

## Bascule des routes existantes

Toutes les routes de l'application, aujourd'hui non protégées, ferment **en une seule fois**, sauf
deux exceptions délibérées :

- les **parcours participants** (Code de session, lien à jeton du Pouls - PRD §5/§7/§8), ouverts par
  conception, pas par oubli ;
- l'**écran d'accueil**, vitrine publique de l'instance qui porte le point d'entrée « Se connecter ».

Une fermeture progressive, route par route au fil des itérations, laisserait des routes ouvertes et
découvrables - pire que l'absence totale d'authentification, parce qu'elle donnerait l'illusion d'une
protection déjà en place.

## Restitutions

**Mur de badges : Coach seul.** L'[ADR-0017](../../docs/adr/0017-mur-de-badges-cote-coach-pas-direction.md)
excluait déjà la Direction de cette vue comparative entre Équipes ; l'exclusion est étendue au Membre
d'équipe. Un Membre qui verrait son équipe classée face aux autres transformerait un outil de
diagnostic en outil de comparaison sociale - exactement ce que « sans classement chiffré » cherchait
à éviter.

**Membre d'équipe : répartition détaillée de toutes les Sessions de son Équipe, sans filtre de
participation.** Le PRD §9 promettait au Membre la répartition détaillée « des sessions auxquelles il
a participé ». C'est devenu infaisable dès que ce Rôle reçoit un compte : le §5 garantit qu'aucune
`Réponse` ne référence le `Membre` ni le `Jeton` qui l'a produite, et que le `Jeton de session` d'un
participant n'est jamais lié à une identité - le système ne peut donc pas savoir à quelles Sessions
une personne a effectivement participé. Ce filtre est **abandonné** plutôt que contourné : le Membre
voit la répartition détaillée de toutes les Sessions de son Équipe, sans distinction. `CONTEXT.md`
est déjà cohérent avec cet abandon - la `Lecture fine` y est définie comme destinée « au Coach et à
l'Équipe », et la `Restriction d'affichage` n'y nomme que Manager et Direction, jamais le Membre.

## Hors périmètre de cette itération

- Le Rôle **Manager d'équipe** : invariant porté par le domaine (`equipeId` seul si `MANAGER`), aucun
  écran ni aucune création de compte.
- Le **SSO client** (PRD §3 et §10).
- La **suppression définitive** d'un compte (RGPD).
- Un **journal des accès** : qui a consulté quoi. On désactive plutôt qu'on ne supprime, ce qui rend
  l'auditabilité possible en théorie, mais rien n'enregistre aujourd'hui les consultations elles-mêmes.
