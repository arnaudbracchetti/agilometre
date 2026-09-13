# La Sollicitation vue du Membre : email et page de réponse

Design issu de la carte `/wayfinder`
[La Sollicitation vue du Membre : email et page de réponse #70](https://github.com/arnaudbracchetti/agilometre/issues/70),
ticket de la carte [Cartographie : Campagne de pouls #67](https://github.com/arnaudbracchetti/agilometre/issues/67).
Cadrage fonctionnel : PRD §5 (anonymat), §8.4-8.7 (parcours du pouls). Vocabulaire : `CONTEXT.md`,
section Pouls. Méthode : `/prototype` - variantes de mise en page comparées en direct, prototype
jetable sur la branche `prototype/pouls-reponse-membre` (page publique non implémentée en
production à ce stade, cette carte ne tranche que la forme).

Décisions déjà posées, respectées ici et non rediscutées :
[ADR-0001](../adr/0001-contrat-anonymat-reponse.md) (anonymat Réponse/Sollicitation, jeton à usage
unique), [ADR-0012](../adr/0012-exoneration-throttler-routes-polling.md) (throttler global, routes
de vote/jointure non exonérées - la page de réponse au pouls suit la même règle, voir §5).

## 1. Mise en page de la page de réponse : variante A, tout sur un écran

Trois variantes comparées (prototype, route `/prototype/pouls-reponse?variant=`) :

- **A - Tout sur un écran** : les N questions de l'envoi empilées verticalement dans une seule
  carte, quatre choix chacune (A/B/C/D, même code couleur/lettre que le vote de séance animée -
  `LETTRES_OPTIONS`), un bouton Valider unique en pied de page.
- **B - Une question à la fois** : navigation pas-à-pas avec Précédent/Suivant. Écartée - le PRD
  §8.5 (« page de réponse épurée [...] quelques secondes ») pousse vers un geste unique, pas un
  parcours multi-écrans.
- **C - Grille compacte** : deux colonnes, options réduites à des pastilles A/B/C/D sans le
  libellé visible. Écartée - le libellé de chaque option doit rester lisible sans interaction
  supplémentaire (survol), une page de pouls n'a pas vocation à optimiser la densité au prix de la
  lisibilité.

**Retenu : A.** Le bouton Valider reste désactivé tant que les N questions n'ont pas de réponse -
cohérent avec PRD §8.5 (« Une seule soumission, indivisible ») : pas de soumission partielle,
« indivisible » couvre aussi bien la transaction d'écriture (déjà acquis, ADR-0001) que la
condition d'activation du bouton.

## 2. Ton : tutoiement, par exception au reste de l'application

Le reste de l'application vouvoie (`home.html`, `definir-mot-de-passe-page.html`,
`mot-de-passe-oublie-page.html`). **La communication du pouls (email + page de réponse) tutoie
délibérément** - voix plus proche et engageante pour un dispositif récurrent dont le critère de
succès n°1 (PRD §11) est le taux de réponse dans la durée. **Ce n'est pas une incohérence à
corriger** : un futur lecteur qui harmoniserait vers le vouvoiement défera ce choix.

## 3. Gabarit email

Nouvelle clé de Template (mécanisme `docs/design/contenu-emails-gabarits.md`), proposée :
`pouls.sollicitation` - non ajoutée à `CleTemplateEmail` par cette carte, qui ne tranche que le
contenu, pas l'implémentation.

```
---
sujet: "{{prenom}}, {{nombreQuestionsAccorde}} sur ton équipe {{equipeNom}}"
---
Salut {{prenom}},

Ton équipe {{equipeNom}} est sollicitée pour le pouls agile. Tu as {{nombreQuestionsAccorde}} à
répondre, ça prend une minute.

[{{lien}}]({{lien}})

Tes réponses sont anonymes : personne ne peut savoir ce que tu as répondu.

Ce lien est valable jusqu'au {{dateExpiration}} et ne peut être utilisé qu'une fois.
```

Variables : `prenom`, `equipeNom`, `nombreQuestionsAccorde`, `lien`, `dateExpiration`. Aucune ne révèle
le contenu d'une Question ni un résultat - cohérent avec l'anonymat (§5).

**`nombreQuestionsAccorde`, pas `nombreQuestions` : accord singulier/pluriel calculé côté appelant.** Le
moteur de rendu du Template substitue littéralement `{{cle}}` (`docs/design/contenu-emails-gabarits.md`,
§3) - aucune condition ni pluriel possible dans le gabarit lui-même. Passer un compte brut aurait
produit « 1 questions » quand l'envoi ne porte qu'une question. La variable porte donc directement
la chaîne déjà accordée (`"1 question"` / `"3 questions"`), calculée par l'appelant avant `rendre()`
- même logique que le prototype (`nombreQuestionsAccorde` computed, `prototype-pouls-reponse-page.ts`).

## 4. Les trois états d'échec et l'écran de remerciement

Formulations retenues (tutoiement, aucune ne nomme l'Équipe ni la Question) :

| État | Message | Détail |
|---|---|---|
| Jeton inconnu | Ce lien n'est pas valide. | Vérifie que tu as copié l'intégralité du lien reçu par email. |
| Jeton expiré | Ce lien a expiré. | Une nouvelle sollicitation te parviendra à la prochaine échéance. |
| Déjà honorée | Tu as déjà répondu à cette sollicitation. | Ta réponse est enregistrée - elle n'est pas modifiable. |
| Remerciement | Merci ! | Ta réponse a été enregistrée. |

Le cas « déjà honorée » nomme explicitement « enregistrée » et « pas modifiable » pour ne pas se
lire comme un bug (PRD §5, ADR-0001).

**Lien de l'écran de remerciement.** « Se connecter pour voir les résultats de ton équipe » pointe
vers `/connexion`, générique - la page de réponse ne sait jamais qui porte le Jeton (elle ne le
saurait qu'en le résolvant vers la Sollicitation, ce qu'elle ne fait pas pour construire ce lien).
C'est l'application, une fois l'utilisateur connecté avec son propre compte Membre, qui sait à
quelle Équipe il appartient. Aucune tension avec l'anonymat : ce lien ne relie jamais le Jeton de
Sollicitation à un compte.

## 5. Throttling : pas de risque à traiter

`ThrottlerGuard` global (`app.module.ts:57-58`) : 100 requêtes/minute par IP, sans exonération pour
la page de réponse - cohérent avec ADR-0012, qui n'exonère que les trois routes de lecture live de
la séance animée, pas les routes à effet métier. Une réponse au pouls produit 1-2 requêtes par
Membre (chargement de la page + soumission). Une Équipe entière derrière la même IP (NAT
d'entreprise) répondant dans la même minute resterait très en dessous de la limite tant que
l'effectif reste de l'ordre de la dizaine - taille d'équipe cohérente avec le produit. Aucune
action nécessaire.
