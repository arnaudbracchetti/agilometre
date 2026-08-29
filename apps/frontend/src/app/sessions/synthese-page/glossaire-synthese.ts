import { Component, inject } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';

export interface DonneesGlossaireSynthese {
  seuilPalierPourcent: number;
}

/** Contenu du modal « Comprendre les résultats » (voir synthese-page.ts, ouvertGlossaire()). */
@Component({
  selector: 'app-glossaire-synthese',
  imports: [],
  templateUrl: './glossaire-synthese.html',
  styleUrl: './glossaire-synthese.scss',
})
export class GlossaireSynthese {
  protected readonly data = inject<DonneesGlossaireSynthese>(NZ_MODAL_DATA);
}
