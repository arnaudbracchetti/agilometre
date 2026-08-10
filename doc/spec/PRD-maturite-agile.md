# PRD — Application de diagnostic de maturité agile

*Nom de code provisoire : à définir. Version 0.1 — document de cadrage.*

---

## 1. Intention

Outiller le diagnostic de maturité agile d'une organisation en deux temps complémentaires.

Un **temps de diagnostic animé** : un coach réunit une équipe, projette les questions du référentiel, ouvre la discussion, puis fait voter chacun depuis son téléphone. Le vote n'est pas une fin en soi — c'est le révélateur qui déclenche la conversation.

Un **temps de pouls** : entre deux séances, les membres reçoivent régulièrement par email une ou deux questions tirées du référentiel. La maturité se met à jour en continu, sans mobiliser personne.

Les deux dispositifs alimentent le même réservoir de réponses et le même calcul de score.

## 2. Utilisateurs

| Rôle | Ce qu'il vient faire |
|---|---|
| Coach / consultant | Anime les séances, configure les campagnes de pouls, exploite le grain fin |
| Membre d'équipe | Répond en séance et au pouls, consulte le niveau de son équipe |
| Manager d'équipe | Suit la maturité et la tendance de son équipe |
| Direction / sponsor | Suit la maturité agrégée de son entité |

## 3. Périmètre

**Dans la v1**
Import du référentiel, gestion des organisations et des équipes, séance animée avec projection et vote multi-tours, campagnes de pouls par email, moteur de scoring, restitutions différenciées par rôle, badges, comptes locaux.

**Hors v1**
SSO client, édition du référentiel dans l'application, multi-tenant, application mobile native, notifications Slack ou Teams, pondération des thèmes dans le score global.

## 4. Modèle de domaine

**Référentiel** — importé une fois au déploiement, figé ensuite. Des *thèmes*, chacun contenant des *questions*, chacune ayant exactement quatre *options* portant un niveau de 1 à 4. Ordre de grandeur : 60 à 120 questions.

*Conséquence à retenir : aucune séance ne peut couvrir l'intégralité du référentiel. Le coach arbitre donc entre plusieurs séances thématiques et une séance unique portant sur un sous-ensemble de questions, selon le temps dont il dispose et la profondeur qu'il vise. Dans les deux cas, la sélection des questions au moment de créer une session est une fonction centrale, pas un confort : elle doit permettre de choisir par thème comme question par question, et de retrouver ce qui a déjà été traité avec cette équipe.*

**Organisation** — des *entités / BU*, contenant des *équipes*, contenant des *membres*. Chaque compte porte un rôle.

**Session** — une séance animée par un coach pour une équipe, à une date, sur une sélection de questions. Contient des *tours de vote*.

**Campagne de pouls** — une configuration attachée à une équipe : rythme, nombre de questions par envoi (une ou deux), thèmes actifs, date de fin éventuelle. Génère des *sollicitations*.

**Réponse** — question, niveau choisi (1 à 4), équipe, horodatage, origine (session ou pouls), et pour une session le numéro de tour. **Aucun lien vers l'identité du répondant.**

## 5. Anonymat — exigences

L'anonymat est une propriété du modèle de données, pas un filtre d'affichage. L'application étant déployée chez le client, un administrateur local a accès à la base : si le lien répondant ↔ réponse existe, la promesse ne tient pas.

- La sollicitation par email porte un jeton à usage unique. À la réception de la réponse, le jeton est marqué consommé et la réponse est enregistrée **sans référence au jeton ni au membre**.
- Est conservé : qui a été sollicité, sur quelle question, à quelle date, et si la sollicitation a été honorée. C'est nécessaire pour l'assiduité, les relances et pour éviter de reposer trop vite la même question à la même personne. Ce lien membre ↔ question ne doit jamais devenir un lien membre ↔ réponse.
- En séance, les participants rejoignent par un code éphémère, sans compte.
- Aucun seuil bloquant de répondants. L'anonymat est protégé par deux règles :
  - **agrégation temporelle** — les restitutions issues du pouls portent toujours sur une fenêtre glissante, jamais sur une question isolée à une date donnée ;
  - **restriction d'affichage** — manager et direction voient les paliers calculés, jamais la répartition brute des votes ni le détail question par question.

## 6. Moteur de scoring

Une fonction unique, appelée par toutes les vues. Entrée : un ensemble de réponses filtré (équipe ou entité, période, thème ou totalité). Sortie : un palier et un taux d'approche.

**Règle du palier.** Un niveau *N* est validé si la part des réponses situées à *N* ou au-dessus atteint *X %*. Le palier est le plus haut *N* validé. La part des réponses ≥ *N* étant décroissante en *N*, le palier est toujours bien défini et sans trou. Le niveau 1 est validé par construction.

**Taux d'approche.** Part des réponses déjà situées à *N+1* ou au-dessus. C'est cet indicateur qui rend la progression visible : le palier bouge par crans rares, le taux d'approche évolue en continu.

*Exemple, X = 60 %.* Sur un thème, 40 réponses dans la fenêtre. Réponses ≥ 2 : 30, soit 75 % → niveau 2 validé. Réponses ≥ 3 : 22, soit 55 % → non validé. **Palier 2, taux d'approche du niveau 3 : 55 %** (il en faut 60).

**Paramètre X.** Configurable, mais **au niveau de l'instance**, jamais par équipe : deux équipes du même client doivent avoir des badges comparables. Repère utile : X = 50 % équivaut à la médiane, 75 % est nettement exigeant, 100 % demande l'unanimité et ne bougera pratiquement jamais.

