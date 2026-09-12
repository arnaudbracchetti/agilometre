# QR code sur l'écran de projection pour rejoindre une Session

Recherche menée pour évaluer l'ajout d'un QR code sur l'écran de projection
(`apps/frontend/src/app/sessions/projection-page/`), permettant à un participant de scanner avec
son smartphone au lieu de saisir le Code à la main. Chiffres (versions, licences, dates de
publication, dépendances) relevés le 2026-09-12 depuis le registre npm (`registry.npmjs.org`,
`api.npmjs.org/downloads`), l'API GitHub des dépôts amont et `bundlephobia.com` — pas de blog ou
d'article secondaire.

## Contexte et contrainte

Flux actuel de jointure (PRD, section "Session", lignes 85-89) :

1. Le Coach ouvre une Session. `apps/backend/src/session/infrastructure/crypto-generateur-de-code.ts`
   génère un **Code numérique à 4 chiffres** (`randomInt(1_000, 10_000)`, jamais de zéro en tête),
   unique parmi les Sessions `OUVERTE` (index partiel `Session_code_ouverte_key`).
2. Le Code s'affiche sur l'écran de projection (`ProjectionPage`), avec l'URL de jointure déjà
   calculée côté navigateur :
   `apps/frontend/src/app/sessions/projection-page/projection-page.ts` ligne 39-41 :
   ```ts
   protected readonly urlDeJointure = signal(
     typeof window !== 'undefined' ? `${window.location.origin}/vote` : '',
   );
   ```
3. Le participant ouvre cette URL (route `path: 'vote'` dans `apps/frontend/src/app/app.routes.ts`,
   composant `VotePage`), saisit le Code dans un champ texte, et `VotePage.rejoindre()`
   (`apps/frontend/src/app/participant/vote-page/vote-page.ts` ligne 76) appelle
   `ParticipantService.rejoindre(code, jetonPrecedent)` →
   `POST /api/participant/rejoindre { code, jetonPrecedent }`
   (`apps/backend/src/session/participant.controller.ts`), qui délivre un Jeton anonyme stocké en
   `localStorage` (`JetonParticipantStorage`) — aucun compte, aucun lien token/réponse persisté
   (PRD §5).

Contrainte de déploiement (PRD §10) : une instance par client, on-premise, **aucune dépendance
cloud obligatoire**, souvent derrière un proxy d'entreprise restrictif — c'est déjà la raison
documentée du choix du polling HTTP 2s plutôt que WebSockets. La même contrainte s'applique ici :
la génération du QR ne doit dépendre d'aucun appel réseau sortant à l'exécution.

Vérifications d'environnement faites avant de comparer les bibliothèques :

- **Pas de SSR** : `apps/frontend/src/main.ts` utilise `bootstrapApplication` pur (pas
  `@angular/ssr`), et `apps/frontend/angular.json` ne déclare qu'un builder
  `@angular/build:dev-server`/application — confirmé navigateur pur aujourd'hui. Une lib qui a
  besoin de `document`/`canvas` n'est donc pas un problème actuel, seulement un point à surveiller
  si le SSR était introduit plus tard.
- **Pas de CSP existante** : aucun `helmet`, aucun en-tête `Content-Security-Policy` n'est posé
  dans `apps/backend/src/main.ts` ni ailleurs dans `apps/backend/src` (grep vide), et `helmet`
  n'est pas dans les dépendances de `apps/backend/package.json`. Rien à adapter aujourd'hui, mais
  toute option "service tiers" aurait immédiatement imposé d'ouvrir `img-src`/`connect-src` vers un
  domaine externe le jour où une CSP serait ajoutée — un point contre elle, détaillé plus bas.
- **Angular 22.1** (`apps/frontend/package.json` : `@angular/core: ^22.1.0`, composants standalone
  partout) — critère de compatibilité pour toute lib "wrapper Angular".

## Comparatif des options de génération

### Option écartée d'emblée : service tiers en ligne

