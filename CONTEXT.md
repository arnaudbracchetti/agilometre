# Agilomètre

Diagnostic de maturité agile porté par deux dispositifs qui alimentent le même réservoir de
Réponses et le même moteur de scoring : la Session animée (vote en direct piloté par un coach) et
le Pouls (micro-sondages email récurrents). Glossaire distillé de
[doc/spec/PRD-maturite-agile.md](doc/spec/PRD-maturite-agile.md).

## Language

### Référentiel

**Référentiel**:
Le catalogue de Thèmes et Questions. Jamais modifié depuis l'application ; mis à jour uniquement par ré-import explicite d'un fichier structuré, jamais automatiquement au démarrage du serveur. Chaque ré-import réconcilie avec l'existant via la Clé stable de chaque Thème/Question.
_Avoid_: Questionnaire

**Clé stable**:
L'identifiant métier porté par un Thème ou une Question dans le fichier d'import, qui persiste d'un import à l'autre et permet de reconnaître "la même" entité malgré un changement de libellé ou de Thème.

**Aperçu d'import**:
Le calcul, sans aucune écriture, de ce qu'un ré-import du Référentiel changerait (créations, mises à jour, réaffectations de Thème, archivages, réactivations) - donné à relire avant application.

**Application de l'import**:
L'écriture effective des changements calculés par l'Aperçu d'import ; refusée si le fichier fourni est invalide.

**Archiver** (un Thème, une Question):
Marquer qu'il/elle a disparu du dernier import, sans le/la supprimer physiquement - préserve la lisibilité des Réponses déjà enregistrées. Réversible : la réapparition de la même Clé stable dans un import ultérieur le/la réactive.

**Thème**:
Un regroupement de Questions à l'intérieur du Référentiel.

**Question**:
Un item du Référentiel appartenant à un Thème, portant exactement quatre Options.

**Option**:
Un des quatre choix de réponse à une Question, portant chacun un Niveau de 1 à 4.

**Niveau**:
Un cran de 1 à 4 porté par une Option, puis reporté sur la Réponse qui la choisit.

### Organisation

**Entité**:
Le niveau le plus haut de l'Organisation ; contient des Équipes.
_Avoid_: BU (synonyme utilisé dans le PRD - Entité est le terme retenu)

**Équipe**:
Le regroupement de Membres auquel sont rattachées les Sessions et les Campagnes de pouls.

**Membre**:
Une personne recensée dans le roster d'une Équipe ; référence au plus un Utilisateur, optionnellement - un Membre n'a pas besoin de compte pour répondre à une Session ou un Pouls (voir Code, Jeton). Quand un Utilisateur est référencé, il porte toujours le Rôle Membre d'équipe. Supprimé en cascade avec son Équipe.
_Avoid_: seul, pour désigner le Rôle "Membre d'équipe" - dans ce sens précis toujours écrire "Membre d'équipe" en entier, pour ne pas le confondre avec ce sens générique.

**Utilisateur**:
Un compte de connexion à l'Organisation, portant un Rôle unique et, selon ce Rôle, une ou plusieurs Habilitations. Un Utilisateur Membre d'équipe est celui qu'un Membre référence pour se connecter et consulter les résultats de son Équipe.

**Habilitation**:
Le rattachement d'un Utilisateur Manager d'équipe (à une ou plusieurs Équipes) ou Direction (à une ou plusieurs Entités) qui détermine sa portée d'accès. Distinct de Membre : une pure autorisation, sans lien avec le roster d'une Équipe ni l'anonymat des Réponses. Un Utilisateur Coach n'a aucune Habilitation - son accès est transversal, déterminé par son Rôle seul.

**Rôle**:
Une des quatre valeurs portées par un Utilisateur, qui détermine ce qu'il voit et peut faire : Coach (transversal, aucune Habilitation), Membre d'équipe (consulte les résultats des Équipes où il est référencé comme Membre), Manager d'équipe (Habilitation sur une ou plusieurs Équipes), Direction (Habilitation sur une ou plusieurs Entités).

### Session animée

