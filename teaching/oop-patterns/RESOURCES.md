# Patterns de conception orientée objet — Resources

## Knowledge

- [When to Use a Private Constructor — Khalil Stemmler](https://khalilstemmler.com/blogs/typescript/when-to-use-a-private-constructor/)
  Spécialiste TypeScript/DDD. Argumente pour valider dans la **factory statique**, pas dans le
  constructeur, en retournant un `Result<T>` plutôt qu'en levant une exception. Use for : la
  question centrale de la leçon 0001 — où placer la validation d'invariant. Position à contraster
  avec Bloch/Baeldung ci-dessous.
- [Effective Java, Item 1: Consider static factory methods instead of constructors — Joshua Bloch (résumé Baeldung)](https://www.baeldung.com/java-constructors-vs-static-factory-methods)
  Référence historique du pattern (Java, mais les arguments sont transposables). Couvre les
  bénéfices au-delà de la validation : noms descriptifs, réutilisation d'instances, types de
  retour flexibles (sous-types). Use for : comprendre que le pattern répond à plusieurs problèmes,
  pas seulement à la validation.
- [Static Methods Can Access Private Class Constructors In TypeScript — Ben Nadel](https://www.bennadel.com/blog/3445-static-methods-can-access-private-class-constructors-in-typescript.htm)
  Explication syntaxique courte et précise : pourquoi `static creer()` peut appeler
  `new MaClasse(...)` même si le constructeur est `private`, en TypeScript spécifiquement. Use
  for : vérifier sa compréhension du mécanisme TypeScript sous-jacent.

## Gaps

- Aucune source trouvée qui tranche explicitement "constructeur vs factory" pour le cas précis
  d'un agrégat avec **plusieurs** factories (`creer` + `reconstituer`) qui doivent partager le même
  invariant — c'est le nœud du bug rencontré. La leçon 0001 comble ce vide par raisonnement direct
  sur le code du projet plutôt que par une source externe.

## Wisdom (Communities)

- Pas encore de communauté identifiée pour ce sujet précis. À revisiter si le mission évolue vers
  une pratique plus large de la conception orientée objet (au-delà de la lecture critique de code
  généré).
