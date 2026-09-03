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
Une personne recensée dans une Équipe ; référence au plus un Utilisateur, optionnellement - un Membre n'a pas besoin de compte pour répondre à une Session ou un Pouls (voir Code, Jeton). Quand un Utilisateur est référencé, il porte toujours le Rôle Membre d'équipe, et devient l'autorité sur les informations du Membre (voir Propagation descendante) - le Membre passe alors en lecture seule sur ces champs. Supprimé en cascade avec son Équipe.
_Avoid_: seul, pour désigner le Rôle "Membre d'équipe" - dans ce sens précis toujours écrire "Membre d'équipe" en entier, pour ne pas le confondre avec ce sens générique. Roster (anglicisme) - toujours dire "Membre" ou "Équipe".

**Propagation descendante**:
La règle par laquelle toute modification du prénom, du nom ou de l'email d'un Utilisateur est reportée sur chaque Membre qui le référence, dans toutes les Équipes où il est référencé comme Membre. Retenue plutôt qu'une simple éclipse à l'affichage pour que l'email du Membre reste toujours à jour et fasse autorité pour tout ce qui le consomme, notamment l'envoi des Sollicitations de pouls. Un changement d'email créant un doublon dans l'une des Équipes concernées est rejeté en bloc, jamais propagé partiellement.

**Utilisateur**:
Un compte de connexion à l'Organisation, portant un Rôle unique et, selon ce Rôle, une ou plusieurs Habilitations. Un Utilisateur Membre d'équipe est celui qu'un Membre référence pour se connecter et consulter les résultats de son Équipe.

**Jeton de compte**:
Un jeton à usage unique, valable 7 jours, émis à un Utilisateur pour définir son mot de passe - à l'invitation initiale comme lors d'une réinitialisation, même mécanisme pour les deux usages, sans fonction de renvoi distincte. Distinct du Jeton de session (Session animée, anonyme, portée toute la Session) et du Jeton de Sollicitation (Pouls, usage unique et nominatif) : celui-ci authentifie un accès de connexion, pas une participation.

**Habilitation**:
Le rattachement d'un Utilisateur Direction (à une ou plusieurs Entités) qui détermine sa portée d'accès - de même pour un futur Utilisateur Manager d'équipe (à une ou plusieurs Équipes), Rôle porté par l'enum mais différé, aucun compte n'étant pour l'instant créable avec. Distinct de Membre : une pure autorisation, sans lien avec les Membres d'une Équipe ni l'anonymat des Réponses. Un Utilisateur Coach n'a aucune Habilitation - son accès est transversal, déterminé par son Rôle seul. Un Utilisateur Membre d'équipe n'en a pas non plus : sa portée d'accès est dérivée des Équipes où il est référencé comme Membre, jamais portée par une Habilitation - les deux mécanismes divergeraient dès qu'on retire son Membre d'une Équipe sans en retirer l'Habilitation.

**Rôle**:
Une des quatre valeurs portées par un Utilisateur, qui détermine ce qu'il voit et peut faire : Coach (transversal, aucune Habilitation), Membre d'équipe (consulte les résultats des Équipes où il est référencé comme Membre), Manager d'équipe (Habilitation sur une ou plusieurs Équipes - Rôle différé, aucun compte créable actuellement), Direction (Habilitation sur une ou plusieurs Entités).
_Avoid_: Management, pour désigner le Rôle Direction - vocabulaire oral rencontré en séance de cadrage, jamais retenu au glossaire.

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

**Réactiver** (une Question sautée):
Annuler le marquage Sautée d'une Question, qui redevient à venir - seulement si son index dans la Sélection n'a pas encore été dépassé par la progression de la Session. La Question sautée pendant qu'elle était courante n'est pas réactivable (le curseur de progression ne recule jamais) ; seule une Question sautée par anticipation, alors qu'elle était encore à venir, reste réactivable tant qu'on ne l'a pas atteinte.

**Écran de pilotage**:
La vue réservée au Coach pour animer une Session ouverte : progression dans la Sélection, ouverture/clôture des Tours de vote, et les seules actions encore permises sur la Sélection (Sauter une Question, Réactiver une Question sautée).

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

### Emails

**Template** (email):
Le contenu d'un type d'email (sujet + corps markdown), chargé et validé depuis un fichier versionné dans le dépôt, identifié par une Clé d'email. Distinct de Modèle de session (voir section Session animée) - deux concepts sans rapport qui partagent le même mot faute de meilleure alternative native pour celui-ci ; voir [docs/design/contenu-emails-gabarits.md](docs/design/contenu-emails-gabarits.md).

**Clé d'email**:
L'identifiant stable d'un type d'email (ex: `compte.invitation`), choisi par le développeur dans le usecase appelant, qui résout par convention de nommage vers son fichier Template sur le disque.

**EmailRendu**:
Le résultat de l'application des variables et du rendu markdown vers HTML sur un Template : sujet, corps HTML, et repli texte brut auto-dérivé - prêt à être envoyé.

