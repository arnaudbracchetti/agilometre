import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { CampagnePoulsDto } from '@agilometre/shared';
import { CampagnePoulsService } from '../../pouls/campagne-pouls.service';
import { CreerCampagnePage, DonneesCreerCampagnePage } from '../creer-campagne-page/creer-campagne-page';
import { PanelParTheme } from '../../shared/panel-par-theme/panel-par-theme';

const JOURS_ABREGES: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim',
};

/**
 * Onglet Campagnes de l'écran Collecte, pour une Équipe sélectionnée. Ne porte, dans ce ticket,
 * que la création et l'affichage en lecture (statut, rythme, Panel) — les gestes de cycle de vie
 * (#76) et l'édition du Panel en place (#77) sont hors périmètre.
 */
@Component({
  selector: 'app-campagne-tab',
  imports: [NzButtonModule, NzModalModule, PanelParTheme],
  templateUrl: './campagne-tab.html',
  styleUrl: './campagne-tab.scss',
})
export class CampagneTab {
  private readonly campagnePoulsService = inject(CampagnePoulsService);
  private readonly modal = inject(NzModalService);

  readonly equipeId = input.required<string>();

  protected readonly campagne = signal<CampagnePoulsDto | null>(null);
  protected readonly chargementEnCours = signal(false);

  protected readonly joursEnvoiLibelles = computed(() =>
    (this.campagne()?.joursEnvoi ?? [])
      .slice()
      .sort((a, b) => a - b)
      .map((jour) => JOURS_ABREGES[jour])
      .join(', '),
  );

  protected readonly heureEnvoiLibelle = computed(() => {
    const heure = this.campagne()?.heureEnvoi;
    if (heure === undefined) {
      return '';
    }
    const heures = Math.floor(heure / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (heure % 60).toString().padStart(2, '0');
    return `${heures}h${minutes}`;
  });

  constructor() {
    effect(() => {
      const equipeId = this.equipeId();
      this.chargementEnCours.set(true);
      this.campagnePoulsService.obtenirParEquipe(equipeId).subscribe({
        next: (campagne) => {
          this.campagne.set(campagne);
          this.chargementEnCours.set(false);
        },
        error: () => {
          this.chargementEnCours.set(false);
          this.modal.error({
            nzTitle: 'Erreur',
            nzContent: 'Impossible de charger la Campagne de pouls de cette Équipe.',
          });
        },
      });
    });
  }

  protected ouvrirCreation(): void {
    const donnees: DonneesCreerCampagnePage = { equipeId: this.equipeId() };
    this.modal
      .create<CreerCampagnePage, DonneesCreerCampagnePage, CampagnePoulsDto>({
        nzTitle: 'Créer une Campagne de pouls',
        nzContent: CreerCampagnePage,
        nzData: donnees,
        nzFooter: null,
        nzWidth: 760,
      })
      .afterClose.subscribe((campagne) => {
        if (campagne) {
          this.campagne.set(campagne);
        }
      });
  }
}
