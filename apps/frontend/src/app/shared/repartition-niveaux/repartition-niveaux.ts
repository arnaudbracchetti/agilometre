import { Component, computed, input } from '@angular/core';
import { RepartitionVotesDto } from '@agilometre/shared';
import { PourcentageRepartition } from '../pourcentage-repartition';

interface LigneRepartition {
  niveau: 1 | 2 | 3 | 4;
  pourcentage: number;
}

/**
 * Répartition des Réponses par Niveau — barres, pas une liste texte (voir critique de
 * synthese-page : une liste "Niveau N … X %" séparée de ~400px de vide était illisible en
 * projection). Reprend le langage visuel déjà validé de pilotage-page (piste + barre en
 * `transform: scaleX()`, teintes cycliques des pastilles d'option) plutôt qu'un nouveau motif.
 *
 * Pas de repère de Seuil de Palier ici, délibérément : le Seuil ne se lit jamais au grain
 * Question (ADR-0016) — l'effectif d'un seul Tour de vote y est trop restreint pour qu'un seuil
 * de validation soit informatif. Le Seuil se lit au grain Thème, via la jauge de Taux d'approche
 * de `<app-palier-theme>`.
 */
@Component({
  selector: 'app-repartition-niveaux',
  imports: [],
  templateUrl: './repartition-niveaux.html',
  styleUrl: './repartition-niveaux.scss',
  host: { class: 'repartition-niveaux' },
})
export class RepartitionNiveaux {
  readonly repartition = input.required<RepartitionVotesDto>();
  readonly effectif = input.required<number>();

  protected readonly lignes = computed<LigneRepartition[]>(() => {
    const repartition = this.repartition();
    const effectif = this.effectif();
    return ([1, 2, 3, 4] as const).map((niveau) => ({
      niveau,
      pourcentage: PourcentageRepartition.executer(repartition[niveau], effectif),
    }));
  });
}
