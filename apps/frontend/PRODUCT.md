# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Coach / consultant** (primary user of most screens) — anime les séances (projection + pilotage), configure les campagnes de pouls, gère l'organisation (entités/équipes) et les modèles de collecte, exploite le grain fin (répartitions brutes, tours de vote, historique). Le seul rôle avec compte "riche".
- **Membre d'équipe** — vote en séance depuis son téléphone/PC (code éphémère, sans compte) et répond au pouls depuis un lien à jeton reçu par email. Consulte les paliers de sa propre équipe par thème, le score global, les badges des autres équipes.
- **Manager d'équipe** — suit paliers, taux d'approche et tendance de son équipe. Jamais la répartition brute ni le détail question par question. Pouls en agrégats glissants uniquement.
- **Direction / sponsor** — suit les paliers agrégés au niveau entité, mur de badges des équipes. Pas de vue équipe par équipe.

État actuel de l'implémentation (`app.routes.ts`) : les parcours coach (organisation, modèles de collecte, sessions : bibliothèque/création/ajustement/pilotage) et les parcours participant (vote, projection) existent. Les trois vues de restitution manager/direction (profil par thème, tendance, mur de badges) ne sont pas encore construites comme routes.

## Product Purpose

Outiller le diagnostic de maturité agile d'une organisation via deux dispositifs complémentaires — une séance animée (vote projeté, multi-tours) et une campagne de pouls par email entre deux séances — alimentant le même réservoir de réponses et le même moteur de scoring, pour rendre visible et suivre dans la durée la progression de maturité d'une équipe.

## Positioning

Anonymat par construction — aucun lien entre un répondant et sa réponse n'est jamais persisté, y compris pour un administrateur local ayant accès à la base — combiné à un dispositif double (séance animée + pouls) alimentant un seul moteur de scoring. Un concurrent qui greffe un simple sondage sur son produit ne peut reproduire ni la garantie structurelle d'anonymat, ni la continuité de mesure entre les deux dispositifs.

## Operating Context

- **Séance animée** : salle de réunion standard, questions projetées, coach anime depuis son propre laptop. Les participants votent depuis leur téléphone ou PC personnel, rejoignent par un code éphémère, sans compte. Pendant le vote, l'écran de projection n'affiche que la participation, jamais le contenu.
- **Pouls** : réponse depuis un email, lien à jeton unique, page de réponse épurée (une question, quatre choix). Le jeton expire à l'échéance suivante.
- **Temps réel** : sondage HTTP toutes les 2 secondes (pas de websocket), choix délibéré pour la robustesse derrière des proxies d'entreprise non maîtrisés.
- **Déploiement** : on-premise, une instance dédiée par client, sans dépendance cloud ; emails envoyés via le SMTP du client.

## Capabilities and Constraints

- Référentiel importé une fois au déploiement (fichier structuré), figé ensuite — pas d'édition dans l'application en v1.
- Sélection des questions à la création d'une session : par thème ou question par question.
- Séance : plusieurs tours de vote possibles par question (revote après discussion) ; seul le dernier tour compte dans le score, les précédents restent consultables par le coach.
- Pouls : une ou deux questions par envoi, tirage équilibrant la couverture des thèmes au niveau de l'équipe, évite de resolliciter trop vite le même membre sur la même question.
- Scoring : palier = plus haut niveau N dont la part des réponses ≥ N atteint le seuil X % ; taux d'approche = part des réponses déjà au niveau N+1. X configurable au niveau de l'instance uniquement, jamais par équipe.
- Restitutions strictement dégressives par rôle (voir Users) — manager et direction ne voient jamais la répartition brute des votes.
- Authentification : comptes locaux en v1 (coach, manager, direction) ; jeton éphémère pour les participants en séance ; lien à jeton sans mot de passe pour le pouls. SSO client hors v1.
- Hors v1 : SSO client, édition du référentiel in-app, multi-tenant, application mobile native, notifications Slack/Teams, pondération des thèmes ou des équipes dans le score.
- Non tranché (PRD §12) : valeur par défaut de X, durée par défaut de la fenêtre glissante du pouls.

## Brand Commitments

Nom : **Agilomètre** (le PRD d'origine le laissait ouvert §12, mais le nom est déjà consacré dans le code — package `@agilometre/shared`, documentation projet). Une charte graphique inspirée d'insee.fr (navy/rouge) a déjà été validée et implémentée (`apps/frontend/src/styles.scss`, `theme.less`) comme identité de toutes les écrans, pas seulement la page d'accueil — à traiter comme un engagement contraignant, pas comme un point de départ.

## Evidence on Hand

Aucun contenu réel de référentiel, aucune équipe/organisation de démonstration, aucun témoignage ou étude de cas dans le dépôt — le référentiel est un fichier propre à chaque client, chargé au déploiement. Le travail de design ne doit ni inventer de contenu de référentiel, ni de témoignages, ni de chiffres d'usage.

## Product Principles

1. L'anonymat est une propriété du modèle de données, jamais un filtre d'affichage — aucun écran, aucune API ne doit introduire un lien répondant ↔ réponse, même indirect.
2. Le vote déclenche la conversation, il n'est pas une fin en soi — les écrans de séance servent l'animation en salle avant de servir la collecte de données.
3. Un seul moteur de scoring pour toutes les vues — jamais de logique de calcul de palier dupliquée ou divergente entre écrans coach/manager/direction.
4. Moins de détail à mesure qu'on s'éloigne de la pièce où la conversation a eu lieu — restitutions strictement dégressives par rôle, jamais une vue qui donne accidentellement plus de grain qu'autorisé.
5. Robustesse avant élégance technique — sondage HTTP simple plutôt que websocket, déploiement autonome sans dépendance cloud, résilience derrière des proxies d'entreprise non maîtrisés.

## Accessibility & Inclusion

RGAA (référentiel général d'amélioration de l'accessibilité) requis — la base clients inclut des organisations du secteur public ou para-public français.