Type `api.qrserver.com`, Google Charts QR, ou tout service qui reçoit le texte à encoder en
paramètre d'URL et renvoie une image. Écarté sans plus d'analyse : contraire au PRD §10 (aucune
dépendance cloud), casse totalement sur un poste client hors ligne ou derrière un pare-feu qui
bloque les domaines non whitelistés, et fuite en clair (à un tiers non contractualisé) l'URL de
jointure d'une Session cliente — inacceptable pour un produit posé chez des clients variés sans
qu'aucun n'ait audité ce tiers.

### Option écartée : génération côté serveur (NestJS)

La lib Node [`qrcode`](https://github.com/soldair/node-qrcode) (voir fiche ci-dessous) sait très
bien produire un SVG/PNG/data-URI côté serveur (`QRCode.toDataURL()`, `toString(text, { type:
'svg' })`). Étudiée puis écartée pour ce besoin précis, pour deux raisons :

1. **L'URL à encoder est déjà connue et correcte côté navigateur, pas côté serveur.** L'app est en
   un seul conteneur, un domaine par client (`docs/deploy-agilometre.md` : ex.
   `agilometre.nekbet.fr`, exposé via un edge Caddy) — mais rien dans le backend NestJS ne connaît
   aujourd'hui son propre nom de domaine public : `urlDeJointure` le résout déjà côté client via
   `window.location.origin`, exactement au bon endroit (le navigateur qui affiche la page de
   projection connaît par construction l'URL qu'il a utilisée pour y accéder). Faire cette
   résolution côté serveur obligerait à faire confiance à un en-tête `Host`/`X-Forwarded-Host`
   transmis par Caddy (nouveau contrat implicite entre l'edge et l'app) ou à introduire une nouvelle
   variable d'environnement "URL publique" — de la complexité ajoutée pour reproduire une valeur
   que le navigateur a déjà, correctement, sans configuration.
2. **Rien à mettre en cache.** Le Code change à chaque Session (aléatoire, unique parmi les
   Sessions `OUVERTE`) : ce n'est pas un asset statique réutilisable, l'argument "un seul rendu
   pixel exact, mis en cache" ne s'applique pas ici — pas de gain à déplacer le calcul côté serveur.

Cette option resterait viable techniquement (zéro dépendance ajoutée au bundle Angular), mais
ajoute un nouvel endpoint et une dépendance backend pour reproduire, avec plus de complexité, ce
que le navigateur peut faire directement avec la donnée qu'il a déjà sous la main.

### Option retenue : génération côté client, en JS pur (canvas/SVG)

Aucun appel réseau à l'exécution : le code d'encodage QR (calcul de la matrice + dessin) est
embarqué dans le bundle Angular au build, comme le reste de l'app.

#### Bibliothèque de calcul : [`qrcode`](https://www.npmjs.com/package/qrcode) (dépôt [soldair/node-qrcode](https://github.com/soldair/node-qrcode))

| Critère | Valeur |
|---|---|
| Version npm actuelle | 1.5.4 |
| Dernière publication npm | 2024-08-05 |
| Dernier commit GitHub | 2024-08-23 (dépôt non archivé) |
| Téléchargements/semaine (npm) | ~18,9 M |
| Étoiles GitHub / issues ouvertes | 8 171 / 125 |
| Licence | MIT |
| Dépendances (champ `main`, usage Node/CLI) | `pngjs`, `yargs`, `dijkstrajs` |
| Dépendances réellement embarquées côté navigateur | `dijkstrajs` (MIT) seulement — le `package.json` de `qrcode` déclare un champ [`browser`](https://registry.npmjs.org/qrcode) qui remappe `./lib/index.js` → `./lib/browser.js` et neutralise `fs`, donc les bundlers (Angular CLI/esbuild) écartent `pngjs`/`yargs` (utilisés uniquement pour `toFile`/le CLI Node) |
| Poids bundle (gzip, mesuré [bundlephobia](https://bundlephobia.com/package/qrcode@1.5.4)) | **8,75 Ko gzippé** (23,4 Ko non minifié), 2 modules effectivement inclus |
| API pertinente | `QRCode.toCanvas(canvasEl, texte)`, `QRCode.toDataURL(texte)`, `QRCode.toString(texte, { type: 'svg' })` — voir [README](https://github.com/soldair/node-qrcode#readme) |

Source : [`qrcode` sur npm (registre)](https://registry.npmjs.org/qrcode), [dépôt GitHub](https://github.com/soldair/node-qrcode).

C'est la bibliothèque de facto de l'écosystème Node/browser pour ce besoin (18,9 M
téléchargements/semaine, 8 171 étoiles), maintenue (dernier commit 2024, pas d'archivage), licence
MIT, zéro appel réseau, zéro `eval`.

#### Intégration Angular : [`angularx-qrcode`](https://www.npmjs.com/package/angularx-qrcode) (dépôt [Cordobo/angularx-qrcode](https://github.com/Cordobo/angularx-qrcode))

| Critère | Valeur |
|---|---|
| Version npm actuelle | 22.0.1 |
| Dernière publication npm | 2026-07-24 |
| Dernier commit GitHub | 2026-09-11 (dépôt non archivé, actif la veille de cette recherche) |
| Téléchargements/semaine (npm) | ~226 k |
| Étoiles GitHub / issues ouvertes | 510 / 15 |
| Licence | MIT |
| Dépendances | `qrcode@1.5.4` (pin exact — la lib ci-dessus), `tslib` |
| `peerDependencies` | `@angular/common` et `@angular/core` **`>=22.0.0 <23.0.0`** |
| Compatibilité standalone | Composant standalone `QRCodeComponent`, importable directement dans le tableau `imports: []` d'un composant standalone (pas de `NgModule` requis) |

Source : [`angularx-qrcode` sur npm (registre)](https://registry.npmjs.org/angularx-qrcode), [dépôt GitHub](https://github.com/Cordobo/angularx-qrcode), [README (guide d'intégration standalone)](https://github.com/Cordobo/angularx-qrcode#readme).

Le `peerDependencies` (`@angular/core >=22.0.0 <23.0.0`) correspond **exactement** à la version
utilisée ici (`^22.1.0`) — pas de tolérance de version à vérifier. Usage :

```ts
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-projection-page',
  imports: [StickyNote, QRCodeComponent],
  // ...
})
```
```html
<qrcode [qrdata]="urlDeJointure()" [width]="200" [errorCorrectionLevel]="'M'"></qrcode>
```

`elementType` permet de choisir `'canvas'` (défaut) ou `'svg'` — SVG est préférable ici pour un
écran de projection (rendu net à n'importe quelle taille/résolution de vidéoprojecteur, sans flou
de mise à l'échelle d'un canvas raster). Le README confirme qu'aucun appel réseau n'est fait par
la lib, hors le cas non utilisé ici d'une image de marque superposée (`imageSrc` fourni par le
développeur).

Le poids ajouté par le wrapper lui-même n'a pas pu être mesuré séparément (bundlephobia a renvoyé
`429 Too Many Requests` sur cet essai précis) ; le poids réel de l'ensemble vient presque
entièrement de `qrcode` qu'il réexporte tel quel (dépendance pinnée à `1.5.4`, la même version
mesurée ci-dessus, 8,75 Ko gzippé) — le wrapper n'est qu'un composant Angular fin autour de cette
API. À titre de comparaison, c'est un ordre de grandeur bien inférieur à `apexcharts` (`^6.8.0`),
déjà présent dans ce même bundle frontend pour les visuels radar/tendance.

#### Candidats étudiés puis écartés

| Lib | Pourquoi écartée |
|---|---|
| [`angular-qrcode`](https://www.npmjs.com/package/angular-qrcode) | Piège de nommage : malgré le nom, c'est une lib **AngularJS 1.x** (`peerDependencies: angular >=1.0.6`), dernière publication 2017-02-19, **marquée `deprecated` sur npm** ("Package no longer supported"). Sans rapport avec Angular (2+) utilisé ici. |
| [`ngx-qrcode2`](https://www.npmjs.com/package/ngx-qrcode2) | Dernière publication 2020-05-01, `peerDependencies` plafonné à Angular ≤10, **marquée `deprecated` sur npm** par l'auteur lui-même au profit de `@techiediaries/ngx-qrcode`. Incompatible avec Angular 22. |
| [`ngx-qrcode-styling`](https://www.npmjs.com/package/ngx-qrcode-styling) | Wrapper Angular pour `qr-code-styling` (QR "stylés", coins arrondis, logo incrusté) compatible Angular 19-24. Écartée : licence **`Beerware`** (déclarée dans le `package.json` npm) — non standard, pas clairement compatible avec un usage commercial on-premise sans clarification de l'auteur, alors que le besoin actuel (un QR lisible sur écran de projection) n'a aucune exigence esthétique justifiant ce risque. |
| [`qr-code-styling`](https://www.npmjs.com/package/qr-code-styling) (lib de base, sans le wrapper Angular ci-dessus) | MIT, activement maintenue (dernier commit 2026-02-14, 2 940 étoiles), ~13,8 Ko gzippé. Techniquement viable, mais objectivement du sur-dimensionnement pour le besoin (dégradés, formes de points personnalisées, logo incrusté) — la charte actuelle (`--color-navy-*`/`--color-red-*` dans `apps/frontend/src/styles.scss`) n'appelle pas un QR "stylé", un QR noir/blanc classique suffit et reste plus robuste à scanner. |

## Ce que doit encoder le QR

L'URL de jointure déjà calculée et affichée en toutes lettres sur l'écran de projection
(`urlDeJointure`), avec le Code en query param plutôt qu'une URL nue à retaper :

```
${window.location.origin}/vote?code=<code>
```

- Réutilise la route publique existante (`path: 'vote'`, `apps/frontend/src/app/app.routes.ts`)
  et le mécanisme de jointure existant (`POST /api/participant/rejoindre`) — **aucun nouveau
  mécanisme d'auth, aucune nouvelle route**, juste un paramètre d'URL supplémentaire sur une page
  déjà publique et déjà sans compte.
- `window.location.origin`, déjà utilisé pour `urlDeJointure` dans `projection-page.ts`, résout
  correctement le domaine public du client en production : un seul conteneur, un domaine par
  client derrière l'edge Caddy (`docs/deploy-agilometre.md`, ex. `agilometre.nekbet.fr`) — la page
  de projection tourne déjà dans ce navigateur avec cette origine, pas besoin de la reconstruire
  ou de la configurer séparément.
- Point d'implémentation à prévoir (hors périmètre de cette recherche, notée pour la carte de
  suivi) : `VotePage` (`apps/frontend/src/app/participant/vote-page/vote-page.ts`) ne lit
  aujourd'hui aucun query param au chargement — `ngOnInit` ne fait que relire un Jeton déjà en
  storage (ligne 68-74) ; sinon l'utilisateur tape le Code à la main via le signal `code` et le
  bouton `rejoindre()`. Pour que le scan aboutisse à une jointure automatique (pas seulement à un
  champ pré-rempli), `ngOnInit` devra lire `ActivatedRoute.snapshot.queryParamMap.get('code')` et,
  si présent, soit pré-remplir `this.code`, soit appeler directement `this.rejoindre()`.

## Points d'attention déploiement identifiés

- **CSP** : rien à adapter. Aucune CSP n'est posée aujourd'hui (`apps/backend/src/main.ts`, pas de
  `helmet`), et une génération 100 % locale (JS embarqué au build, dessin sur `<canvas>` ou
  `<svg>` déjà dans le DOM) ne requiert ni `script-src` externe, ni `eval()`, ni `img-src` vers un
  tiers — compatible même avec la CSP la plus stricte (`default-src 'self'`) si elle est ajoutée
  plus tard. C'est l'inverse exact de l'option "service tiers", qui aurait imposé d'ouvrir
  `img-src`/`connect-src` vers un domaine externe — exactement le genre de règle qu'un proxy
  d'entreprise bloque par défaut.
- **SSR** : non applicable aujourd'hui (`bootstrapApplication` pur, confirmé dans
  `apps/frontend/src/main.ts` et `apps/frontend/angular.json`). `qrcode` dessine sur un `<canvas>`
  (a besoin de `document`), donc resterait à garder derrière une vérification de plateforme
  (`isPlatformBrowser`) si le SSR était introduit un jour — non bloquant maintenant, à documenter
  si le SSR revient en discussion.
- **Licence** : `qrcode` et `angularx-qrcode` sont tous les deux MIT, y compris leur seule
  dépendance transitive effectivement embarquée côté navigateur (`dijkstrajs`, MIT) — compatible
  usage commercial on-premise sans réserve. Le candidat écarté `ngx-qrcode-styling` (licence
  `Beerware`) est le seul point d'attention licence rencontré dans cette recherche.
- **Aucun changement backend** : l'option retenue ne touche ni `apps/backend`, ni le contrat
  d'API existant (`POST /api/participant/rejoindre` reste inchangé) — c'est le sens strict de
  "solution la moins intrusive" : un ajout localisé à `apps/frontend` (une dépendance npm, un
  composant sur une page déjà publique), zéro nouvelle surface serveur, zéro nouvelle variable
  d'environnement.

## Recommandation

**Génération côté client, en JS pur, via `angularx-qrcode` (qui embarque `qrcode`), rendu en SVG
sur `ProjectionPage`.**

Trois raisons, dans l'ordre :

1. **Zéro appel réseau, zéro nouvelle surface backend** — la seule option compatible sans réserve
   avec la contrainte "aucun problème de déploiement chez le client" : pas de service tiers (exclu
   d'office par le PRD), pas de nouvel endpoint NestJS à sécuriser/monitorer/documenter (l'option
   serveur étudiée plus haut), juste du JS déjà bundlé qui dessine sur un élément déjà présent
   dans le DOM de la page.
2. **Compatibilité exacte avec la stack en place** — `angularx-qrcode` cible précisément
   `@angular/core >=22.0.0 <23.0.0`, la version utilisée ici (`^22.1.0`), en composant standalone
   directement importable, sans `NgModule` à créer. Dépôt actif la veille de cette recherche
   (2026-09-11), MIT, wrapper d'une lib de calcul (`qrcode`) elle-même la référence de facto du
   secteur (18,9 M téléchargements/semaine).
3. **Réutilise ce qui existe déjà plutôt que d'inventer** — l'URL à encoder est celle que
   `ProjectionPage` calcule déjà (`urlDeJointure`), le Code est celui que `SessionsService`
   affiche déjà, et le point d'arrivée (`VotePage` + `POST /api/participant/rejoindre`) ne change
   pas. Le seul code à écrire est : ajouter `angularx-qrcode` en dépendance frontend, poser
   `<qrcode [qrdata]="urlDeJointure() + '?code=' + code()" elementType="svg">` dans
   `projection-page.html`, et faire lire `VotePage` le query param `code` au chargement.

## Synthèse

| Besoin | Choix | Alternative écartée |
|---|---|---|
| Calcul de la matrice QR | [`qrcode`](https://github.com/soldair/node-qrcode) (MIT, 8,75 Ko gzip côté navigateur) | Service tiers (cloud, exclu par le PRD §10) ; génération côté serveur NestJS (résolution d'URL publique plus fragile qu'en JS navigateur, rien à mettre en cache) |
| Intégration Angular standalone | [`angularx-qrcode`](https://github.com/Cordobo/angularx-qrcode) (MIT, peer-dep Angular 22.x exact) | `angular-qrcode` (AngularJS 1.x, deprecated) ; `ngx-qrcode2` (deprecated, Angular ≤10) ; `ngx-qrcode-styling` (licence Beerware) |
| Style de rendu | QR noir/blanc classique, `elementType="svg"` | `qr-code-styling` (QR "stylés" avec logo/couleurs — sur-dimensionné pour le besoin actuel) |

Les deux bibliothèques retenues sont MIT, activement maintenues, n'exigent aucun appel réseau à
l'exécution, et ne modifient ni le contrat d'API ni le mécanisme d'anonymat existants — compatible
avec la contrainte on-premise du PRD §10 et avec la demande explicite de solution la moins
intrusive possible.
