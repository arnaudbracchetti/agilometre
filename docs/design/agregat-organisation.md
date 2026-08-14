# Agrégats Organisation

Design issu de la session `/ddd` + `/grill-with-docs` sur la carte
[#6](https://github.com/arnaudbracchetti/agilometre/issues/6). Vocabulaire : voir `CONTEXT.md`,
section Organisation.

## Contexte

Le glossaire initial (`CONTEXT.md`) définissait Membre comme "une personne dotée d'un compte,
porteuse d'un Rôle" — un seul concept. En creusant en session `/ddd`, ça s'est révélé faux à deux
titres :

1. Un Membre d'équipe n'a pas besoin de compte pour répondre à une Session ou un Pouls (mécanisme
   déjà existant : Code de session, Jeton) - les Réponses ne référencent jamais le Membre
   (anonymat, voir section Réponses & anonymat de CONTEXT.md).
2. Le Rôle (Coach / Membre d'équipe / Manager d'équipe / Direction) est en réalité porté par un
   compte de connexion distinct (**Utilisateur**), que Membre référence optionnellement - pas par
   Membre lui-même. Coach et Manager/Direction ont des portées d'accès différentes (transversale,
   ou une/plusieurs Équipes/Entités) qui n'ont rien à voir avec la composition d'une équipe.

Ça donne trois agrégats plutôt qu'un seul concept "Membre".

## 1. Structure des agrégats

