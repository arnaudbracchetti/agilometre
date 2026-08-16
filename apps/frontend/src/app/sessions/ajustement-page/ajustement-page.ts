import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  EntiteDto,
  EquipeDto,
  LigneBibliothequeModeleSessionDto,
  SelectionQuestionDto,
  SessionDto,
  ThemeReferentielDto,
} from '@agilometre/shared';
import { SelectionEditor } from '../../shared/selection-editor/selection-editor';
import { OrganisationService } from '../../organisation/organisation.service';
import { ModelesSessionService } from '../../modeles-session/modeles-session.service';
import { ReferentielService } from '../../modeles-session/referentiel.service';
import { SessionsService } from '../sessions.service';

@Component({
  selector: 'app-ajustement-page',
  imports: [
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzDatePickerModule,
    NzModalModule,
    NzSelectModule,
    NzTagModule,
    SelectionEditor,
  ],
  templateUrl: './ajustement-page.html',
  styleUrl: './ajustement-page.scss',
})
export class AjustementPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(SessionsService);
  private readonly organisationService = inject(OrganisationService);
  private readonly modelesSessionService = inject(ModelesSessionService);
  private readonly referentielService = inject(ReferentielService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly equipeNom = signal('');
  protected readonly entiteId = signal<string | null>(null);
  protected readonly equipeId = signal<string | null>(null);
  protected readonly date = signal<Date | null>(null);
  protected readonly modeleSessionId = signal<string | null>(null);
  protected readonly statut = signal<SessionDto['statut'] | null>(null);
  protected readonly verrouillee = signal(false);
  protected readonly themes = signal<ThemeReferentielDto[]>([]);
  protected readonly selection = signal<SelectionQuestionDto[]>([]);
  protected readonly chargementEnCours = signal(false);

  protected readonly entites = signal<EntiteDto[]>([]);
  protected readonly equipesDeLEntite = signal<EquipeDto[]>([]);
  protected readonly modeles = signal<LigneBibliothequeModeleSessionDto[]>([]);
  protected readonly chargementEquipesEnCours = signal(false);

  /** Équipe, Date et Modèle ne sont modifiables que tant qu'aucune réponse n'a été reçue et que la Session n'est pas clôturée. */
  protected readonly modifiable = computed(
    () => !this.verrouillee() && this.statut() !== 'CLOTUREE',
  );

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
      entites: this.organisationService.listerEntites(),
      modeles: this.modelesSessionService.listerBibliotheque(),
    }).subscribe({
      next: ({ referentiel, session, entites, modeles }) => {
        this.themes.set(referentiel.themes);
        this.entites.set(entites);
        this.modeles.set(modeles);
        this.appliquerSession(session);
        this.chargementEnCours.set(false);
        if (session.entiteId) {
          this.chargerEquipesDeLEntite(session.entiteId);
        }
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.message.error('Impossible de charger cette Session.');
      },
    });
  }

  private chargerEquipesDeLEntite(entiteId: string): void {
    this.chargementEquipesEnCours.set(true);
    this.organisationService.listerEquipesParEntite(entiteId).subscribe({
      next: (equipes) => {
        this.equipesDeLEntite.set(equipes);
        this.chargementEquipesEnCours.set(false);
      },
      error: () => {
        this.chargementEquipesEnCours.set(false);
        this.message.error('Impossible de charger les Équipes de cette Entité.');
      },
    });
  }

  private appliquerSession(session: SessionDto): void {
    this.equipeNom.set(session.equipeNom);
    this.entiteId.set(session.entiteId);
    this.equipeId.set(session.equipeId);
    this.date.set(new Date(session.date));
    this.modeleSessionId.set(session.modeleSessionId);
    this.statut.set(session.statut);
    this.verrouillee.set(session.verrouillee);
    this.selection.set(session.selection);
  }

  protected onEntiteChange(entiteId: string | null): void {
    this.entiteId.set(entiteId);
    this.equipeId.set(null);
    this.equipesDeLEntite.set([]);
    if (!entiteId) {
      return;
    }
    this.chargerEquipesDeLEntite(entiteId);
  }

  protected onEquipeChange(equipeId: string | null): void {
    this.equipeId.set(equipeId);
    this.persisterInfos();
  }

  protected onDateChange(date: Date | null): void {
    this.date.set(date);
    this.persisterInfos();
  }

  private persisterInfos(): void {
    const equipeId = this.equipeId();
    const date = this.date();
    if (!equipeId || !date) {
      return;
    }
    this.sessionsService.modifierInfos(this.requireId(), equipeId, date.toISOString()).subscribe({
      next: (session) => this.appliquerSession(session),
      error: () => this.message.error('Impossible de modifier cette Session.'),
    });
  }

  protected onModeleChange(nouveauModeleSessionId: string | null): void {
    const modeleActuel = this.modeleSessionId();
    if (!nouveauModeleSessionId || nouveauModeleSessionId === modeleActuel) {
      return;
    }
    this.modal.confirm({
      nzTitle: 'Changer de Modèle de session ?',
      nzContent:
        'La Sélection de Questions sera entièrement réinitialisée avec celle du nouveau Modèle. Toute modification manuelle déjà faite sur la Sélection actuelle sera perdue.',
      nzOkText: 'Changer le Modèle',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => this.persisterChangementModele(nouveauModeleSessionId),
    });
  }

  private persisterChangementModele(modeleSessionId: string): void {
    this.sessionsService.changerModele(this.requireId(), modeleSessionId).subscribe({
      next: (session) => this.appliquerSession(session),
      error: () => this.message.error('Impossible de changer le Modèle de cette Session.'),
    });
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
