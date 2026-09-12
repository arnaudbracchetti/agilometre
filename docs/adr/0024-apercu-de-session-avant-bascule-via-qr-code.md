---
status: accepted
---

# Aperçu de Session en lecture seule avant une bascule automatique via QR code

Le scan d'un QR sur l'écran de projection déclenche une jointure **automatique** (pas de
confirmation quand aucun Jeton n'est encore actif — voir grilling du 2026-09-12). Mais quand un
Jeton est **déjà actif** sur une autre Session (device qui rescanne un QR différent pendant qu'il
participe encore ailleurs), une bascule silencieuse ferait perdre un vote en cours sans que le
participant l'ait décidé — et il n'a aucun moyen de reconnaître si la Session déjà active est la
bonne ou une vieille Session mal réinitialisée.

**Décision** : dans ce cas, une confirmation explicite est requise, appuyée sur un nouvel **Aperçu
de Session** — la résolution du Code en lecture seule (Équipe, date d'ouverture), sans émission de
Jeton ni écriture. Le participant voit Équipe + Ouverte le des deux Sessions (actuelle vs ciblée)
avant de confirmer.

**Raison.** Deux options étaient sur la table : (a) un aperçu séparé, purement en lecture, ou (b)
émettre le nouveau Jeton immédiatement et n'invalider l'ancien qu'à la confirmation, avec
invalidation explicite du nouveau si l'utilisateur renonce. (b) laisse deux Jetons vivants
simultanément pendant toute la fenêtre de décision, avec un Jeton orphelin à nettoyer si
l'utilisateur ferme la boîte de dialogue sans répondre. (a) n'écrit rien tant que rien n'est
confirmé — rien à nettoyer, rien à raisonner sur l'état intermédiaire. Même principe que l'Aperçu
d'import du Référentiel, appliqué ici à la résolution d'un Code plutôt qu'à un fichier d'import
(voir `CONTEXT.md`, terme **Aperçu de Session**).
