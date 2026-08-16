import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzI18n, fr_FR } from 'ng-zorro-antd/i18n';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { NzModalService } from 'ng-zorro-antd/modal';
import { StatutSession } from '@agilometre/shared';
import { AjustementPage } from './ajustement-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

const referentielFixture = {
  themes: [
    {
      id: 't1',
      libelle: 'Thème A',
      questions: [
        { id: 'q1', libelle: 'Question 1', themeId: 't1', options: [] },
        { id: 'q2', libelle: 'Question 2', themeId: 't1', options: [] },
      ],
    },
  ],
};

const sessionFixture = {
  id: 's1',
  equipeId: 'e1',
  equipeNom: 'Équipe Alpha',
  entiteId: 'ent1',
  date: '2026-04-01T00:00:00.000Z',
  statut: 'OUVERTE',
  modeleSessionId: 'm1',
  verrouillee: false,
  selection: [{ questionId: 'q1', libelle: 'Question 1', themeId: 't1', themeLibelle: 'Thème A' }],
};

const entitesFixture = [{ id: 'ent1', nom: 'SNDIP' }];
const equipesFixture = [
  { id: 'e1', nom: 'Alpha', entiteId: 'ent1', membres: [] },
  { id: 'e2', nom: 'Beta', entiteId: 'ent1', membres: [] },
];
const modelesFixture = [
  {
    id: 'm1',
    nom: 'Diagnostic',
    nbQuestionsActives: 2,
    themesCouverts: ['Thème A'],
    misAJourLe: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'm2',
    nom: 'Suivi',
    nbQuestionsActives: 1,
    themesCouverts: ['Thème A'],
    misAJourLe: '2026-01-01T00:00:00.000Z',
  },
];

describe('AjustementPage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<AjustementPage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjustementPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        provideNzI18n(fr_FR),
        provideNzNativeDateAdapter(),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AjustementPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/referentiel').flush(referentielFixture);
    httpMock.expectOne('/api/sessions/s1').flush(sessionFixture);
    httpMock.expectOne('/api/organisation/entites').flush(entitesFixture);
    httpMock.expectOne('/api/modeles-session').flush(modelesFixture);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/ent1/equipes').flush(equipesFixture);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge Équipe, Entité, Date, Modèle, statut et Sélection de la Session', () => {
    expect(fixture.componentInstance['equipeNom']()).toBe('Équipe Alpha');
    expect(fixture.componentInstance['entiteId']()).toBe('ent1');
    expect(fixture.componentInstance['equipeId']()).toBe('e1');
    expect(fixture.componentInstance['modeleSessionId']()).toBe('m1');
    expect(fixture.componentInstance['statut']()).toBe('OUVERTE');
    expect(fixture.componentInstance['selection']()).toHaveLength(1);
    expect(fixture.componentInstance['equipesDeLEntite']()).toEqual(equipesFixture);
    expect(fixture.nativeElement.textContent).toContain('Équipe Alpha');
  });

  it('onEquipeChange — appelle modifierInfos et met à jour l’état depuis la réponse', () => {
    fixture.componentInstance['onEquipeChange']('e2');

    const req = httpMock.expectOne('/api/sessions/s1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ equipeId: 'e2', date: '2026-04-01T00:00:00.000Z' });
    req.flush({ ...sessionFixture, equipeId: 'e2', equipeNom: 'Équipe Beta' });

    expect(fixture.componentInstance['equipeId']()).toBe('e2');
    expect(fixture.componentInstance['equipeNom']()).toBe('Équipe Beta');
  });

  it('onDateChange — appelle modifierInfos avec la nouvelle Date', () => {
    fixture.componentInstance['onDateChange'](new Date('2026-05-01T00:00:00.000Z'));

    const req = httpMock.expectOne('/api/sessions/s1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ equipeId: 'e1', date: '2026-05-01T00:00:00.000Z' });
    req.flush({ ...sessionFixture, date: '2026-05-01T00:00:00.000Z' });
  });

  it('onEntiteChange — réinitialise l’Équipe et recharge les Équipes de la nouvelle Entité', () => {
    fixture.componentInstance['onEntiteChange']('ent2');

    expect(fixture.componentInstance['equipeId']()).toBeNull();
    const req = httpMock.expectOne('/api/organisation/entites/ent2/equipes');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e9', nom: 'Gamma', entiteId: 'ent2', membres: [] }]);

    expect(fixture.componentInstance['equipesDeLEntite']()).toHaveLength(1);
  });

  it('onModeleChange — demande confirmation avant de changer de Modèle', () => {
    const modal = fixture.debugElement.injector.get(NzModalService);
    const confirmSpy = vi.spyOn(modal, 'confirm');

    fixture.componentInstance['onModeleChange']('m2');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('onModeleChange — ne fait rien si le Modèle choisi est déjà le Modèle actuel', () => {
    const modal = fixture.debugElement.injector.get(NzModalService);
    const confirmSpy = vi.spyOn(modal, 'confirm');

    fixture.componentInstance['onModeleChange']('m1');

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('onAjouterQuestion — appelle le service et met à jour la Sélection depuis la réponse', () => {
    fixture.componentInstance['onAjouterQuestion']({ questionId: 'q2' });

    const req = httpMock.expectOne('/api/sessions/s1/questions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionId: 'q2', position: undefined });
    req.flush({
      ...sessionFixture,
      selection: [
        ...sessionFixture.selection,
        { questionId: 'q2', libelle: 'Question 2', themeId: 't1', themeLibelle: 'Thème A' },
      ],
    });

    expect(fixture.componentInstance['selection']()).toHaveLength(2);
  });

  it('onRetirerQuestion — retire une Question', () => {
    fixture.componentInstance['onRetirerQuestion']('q1');

    const req = httpMock.expectOne('/api/sessions/s1/questions/q1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...sessionFixture, selection: [] });

    expect(fixture.componentInstance['selection']()).toEqual([]);
  });

  it('onReordonnerQuestion — réordonne la Sélection', () => {
    fixture.componentInstance['onReordonnerQuestion']({ questionId: 'q1', position: 1 });

    const req = httpMock.expectOne('/api/sessions/s1/questions/q1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ position: 1 });
    req.flush(sessionFixture);
  });

  it('affiche le bandeau de verrouillage quand la Session est verrouillée', () => {
    fixture.componentInstance['verrouillee'].set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('verrouillée');
  });

  it('affiche un bandeau distinct quand la Session est clôturée', () => {
    fixture.componentInstance['statut'].set(StatutSession.Cloturee);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('clôturée');
  });

  it('modifiable — faux si verrouillée ou clôturée, vrai sinon', () => {
    expect(fixture.componentInstance['modifiable']()).toBe(true);

    fixture.componentInstance['verrouillee'].set(true);
    expect(fixture.componentInstance['modifiable']()).toBe(false);

    fixture.componentInstance['verrouillee'].set(false);
    fixture.componentInstance['statut'].set(StatutSession.Cloturee);
    expect(fixture.componentInstance['modifiable']()).toBe(false);
  });
});
