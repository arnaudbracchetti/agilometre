---
status: accepted
---

# Restitutions périodiques : deux branches d'origine composées au niveau du use case, jamais une requête unifiée

Une fois le Pouls entré dans les Périodes de calcul (ADR-0014, addendum), une restitution périodique
doit lire des Réponses de deux origines. Or chacune appartient à une Période selon une règle qui lui
est propre : une Réponse de Session par la **date de sa Session** et seulement si cette Session est
close (plus la règle du dernier Tour clos, ADR-0018), une Réponse de Pouls par son **horodatage**
(ADR-0029). La tentation est de fondre les deux en une requête unique sur les Réponses, puisque
l'ADR-0002 les stocke dans un modèle unifié.

**Décision.** Les deux branches restent séparées jusqu'au use case de restitution, qui les compose.
La branche Session est la source existante portée par `session/`, la branche Pouls une requête
directe portée par `reponse/` ; l'assemblage vit dans les use cases `obtenir-profil-equipe` et
`obtenir-profil-entite` (pas de module `restitution/` tant qu'il n'y a que deux origines). La garde
qui autorise le calcul de l'Évolution suit la même forme : la requête existante sur les Sessions
closes est **conservée telle quelle** et **complétée** d'une requête équivalente sur les Réponses de
Pouls, les deux combinées par un `||`.

**Alternative écartée.** Une requête unique sur les Réponses, jugeant les deux origines sur le seul
horodatage, est plus courte mais fait diverger la garde de la source qu'elle garde. Cas concret et
atteignable : une Session datée de juin, **encore ouverte**, porte des Réponses horodatées en juin ;
la requête unifiée répondrait « il existe une Période précédente » là où la source, qui exclut les
Sessions non closes, ne trouvera rien. Une règle unique appliquée à deux origines qui n'en ont pas
n'est pas une simplification, c'est une incohérence en attente. C'est aussi la raison pour laquelle
cet ADR existe : le `||` a l'air d'un doublon qu'un lecteur pressé voudra fusionner.

**Conséquence : le compte par origine est pris avant la fusion.** Les restitutions affichent la
**Composition** de l'effectif (part Session, part Pouls), ce qui exigerait sinon soit d'enrichir le
port du scoring d'un champ `origine` (l'ADR-0018 le veut explicitement ignorant de l'origine), soit
de rejouer ailleurs la règle du dernier Tour clos au risque de surcompter. Comme le use case tient
les deux listes séparées, il compte d'abord, fond ensuite, et passe au scoring une liste dont
l'origine a disparu. Le compte est donc juste par construction, puisqu'il porte sur la sélection
même qui alimente le Palier.

Cela ne contredit pas l'ADR-0014, qui dit que les deux origines « se mélangent sans distinction
d'origine » : elles se mélangent dans le **calcul**, et restent distinguées dans le **compte**. Un
Coach qui lit une baisse a besoin de savoir si elle vient d'une séance tendue ou d'un pouls à trois
répondants ; aucun Palier, aucune Moyenne ni aucune Dispersion n'est pour autant calculé par origine.
