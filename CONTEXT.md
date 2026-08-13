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
Une personne dotée d'un compte dans l'Organisation, rattachée à une Équipe, porteuse d'un Rôle.
_Avoid_: seul, pour désigner le Rôle "Membre d'équipe" - dans ce sens précis toujours écrire "Membre d'équipe" en entier, pour ne pas le confondre avec ce sens générique (voir Rôle).

**Rôle**:
Une des quatre valeurs qui détermine ce qu'un Membre voit et peut faire : Coach, Membre d'équipe, Manager d'équipe, Direction.

### Session animée

**Session**:
Une séance animée par un Coach pour une Équipe, à une date, sur une sélection de Questions ; contient des Tours de vote.
_Avoid_: Séance (synonyme naturel du PRD narratif - Session est le terme du modèle)

**Tour de vote**:
Un cycle de vote sur une Question au sein d'une Session. Plusieurs tours peuvent se succéder sur une même Question (revote) ; seul le dernier compte dans le score, les précédents restent consultables par le Coach.

**Code (de session)**:
Le code court affiché à l'écran de projection permettant aux Membres de rejoindre une Session sans compte.

### Pouls

**Campagne de pouls**:
La configuration attachée à une Équipe qui pilote l'envoi périodique de Sollicitations : rythme, nombre de Questions par envoi, Thèmes actifs, date de fin éventuelle.

**Sollicitation**:
Un envoi individuel généré par une Campagne de pouls vers un Membre, portant un Jeton à usage unique.

**Jeton**:
Un identifiant à usage unique attaché à une Sollicitation, consommé à la réception de la Réponse puis sans lien conservé vers celle-ci.

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
