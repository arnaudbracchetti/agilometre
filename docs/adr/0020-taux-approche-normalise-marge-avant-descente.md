---
status: accepted
---

# Taux d'approche normalisé par le Seuil de Palier, Marge avant descente comme second indicateur distinct

Le PRD §6 définissait le Taux d'approche comme *"part des réponses déjà situées à N+1 ou
au-dessus"*, rapportée à l'effectif total. Tel quel, cet indicateur plafonne toujours strictement
en dessous du Seuil de Palier : s'il l'atteignait, le Palier serait déjà passé à *N+1*. Un Coach
lisant "Taux d'approche : 55 %" sans connaître le Seuil de Palier (60 % par exemple) ne peut pas
savoir si c'est proche ou loin du palier suivant, et l'intuition portée par le nom même de
l'indicateur - "100 % = je passe au palier suivant" - est fausse telle que définie dans le PRD.

Deuxième lacune signalée en relecture : l'indicateur ne dit rien du sens inverse. Une Équipe peut
être sur le point de redescendre au Palier inférieur (le Palier n'étant validé qu'à la limite du
Seuil de Palier) sans que rien ne le rende visible.

**Décision.**

- **Taux d'approche** reste défini sur la même population que le PRD (part des Réponses au Niveau
  juste au-dessus du Palier), mais **normalisé par le Seuil de Palier** :
  `tauxApproche = part(≥ Palier+1) / seuilPalier`. Par construction, cette valeur reste dans
  `[0, 1[` tant que le Palier n'a pas changé, et atteint exactement 1 (100 %) au moment précis du
  franchissement - l'intuition "100 % = palier suivant" devient vraie mathématiquement, pas
  seulement approximativement. `null` quand le Palier est déjà au maximum (Niveau 4) : il n'existe
  pas de Niveau 5 à approcher.
- **Marge avant descente**, un second indicateur, nouveau et distinct :
  `margeAvantDescente = (part(≥ Palier) - seuilPalier) / (1 - seuilPalier)`. 0 % signifie que le
  Palier n'est validé qu'à la limite stricte du Seuil de Palier (une seule Réponse en moins et il
  tombe) ; 100 % qu'il est solidement validé (toute la population est au Palier courant ou
  au-dessus). Cas dégénéré : à Seuil de Palier = 100 %, cette part vaut toujours exactement 1 quand
  le Palier est validé (aucune marge n'est mathématiquement possible à ce seuil) - la Marge avant
  descente vaut alors 0 par convention, pour éviter une division par zéro plutôt que de la laisser
  indéfinie.
- Le Palier 1 n'a pas de Palier 0 en dessous : sa Marge avant descente vaut donc toujours 100 %
  (`part(≥1) = 1` par construction, PRD §6 - tout Niveau est ≥ 1).

**Alternative écartée : un indicateur composite unique, 0 % = descente / 100 % = montée.** Séduisant
à l'affichage, mais mathématiquement malhonnête : la frontière basse porte sur `part(≥ Palier)` et
la frontière haute sur `part(≥ Palier+1)` - deux populations de Réponses différentes, pas deux
points sur une même échelle continue. Les fusionner en un seul chiffre demanderait une formule
d'interpolation arbitraire, sans justification métier, qui masquerait ce que le chiffre mesure
réellement. Deux indicateurs séparés, chacun honnête sur sa propre population, ont été préférés.

**Conséquence.** `ResultatPalier` (`apps/backend/src/scoring/domain/scoring.ts`) porte désormais
`tauxApproche` (nullable, `null` au Palier 4) et `margeAvantDescente` (jamais `null`, toujours
défini dès qu'un Palier existe, y compris au Palier 1). L'exemple chiffré du PRD §6 est mis à jour
en conséquence.
