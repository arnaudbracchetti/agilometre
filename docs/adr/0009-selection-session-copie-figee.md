---
status: accepted
---

# Sélection de Session copiée depuis le Modèle, jamais référencée en direct

Au moment de créer une Session à partir d'un Modèle de session, deux options existaient :
garder un lien vivant vers le Modèle (toute modification ultérieure du Modèle se
répercuterait sur les Sessions qui le référencent), ou copier la Sélection dans la Session
au moment de sa création.

**Décision**: copie figée. La Session capture son propre instantané de la Sélection
(contenu et ordre des Questions) à sa création, sans lien vivant vers le Modèle d'origine.
Ça protège l'intégrité d'une séance déjà tenue ou en préparation contre une modification
ultérieure du Modèle, et ça permet de supprimer un Modèle à tout moment - même déjà utilisé
- sans jamais impacter une Session existante.

**Conséquence.** Un Modèle de session n'a donc aucune trace de retour vers les Sessions
qu'il a servi à créer ; sa suppression ne nécessite aucune vérification d'usage préalable.

**Addendum (conception de l'Epic #9, carte [#68](https://github.com/arnaudbracchetti/agilometre/issues/68)).**
Le même mécanisme s'étend à la Campagne de pouls : son Panel est une copie figée de la Sélection du
Modèle de collecte au moment de la création de la Campagne, sans lien vivant vers le Modèle
d'origine - supprimer le Modèle source n'a aucun effet sur les Campagnes qui en sont issues. Cette
décision n'amende rien au fond ; elle est reprise telle quelle, pas rediscutée. Voir
[ADR-0028](0028-modele-de-collecte-verrouille-panel-modifiable-en-place.md) pour la nuance propre au
Pouls : contrairement au Modèle, qui n'a jamais de lien retour, le Panel obtenu reste ensuite
modifiable en place tant que la Campagne n'est pas terminée - seule la copie initiale est figée.
