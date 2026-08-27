import { Component, computed, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';

export type TaillePalierTheme = 'normale' | 'grande';

/**
 * Repère de Palier partagé par synthese-page, profil-page et lecture-fine-page — badge de
 * Palier, jauge de Taux d'approche et alerte de Marge avant descente. Les trois compléments
 * (jauge/alerte) sont optionnels et n'apparaissent que si l'appelant fournit la donnée : c'est
 * ce qui permet à lecture-fine-page de continuer à n'afficher que le badge, à profil-page de
 * garder badge + jauge, et à synthese-page d'afficher les trois (voir doc/spec §6 : le Palier
 * seul ne dit pas où l'Équipe doit se concentrer).
 *
 * Auparavant dupliqué avec trois préfixes de classe différents et trois comportements divergents
 * — c'est cette duplication qui avait laissé la Règle du Chiffre Mono et le flottant brut de
 * Moyenne diverger sans être détectés (voir critique de synthese-page).
 */
@Component({
  selector: 'app-palier-theme',
  imports: [NzIconModule, NzProgressModule],
  templateUrl: './palier-theme.html',
  styleUrl: './palier-theme.scss',
  host: {
    class: 'palier-theme',
    '[class.palier-theme--grande]': "taille() === 'grande'",
  },
})
export class PalierTheme {
  /** Seuil, en fraction de Marge avant descente, sous lequel le Palier est signalé fragile. */
  private static readonly SEUIL_ALERTE_MARGE = 0.2;

  readonly palier = input.required<1 | 2 | 3 | 4 | null>();
  /**
   * `grande` : seul badge agrandi (Chiffre Mono à la taille des autres compteurs-clés de l'app,
   * ex. le code de séance sur pilotage-page) — pour la poignée d'écrans où un Palier est LE
   * chiffre-titre de l'écran (ex. Palier global de synthese-page), jamais le défaut.
   */
  readonly taille = input<TaillePalierTheme>('normale');
  /** `null` ou absent : aucune jauge affichée (Palier 4 n'a pas de Palier suivant à approcher). */
  readonly tauxApproche = input<number | null>(null);
  /** `null` ou absent : aucune alerte affichée. */
  readonly margeAvantDescente = input<number | null>(null);
  /**
   * Libellé du badge quand `palier` est `null`. Deux conventions coexistent délibérément (voir
   * l'annexe Moteur de scoring) : « Aucune donnée » à la Portée Session (synthese-page,
   * lecture-fine-page — un Thème qui n'a simplement pas encore été voté cette séance) contre
   * « Non évalué » à la Portée périodique (profil-page — un Thème hors Sélection sur la Période).
   */
  readonly libelleVide = input('Aucune donnée');

  protected readonly afficherJauge = computed(() => this.tauxApproche() !== null);
  protected readonly tauxApprochePourcent = computed(() => {
    const taux = this.tauxApproche();
    return taux === null ? 0 : Math.round(taux * 100);
  });
  protected readonly palierSuivant = computed(() => {
    const palier = this.palier();
    return palier === null ? null : palier + 1;
  });

  protected readonly alerteMargeFaible = computed(() => {
    const marge = this.margeAvantDescente();
    return marge !== null && marge < PalierTheme.SEUIL_ALERTE_MARGE;
  });
  protected readonly margeAvantDescentePourcent = computed(() => {
    const marge = this.margeAvantDescente();
    return marge === null ? 0 : Math.round(marge * 100);
  });
}
