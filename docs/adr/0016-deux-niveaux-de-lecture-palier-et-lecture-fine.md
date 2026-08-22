---
status: accepted
---

# Deux niveaux de lecture : le Palier (macro) et la lecture fine par Question

Le corps de l'Epic #10 évoquait "réponse majoritaire" et "dispersion" comme des axes de résultat en
plus du Palier/Taux d'approche du PRD §6. Le grilling a établi que ce n'était pas une formulation
périmée par le PRD mais un vrai second besoin : le Palier, volontairement grossier (granularité à 4
crans, "pour permettre l'émulation entre équipes sans autoriser le classement fin" - PRD §6), ne dit
pas au Coach et à l'Équipe *où* se concentrer.

**Décision.** Deux niveaux de lecture, tous deux issus de la même population de Réponses filtrée :
- **macro** : Palier + Taux d'approche, à grain **Thème, Équipe ou Entité** - c'est aussi le Badge
  (CONTEXT.md), pas un objet distinct. **Jamais au grain Question** (voir Correction ci-dessous) :
  un seuil de validation *X %* n'a de sens que sur une population assez large pour qu'un pourcentage
  soit informatif ; l'effectif d'un seul Tour de vote (quelques votants) ne l'est pas.
- **fine** : Moyenne + Dispersion (restituée en 3 crans de consensus) par Question uniquement, avec
  drill-down vers la répartition en % par Niveau. La Moyenne n'est **jamais** agrégée au-dessus de
  la Question : au grain Thème ou Équipe, elle recréerait précisément le classement fin que le PRD
  écarte pour le Palier. La lecture fine utilise systématiquement la même Portée que le Palier
  qu'elle détaille, pour ne jamais afficher deux chiffres contradictoires côte à côte.

**Hors périmètre.** La lecture fine n'existe pas au niveau Entité (mélange de contextes hétérogènes,
ne désigne aucune action concrète) ; elle reste au grain Équipe et Session.

**Correction (`/to-tickets`, découpage en tickets).** La version initiale de cette décision
prévoyait le Palier "à tout grain, y compris Question", avec un ticket dédié pour l'afficher sur
l'écran de projection à la clôture d'un Tour de vote (PRD §7.6, qui l'annonçait déjà). Ticket retiré
du découpage : au grain d'un seul Tour, la Moyenne + Dispersion (lecture fine) porte déjà
l'information utile, et un Palier calculé sur un effectif aussi restreint n'apporte rien de plus -
seulement une fausse précision. **Le Palier ne s'applique donc jamais au grain Question.** L'écran
de projection reste inchangé par cette Epic ; PRD §7.6 reste, pour l'instant, sans réponse - à
reprendre séparément si le besoin se confirme.
