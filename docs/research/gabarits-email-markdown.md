# Comparatif des bibliothèques Node de rendu markdown → HTML (on-premise)

Recherche menée pour [issue #66](https://github.com/arnaudbracchetti/agilometre/issues/66),
enfant de la carte [#63 "Contenu des emails en fichiers markdown"](https://github.com/arnaudbracchetti/agilometre/issues/63).
Chiffres (téléchargements, dates, dépendances) relevés le 2026-09-03 depuis le registre npm
(`registry.npmjs.org`, `api.npmjs.org/downloads`) et l'API GitHub des dépôts amont — pas de
blog ou d'article secondaire.

## Contexte et critères

Chaque email envoyé par Agilomètre aura son contenu dans un fichier markdown : un bloc
frontmatter portant le sujet, un corps markdown rendu en HTML, et un texte brut auto-dérivé du
rendu (pas de section texte brut écrite séparément). Ces fichiers sont écrits par des
développeurs, versionnés dans le dépôt, et embarqués dans l'image Docker au build (PRD §10 :
déploiement on-premise, une instance par client, aucune dépendance cloud) — le rendu doit donc
tourner entièrement en local, sans appel réseau.

Critères de comparaison : poids / dépendances transitives, activité de maintenance (dernière
publication npm, dernier commit GitHub, dépôt archivé ou non), simplicité d'API pour un usage
serveur simple (pas besoin d'un riche écosystème de plugins), licence, et facilité de dérivation
du texte brut à partir du HTML rendu.

Le contenu markdown vient de développeurs de confiance, pas d'utilisateurs finaux — le risque XSS
est donc faible aujourd'hui, mais chaque option ci-dessous précise si elle échappe/sanitize par
défaut, au cas où cette hypothèse changerait plus tard (ex. contenu personnalisable par un
client).

## 1. Parsing du frontmatter

| | [`gray-matter`](https://github.com/jonschlinkert/gray-matter) | [`front-matter`](https://github.com/jxson/front-matter) |
|---|---|---|
| Version npm actuelle | 4.0.3 | 4.0.2 |
| Dernière publication npm | 2021-04-24 | 2020-05-29 |
| Dernier commit GitHub | 2025-06-14 (dépôt non archivé) | non vérifié précisément, dépôt beaucoup moins actif |
| Téléchargements/semaine (npm) | ~8,9 M | ~4,4 M |
| Étoiles GitHub / issues ouvertes | 4 489 / 81 | non comparé en détail (bien moins populaire) |
| Dépendances directes | 4 (`js-yaml`, `kind-of`, `section-matter`, `strip-bom-string`) | 1 (`js-yaml`) |
| Licence | MIT | MIT |
| API | `matter(content) → { data, content }`, une seule fonction | `fm(content) → { attributes, body }`, équivalent |

Sources : [gray-matter sur npm (registre)](https://registry.npmjs.org/gray-matter),
[dépôt gray-matter](https://github.com/jonschlinkert/gray-matter),
[front-matter sur npm (registre)](https://registry.npmjs.org/front-matter),
[dépôt front-matter](https://github.com/jxson/front-matter).

**Recommandation : `gray-matter`.** Pas de publication npm récente (2021), mais le dépôt
GitHub a bien reçu des commits en 2025 (donc pas abandonné, juste stable) et l'écart de
popularité est très net (8,9 M vs 4,4 M téléchargements/semaine, 4 489 étoiles) — c'est la
bibliothèque de facto pour ce besoin dans l'écosystème Node (utilisée par exemple par Gatsby,
Metalsmith, Assemble). Son API est une seule fonction avec un objet `{ data, content }` en
retour, ce qui correspond exactement au besoin (extraire le sujet + variables de frontmatter,
recevoir le corps markdown restant). `front-matter` a une empreinte de dépendances légèrement
plus légère (1 dépendance contre 4) mais est moins actif et beaucoup moins utilisé ; pas un
gain suffisant pour justifier de s'écarter du choix standard.

Aucune des deux bibliothèques n'exécute le contenu qu'elle parse (parsing YAML déclaratif via
`js-yaml`) — pas de risque XSS à ce niveau, qu'il y ait ou non confiance dans les auteurs.

## 2. Rendu markdown → HTML

| | [`markdown-it`](https://github.com/markdown-it/markdown-it) | [`marked`](https://github.com/markedjs/marked) | [`showdown`](https://github.com/showdownjs/showdown) |
|---|---|---|---|
| Version npm actuelle | 15.0.1 | 18.0.11 | 2.1.0 |
| Dernière publication npm | 2026-08-27 | 2026-08-24 | 2022-04-21 |
| Dernier commit GitHub | 2026-08-27 | 2026-09-03 | non vérifié en détail, mais npm date déjà l'abandon relatif |
| Téléchargements/semaine (npm) | ~30,9 M | ~73,3 M | ~1,4 M |
| Étoiles GitHub / issues ouvertes | 21 868 / 8 | 37 112 / 27 | non comparé (nettement moins actif) |
| Dépendances directes | 6 (`mdurl`, `argparse`, `entities`, `uc.micro`, `linkify-it`, `punycode.js`) | 0 | 1 (`commander`, utilisé seulement par le CLI) |
| Licence | MIT | MIT (déclarée `"license": "MIT"` dans `package.json` ; le détecteur GitHub affiche `NOASSERTION`, probablement un souci de format de fichier LICENSE, pas une licence différente) | MIT |
| HTML brut dans la source | **échappé par défaut** (option `html: false` — [confirmé dans le preset par défaut du dépôt](https://github.com/markdown-it/markdown-it/blob/master/src/presets/default.ts)) | **passe tel quel par défaut**, aucune sanitization intégrée — le [README recommande explicitement DOMPurify, sanitize-html ou insane](https://github.com/markedjs/marked#usage) en aval si le contenu n'est pas fiable | passe tel quel par défaut (comportement similaire à marked) |
| API | `new MarkdownIt().render(md)` | `marked.parse(md)` | `new showdown.Converter().makeHtml(md)` |

Sources : [markdown-it sur npm (registre)](https://registry.npmjs.org/markdown-it),
[dépôt markdown-it](https://github.com/markdown-it/markdown-it),
[preset par défaut markdown-it (`html: false`)](https://github.com/markdown-it/markdown-it/blob/master/src/presets/default.ts),
[marked sur npm (registre)](https://registry.npmjs.org/marked),
[dépôt marked](https://github.com/markedjs/marked),
[README marked — section sécurité/sanitization](https://github.com/markedjs/marked#usage),
[showdown sur npm (registre)](https://registry.npmjs.org/showdown),
[dépôt showdown](https://github.com/showdownjs/showdown).

Un quatrième candidat, l'écosystème [`remark`/`unified`](https://github.com/remarkjs/remark)
(dernière publication `remark` 15.0.1, 2023-09-18), a été écarté d'emblée : c'est un pipeline à
plugins (`remark-parse`, `remark-stringify`, `unified`, etc.) pensé pour des chaînes de
transformation riches (MDX, transformations AST personnalisées) — plus de pièces mobiles et de
dépendances transitives que nécessaire pour un simple rendu email, alors que le besoin ici est
explicitement "pas besoin d'un riche écosystème de plugins".

**Recommandation : `markdown-it`.** Trois raisons :

1. **Maintenance** : les deux (`markdown-it` et `marked`) sont activement maintenus (publications
   à quelques jours d'intervalle, fin août/début septembre 2026, dépôts non archivés, peu
   d'issues ouvertes proportionnellement à leur popularité). `showdown` est écarté : dernière
   publication mi-2022, activité bien plus faible.
2. **Sécurité par défaut** : c'est le point qui différencie vraiment `markdown-it` de `marked`
   pour ce projet. `markdown-it` échappe le HTML brut par défaut (`html: false`) — un email
   markdown avec `<script>` ou un attribut `onerror` collé dans le texte ne produit pas de HTML
   exécutable tant que l'option n'est pas explicitement activée. `marked` ne fait aucun filtrage :
   son propre README recommande d'ajouter un sanitizer externe (DOMPurify, sanitize-html) dès que
   le contenu n'est plus garanti sûr. Le risque est faible aujourd'hui (auteurs = développeurs de
   confiance), mais la carte #63 elle-même liste en "Not yet specified" une possible évolution
   vers du contenu personnalisable par client — `markdown-it` est le choix qui reste sûr sans
   action supplémentaire si cette hypothèse change, `marked` demanderait d'ajouter un sanitizer à
   ce moment-là.
3. **API simple** : les deux ont une API minimale suffisante (une instance/fonction, une méthode
   de rendu) ; `marked` a l'avantage de zéro dépendance directe contre 6 pour `markdown-it`, mais
   ce sont toutes des sous-modules du même projet (`markdown-it` organisation), pas des
   dépendances tierces disparates, et le total reste modeste pour un usage serveur one-shot au
   build/démarrage (pas de bundle-size client à optimiser ici, contrainte absente du besoin réel).

Si le poids en dépendances (0 vs 6) devait devenir un critère décisif, `marked` resterait un
second choix raisonnable — mais il faudrait alors explicitement documenter le choix de ne pas
sanitizer (cohérent avec la confiance dans les auteurs actuels) plutôt que de l'hériter par
défaut sans y avoir pensé.

## 3. Dérivation du texte brut (repli plain-text de l'email)

Le besoin (carte #63) est un texte brut **auto-dérivé**, pas écrit séparément. Deux approches :

- Dériver depuis le **HTML rendu** avec [`html-to-text`](https://github.com/html-to-text/node-html-to-text)
  — version npm 10.0.1, publiée 2026-08-19 (activement maintenue), 1 766 étoiles GitHub, 33 issues
  ouvertes, ~16,4 M téléchargements/semaine, licence MIT (déclarée dans `package.json` ; même
  remarque `NOASSERTION` côté détecteur GitHub que pour `marked`). 5 dépendances directes
  (`htmlparser2`, `selderee`, `dom-serializer`, `deepmerge-ts`, `@selderee/plugin-htmlparser2`).
  API minimale : `htmlToText(html, options)` → chaîne de texte, avec gestion correcte des listes,
  liens (affiche l'URL entre parenthèses), titres, etc. — exactement le comportement souhaitable
  pour un repli d'email lisible.
- Dériver depuis le **markdown source** par une regex/un strip artisanal : écarté — un strip
  maison réinvente mal ce que `html-to-text` fait déjà correctement (listes, liens, tableaux), et
  opérer sur le HTML déjà rendu garantit que texte brut et HTML restent cohérents entre eux (une
  seule source de vérité : le HTML), plutôt que deux dérivations indépendantes depuis le markdown.

Source : [html-to-text sur npm (registre)](https://registry.npmjs.org/html-to-text),
[dépôt html-to-text](https://github.com/html-to-text/node-html-to-text).

**Recommandation : `html-to-text`**, appliqué au HTML déjà produit par `markdown-it`.

## Synthèse

| Besoin | Choix | Alternative écartée |
|---|---|---|
| Frontmatter | `gray-matter` | `front-matter` (moins populaire, moins actif) |
| Markdown → HTML | `markdown-it` | `marked` (pas de sanitization par défaut) ; `showdown` (peu maintenu) ; `remark`/`unified` (trop d'ossature pour le besoin) |
| Texte brut auto-dérivé | `html-to-text`, appliqué au HTML rendu | strip markdown artisanal |

Les trois bibliothèques retenues sont MIT, actuellement maintenues (ou, pour `gray-matter`,
stable et toujours largement utilisée malgré une dernière publication npm plus ancienne), et
n'exigent aucun appel réseau à l'exécution — compatible avec la contrainte on-premise du PRD §10.
