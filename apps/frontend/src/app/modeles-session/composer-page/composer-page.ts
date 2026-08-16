import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, forkJoin } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  ModeleSessionDto,
  OptionReferentielDto,
  QuestionReferentielDto,
  ThemeReferentielDto,
} from '@agilometre/shared';
import { ModelesSessionService } from '../modeles-session.service';
import { ReferentielService } from '../referentiel.service';

const TAILLE_PALETTE = 8;
const DEBOUNCE_RENOMMAGE_MS = 600;

type DragPayload =
  | { type: 'question'; questionId: string }
  | { type: 'theme'; questionIds: string[] };

interface EntreeThemeGauche {
  theme: ThemeReferentielDto;
  questionsRestantes: QuestionReferentielDto[];
  idListeGauche: string;
  idListeBulk: string;
}

@Component({
  selector: 'app-composer-page',
  imports: [
    FormsModule,
    RouterLink,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    NzButtonModule,
    NzInputModule,
  ],
  templateUrl: './composer-page.html',
  styleUrl: './composer-page.scss',
})
export class ComposerPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly modelesSessionService = inject(ModelesSessionService);
  private readonly referentielService = inject(ReferentielService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nomModifie$ = new Subject<string>();

  protected readonly modeleId = signal<string | null>(null);
  protected readonly nom = signal('');
  protected readonly nomRenomme = signal('');
  protected readonly chargementEnCours = signal(false);
  protected readonly renommageEnCours = signal(false);

  protected readonly themes = signal<ThemeReferentielDto[]>([]);
  protected readonly selection = signal<ModeleSessionDto['selection']>([]);
  protected readonly expandedQuestionIds = signal<Set<string>>(new Set());

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

  protected readonly indexTheme = computed<Record<string, number>>(() => {
    const index: Record<string, number> = {};
    this.themes().forEach((theme, position) => {
      index[theme.id] = (position % TAILLE_PALETTE) + 1;
    });
    return index;
  });

  /** Couleur catégorielle d'un Thème (pastille du panneau gauche et de la sélection à droite). */
  protected couleurTheme(themeId: string): string {
    return `var(--color-cat-${this.indexTheme()[themeId] ?? 1})`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.modeleId.set(id);
    this.chargerModele(id);

    this.nomModifie$
      .pipe(
        debounceTime(DEBOUNCE_RENOMMAGE_MS),
        distinctUntilChanged(),
        filter((nom) => nom.trim().length > 0 && nom.trim() !== this.nom()),
        switchMap((nom) => {
          this.renommageEnCours.set(true);
          return this.modelesSessionService.renommerModele(this.requireId(), nom.trim()).pipe(
            catchError(() => {
              this.renommageEnCours.set(false);
              this.message.error('Impossible de renommer ce Modèle de session.');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((modele) => {
        this.nom.set(modele.nom);
        this.renommageEnCours.set(false);
      });
  }

  protected onNomModifie(nom: string): void {
    this.nomRenomme.set(nom);
    this.nomModifie$.next(nom);
  }

  private chargerModele(id: string): void {
    this.chargementEnCours.set(true);
    forkJoin({
      referentiel: this.referentielService.obtenirReferentielActif(),
      modele: this.modelesSessionService.obtenirModele(id),
    }).subscribe({
      next: ({ referentiel, modele }) => {
        this.themes.set(referentiel.themes);
        this.nom.set(modele.nom);
        this.nomRenomme.set(modele.nom);
        this.selection.set(modele.selection);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.message.error('Impossible de charger ce Modèle de session.');
      },
    });
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
    this.persister(this.modelesSessionService.ajouterQuestion(this.requireId(), questionId));
  }

  protected ajouterThemeViaBouton(questionIds: string[]): void {
    if (questionIds.length === 0) {
      return;
    }
    this.persister(this.modelesSessionService.ajouterTheme(this.requireId(), questionIds));
  }

  protected retirerQuestion(questionId: string): void {
    this.persister(this.modelesSessionService.retirerQuestion(this.requireId(), questionId));
  }

  protected onDropIntoReferentiel(event: CdkDragDrop<unknown, unknown, DragPayload>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const payload = event.item.data;
    if (payload.type !== 'question') {
      return;
    }
    this.retirerQuestion(payload.questionId);
  }

  protected onDropIntoSelection(event: CdkDragDrop<unknown, unknown, DragPayload>): void {
    const id = this.requireId();
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) {
        return;
      }
      const payloadReordre = event.item.data;
      if (payloadReordre.type !== 'question') {
        return;
      }
      this.persister(
        this.modelesSessionService.reordonnerQuestion(
          id,
          payloadReordre.questionId,
          event.currentIndex,
        ),
      );
      return;
    }

    const payload = event.item.data;
    if (payload.type === 'question') {
      this.persister(
        this.modelesSessionService.ajouterQuestion(id, payload.questionId, event.currentIndex),
      );
    } else {
      this.persister(
        this.modelesSessionService.ajouterTheme(id, payload.questionIds, event.currentIndex),
      );
    }
  }

  private persister(appel: Observable<ModeleSessionDto>): void {
    appel.subscribe({
      next: (modele) => this.selection.set(modele.selection),
      error: () => this.message.error('Cette action n’a pas pu être enregistrée.'),
    });
  }

  private requireId(): string {
    const id = this.modeleId();
    if (!id) {
      throw new Error('Aucun Modèle de session créé pour l’instant');
    }
    return id;
  }
}
