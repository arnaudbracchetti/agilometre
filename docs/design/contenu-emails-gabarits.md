# Contenu des emails en fichiers markdown

Design issu de la carte `/wayfinder` [#63](https://github.com/arnaudbracchetti/agilometre/issues/63)
(décisions : bibliothèques, convention de nommage/emplacement, portée de la validation fail-fast) +
session `/ddd`. Vocabulaire : voir `CONTEXT.md`, section Emails.

## Contexte

Aujourd'hui, `EmettreJetonCompte` (`apps/backend/src/organisation/application/emettre-jeton-compte.ts`)
code en dur le même sujet/texte pour deux flux distincts — `CreerUtilisateur` (invitation) et
`DemanderReinitialisation` (mot de passe oublié) — partagés littéralement, pas seulement dans leur
comportement. `MailSender.envoyer` (`apps/backend/src/mail/mail-sender.ts`) prend un
`{ destinataire, sujet, texte }` en clair. Objectif : rendre le contenu de chaque email pilotable
par un fichier markdown versionné, sans autre modification du code pour ajouter un nouveau type
d'email qu'un nouvel appel + un nouveau fichier.

## 1. Nature du concept : Value Object, pas un agrégat

`Template` (email) n'a pas de cycle de vie applicatif : aucune route ne le crée/modifie/supprime,
seul un déploiement le fait (fichier versionné, embarqué dans l'image Docker). Il n'a pas d'état
qui évolue dans le temps au sein de l'application. C'est donc un **Value Object** avec une factory
validante (`Template.depuisContenuBrut`, à l'image de `Niveau.creer`/`Question.creer`), résolu par
une **lecture** (pas de `save()`/`remove()`), pas un agrégat à part entière.

## 2. Invariants

| Invariant | Portée |
|---|---|
| Le frontmatter du fichier doit être parsable (gray-matter) | `Template.depuisContenuBrut` |
| Le frontmatter doit porter un champ `sujet` non vide | `Template.depuisContenuBrut` |
| Le corps markdown doit être parsable (markdown-it) | `Template.depuisContenuBrut` |
| Aucune vérification que les variables fournies à `rendre()` correspondent aux placeholders du gabarit (déjà tranché en #65) | `Template.rendre` — un placeholder `{{x}}` sans variable fournie reste littéral dans le rendu, jamais remplacé par une chaîne vide ni une exception |
| Toutes les clés de `CleTemplateEmail` doivent résoudre un Template valide au démarrage, sinon le bootstrap échoue (agrégation de toutes les erreurs, déjà tranché en #65) | Validateur `OnModuleInit` dans `mail/infrastructure/` |

## 3. Opérations

| Opération | Commande/requête | Où |
|---|---|---|
| Résoudre + valider un Template par clé | Lecture | `TemplateRepository.trouverParCle(cle)` → `Result<Template, ErreurTemplate>` |
| Rendre un Template avec des variables | Calcul pur | `Template.rendre(variables)` → `EmailRendu { sujet, html, texte }` |
| Envoyer un email | Commande (effet de bord externe) | `MailSender.envoyer(cle, destinataire, variables)` |
| Valider tous les gabarits attendus au démarrage | Lecture en boucle, bootstrap | `OnModuleInit` dans `mail/infrastructure/`, itère `CleTemplateEmail` |

Le rendu applique la substitution `{{cle}}` **au sujet et au corps** (cohérence, coût nul), puis le
rendu markdown → HTML (markdown-it), puis le repli texte brut auto-dérivé du HTML déjà rendu
(html-to-text) — une seule source de vérité pour le texte brut.

## 4. Interface de repository

```ts
interface TemplateRepository {
  trouverParCle(cle: CleTemplateEmail): Promise<Result<Template, ErreurTemplate>>;
}
```

Pas de `save()`/`remove()` — cohérent avec la décision « Value Object + lecture » (section 1). Seule
la lecture du fichier (`fs.readFile`) est infrastructure ; le parsing (gray-matter) et la validation
vivent dans `Template.depuisContenuBrut`, pur, testable sans mock ni fichier réel.

`MailSender` (existant, signature mise à jour) :

```ts
interface MailSender {
  envoyer(cle: CleTemplateEmail, destinataire: string, variables: Record<string, string>): Promise<void>;
}
```

`CleTemplateEmail` : type union de littéraux (ex: `'compte.invitation' | 'compte.mot-de-passe-oublie'`),
la liste maintenue à la main déjà actée en #65 — une clé mal orthographiée est une erreur de
compilation, jamais un incident à l'exécution. L'ancien type `MessageEmail` (`{ destinataire, sujet,
texte }`) disparaît de l'API publique de `MailSender`, remplacé par `EmailRendu` en usage interne
entre `Template.rendre()` et l'implémentation d'envoi.

Si `trouverParCle` échoue au moment d'un envoi (après un bootstrap qui a pourtant validé toutes les
clés attendues), c'est un bug de programmation, pas un cas métier : l'implémentation de `MailSender`
lève dans ce cas, capturé par le `try/catch` déjà présent autour de l'envoi dans
`EmettreJetonCompte` (qui ne fait jamais échouer la création de compte / la demande de
réinitialisation pour un souci d'email).

## 5. Inversion de dépendance

Le domaine (`Template`, `EmailRendu`, `ErreurTemplate`, `CleTemplateEmail`, les interfaces
`TemplateRepository`/`MailSender`) ne dépend d'aucun framework ni de Prisma — `apps/backend/src/mail/domain/`.
Implémentations dans `apps/backend/src/mail/infrastructure/` :

```
apps/backend/src/mail/
  domain/
    template.ts                    Template (VO) + Template.depuisContenuBrut() + ErreurTemplate
    template.repository.ts         interface TemplateRepository
    mail-sender.ts                 interface MailSender
    cles-templates-email.ts        type CleTemplateEmail + liste des clés attendues (#65)
  infrastructure/
    filesystem-template.repository.ts   implémente TemplateRepository (fs + gray-matter)
    nodemailer-mail-sender.ts           implémente MailSender (résout, rend, envoie via nodemailer)
    valider-templates-email.ts          OnModuleInit — valide toutes les clés attendues au boot
  templates/
    compte.invitation.md
    compte.mot-de-passe-oublie.md
  mail.module.ts
```

## Décision écartée : porter l'orchestration sur l'agrégat `Utilisateur`

Discuté en session `/ddd` : plutôt que deux méthodes sur `EmettreJetonCompte`, porter directement
`inviter()`/`demanderReinitialisationMotDePasse()` sur l'agrégat `Utilisateur`, avec `MailSender` et
la gestion du Jeton injectés dans son constructeur. Écarté : `Utilisateur.reconstituer(...)` est
appelé par le repository Prisma à **chaque** hydratation, y compris pour des opérations sans rapport
avec l'email (lister des comptes, vérifier une habilitation, changer un rôle) — injecter ces
dépendances dans le constructeur aurait forcé le repository Prisma à les fournir à chaque
chargement, et tout test construisant un `Utilisateur` (nombreux, sans rapport avec l'email) à
fournir des mocks. Aucun agrégat du repo n'a aujourd'hui de dépendance injectée de ce type
(`Utilisateur.creer`/`.modifierProfil`/`.definirMotDePasse` sont 100 % purs) — cohérent avec la règle
transversale du skill `/ddd` : « un domaine sans framework se teste trivialement, sans mock ».

Retenu à la place : `Utilisateur` reste pur. Les interfaces (`MailSender`, `JetonCompteRepository`)
restent injectées dans la couche application (`organisation/application/` — déjà « le monde
Utilisateur », pas une classe détachée), et `EmettreJetonCompte` porte deux méthodes nommées :

```ts
emettrePourInvitation(utilisateur: Utilisateur): Promise<void>       // clé compte.invitation
emettrePourReinitialisation(utilisateur: Utilisateur): Promise<void> // clé compte.mot-de-passe-oublie
```

Chacune fixe en interne sa `CleTemplateEmail` — `CreerUtilisateur` et `DemanderReinitialisation`
appellent la méthode qui correspond à leur intention, aucune chaîne de caractères à passer.

## Hors périmètre de cette conception

- Rédaction du contenu markdown des deux gabarits (`compte.invitation.md`,
  `compte.mot-de-passe-oublie.md`) — question de contenu, pas de conception. Même texte initial que
  le contenu codé en dur aujourd'hui.
- Intégration du futur email de pouls dans ce mécanisme, en respectant l'anonymat (PRD §5) — à
  traiter quand le module `pouls` sera conçu (déjà noté en fog sur la carte #63).
