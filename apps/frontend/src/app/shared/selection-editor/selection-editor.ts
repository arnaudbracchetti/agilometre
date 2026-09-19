import { Component, computed, input, output, signal } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NzButtonModule } from 'ng-zorro-antd/button';
import {
  OptionReferentielDto,
  QuestionReferentielDto,
  SelectionQuestionDto,
  ThemeReferentielDto,
} from '@agilometre/shared';
import { couleurCategorielle, couleurCategorielleFond } from '../couleur-categorielle';

export type DragPayload =
  | { type: 'question'; questionId: string }
  | { type: 'theme'; questionIds: string[] };

interface EntreeThemeGauche {
  theme: ThemeReferentielDto;
  questionsRestantes: QuestionReferentielDto[];
  idListeGauche: string;
  idListeBulk: string;
}

interface EntreeCouvertureTheme {
  id: string;
  libelle: string;
  couleur: string;
  couleurFond: string;
  count: number;
}

/**
 * Écran double-liste (arbre du Référentiel à gauche, Sélection réordonnable à droite), partagé
 * entre le composer d'un Modèle de collecte et l'ajustement de la Sélection d'une Session — même
 * interaction, deux consommateurs distincts qui persistent chacun à leur propre endpoint (le
 * composant ne fait lui-même aucun appel HTTP, il ne fait qu'émettre des intentions).
 * `verrouillee` désactive l'ajout et le réordonnancement (reflète `Session.estVerrouillee()`),
 * jamais le retrait — invariant docs/design/agregat-session.md §2.
 */
@Component({
  selector: 'app-selection-editor',
  imports: [CdkDrag, CdkDropList, CdkDropListGroup, CdkScrollable, NzButtonModule],
  templateUrl: './selection-editor.html',
  styleUrl: './selection-editor.scss',
})
export class SelectionEditor {
  readonly themes = input.required<ThemeReferentielDto[]>();
  readonly selection = input.required<SelectionQuestionDto[]>();
  readonly verrouillee = input(false);

  readonly ajouterQuestion = output<{ questionId: string; position?: number }>();
  readonly ajouterTheme = output<{ questionIds: string[]; position?: number }>();
  readonly retirerQuestion = output<string>();
  readonly reordonnerQuestion = output<{ questionId: string; position: number }>();

  protected readonly expandedQuestionIds = signal<Set<string>>(new Set());
  /** Thèmes dépliés dans le panneau Référentiel — tous repliés par défaut (Set vide). */
  protected readonly expandedThemeIds = signal<Set<string>>(new Set());

  protected readonly panneauGauche = computed<EntreeThemeGauche[]>(() => {
    const idsSelectionnes = new Set(this.selection().map((q) => q.questionId));
    return this.themes().map((theme) => ({
      theme,
      questionsRestantes: theme.questions.filter((q) => !idsSelectionnes.has(q.id)),
      idListeGauche: `theme-questions-${theme.id}`,
      idListeBulk: `theme-bulk-${theme.id}`,
    }));
  });

  protected readonly optionsParQuestionId = computed<Record<string, OptionReferentielDto[]>>(() => {
    const index: Record<string, OptionReferentielDto[]> = {};
    this.themes().forEach((theme) => {
      theme.questions.forEach((question) => {
        index[question.id] = question.options;
      });
    });
    return index;
  });

  protected readonly positionTheme = computed<Record<string, number>>(() => {
    const position: Record<string, number> = {};
    this.themes().forEach((theme, index) => {
      position[theme.id] = index;
    });
    return position;
  });

  /** Couleur catégorielle d'un Thème (pastille du panneau gauche et de la sélection à droite). */
  protected couleurTheme(themeId: string): string {
    return couleurCategorielle(this.positionTheme()[themeId] ?? 0);
  }

  /** Nombre de Questions sélectionnées par Thème — bandeau de couverture du panneau droit. */
  protected readonly couvertureParTheme = computed<EntreeCouvertureTheme[]>(() => {
    const comptes = new Map<string, number>();
    this.selection().forEach((question) => {
      comptes.set(question.themeId, (comptes.get(question.themeId) ?? 0) + 1);
    });
    return this.themes().map((theme) => ({
      id: theme.id,
      libelle: theme.libelle,
      couleur: this.couleurTheme(theme.id),
      couleurFond: couleurCategorielleFond(this.positionTheme()[theme.id] ?? 0),
      count: comptes.get(theme.id) ?? 0,
    }));
  });

  protected toggleThemeExpansion(themeId: string): void {
    this.expandedThemeIds.update((ids) => {
      const copie = new Set(ids);
      if (copie.has(themeId)) {
        copie.delete(themeId);
      } else {
        copie.add(themeId);
      }
      return copie;
    });
  }

  protected deplierTousLesThemes(): void {
    this.expandedThemeIds.set(new Set(this.themes().map((theme) => theme.id)));
  }

  protected replierTousLesThemes(): void {
    this.expandedThemeIds.set(new Set());
  }

  protected toggleExpansion(questionId: string): void {
    this.expandedQuestionIds.update((ids) => {
      const copie = new Set(ids);
      if (copie.has(questionId)) {
        copie.delete(questionId);
      } else {
        copie.add(questionId);
      }
      return copie;
    });
  }

  protected ajouterQuestionViaBouton(questionId: string): void {
    if (this.verrouillee()) {
      return;
    }
    this.ajouterQuestion.emit({ questionId });
  }

  protected ajouterThemeViaBouton(questionIds: string[]): void {
    if (this.verrouillee() || questionIds.length === 0) {
      return;
    }
    this.ajouterTheme.emit({ questionIds });
  }

  protected retirer(questionId: string): void {
    this.retirerQuestion.emit(questionId);
  }

  /** Toujours permis, même verrouillée : c'est un retrait. */
  protected onDropIntoReferentiel(event: CdkDragDrop<unknown, unknown, DragPayload>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const payload = event.item.data;
    if (payload.type !== 'question') {
      return;
    }
    this.retirer(payload.questionId);
  }

  protected onDropIntoSelection(event: CdkDragDrop<unknown, unknown, DragPayload>): void {
    if (this.verrouillee()) {
      return;
    }
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) {
        return;
      }
      const payloadReordre = event.item.data;
      if (payloadReordre.type !== 'question') {
        return;
      }
      this.reordonnerQuestion.emit({
        questionId: payloadReordre.questionId,
        position: event.currentIndex,
      });
      return;
    }

    const payload = event.item.data;
    if (payload.type === 'question') {
      this.ajouterQuestion.emit({ questionId: payload.questionId, position: event.currentIndex });
    } else {
      this.ajouterTheme.emit({ questionIds: payload.questionIds, position: event.currentIndex });
    }
  }
}
