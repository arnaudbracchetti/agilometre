---
status: accepted
---

# Organisation : trois agrégats séparés (Entité, Équipe, Utilisateur), pas un seul imbriqué

Design complet : [docs/design/agregat-organisation.md](../design/agregat-organisation.md).

Premier réflexe en session `/ddd` : un seul agrégat `Entité` imbriquant `Équipe` puis `Membre`,
avec en particulier la garde "pas de suppression d'Entité si des Équipes existent" comme preuve
que Entité devait posséder ses Équipes. En creusant l'échelle réelle (potentiellement des dizaines
d'Équipes et des centaines de Membres par Entité), cet agrégat unique serait devenu un
agrégat-dieu : toute écriture sur une Équipe aurait chargé/verrouillé l'Entité entière, créant des
conflits entre Équipes sans rapport et un chargement lourd à chaque opération.

**Décision** : trois agrégats racines indépendants, référencés par id (pas d'imbrication) :

- **Entité** — ne possède pas la liste de ses Équipes. La garde de suppression est vérifiée par un
  use case (`ÉquipeRepository.compterParEntite`), pas par une méthode de domaine sur Entité.
- **Équipe** — possède **Membre** comme entité enfant (cascade à la suppression) : c'est la seule
  relation parent/enfant réelle du domaine (une Équipe supprimée n'a pas de sens sans nettoyer
  son roster).
- **Utilisateur** — porte un Rôle unique et une liste d'Habilitations (Équipes pour Manager,
  Entités pour Direction, aucune pour Coach - accès transversal).

**Conséquence.** Toute opération de coordination entre agrégats (garde de suppression d'Entité,
nettoyage des Habilitations orphelines - voir [ADR 0006](0006-organisation-nettoyage-habilitations-meme-transaction.md))
vit dans un use case, jamais dans une méthode de domaine d'un des trois agrégats.
