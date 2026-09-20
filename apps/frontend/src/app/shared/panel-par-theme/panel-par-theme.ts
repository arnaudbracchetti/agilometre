import { Component, computed, input } from '@angular/core';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { SelectionQuestionDto } from '@agilometre/shared';
import { couleurCategorielle } from '../couleur-categorielle';

interface GroupeTheme {
  themeId: string;
  themeLibelle: string;
  questions: SelectionQuestionDto[];
  couleur: string;
}

/**
 * Affichage en lecture d'une Sélection/Panel de Questions groupées par Thème, en `nz-collapse` —
 * factorisé depuis `sessions/creer-page` une fois dupliqué une seconde fois par le Pouls
 * (`collecte/campagne-tab`, `collecte/creer-campagne-page`) : trois copies auraient dépassé le
 * seuil où la duplication coûte plus cher que l'abstraction.
 */
@Component({
  selector: 'app-panel-par-theme',
  imports: [NzCollapseModule],
  templateUrl: './panel-par-theme.html',
  styleUrl: './panel-par-theme.scss',
})
export class PanelParTheme {
  readonly questions = input<SelectionQuestionDto[]>([]);

  protected readonly groupes = computed<GroupeTheme[]>(() => {
    const groupes = new Map<string, GroupeTheme>();
    this.questions().forEach((question) => {
      let groupe = groupes.get(question.themeId);
      if (!groupe) {
        groupe = {
          themeId: question.themeId,
          themeLibelle: question.themeLibelle,
          questions: [],
          couleur: couleurCategorielle(groupes.size),
        };
        groupes.set(question.themeId, groupe);
      }
      groupe.questions.push(question);
    });
    return [...groupes.values()];
  });
}
