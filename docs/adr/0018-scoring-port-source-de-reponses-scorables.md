---
status: accepted
---

# scoring/ n'accède à aucune table : port "source de Réponses scorables", une implémentation par origine

ADR-0003 place déjà le calcul côté backend, comme fonction pure de domaine du module `scoring/`.
Reste à border qui alimente cette fonction en Réponses. Deux tentations à écarter : que `scoring/`
lise directement les tables (couplage à un détail d'infrastructure, et à un module frère si la
structure des Réponses change), ou qu'il soit écrit contre le module `session/` (la Session n'est
qu'une origine parmi d'autres - le Pouls, Epic #9, en fournira une autre selon ses propres règles
d'expiration de Jeton et de fenêtre d'agrégation).

**Décision.** `scoring/domain/` définit un **port** "source de Réponses scorables", ignorant de
l'origine, qui rend des Réponses déjà filtrées. `session/` en fournit une implémentation, où vit la
règle "seul le dernier Tour clos de chaque couple (Session, Question) compte" (elle seule possède
`TourDeVote`) ; `pouls/` en fournira une autre plus tard, sans modifier `scoring/`. Chaque
implémentation s'appuie sur le module `reponse/` (extrait de `session/` par cette même Epic, voir
commentaire sur l'Epic #7) pour obtenir les Réponses elles-mêmes. `scoring/` orchestre les sources,
agrège et calcule ; il ne connaît que le port, et n'importe aucun module Prisma/infrastructure.

**Conséquence pour les tests.** Les use cases de `scoring/` doivent pouvoir se tester avec une
implémentation en mémoire du port, preuve qu'aucune origine n'y est câblée en dur.
