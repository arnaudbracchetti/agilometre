---
status: accepted
---

# Renommage Modèle de collecte : complet, jusqu'à la base, en carte dédiée et avant le Pouls

`CONTEXT.md` acte **Modèle de collecte** comme terme du domaine : le concept sert désormais les deux
dispositifs de collecte (une Session en copie la Sélection pour ses Tours, une Campagne de pouls en
copie la Sélection pour son Panel), donc son nom ne peut plus dire « session ». Le code, lui, dit
encore `ModeleSession`.

Empreinte mesurée : **863 occurrences sur 74 fichiers de code** (et non ~497 comme l'annonçait
l'annexe), mais très concentrées - 242 dans trois fichiers seulement (`session.controller.ts`, son
spec et `session.module.ts`). Les trois axes sont quasi indépendants et ne partagent presque aucune
ligne : la base (6 objets SQL), les routes API (11 routes sous `/api/modeles-session`), les libellés
d'interface (~35 lignes).

**Décision.** Renommage **complet**, sur les trois axes :

- **Base** : un vrai `ALTER TABLE ... RENAME`, dans une migration écrite à la main (Prisma ne génère
  pas de rename fiable seul). **`@@map` est écarté** : le schéma n'a aujourd'hui aucune divergence
  entre nom de modèle et nom de table, et en introduire une - la seule - pour économiser une
  migration reviendrait à porter indéfiniment un décalage de vocabulaire dans le fichier qui fait le
  plus autorité sur le modèle. Les deux dossiers de migration historiques ne sont pas renommés
  (`_prisma_migrations` les référence).
- **Routes API** : `/api/modeles-session` devient `/api/modeles-collecte`, et `modeleSessionId`
  devient `modeleCollecteId` dans les corps de requête. Le frontend est le seul consommateur : pas de
  client tiers, donc **aucune période de compatibilité à tenir**.
- **Fichiers, dossiers et libellés** : 26 fichiers et 1 dossier renommés, plus les libellés visibles.

**`ModeleCollecte` est extrait dans son propre module `modele-collecte/`.** C'est déjà un agrégat
racine à part entière (repository propre, cycle de vie propre) ; ses fichiers vivaient dans
`session/` uniquement parce qu'il ne servait que la séance animée. L'y laisser ferait dépendre
`pouls/` de `session/` pour un concept qui n'a plus rien de propre au direct, contre la règle
d'organisation par agrégat de CLAUDE.md. Le VO `Selection` déménage avec lui et est importé par
`session/` comme par `pouls/`.

**En carte dédiée, exécutée avant les cartes de la Campagne de pouls.** L'ordre est ce qui rend le
renommage bon marché : `CampagnePouls` **ne référence pas encore** `ModeleSession` en base. Renommer
d'abord évite d'ajouter une troisième référence à renommer ensuite, et évite d'écrire du code neuf
dans un vocabulaire déjà su faux.

**Alternatives écartées.**

- **Libellés seuls** (moins d'une demi-journée) : l'utilisateur verrait le bon vocabulaire tout de
  suite, mais le code continuerait de dire `ModeleSession` durablement. C'est l'état transitoire que
  `CONTEXT.md` documente déjà ; le figer serait accepter un glossaire à deux vitesses.
- **Tout sauf la base, via `@@map`** : économise la migration, au prix de la divergence permanente
  ci-dessus.
- **S'arrêter à la frontière HTTP** : économise ~1 jour (90 littéraux d'URL, dont 50 en e2e) pour un
  contrat d'API qui dirait durablement autre chose que le domaine.

**Conséquence.** L'ADR [0008](0008-modele-session-bibliotheque-globale.md) porte « modele-session »
jusque dans son nom de fichier ; son fond (bibliothèque globale, sans rattachement à une Équipe) est
inchangé et **renforcé** par le fait que le concept sert maintenant deux dispositifs.
