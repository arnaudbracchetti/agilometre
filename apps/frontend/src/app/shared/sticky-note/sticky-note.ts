import { Component, input } from '@angular/core';

export type CouleurStickyNote = 'blue' | 'violet' | 'magenta';

const ROTATION_MIN_DEG = 1;
const ROTATION_MAX_DEG = 2.5;
const SCOTCH_GAUCHE_MIN_PCT = 30;
const SCOTCH_GAUCHE_MAX_PCT = 70;
const SCOTCH_ROTATION_MAX_DEG = 6;

function signeAleatoire(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

/**
 * Note autocollante — matériau partagé de la direction « Salle d'atelier » (accueil, vote,
 * projection…). Inclinaison de la note et position/rotation du ruban adhésif tirées au sort à
 * chaque instanciation (dans une amplitude mesurée), pour qu'une rangée de notes ne se répète
 * jamais mécaniquement — comme de vrais post-it posés à la main. Le contenu est projeté
 * (`<ng-content>`) ; l'hôte porte directement le style de note (pas de wrapper interne), pour
 * que chaque appelant puisse le dimensionner via sa propre classe sans lutter contre un div
 * intermédiaire.
 */
@Component({
  selector: 'app-sticky-note',
  imports: [],
  templateUrl: './sticky-note.html',
  styleUrl: './sticky-note.scss',
  host: {
    class: 'sticky-note',
    '[class.sticky-note--violet]': "couleur() === 'violet'",
    '[class.sticky-note--magenta]': "couleur() === 'magenta'",
    '[style.transform]': "'rotate(' + rotationDeg + 'deg)'",
  },
})
export class StickyNote {
  readonly couleur = input<CouleurStickyNote>('blue');
  readonly scotch = input(true);

  protected readonly rotationDeg =
    signeAleatoire() * (ROTATION_MIN_DEG + Math.random() * (ROTATION_MAX_DEG - ROTATION_MIN_DEG));
  protected readonly scotchGauchePct =
    SCOTCH_GAUCHE_MIN_PCT + Math.random() * (SCOTCH_GAUCHE_MAX_PCT - SCOTCH_GAUCHE_MIN_PCT);
  protected readonly scotchRotationDeg = signeAleatoire() * Math.random() * SCOTCH_ROTATION_MAX_DEG;
}
