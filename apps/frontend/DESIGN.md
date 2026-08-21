---
name: Agilomètre
description: Diagnostic de maturité agile — séances animées et campagnes de pouls email, un anonymat garanti par la donnée, jamais par l'écran.
colors:
  bleu-profond: "#3467ae"
  bleu-fonce: "#0f417a"
  bleu-survol: "#2958a7"
  bleu-pale: "#ebf5ff"
  bleu-vif: "#8ab6f5"
  violet-median: "#5b32b8"
  violet-vif: "#b98ef2"
  violet-pale: "#ede6fa"
  or-vif: "#ffc400"
  magenta-signal: "#a01464"
  magenta-fonce: "#6e0f3d"
  magenta-vif: "#f27ab8"
  magenta-pale: "#fbe6f0"
  danger: "#cf1322"
  danger-pale: "#fff1f0"
  encre: "#1d1d1d"
  encre-attenuee: "#444444"
  surface: "#ffffff"
  surface-alt: "#f5f6f8"
  bordure: "#e2e2e2"
  sur-primaire: "#ffffff"
typography:
  display:
    fontFamily: "IBM Plex Sans, Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.875rem, 1.4rem + 2vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "IBM Plex Sans, Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  mono:
    fontFamily: "IBM Plex Mono, Cascadia Code, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 500
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  note: "3px"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.bleu-profond}"
    textColor: "{colors.sur-primaire}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.bleu-survol}"
    textColor: "{colors.sur-primaire}"
    rounded: "{rounded.sm}"
  button-ghost:
    textColor: "{colors.sur-primaire}"
    rounded: "{rounded.sm}"
  button-text:
    textColor: "{colors.bleu-profond}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "24px"
  sticky-note-blue:
    backgroundColor: "{colors.bleu-pale}"
    textColor: "{colors.bleu-fonce}"
    rounded: "{rounded.note}"
    padding: "24px"
  sticky-note-violet:
    backgroundColor: "{colors.violet-pale}"
    textColor: "{colors.violet-median}"
    rounded: "{rounded.note}"
    padding: "24px"
  sticky-note-magenta:
    backgroundColor: "{colors.magenta-pale}"
    textColor: "{colors.magenta-fonce}"
    rounded: "{rounded.note}"
    padding: "24px"
---

# Design System: Agilomètre

## Overview

**Creative North Star: "La Salle d'Atelier"**

Agilomètre habille deux moments distincts sous un même toit. Il y a la salle où la mesure se
vit — l'accueil, le vote projeté, l'écran de vote sur le téléphone d'un participant : là, le
mur d'atelier prend le dessus, notes autocollantes légèrement inclinées, coin plié, ruban
adhésif, un seul trait de marqueur tracé à la main comme signature. Et il y a la salle d'à côté
où la mesure se pilote — organisation, composeur de session, pilotage, bibliothèques : là,
plus une note ne traîne, seulement des cartes à bordure nette, des arbres, des tableaux, et des
chiffres alignés au monospace comme sortis d'un instrument calibré. Les deux salles partagent
la même palette et la même typographie ; c'est la densité de matériau — papier vs. bordure
sobre — qui les distingue, jamais une deuxième charte.

Le ton reste institutionnel chaleureux : la palette et la rigueur viennent d'insee.fr (bleu et
or authentiques, extraits de son propre CSS, pas une évocation générique de "gouvernemental"),
la base d'utilisateurs inclut des organisations publiques et para-publiques soumises au RGAA —
mais le geste à la main et le papier réchauffent ce sérieux plutôt que de l'alourdir. Un rejet
confirmé : le magenta de marque (`--color-accent`) n'est jamais un signal d'erreur — un rouge
dédié (`--color-danger`) existe précisément pour ne jamais laisser la couleur de marque porter
une connotation négative involontaire.