**Score global.** Même calcul appliqué à toutes les réponses, tous thèmes confondus. *Limite assumée en v1 : les thèmes comportant le plus de questions pèsent mécaniquement davantage.*

**Agrégation entité / BU.** Recalcul du palier sur l'ensemble des réponses de l'entité. *Limite assumée : les grandes équipes pèsent davantage que les petites.*

**Fenêtres d'agrégation.** Séance : la session elle-même. Pouls : fenêtre glissante configurable. Vue consolidée d'une équipe : les deux sources réunies.

**Badges.** Un badge est la représentation visuelle d'un palier atteint sur un thème. Ce n'est pas un objet distinct — même donnée, autre habillage. La granularité à quatre crans est délibérée : elle permet l'émulation entre équipes sans autoriser le classement fin.

## 7. Parcours — la séance animée

1. Le coach crée une session : équipe, sélection des thèmes ou des questions.
2. Ouverture. Un code court s'affiche sur l'écran de projection.
3. Les membres saisissent le code depuis leur téléphone ou leur PC. Aucun compte à créer, jeton de session anonyme.
4. Pour chaque question : affichage de la question et de ses quatre options sur l'écran de projection, discussion animée par le coach, puis ouverture du vote.
5. Pendant le vote, l'écran affiche la participation (« 6 sur 8 ») et rien du contenu.
6. Le coach clôt le tour. La répartition apparaît en histogramme, avec le palier de la question.
7. **Revote.** Le coach peut ouvrir un nouveau tour sur la même question après discussion. Plusieurs tours sont conservés en base ; **seul le dernier tour compte dans le score**, les précédents restent consultables par le coach comme trace du déplacement de l'équipe.
8. Question suivante. En fin de séance, écran de synthèse par thème.

## 8. Parcours — le pouls

1. Le coach configure la campagne : rythme, une ou deux questions par envoi, thèmes actifs, date de fin.
2. À chaque échéance, l'application tire les questions en **équilibrant la couverture des thèmes au niveau de l'équipe** — l'objectif est de balayer le référentiel régulièrement, pas que chaque personne voie tous les thèmes. Le tirage évite les questions récemment adressées au même membre.
3. Envoi d'un email par membre, avec un lien à jeton unique.
4. Page de réponse épurée : une question, quatre choix, quelques secondes.
5. Le jeton expire à l'échéance suivante, pour éviter que des réponses tardives ne polluent la fenêtre d'agrégation en cours.
6. Après validation, un simple remerciement. Aucun résultat n'est affiché à cette étape.

## 9. Restitutions et droits

Principe : plus on s'éloigne de la pièce où la conversation a eu lieu, moins on voit de détail.

| Rôle | Accès |
|---|---|
| Membre | Paliers de son équipe par thème, score global, badges des autres équipes, répartition détaillée des sessions auxquelles il a participé |
| Coach | Tout sur ses équipes : répartitions brutes, tours de vote, historique des sessions, taux de participation au pouls, comparaison entre ses équipes |
| Manager d'équipe | Paliers par thème, taux d'approche, tendance. Ni répartition brute, ni détail question par question. Pouls en agrégats glissants uniquement |
| Direction | Paliers par thème agrégés au niveau entité, mur de badges des équipes. Pas de vue détaillée équipe par équipe |

**Trois vues à concevoir**

- **Profil par thème** — radar ou barres, chaque thème portant son palier et la jauge d'approche du palier suivant.
- **Tendance** — le palier en escalier, doublé de la courbe du taux d'approche qui bouge en continu et rend lisible la progression entre deux crans.
- **Mur de badges** — les paliers des équipes, sans classement chiffré.

## 10. Contraintes techniques

**Déploiement chez le client**, une instance dédiée par client. Implications :

- Installation autonome, sans dépendance à un service cloud.
- Envoi d'emails via le **SMTP du client**. Obtenir le compte technique est le point de dépendance à identifier tôt dans un projet client — c'est ce qui bloque le plus souvent.
- Les données ne sortent pas du système d'information du client, ce qui simplifie la conformité RGPD.

**Architecture proposée** : application web unique — backend, frontend, base Postgres — livrée en `docker-compose` derrière un reverse proxy.

**Temps réel en séance** : sondage HTTP toutes les deux secondes plutôt que websockets. Moins élégant, mais robuste derrière les proxies d'entreprise dont on ne maîtrise pas la configuration. Deux secondes de latence sur un compteur de votes sont invisibles en atelier.

**Authentification** : comptes locaux en v1 pour coach, manager et direction ; jeton éphémère pour les participants en séance ; lien à jeton sans mot de passe pour le pouls. SSO client dans un second temps.

**Import du référentiel** : fichier structuré chargé au déploiement.

## 11. Critères de succès

Par ordre de priorité :

1. **Taux de réponse au pouls dans la durée.** Le critère principal — un dispositif récurrent qui s'essouffle au bout de six semaines n'a produit aucune valeur.
2. **Qualité des discussions en séance.** L'outil est un déclencheur de conversation ; s'il ne déclenche rien, il ne sert à rien.
3. **Progression des paliers.**
4. **Nombre d'équipes équipées.**

## 12. Points ouverts

- Pondération des thèmes dans le score global (écarté de la v1, à réexaminer).
- Pondération des équipes dans l'agrégation par entité (écarté de la v1, à réexaminer).
- Valeur par défaut de X à recommander aux coachs.
- Durée par défaut de la fenêtre glissante du pouls.
- Nom du produit.