Trois agrégats racines, indépendants, référencés entre eux par id (pas d'imbrication à 3 niveaux) :

- **`Entité`** (racine) : id, `nom`. Ne possède pas la liste de ses Équipes - simple référence
  inverse (`Équipe.entiteId`). Délibérément gardée petite : avec potentiellement des dizaines
  d'Équipes et des centaines de Membres par Entité, l'imbriquer aurait fait de `Entité` un
  agrégat-dieu (contention d'écriture entre Équipes sans rapport, chargement lourd à chaque
  opération) - voir `theory/aggregate-design.md` du skill `/ddd`, anti-pattern 8.
- **`Équipe`** (racine) : id, `nom`, `entiteId`. Possède **`Membre`** comme entité enfant (chargée/
  sauvegardée avec elle, supprimée en cascade avec elle) : id, `utilisateurId: string | null` -
  quand renseigné, référence toujours un Utilisateur `Rôle=MEMBRE` (invariant cross-agrégat, voir
  section 2). Voir [ADR 0007](../adr/0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md) sur
  pourquoi ce champ existe dès maintenant alors que le PRD v1 ne prévoit pas de compte pour ce rôle.
- **`Utilisateur`** (racine) : id, identifiants de connexion, `Rôle` (Value Object, une des 4
  valeurs `COACH` / `MEMBRE` / `MANAGER` / `DIRECTION`), liste d'**`Habilitation`** (entité enfant) :
  `équipeId: string | null`, `entiteId: string | null` (exactement un des deux selon le Rôle - voir
  invariants).

## 2. Invariants

| Invariant | Portée |
|---|---|
| Deux Entités ne peuvent pas porter le même nom (comparaison insensible à la casse) | Use cases `CreerEntite`/`RenommerEntite`, via `EntiteRepository.trouverParNom(nom)` - **pas** une méthode de domaine sur `Entité`, qui ne connaît pas les autres instances (règle de coordination, cf. `/ddd`) ; filet de sécurité en base via un index unique fonctionnel sur `LOWER(nom)` |
| Une Habilitation est cohérente avec le Rôle : `équipeId` seul si `MANAGER`, `entiteId` seul si `DIRECTION`, aucune Habilitation si `COACH` | `Utilisateur.ajouterHabilitation()` |
| Pas de doublon d'Habilitation (même Équipe/Entité deux fois) | `Utilisateur.ajouterHabilitation()` |
| Un Membre référence au plus un Utilisateur | Structurel (`utilisateurId` singulier, pas une liste) |
| Un Utilisateur ne peut pas être Membre deux fois de la même Équipe | `Équipe.ajouterMembre()`, vérifie les Membres enfants existants |
| Supprimer une Équipe supprime tous ses Membres (cascade) | `Équipe.supprimer()` - Membre n'a pas de sens hors de son Équipe |
| Une Entité ne peut être supprimée si des Équipes lui sont rattachées | Use case `SupprimerEntite`, via `ÉquipeRepository.compterParEntite(entiteId)` - **pas** une méthode de domaine sur `Entité`, qui ne possède pas la liste de ses Équipes |
| Un Membre ne référence qu'un Utilisateur `Rôle=MEMBRE` | Use case (`ajouterMembre`/`lierUtilisateur`), lecture du Rôle via `UtilisateurRepository` avant d'écrire sur l'agrégat `Équipe` - cross-agrégat, voir [ADR 0005](../adr/0005-organisation-trois-agregats-separes.md) |
| Changer le Rôle d'un Utilisateur est rejeté si ses Habilitations existantes deviennent incohérentes avec le nouveau Rôle | `Utilisateur.changerRole()` - pas de vidage silencieux, l'opérateur doit retirer les Habilitations explicitement d'abord |
| La suppression d'une Équipe/Entité nettoie les Habilitations orphelines qui la référencent | Use case `SupprimerEquipe`/`SupprimerEntite`, même transaction - voir [ADR 0006](../adr/0006-organisation-nettoyage-habilitations-meme-transaction.md) |

## 3. Opérations

| Opération | Commande/Requête | Use case ou méthode de domaine | Racine ou enfant |
|---|---|---|---|
| Créer une Entité | Commande | Méthode de domaine | Racine (`Entité`) |
| Renommer une Entité | Commande | Méthode de domaine | Racine (`Entité`) |
| Supprimer une Entité | Commande | Use case (garde via `ÉquipeRepository.compterParEntite`, puis nettoyage des Habilitations `entiteId` orphelines) | — |
| Créer une Équipe (rattachée à une Entité) | Commande | Méthode de domaine | Racine (`Équipe`) |
| Renommer une Équipe | Commande | Méthode de domaine | Racine (`Équipe`) |
| Supprimer une Équipe (cascade Membres) | Commande | Use case (suppression + nettoyage des Habilitations `équipeId` orphelines) | Racine (`Équipe`) |
| Ajouter un Membre à une Équipe (avec ou sans Utilisateur) | Commande | Use case + `équipe.ajouterMembre(utilisateurId?)` - vérifie `Rôle=MEMBRE` si un Utilisateur est fourni | Enfant (`Membre`), délégué par la racine |
| Retirer un Membre d'une Équipe | Commande | `équipe.retirerMembre(id)` | Enfant (`Membre`), délégué par la racine |
| Lier un Utilisateur existant à un Membre | Commande | Use case + `membre.lierUtilisateur(utilisateurId)` - vérifie `Rôle=MEMBRE` | Enfant (`Membre`) |
| Délier l'Utilisateur d'un Membre | Commande | `membre.delierUtilisateur()` | Enfant (`Membre`) |
| Créer un Utilisateur avec un Rôle | Commande | Méthode de domaine | Racine (`Utilisateur`) |
| Changer le Rôle d'un Utilisateur | Commande | `utilisateur.changerRole(role)` - rejette si des Habilitations existantes deviennent incohérentes | Racine (`Utilisateur`) |
| Ajouter une Habilitation | Commande | `utilisateur.ajouterHabilitation(...)` | Racine (`Utilisateur`) |
| Retirer une Habilitation | Commande | `utilisateur.retirerHabilitation(id)` | Racine (`Utilisateur`) |
| Lister les Équipes d'une Entité | Requête directe (DTO) | — | — |
| Lister les Membres d'une Équipe | Requête directe (DTO) | — | — |
| Lister les Utilisateurs et leurs Habilitations | Requête directe (DTO) | — | — |

## 4. Interface de repository

```
interface EntiteRepository {
  findById(id: string): Entite | null
  findAll(): Entite[]              // liste des Entités (écran Organisation, carte #20)
  trouverParNom(nom: string): Entite | null  // insensible à la casse - garde d'unicité (Créer/Renommer)
  save(entite: Entite): void
  remove(id: string): void        // appelé uniquement par le use case SupprimerEntite
}

interface EquipeRepository {
  findById(id: string): Equipe | null      // agrégat complet, avec ses Membres
  save(equipe: Equipe): void
  remove(id: string): void
  compterParEntite(entiteId: string): number  // pour la garde de suppression d'Entité
}

interface UtilisateurRepository {
  findById(id: string): Utilisateur | null  // agrégat complet, avec ses Habilitations
  save(utilisateur: Utilisateur): void
  trouverParHabilitation(cible: { equipeId: string } | { entiteId: string }): Utilisateur[]
  // pour le nettoyage des Habilitations orphelines lors de SupprimerEquipe/SupprimerEntite (ADR 0006)
}
```

Pas de `findByUtilisateurId` sur `EquipeRepository` pour l'instant (YAGNI) : le besoin pressenti
("un Utilisateur Membre d'équipe consulte les résultats de ses Équipes") sera servi par une
requête directe (read model), pas par le chargement d'agrégats `Équipe` complets - à réexaminer
si cette fonctionnalité se construit et qu'un besoin différent apparaît.

## 5. Inversion de dépendance

Le domaine (`Entité`, `Équipe`, `Membre`, `Utilisateur`, `Habilitation`, `Rôle`) ne dépend d'aucun
framework ni de Prisma. Les trois interfaces de repository sont définies dans le domaine
(`apps/backend/src/organisation/domain/`), implémentées dans
`apps/backend/src/organisation/infrastructure/` avec Prisma.

## Notes et améliorations différées

- **`enum Role` dans `apps/backend/prisma/schema.prisma`** ne portait que `COACH`/`MANAGER`/
  `DIRECTION` (bug signalé sur la carte #1 et l'Epic #6) - corrigé pour porter les 4 valeurs,
  alignées sur `packages/shared/src/roles.ts`.
- **Recherche "mes Équipes" pour un Utilisateur Membre d'équipe** : décision explicitement
  reportée (voir section 4) - pas de méthode de repository dédiée tant que la fonctionnalité de
  consultation des résultats n'est pas construite (voir aussi [ADR 0007](../adr/0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md)
  sur l'écart avec le périmètre PRD v1).
- **Suppression/désactivation d'un Utilisateur** : hors périmètre de l'Epic #6, différée à une
  itération future - le comportement sur `Membre.utilisateurId` (mise à null, blocage, ou autre)
  reste à trancher à ce moment-là.
