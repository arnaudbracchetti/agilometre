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

**Addendum (conception de l'Epic #9, carte [#68](https://github.com/arnaudbracchetti/agilometre/issues/68)).**
La phrase « `pouls/` en fournira une autre » ci-dessus est amendée sur la forme, pas sur le fond. La
source de Réponses scorables d'origine Pouls est une **requête directe portée par `reponse/`**, et
non une implémentation vivant dans `pouls/`. La raison : il n'y a **rien à filtrer** côté Pouls,
contrairement à la source Session, où vit la règle « seul le dernier Tour clos de chaque couple
(Session, Question) compte » et qui justifie que l'implémentation soit là où vit `TourDeVote`. Faire
transiter par `pouls/` une requête sans règle n'aurait fait qu'y créer une dépendance au scoring que
ce module n'a aucune raison de porter : `pouls/` produit des Sollicitations, tire des Questions et
consomme des Jetons.

Le fond de cette décision est intact : `scoring/` ne connaît toujours que le port, ignore l'origine,
et n'importe aucun module d'infrastructure. L'emplacement du composite des deux sources reste à la
carte [#71](https://github.com/arnaudbracchetti/agilometre/issues/71).