**Modèle de session**:
Une Sélection de Questions nommée, indépendante de toute Équipe, que le Coach compose et réutilise pour créer des Sessions. Librement supprimable, y compris après avoir servi à créer une ou plusieurs Sessions - aucun lien retour vers les Sessions qui en sont issues.
_Avoid_: Template, Template de session (anglicisme utilisé en discussion, écarté au profit d'un glossaire 100% français)

**Sélection**:
Une liste ordonnée de Questions. Un Modèle de session porte sa propre Sélection, librement modifiable. Une Session reçoit une copie figée de la Sélection de son Modèle d'origine au moment de sa création - sans lien vivant vers celui-ci.

**Session**:
Une séance animée par un Coach pour une Équipe, à une date, à partir d'un Modèle de session dont la Sélection est copiée au moment de la création ; contient des Tours de vote.
_Avoid_: Séance (synonyme naturel du PRD narratif - Session est le terme du modèle)

**Tour de vote**:
Un cycle de vote sur une Question au sein d'une Session. Plusieurs tours peuvent se succéder sur une même Question (revote) ; seul le dernier compte dans le score, les précédents restent consultables par le Coach.

**Code (de session)**:
Le code court affiché à l'écran de projection permettant aux Membres de rejoindre une Session sans compte.

**Jeton de session**:
Un jeton anonyme émis à un device qui rejoint une Session via le Code, valable pour toute la Session (pas renouvelé par Tour de vote) ; authentifie le device sans jamais être lié à une identité ni à une Réponse.
_Avoid_: Jeton (sans qualificatif, réservé au jeton de Sollicitation du Pouls - mécanisme distinct, voir section Pouls)

**Sauter** (une Question):
Marquer, une fois la Session ouverte, qu'une Question restante de la Sélection ne sera pas traitée - la Question reste visible dans l'historique de la Session mais est exclue du score. Remplace toute édition de la Sélection (ajout, retrait, réordonnancement), verrouillée dès l'ouverture.

**Écran de pilotage**:
La vue réservée au Coach pour animer une Session ouverte : progression dans la Sélection, ouverture/clôture des Tours de vote, et les seules actions encore permises sur la Sélection (Sauter une Question).

**Écran de projection**:
La vue plein écran destinée à la salle (vidéoprojecteur), qui affiche selon l'étape le Code, la Question courante (restant affichée pendant tout le Tour de vote, Compteur de participation en plus), ou le résultat d'un Tour de vote clos - seule la répartition des votes en cours reste cachée tant que le Tour n'est pas clos.

**Écran participant**:
La vue accessible sans compte depuis le device d'un Membre après obtention d'un Jeton de session ; ne montre la Question et ses Options que le temps d'un Tour de vote ouvert, un écran d'attente neutre sinon.

**Compteur de participation**:
L'indicateur affiché pendant un Tour de vote ("6 sur 8") : le nombre de Jetons de session ayant voté sur ce Tour, rapporté au nombre de Jetons émis depuis l'ouverture de la Session.

**Progression**:
L'état d'avancement d'une Session dans sa Sélection : pour chaque Question, si elle est à venir, courante, traitée (au moins un Tour de vote clos) ou Sautée. Déduite de l'état de la Session et de ses Tours, jamais stockée telle quelle.

### Pouls

**Campagne de pouls**:
La configuration attachée à une Équipe qui pilote l'envoi périodique de Sollicitations : rythme, nombre de Questions par envoi, Thèmes actifs, date de fin éventuelle.

**Sollicitation**:
Un envoi individuel généré par une Campagne de pouls vers un Membre, portant un Jeton à usage unique.

**Jeton**:
Un identifiant à usage unique attaché à une Sollicitation, consommé à la réception de la Réponse puis sans lien conservé vers celle-ci. Distinct du Jeton de session (Session animée) : usage unique et nominatif ici, réutilisable et anonyme là-bas.

**Honorer** (une Sollicitation):
Marquer qu'une Sollicitation a reçu une réponse, en renseignant `honoreeLe`, au moment précis où le Jeton résout la Sollicitation - avant que celle-ci ne soit définitivement désolidarisée de la Réponse écrite.
_Avoid_: Répondre à (réservé à l'acte du Membre ; "honorer" est l'effet côté Sollicitation)

**Taux de participation**:
La part des Sollicitations honorées sur une période - le critère de succès principal du produit (PRD §11).
_Avoid_: Taux de réponse (même notion, formulation alternative du PRD §11)

### Réponses & anonymat

**Réponse**:
Un enregistrement immuable : Question, Niveau choisi, Équipe, horodatage, origine (Session ou Pouls), et pour une Session le numéro de Tour de vote. Ne porte jamais de référence au Membre ni au Jeton qui l'a produite - l'anonymat est une propriété du modèle de données, pas un filtre d'affichage.

**Agrégation temporelle**:
La règle qui impose aux restitutions issues du Pouls de toujours porter sur une fenêtre glissante, jamais sur une Réponse isolée à une date donnée.

**Restriction d'affichage**:
La règle qui limite Manager et Direction aux Paliers calculés, jamais à la répartition brute des votes ni au détail Question par Question.

### Scoring

**Palier**:
Le plus haut Niveau *N* pour lequel la part des Réponses situées à *N* ou au-dessus atteint le Paramètre X. Toujours bien défini : le Niveau 1 est validé par construction.

**Taux d'approche**:
La part des Réponses déjà situées au Niveau juste au-dessus du Palier atteint - l'indicateur qui rend visible la progression entre deux Paliers.

**Paramètre X**:
Le seuil de validation d'un Palier, configurable au niveau de l'instance uniquement, jamais par Équipe.

**Badge**:
La représentation visuelle d'un Palier atteint sur un Thème - pas un objet distinct, seulement un habillage de la même donnée.

### Restitutions

**Restitution**:
Une vue de la maturité calculée, dont le niveau de détail dépend du Rôle qui la consulte - principe : plus on s'éloigne de la séance, moins on voit de détail.
