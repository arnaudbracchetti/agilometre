---
status: accepted
---

# Toutes les règles de calcul concentrées dans scoring/domain/ - le recalcul rétroactif de l'historique est assumé

Les règles de scoring (seuil X, règle du Palier, formule du Taux d'approche, Moyenne, écart-type,
seuils des 3 crans de Dispersion) sont amenées à évoluer avec l'usage produit - le PRD §12 laisse
d'ailleurs la valeur par défaut de X comme point ouvert. Les laisser se disperser (un arrondi dans
un mapper, un seuil dupliqué côté frontend) rendrait cette évolution risquée et incomplète.

**Décision.** Aucun calcul, seuil ou formule n'existe hors de `apps/backend/src/scoring/domain/` -
ni dans un use case, un contrôleur, un mapper, un DTO, ni dans le frontend (qui ne recalcule jamais
rien, y compris en optimiste - déjà acté par ADR-0003). La traduction écart-type → cran de consensus
est une règle à ce titre, pas un détail d'affichage.

**Conséquence assumée : le recalcul rétroactif.** Combinée à l'absence de persistance des résultats
(ADR-0003 - recalcul à la volée, volumes dérisoires), cette concentration signifie qu'une évolution
de X ou d'un seuil recalcule **tout** l'historique : le Palier affiché pour une Session de l'an
dernier peut changer du jour au lendemain. C'est délibéré, pas un bug : une Tendance dont les points
auraient été calculés avec des règles différentes afficherait de fausses progressions ou
régressions. L'alternative (versionner les règles, figer les résultats passés) réintroduirait la
persistance et l'invalidation écartées par ADR-0003, pour rendre les points d'une Tendance
justement *moins* comparables entre eux.
