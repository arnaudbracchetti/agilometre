---
status: accepted
---

# Membre référence un Utilisateur dès maintenant, en avance sur le périmètre PRD v1

Le PRD (§10) limite les "comptes locaux v1" à Coach, Manager et Direction - rien pour Membre
d'équipe, même pour consulter les résultats de son équipe. Le design de l'agrégat Organisation
(session `/ddd`, [docs/design/agregat-organisation.md](../design/agregat-organisation.md)) porte
pourtant `Membre.utilisateurId`, un lien optionnel vers un Utilisateur `Rôle=MEMBRE`.

**Décision** : garder ce champ dans le modèle dès cette itération, même si aucune fonctionnalité
de login/consultation pour le Rôle Membre n'est construite maintenant - seul le champ existe,
rien ne l'exploite encore côté produit. Alternative rejetée : retirer `Rôle=MEMBRE` du périmètre
actuel pour coller strictement au PRD v1, au prix d'une migration de schéma plus tard quand cette
fonctionnalité (déjà anticipée par le métier, voir échanges Epic #6) sera construite.

**Conséquence.** Le PRD lui-même n'est pas corrigé - cet ADR documente l'écart assumé entre le
modèle de données (qui anticipe le besoin) et le périmètre fonctionnel v1 (qui ne l'implémente
pas encore).
