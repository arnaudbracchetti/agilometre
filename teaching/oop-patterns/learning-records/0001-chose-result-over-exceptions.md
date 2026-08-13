# A tranché : Result<T, E> plutôt que throw pour la validation d'invariant

Après la leçon 0001 sur le pattern named constructor, l'utilisateur a choisi explicitement l'école
Khalil Stemmler (constructeur muet, validation dans la factory, retour d'un `Result<T, E>` plutôt
que `throw`) — et a lui-même identifié le point de vigilance associé : ce choix ne protège que si
**chaque** factory ajoutée est explicitement passée en revue vis-à-vis de l'invariant, pas
seulement la première. C'est allé au-delà de la leçon (qui présentait les deux écoles sans
trancher) : compréhension démontrée du vrai risque, pas seulement de la mécanique syntaxique du
pattern.

## Implications
- Prochaines leçons sur ce sujet peuvent supposer connu : constructeur privé + factory nommée,
  `Result<T, E>` comme alternative à `throw`, et le risque spécifique des factories multiples sur
  un même agrégat.
- Chantier naturel à proposer ensuite : comment composer plusieurs `Result` (ex: valider une
  liste d'options où chacune peut échouer) sans retomber dans du code impératif verbeux — c'est
  exactement le problème rencontré en réécrivant `referentiel-yaml.parser.ts`.
- Règle actée dans `CLAUDE.md` du projet (section "Domain validation") — le workspace
  d'apprentissage et le projet convergent sur la même règle, donc pas de dérive attendue entre
  les deux.