### Réponses & anonymat

**Réponse**:
Un enregistrement immuable : Question, Niveau choisi, Équipe, horodatage, origine (Session ou Pouls), et pour une Session le numéro de Tour de vote. Ne porte jamais de référence au Membre ni au Jeton qui l'a produite - l'anonymat est une propriété du modèle de données, pas un filtre d'affichage.

**Agrégation temporelle**:
La règle qui impose aux restitutions issues du Pouls de toujours porter sur une fenêtre glissante, jamais sur une Réponse isolée à une date donnée.

**Restriction d'affichage**:
La règle qui limite Manager et Direction aux Paliers calculés, jamais à la répartition brute des votes ni au détail Question par Question.

### Scoring

**Palier**:
Le plus haut Niveau *N* pour lequel la part des Réponses situées à *N* ou au-dessus atteint le Seuil de Palier. Toujours bien défini dès qu'il existe au moins une Réponse : le Niveau 1 est validé par construction. Sur une Portée sans aucune Réponse, il n'y a pas de Palier - jamais un Palier 1 par défaut.

**Taux d'approche**:
La part des Réponses déjà situées au Niveau juste au-dessus du Palier atteint, rapportée au Seuil de Palier (pas à l'effectif total) - l'indicateur qui rend visible la progression entre deux Paliers. Rapportée à l'effectif total, cette part plafonnerait toujours juste sous le Seuil de Palier (l'atteindre ferait déjà passer au Palier suivant) ; rapportée au Seuil de Palier, 100 % coïncide exactement avec le franchissement.

**Marge avant descente**:
Symétrique du Taux d'approche côté risque : la part des Réponses déjà au Palier courant ou au-dessus, repositionnée entre le Seuil de Palier (0 %, Palier tenu à la limite stricte) et l'effectif total (100 %, Palier solidement acquis). Le Palier 1 n'a pas de Palier 0 en dessous : sa Marge avant descente vaut donc toujours 100 %. Volontairement distinct du Taux d'approche plutôt que fusionné en un seul indicateur : les deux portent sur des populations de Réponses différentes (le Niveau du Palier pour l'un, celui du Palier+1 pour l'autre), qu'un chiffre composite unique fusionnerait sans justification métier.

**Seuil de Palier**:
Le seuil de validation d'un Palier, configurable au niveau de l'instance uniquement, jamais par Équipe.
_Avoid_: Paramètre X (terme du PRD - Seuil de Palier est le terme retenu côté code et glossaire)

**Badge**:
La représentation visuelle d'un Palier atteint sur un Thème - pas un objet distinct, seulement un habillage de la même donnée.

**Portée**:
L'ensemble de Réponses sur lequel porte un calcul de scoring : soit une Session donnée, soit une Période de calcul pour une Équipe ou une Entité. Les deux modes sont exclusifs - une Portée de Session ignore tout découpage temporel.

**Période de calcul**:
L'intervalle calendaire contigu, de durée fixée pour toute l'instance et aligné sur le calendrier pour toutes les Équipes, qui sert de Portée aux restitutions synthétiques et à la Tendance.

**Lecture fine**:
La restitution au grain Question - Moyenne, Dispersion et répartition des Niveaux - destinée au Coach et à l'Équipe pour situer les points à travailler. Complète le Palier, volontairement grossier, sans le remplacer.

**Moyenne** (d'une Question):
La moyenne des Niveaux des Réponses à une Question sur une Portée. Jamais calculée au-delà de la Question : au grain Thème ou Équipe, elle recréerait le classement fin que la granularité du Palier écarte délibérément.

**Dispersion**:
L'écart entre les Réponses à une même Question - le désaccord de l'Équipe - restitué en trois crans de consensus (fort, modéré, faible) plutôt qu'en valeur brute.

**Tendance**:
La suite des Paliers d'une Équipe ou d'une Entité, une Période de calcul après l'autre. Une Période sans Réponse y laisse un trou, jamais le report du dernier Palier connu.

**Évolution**:
Le mouvement d'un Palier (par Thème ou global) entre la Période de calcul affichée et la Période immédiatement précédente : hausse, baisse ou stable. Distinct de la Tendance (qui porte sur la suite complète des Paliers) - l'Évolution ne compare que deux Périodes consécutives, prend `null` s'il n'y a pas de Palier des deux côtés. À Palier identique, ne s'arrête pas là : compare le Taux d'approche (ou, au Palier 4, la Marge avant descente) pour détecter un mouvement à l'intérieur du Palier, avec une marge de tolérance de 10 points (un écart de 10 points ou moins reste stable, pas une égalité stricte).
_Avoid_: Tendance (réservé à la suite complète des Paliers période après période)

**Mur de badges**:
La vue comparant les Badges de plusieurs Équipes entre elles, sans classement chiffré.

### Restitutions

**Restitution**:
Une vue de la maturité calculée, dont le niveau de détail dépend du Rôle qui la consulte - principe : plus on s'éloigne de la séance, moins on voit de détail.