**Key Characteristics:**
- Un seul jeu de tokens, deux densités de matériau : note d'atelier sur les surfaces Persuade, carte sobre sur les surfaces Operate — jamais un mélange des deux sur un même écran.
- Chiffres calibrés en IBM Plex Mono partout où une mesure compte (paliers, taux, codes de séance, compteurs) — jamais pour de la prose.
- Palette institutionnelle réelle (bleu/or extraits d'insee.fr), pas une évocation "service public" générique.
- Plat par défaut ; l'ombre n'existe que pour le matériau papier.

## Colors

Palette à deux registres : les teintes "posées" (bleu profond, magenta signal, or, violet) qui
portent le texte et les surfaces de marque, et une déclinaison "vive" des trois mêmes teintes
(bleu/violet/magenta) réservée aux pastilles lisibles sur fond navy très sombre (écran de
projection, écran de vote) — jamais utilisée comme couleur de texte.

### Primary
- **Bleu Profond** (#3467ae): couleur de marque — boutons primaires, liens, titres de page, bordure du bandeau d'en-tête. Extrait tel quel du CSS d'insee.fr (occurrence la plus fréquente de son bleu), pas une teinte institutionnelle générique.
- **Bleu Foncé** (#0f417a): fonds pleine page des surfaces "vécues en salle" — bandeau supérieur du header, pied de page, fond de l'écran de projection et de l'écran de vote participant. Jamais utilisé pour du texte.
- **Bleu Survol** (#2958a7): état hover/actif du bleu profond.
- **Bleu Pâle** (#ebf5ff): fond de sélection (arbre, ligne active), fond de la note autocollante bleue.

### Secondary
- **Magenta Signal** (#a01464): couleur d'accent — trait signature du logo home, focus visible, icônes ponctuelles. Version assombrie du magenta réel d'insee.fr (#e61778) pour rester lisible comme texte (≥4.5:1) ; jamais utilisée comme signal d'erreur (voir Do's and Don'ts).
- **Magenta Foncé** (#6e0f3d): variante encore plus sûre de l'accent, encre de la note autocollante magenta.

### Tertiary
- **Or Vif** (#ffc400): couleur d'action extraite d'insee.fr — ruban adhésif des notes, une des quatre teintes cycliques des pastilles de réponse (jamais porteuse de texte, pas de contrainte de contraste à ce titre).
- **Violet Médian** (#5b32b8): teinte de liaison propre au pictogramme du logo (entre le bleu et le magenta), présente dans le pictogramme mais pas dans le site insee.fr lui-même — encre de la note autocollante violette, une des quatre teintes cycliques.

### Neutral
- **Encre** (#1d1d1d): texte courant.
- **Encre Atténuée** (#444444): texte secondaire, libellés de champ, métadonnées.
- **Surface** (#ffffff): fond des cartes, panneaux, champs.
- **Surface Atténuée** (#f5f6f8): fond de bandeau, ligne de tableau survolée, fond de sélection au clavier.
- **Bordure** (#e2e2e2): bordure des cartes, séparateurs.
- **Sur Primaire** (#ffffff): texte/icônes posés sur un fond Bleu Profond ou Bleu Foncé — jamais l'encre par défaut.
- **Danger** (#cf1322) / **Danger Pâle** (#fff1f0): erreurs et validations uniquement. Valeurs Ant Design (red-7/red-1), pas une teinte de marque, précisément pour ne jamais se confondre avec le Magenta Signal.

### Palette catégorielle (hors frontmatter)
8 teintes cycliques (`--color-cat-1` à `-8`, base + fond pâle chacune) identifient les Thèmes du
référentiel dans le composeur de session — volontairement distinctes des familles bleu/violet/
magenta pour ne jamais se confondre avec le primaire ou l'accent. Détail complet dans le
sidecar (`extensions.categoricalPalette`).

### Named Rules
**La Règle du Registre Unique.** Une surface est soit Persuade (matériau note : inclinaison,
coin plié, ruban, ombre teintée) soit Operate (carte sobre : bordure nette, angle droit, pas
d'ombre) — jamais les deux motifs sur le même écran.

**La Règle du Rouge Dédié.** `--color-accent` (magenta de marque) ne signale jamais une erreur
ou un danger. `--color-danger` existe pour ça, sans exception.

## Typography

**Display/Headline/Title/Body Font:** IBM Plex Sans (avec repli système : Segoe UI, Roboto,
-apple-system, Helvetica, Arial, sans-serif)
**Label/Mono Font:** IBM Plex Mono (avec repli Cascadia Code, Consolas, monospace)

**Character:** institutionnel avec une pointe ludique — IBM Plex Sans porte le sérieux
(titres pleine graisse, pas de serif décoratif), IBM Plex Mono porte la précision : la même
famille dessinée pour la mesure technique, pour que même le chiffre reste "maison" plutôt que
d'emprunter un monospace générique de terminal.

### Hierarchy
- **Display** (700, `clamp(1.875rem, 1.4rem + 2vw, 2.75rem)`, 1.2): titre du hero d'accueil uniquement.
- **Headline** (700, 1.875rem, 1.2): titres de section sur les surfaces Persuade (ex. "Nos dispositifs" sur l'accueil).
- **Title** (700, 1.25rem, 1.2): titre de page sur les surfaces Operate (bibliothèque, organisation, pilotage, composeur).
- **Body** (400, 1rem, 1.5): texte courant, contenu de formulaire.
- **Label** (500, 0.875rem, 1.5): libellés de champ, sous-titres de panneau ; en majuscules + `letter-spacing: 0.04em` dans le bandeau supérieur du header.
- **Mono** (500, taille variable de 0.875rem à `clamp(3.5rem, 9vw, 7rem)`, `letter-spacing: 0.1em`): tout chiffre "calibré" — code de séance, compteur de participation, palier, taux d'approche, tour de vote. Jamais pour de la prose, même courte.

### Named Rules
**La Règle du Chiffre Mono.** Toute valeur qui mesure quelque chose (un palier, un taux, un
compte, un code) s'affiche en IBM Plex Mono, jamais en Plex Sans — le lecteur doit reconnaître
une mesure calibrée au premier coup d'œil, avant même de la lire.

## Layout

Densité moyenne, rythmée par une échelle d'espacement en base 4px (`--space-1` = 4px à
`--space-8` = 64px). Les pages Operate suivent un padding de conteneur `--space-6` (32px) en
desktop, réduit à `--space-4` (16px) sous 640px. Les compositions à deux colonnes (organisation :
arbre + détail ; composeur de session : deux panneaux glisser-déposer) passent à une seule
colonne sous 900px / 640px selon l'écran.

Les surfaces Persuade plein écran (projection, vote) sont centrées verticalement et
horizontalement (`min-height: 100vh`, flex column centré) et gagnent en amplitude avec le
viewport via `clamp()` plutôt que des breakpoints fixes — le contenu (code, question, options)
occupe toujours l'essentiel de l'écran, du téléphone à la projection grand format. Sur l'écran
de vote, la cible tactile prime sur le libellé texte sous 640px (le libellé complet reste
consultable sur l'écran de projection partagé).

## Elevation & Depth

Système plat par défaut : les cartes, panneaux et lignes de tableau des surfaces Operate n'ont
aucune ombre, seulement une bordure `--color-border` 1px. L'ombre existe pour un seul usage,
délibérément réservé : le matériau "note autocollante" (teintée bleu, jamais noir pur) et
l'aperçu de glisser-déposer en cours (même teinte). Il n'y a pas d'élévation "générique" au
survol des boutons ou cartes.

### Shadow Vocabulary
- **Ombre note** (`box-shadow: 0 6px 14px rgba(30, 58, 143, 0.16), 0 2px 4px rgba(30, 58, 143, 0.1)`): sous chaque note autocollante et les repères "punaisés" du bandeau d'accueil. Teintée bleu insee.fr, jamais un noir neutre.
- **Ombre élevée** (`box-shadow: 0 4px 12px rgba(29, 29, 29, 0.2)`): aperçu d'un élément en cours de glisser-déposer uniquement (composeur de session).

### Named Rules
**La Règle du Plat-par-Défaut.** Une surface est plate au repos. Une ombre n'apparaît que
lorsqu'elle porte un sens précis (matériau papier, élément en train d'être déplacé) — jamais
comme décoration ambiante.

## Shapes

Rayon quasi nul par défaut : `--radius-sm` (4px) sur cartes, boutons, champs, tags — un
institutionnel de bureau, pas arrondi. Deux exceptions signature : `--radius-pill` (999px) pour
les repères circulaires (pastilles de lettre d'option, piste de progression, note "punaisée" du
bandeau d'accueil) et `--radius-note` (3px, quasiment confondu avec `--radius-sm`) pour le corps
de la note autocollante, dont la silhouette vient en réalité du `clip-path` en coin plié, pas du
rayon. Aucun composant n'utilise de coins totalement carrés (0) ni de rayon large (>8px) hors
des cercles pill.

## Components

### Buttons
Portés par ng-zorro-antd (`nz-button`), théorisés via `theme.less` plutôt qu'une classe maison —
sobres, sans fioriture, la personnalité vient de la rareté de l'accent plus que du geste sur le
bouton lui-même.
- **Shape:** `--radius-sm` (4px), hérité de `@border-radius-base` dans `theme.less`.
- **Primary** (`nzType="primary"`): fond Bleu Profond, texte blanc — action principale d'un écran (CTA hero, valider un formulaire, ouvrir/piloter une séance).
- **Default** (`nzType="default"`): bordure Bleu Profond, fond blanc — action secondaire (retour, annuler).
- **Ghost** (`nzType="default" nzGhost`): bordure et texte blancs sur fond Bleu Foncé — variante du bouton par défaut réservée aux CTA posés sur le hero.
- **Text / Link** (`nzType="text"` / `"link"`): pas de fond, texte Bleu Profond — actions de ligne de tableau (éditer, ouvrir), souvent combinées à `nzShape="circle"` pour une icône seule.
- **Hover / Focus:** couleur Bleu Survol ; focus visible = liseré Magenta Signal (`outline: 2px solid var(--color-accent)`), cohérent avec tout le reste de l'app, pas une spécificité du bouton.

### Chips / Tags
- **Statut de séance** (`nz-tag [nzColor]`): bleu = ouverte, gris = clôturée, orange = à venir — presets ng-zorro, pas une teinte de marque.
- **Thème** (composeur de session): pastille pleine `--radius-pill` colorée par la palette catégorielle (`--color-cat-N`), même index partagé entre l'arbre de gauche et les tags de droite — l'identité visuelle d'un Thème doit rester identique partout où il apparaît sur l'écran.

### Cards / Containers
- **Corner Style:** `--radius-sm` (4px).
- **Background:** `--color-surface` (blanc).
- **Shadow Strategy:** aucune — voir Elevation & Depth.
- **Border:** `1px solid var(--color-border)`.
- **Internal Padding:** `--space-5` (24px).

### Inputs / Fields
- **Style:** composants ng-zorro par défaut (`nz-input`), pas de restylage maison au-delà de la police et du rayon hérités du thème.
- **Focus:** liseré `2px solid var(--color-accent)` (`:focus-visible`), commun à toute l'app, pas propre au champ.

### Note autocollante (composant signature)
Matériau partagé de "La Salle d'Atelier" (`<app-sticky-note>`), utilisé pour les repères de
connexion (accueil, écran de vote, écran de projection) et la copie du code de séance côté
coach (pilotage). Fond `--color-sticky-{blue|violet|magenta}` avec encre assortie, coin plié en
`clip-path` (jamais un rayon), ruban adhésif or en position absolue au-dessus du pli, ombre
teintée bleue. Inclinaison (1°–2.5°) et position du ruban tirées au hasard à chaque instance
dans une amplitude mesurée, pour qu'une rangée de notes ne se répète jamais mécaniquement, comme
de vrais post-it posés à la main. Trois couleurs seulement (bleu/violet/magenta, dans l'ordre
des barres du pictogramme Insee), jamais une quatrième teinte pour ce composant.

### Pastilles d'option (vote / pilotage / projection)
Cercle lettré coloré par une palette de 4 teintes vives cycliques (bleu/violet/magenta/or, dans
cet ordre, par position d'option et non par contenu) — le même ordre sur l'écran de vote du
participant, l'écran de pilotage du coach et l'écran de projection de la salle, pour qu'un
repère de couleur voyagé entre les trois écrans reste immédiatement reconnaissable.

### Navigation
En-tête (`app-header`): bandeau supérieur Bleu Foncé (métadonnées en majuscules, `letter-spacing: 0.04em`), rangée de navigation blanche collée en haut (`position: sticky`) avec bordure basse Bleu Profond 3px. Liens = Bleu Profond, soulignés au survol et à l'état actif. Fil d'Ariane (`app-breadcrumb`) : fond `--color-surface-alt`, texte atténué, page courante en encre pleine.

## Do's and Don'ts

### Do:
- **Do** référencer les custom properties sémantiques (`var(--color-primary)`, etc.) dans tout nouveau style — jamais une couleur ou une taille codée en dur ; voir `home.scss` comme référence du patron.
- **Do** réserver le matériau note/papier (inclinaison, coin plié, ruban, ombre teintée) aux surfaces Persuade (accueil, vote, projection) ; les surfaces Operate restent des cartes sobres à bordure nette, sans rotation.
- **Do** afficher toute mesure (palier, taux, code, compteur) en IBM Plex Mono, jamais en Plex Sans.
- **Do** garder le même ordre de couleur (bleu → violet → magenta → or) pour les 4 pastilles d'option sur les trois écrans (vote, pilotage, projection).
- **Do** mettre à jour `theme.less` en même temps que `styles.scss` en cas de changement de teinte — ce sont deux sources de vérité qui doivent rester synchronisées à la main (préprocesseurs différents, ng-zorro ne lit pas les custom properties CSS).

### Don't:
- **Don't** utiliser `--color-accent` (magenta de marque) comme signal d'erreur ou de danger — `--color-danger` existe précisément pour ça.
- **Don't** poser du texte ou une icône directement sur `--color-primary` / `--color-primary-emphasis` sans `--color-on-primary` — bug déjà survenu une fois (texte sombre illisible sur le hero navy).
- **Don't** utiliser la teinte pâle (`-100`/`-pale`) d'une couleur sur fond sombre (projection, vote) — elle ne se détache pas assez ; utiliser le palier "vif" (`-300`) prévu pour cet usage.
- **Don't** ajouter une ombre générique au survol d'un bouton ou d'une carte — le système est plat par défaut, l'ombre est réservée au matériau note.
