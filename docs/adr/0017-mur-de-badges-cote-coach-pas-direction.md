---
status: accepted
---

# Mur de badges comparatif : vue Coach, pas vue Direction - divergence assumée du PRD §9

Le PRD §9 accorde à la Direction "Paliers par thème agrégés au niveau entité, **mur de badges des
équipes**" - donc le détail par Équipe côte à côte. Le grilling a fait ressortir un besoin produit
plus restrictif : au niveau Entité, seule compte la synthèse (badges agrégés + tendance de
l'Entité), jamais le détail par Équipe.

**Décision.** L'écran Entité s'en tient à ses propres badges par Thème et sa tendance, sans détail
par Équipe. La comparaison inter-Équipes (le Mur de badges au sens propre) devient une vue **Coach**
- que le PRD §9 lui accorde déjà explicitement ("comparaison entre ses équipes"). Le besoin du PRD
est ainsi servi sans donner à la Direction un niveau de détail par Équipe qu'elle ne doit pas avoir.

**Explicitement écarté.** Ce n'est pas un sujet de droits d'accès (l'Epic #10 sort sans matrice de
rôle, différée à l'Epic #11) mais un choix produit sur ce que chaque écran montre.
