import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, forkJoin } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ModeleSessionDto, ThemeReferentielDto } from '@agilometre/shared';
import { SelectionEditor } from '../../shared/selection-editor/selection-editor';
import { ModelesSessionService } from '../modeles-session.service';
import { ReferentielService } from '../referentiel.service';

const DEBOUNCE_RENOMMAGE_MS = 600;

@Component({
  selector: 'app-composer-page',
  imports: [FormsModule, RouterLink, NzButtonModule, NzInputModule, SelectionEditor],
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

  protected onAjouterQuestion(evt: { questionId: string; position?: number }): void {
    this.persister(
      this.modelesSessionService.ajouterQuestion(this.requireId(), evt.questionId, evt.position),
    );
  }

  protected onAjouterTheme(evt: { questionIds: string[]; position?: number }): void {
    this.persister(
      this.modelesSessionService.ajouterTheme(this.requireId(), evt.questionIds, evt.position),
    );
  }

  protected onRetirerQuestion(questionId: string): void {
    this.persister(this.modelesSessionService.retirerQuestion(this.requireId(), questionId));
  }

  protected onReordonnerQuestion(evt: { questionId: string; position: number }): void {
    this.persister(
      this.modelesSessionService.reordonnerQuestion(this.requireId(), evt.questionId, evt.position),
    );
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
