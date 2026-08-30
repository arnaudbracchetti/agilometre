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
- **`Équipe`** (racine) : id, `nom` (unique dans toute l'Organisation, insensible à la casse - même
  règle que le nom d'Entité), `entiteId`. Possède **`Membre`** comme entité enfant (chargée/
  sauvegardée avec elle, supprimée en cascade avec elle) : id, `nom`, `prénom: string | null`,
  `email` (`nom` et `email` obligatoires - une personne recensée dans un roster doit être
  identifiable à l'écran même sans compte de connexion associé ; `prénom` reste `null` tant qu'aucun
  compte n'est lié), `utilisateurId: string | null` - quand renseigné, référence toujours un
  Utilisateur `Rôle=MEMBRE` (invariant cross-agrégat, voir section 2). Voir
  [ADR 0007](../adr/0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md) sur pourquoi ce champ
  existe dès maintenant, et son suivi [ADR 0021](../adr/0021-comptes-membre-equipe-en-perimetre-suivi-adr-0007.md)
  qui referme l'écart au PRD v1 : le Rôle Membre d'équipe est désormais en périmètre. Une fois lié,
  `nom`/`prénom`/`email` sont **reportés depuis l'Utilisateur** (propagation descendante, pas une
  simple éclipse à l'affichage : voir [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md))
  et le `Membre` devient **lecture seule** sur ces trois champs - on ne les modifie plus qu'en
  modifiant le compte.
- **`Utilisateur`** (racine) : id, `email` (identifiant de connexion, unique sur toute l'instance,
  insensible à la casse), `prénom`, `nom`, hash du mot de passe, `actif: boolean`, `Rôle` (Value
  Object, une des 4 valeurs `COACH` / `MEMBRE` / `MANAGER` / `DIRECTION`), liste
  d'**`Habilitation`** (entité enfant) : `équipeId: string | null`, `entiteId: string | null`
  (exactement un des deux selon le Rôle - voir invariants). Livré dans cette itération pour
  `COACH`, `DIRECTION` et `MEMBRE` ; `MANAGER` reste une valeur de l'enum sans compte créable, voir
  [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md).

## 2. Invariants

| Invariant | Portée |
|---|---|
| Deux Entités ne peuvent pas porter le même nom (comparaison insensible à la casse) | Use cases `CreerEntite`/`RenommerEntite`, via `EntiteRepository.trouverParNom(nom)` - **pas** une méthode de domaine sur `Entité`, qui ne connaît pas les autres instances (règle de coordination, cf. `/ddd`) ; filet de sécurité en base via un index unique fonctionnel sur `LOWER(nom)` |
| Deux Équipes ne peuvent pas porter le même nom, même règle et même portée globale que pour Entité (pas scopée à une Entité) | Use cases `CreerEquipe`/`RenommerEquipe`, via `EquipeRepository.trouverParNom(nom)` ; filet de sécurité en base via un index unique fonctionnel sur `LOWER(nom)` |
| `Membre.nom` et `Membre.email` sont obligatoires ; deux Membres d'une même Équipe ne peuvent pas partager le même email (comparaison insensible à la casse) | `Équipe.ajouterMembre()` - invariant purement local à l'agrégat, l'Équipe porte déjà tout son roster |
| Une Habilitation est cohérente avec le Rôle : `entiteId` seul si `DIRECTION`, aucune Habilitation si `COACH` **ni si `MEMBRE`** (portée dérivée du roster, jamais d'Habilitation - les deux mécanismes divergeraient), `équipeId` seul si `MANAGER` (invariant porté, Rôle non exploité cette itération) | `Utilisateur.ajouterHabilitation()` |
| Pas de doublon d'Habilitation (même Équipe/Entité deux fois) | `Utilisateur.ajouterHabilitation()` |
| Un Membre référence au plus un Utilisateur | Structurel (`utilisateurId` singulier, pas une liste) |
| Un Utilisateur ne peut pas être Membre deux fois de la même Équipe | `Équipe.ajouterMembre()`, vérifie les Membres enfants existants |
| Supprimer une Équipe supprime tous ses Membres (cascade) | `Équipe.supprimer()` - Membre n'a pas de sens hors de son Équipe |
| Une Entité ne peut être supprimée si des Équipes lui sont rattachées | Use case `SupprimerEntite`, via `ÉquipeRepository.compterParEntite(entiteId)` - **pas** une méthode de domaine sur `Entité`, qui ne possède pas la liste de ses Équipes |
| Un Membre ne référence qu'un Utilisateur `Rôle=MEMBRE` | Use case (`ajouterMembre`/`lierUtilisateur`), lecture du Rôle via `UtilisateurRepository` avant d'écrire sur l'agrégat `Équipe` - cross-agrégat, voir [ADR 0005](../adr/0005-organisation-trois-agregats-separes.md) |
| `Utilisateur.email` unique sur toute l'instance (comparaison insensible à la casse) | Use cases `CreerUtilisateur`/`ModifierUtilisateur`, via `UtilisateurRepository.trouverParEmail(email)` ; filet de sécurité en base via un index unique fonctionnel sur `LOWER(email)` |
| Modifier prénom/nom/email d'un Utilisateur les **propage** vers chaque `Membre` qui le référence, dans toutes les Équipes concernées, dans la même transaction ; rejetée **en bloc** si elle créerait un doublon d'email dans l'un des rosters | Use case `ModifierUtilisateur`, cross-agrégat comme le nettoyage d'[ADR 0006](../adr/0006-organisation-nettoyage-habilitations-meme-transaction.md) - voir [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md) |
| Un `Membre` lié à un `Utilisateur` est en lecture seule sur `nom`/`prénom`/`email` | Use case (refuse toute modification directe tant que `utilisateurId` est renseigné) |
| Créer un `Utilisateur`, ou ajouter un `Membre` à un roster, déclenche un rattachement automatique par email (jamais rejoué ensuite - `utilisateurId` fait foi une fois posé) | Use cases `CreerUtilisateur`/`AjouterMembre`, via `UtilisateurRepository.trouverParEmail`/`EquipeRepository` |
| Un `Utilisateur` désactivé (`actif=false`) ne peut pas se connecter, mais reste consultable et son lien `Membre.utilisateurId` n'est pas affecté | Use cases `DesactiverUtilisateur`/`ReactiverUtilisateur` ; vérifié à l'authentification, pas au niveau de l'agrégat Organisation |
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
| Ajouter un Membre à une Équipe (nom, email obligatoires) | Commande | Use case + `équipe.ajouterMembre(id, nom, email)` - rejette un email déjà présent dans le roster de cette Équipe, déclenche le rattachement automatique par email (#62) | Enfant (`Membre`), délégué par la racine |
| Retirer un Membre d'une Équipe | Commande | `équipe.retirerMembre(id)` | Enfant (`Membre`), délégué par la racine |
| Lier un Utilisateur existant à un Membre | Commande | Use case + `membre.lierUtilisateur(utilisateurId)` - vérifie `Rôle=MEMBRE`, applique la propagation descendante (#62) | Enfant (`Membre`) |
| Délier l'Utilisateur d'un Membre | Commande | `membre.delierUtilisateur()` - rien à recopier, les valeurs sont déjà à jour par propagation | Enfant (`Membre`) |
| Créer un Utilisateur avec un Rôle | Commande | Méthode de domaine - refuse `MANAGER` (aucun compte créable avec ce Rôle cette itération) | Racine (`Utilisateur`) |
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
  findByEntiteId(entiteId: string): Equipe[]  // Équipes d'une Entité, agrégats complets
  trouverParNom(nom: string): Equipe | null   // insensible à la casse - garde d'unicité (Créer/Renommer)
  save(equipe: Equipe): void
  remove(id: string): void
  compterParEntite(entiteId: string): number  // pour la garde de suppression d'Entité
}

interface UtilisateurRepository {
  findById(id: string): Utilisateur | null  // agrégat complet, avec ses Habilitations
  save(utilisateur: Utilisateur): void
  trouverParEmail(email: string): Utilisateur | null
  // insensible à la casse - garde d'unicité (Créer/Modifier) et rattachement automatique par email
  trouverParHabilitation(cible: { equipeId: string } | { entiteId: string }): Utilisateur[]
  // pour le nettoyage des Habilitations orphelines lors de SupprimerEquipe/SupprimerEntite (ADR 0006)
}
```

Le besoin pressenti ("un Utilisateur Membre d'équipe consulte les résultats de ses Équipes"), différé
en YAGNI lors de la conception initiale, est désormais construit (voir
[gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md)). Il reste servi par une
**requête directe dédiée** ("mes Équipes"), **pas** par un `findByUtilisateurId` sur
`EquipeRepository` qui chargerait des agrégats `Équipe` complets : le besoin est une liste d'Équipes
et leur profil, pas la modification du roster.

## 5. Inversion de dépendance

Le domaine (`Entité`, `Équipe`, `Membre`, `Utilisateur`, `Habilitation`, `Rôle`) ne dépend d'aucun
framework ni de Prisma. Les trois interfaces de repository sont définies dans le domaine
(`apps/backend/src/organisation/domain/`), implémentées dans
`apps/backend/src/organisation/infrastructure/` avec Prisma.

## Notes et améliorations différées

- **`enum Role` dans `apps/backend/prisma/schema.prisma`** ne portait que `COACH`/`MANAGER`/
  `DIRECTION` (bug signalé sur la carte #1 et l'Epic #6) - corrigé pour porter les 4 valeurs,
  alignées sur `packages/shared/src/roles.ts`.
- **Recherche "mes Équipes" pour un Utilisateur Membre d'équipe** : n'est plus différée (voir
  section 4) - requête directe dédiée, construite à même titre que les comptes Membre d'équipe
  ([ADR 0021](../adr/0021-comptes-membre-equipe-en-perimetre-suivi-adr-0007.md), suivi de
  [ADR 0007](../adr/0007-membre-utilisateur-optionnel-anticipe-sur-prd-v1.md)).
- **Désactivation d'un Utilisateur** : tranchée - réversible (`actif: boolean`), jamais de
  suppression définitive (auditabilité ; la suppression relève du RGPD et reste hors périmètre).
  `Membre.utilisateurId` n'est pas affecté par une désactivation : seule la connexion est bloquée,
  le lien au roster et la propagation descendante restent inchangés. Voir
  [gestion-des-droits.md](../../doc/spec/annexes/gestion-des-droits.md).
