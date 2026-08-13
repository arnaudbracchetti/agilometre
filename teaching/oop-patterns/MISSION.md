# Mission: Patterns de conception orientée objet (dans le code écrit par un agent IA)

## Why
Vous travaillez avec un agent IA (Claude Code) qui écrit du code de conception (DDD, patterns
orientés objet) dans vos projets. Vous voulez être capable de relire ce code, de repérer quand un
choix de conception est discutable ou risqué, et de challenger l'agent avec les bonnes questions —
plutôt que d'accepter ou de rejeter en aveugle. Le déclencheur concret : un bug (déjà corrigé deux
fois) où l'agent a placé la validation d'un invariant métier dans une factory plutôt que dans le
constructeur, ce qui a permis à un second point d'entrée (`reconstituer`) de créer un objet
invalide sans le vouloir.

## Success looks like
- Repérer, dans une revue de code, où vit la validation d'un invariant par rapport aux différents
  points de construction d'un objet (constructeur, factories multiples).
- Poser la bonne question à l'agent quand un pattern de conception a plusieurs variantes valables
  (ex: "as-tu choisi de valider dans le constructeur ou dans la factory, et pourquoi ?").
- Comprendre le vocabulaire courant des patterns de conception orientée objet suffisamment pour
  lire une explication ou une doc sans se perdre (factory method, invariant, value object,
  encapsulation, etc.).

## Constraints
- Apprentissage au fil de l'eau, déclenché par du vrai code rencontré en travaillant sur le projet
  Agilomètre — pas un cursus académique à part.
- Sessions courtes, ancrées dans le code réellement écrit (pas d'exercices abstraits déconnectés
  du projet).

## Out of scope
- Les patterns du Gang of Four non liés à la construction d'objets (comportementaux, structurels)
  — à traiter si/quand ils apparaissent dans du vrai code.
- La théorie DDD au sens large (agrégats, bounded contexts) — déjà couverte par le skill `/ddd` du
  projet ; ce workspace se concentre sur la lecture critique du code produit, pas sur la
  conception amont.
