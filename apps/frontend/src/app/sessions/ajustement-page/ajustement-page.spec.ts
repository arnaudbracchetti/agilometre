import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
  date: '2026-04-01T00:00:00.000Z',
  statut: 'OUVERTE',
  modeleSessionId: 'm1',
  verrouillee: false,
  selection: [{ questionId: 'q1', libelle: 'Question 1', themeId: 't1', themeLibelle: 'Thème A' }],
};

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
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AjustementPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/referentiel').flush(referentielFixture);
    httpMock.expectOne('/api/sessions/s1').flush(sessionFixture);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge l’équipe, la date, le statut et la Sélection de la Session', () => {
    expect(fixture.componentInstance['equipeNom']()).toBe('Équipe Alpha');
    expect(fixture.componentInstance['statut']()).toBe('OUVERTE');
    expect(fixture.componentInstance['selection']()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Équipe Alpha');
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
});
