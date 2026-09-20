import { Component, computed, viewChild } from '@angular/core';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { ArbreOrganisation } from '../../organisation/arbre-organisation/arbre-organisation';
import { CampagneTab } from '../campagne-tab/campagne-tab';

/**
 * Écran « Collecte d'informations » (doc/spec/annexes/campagne-de-pouls.md §6), pour l'onglet
 * Campagnes seul dans ce ticket — équipe sélectionnée uniquement. L'onglet Sessions (fusionné
 * depuis /sessions) et la vue Entité en lecture seule sont le périmètre de la carte #81, pas
 * de celui-ci.
 */
@Component({
  selector: 'app-collecte-page',
  imports: [ArbreOrganisation, NzTabsModule, CampagneTab],
  templateUrl: './collecte-page.html',
  styleUrl: './collecte-page.scss',
})
export class CollectePage {
  protected readonly arbre = viewChild.required(ArbreOrganisation);

  protected readonly equipeSelectionneeId = computed<string | null>(() => {
    const selection = this.arbre().selectionActuelle();
    return selection.type === 'equipe' ? selection.equipe.id : null;
  });
}
