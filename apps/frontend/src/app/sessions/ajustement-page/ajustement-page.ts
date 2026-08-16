import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { SelectionQuestionDto, SessionDto, ThemeReferentielDto } from '@agilometre/shared';
import { SelectionEditor } from '../../shared/selection-editor/selection-editor';
import { ReferentielService } from '../../modeles-session/referentiel.service';
import { SessionsService } from '../sessions.service';

@Component({
  selector: 'app-ajustement-page',
  imports: [DatePipe, RouterLink, NzButtonModule, NzTagModule, SelectionEditor],
  templateUrl: './ajustement-page.html',
  styleUrl: './ajustement-page.scss',
})
export class AjustementPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(SessionsService);
  private readonly referentielService = inject(ReferentielService);
  private readonly message = inject(NzMessageService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly equipeNom = signal('');
  protected readonly date = signal('');
  protected readonly statut = signal<SessionDto['statut'] | null>(null);
  protected readonly verrouillee = signal(false);
  protected readonly themes = signal<ThemeReferentielDto[]>([]);
  protected readonly selection = signal<SelectionQuestionDto[]>([]);
  protected readonly chargementEnCours = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);
    this.chargerSession(id);
  }

  private chargerSession(id: string): void {
    this.chargementEnCours.set(true);
    forkJoin({
      referentiel: this.referentielService.obtenirReferentielActif(),
      session: this.sessionsService.obtenir(id),
    }).subscribe({
      next: ({ referentiel, session }) => {
        this.themes.set(referentiel.themes);
        this.appliquerSession(session);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.message.error('Impossible de charger cette Session.');
      },
    });
  }

  private appliquerSession(session: SessionDto): void {
    this.equipeNom.set(session.equipeNom);
    this.date.set(session.date);
    this.statut.set(session.statut);
    this.verrouillee.set(session.verrouillee);
    this.selection.set(session.selection);
  }

  protected onAjouterQuestion(evt: { questionId: string; position?: number }): void {
    this.persister(
      this.sessionsService.ajouterQuestion(this.requireId(), evt.questionId, evt.position),
    );
  }

  protected onAjouterTheme(evt: { questionIds: string[]; position?: number }): void {
    this.persister(
      this.sessionsService.ajouterTheme(this.requireId(), evt.questionIds, evt.position),
    );
  }

  protected onRetirerQuestion(questionId: string): void {
    this.persister(this.sessionsService.retirerQuestion(this.requireId(), questionId));
  }

  protected onReordonnerQuestion(evt: { questionId: string; position: number }): void {
    this.persister(
      this.sessionsService.reordonnerQuestion(this.requireId(), evt.questionId, evt.position),
    );
  }

  private persister(appel: Observable<SessionDto>): void {
    appel.subscribe({
      next: (session) => this.appliquerSession(session),
      error: () => this.message.error('Cette action n’a pas pu être enregistrée.'),
    });
  }

  private requireId(): string {
    const id = this.sessionId();
    if (!id) {
      throw new Error('Aucune Session chargée pour l’instant');
    }
    return id;
  }
}
