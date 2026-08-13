---
status: accepted
---

# Emplacement du calcul du moteur de scoring : backend uniquement, pas `packages/shared`

`packages/shared/src/scoring.ts` porte le type `ResultatScoring` (palier, tauxApproche, effectif)
consommé par le backend et le frontend, mais pas la fonction qui le calcule (règle du Palier et
du Taux d'approche, PRD §6). Cette fonction vit **côté backend uniquement**, comme fonction pure
de domaine dans le futur module `scoring/` (mandat DDD de CLAUDE.md : couche domaine pure, sans
dépendance NestJS/Prisma), et non dans `packages/shared`.

**Raisonnement.** Le rôle de `packages/shared` (CLAUDE.md) est d'éviter la dérive de calcul entre
les vues Coach, Manager et Direction. Or aucune vue ne recalcule jamais le Palier ou le Taux
d'approche côté client — pas même en optimiste pendant un Tour de vote — toutes lisent le même
`ResultatScoring` renvoyé par l'API, rafraîchi par le polling 2s (CLAUDE.md §10). Cette garantie
anti-dérive est donc déjà assurée par le **type** partagé seul : les trois vues important le même
contrat TypeScript pour la réponse API suffit à empêcher toute divergence de forme ou
d'interprétation entre elles. Dupliquer la fonction de calcul dans `packages/shared`
n'apporterait aucune protection supplémentaire, ajouterait une dépendance inutile du frontend
vers une logique métier qu'il n'exécute jamais, et irait à l'encontre du principe DDD déjà acté
(logique métier dans des agrégats backend, pas dispersée entre couches).

**Conséquence.** `packages/shared` continue de ne porter que le contrat (`ResultatScoring` et
types associés). L'implémentation du calcul reste un détail d'agrégat backend, à concevoir via
`/ddd` au démarrage de l'Epic Moteur de scoring — le bornage fin de cet agrégat n'est pas tranché
par cette décision.
