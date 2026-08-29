import { Component, computed, input } from '@angular/core';
import { CranConsensusDto } from '@agilometre/shared';
import { LibelleConsensus } from '../libelle-consensus';

/** Position des 3 points du glyphe (sur un axe 0-24) : leur écartement dessine la dispersion
 * elle-même — serrés pour un accord, étalés pour un désaccord — plutôt que de ne reposer que
 * sur la couleur (canal non chromatique requis, RGAA). */
const POSITIONS_GLYPHE: Record<CranConsensusDto, readonly [number, number, number]> = {
  FORT: [10, 12, 14],
  MODERE: [6, 12, 18],
  FAIBLE: [2, 12, 22],
};

/**
 * Cran de consensus d'une Question (synthese-page, lecture-fine-page) : jusqu'ici un `<span>` gris
 * dupliqué sur les deux écrans, sans aucun signal — un coach qui balaie l'écran ne pouvait pas
 * distinguer un cran de l'autre sans lire chaque libellé. Le cran faible porte le rôle
 * « attention » (or), jamais `--color-danger` : un désaccord d'Équipe déclenche la conversation
 * en salle (principe produit n° 2), ce n'est pas une erreur (Règle du Rouge Dédié, DESIGN.md).
 */
@Component({
  selector: 'app-cran-consensus',
  templateUrl: './cran-consensus.html',
  styleUrl: './cran-consensus.scss',
  host: { class: 'cran-consensus' },
})
export class CranConsensus {
  readonly consensus = input.required<CranConsensusDto | null>();

  protected readonly libelle = computed(() => LibelleConsensus.pour(this.consensus()));

  protected readonly classeCran = computed(() => {
    const consensus = this.consensus();
    return consensus ? `cran-consensus--${consensus.toLowerCase()}` : '';
  });

  protected readonly positionsGlyphe = computed(() => {
    const consensus = this.consensus();
    return consensus ? POSITIONS_GLYPHE[consensus] : null;
  });
}
