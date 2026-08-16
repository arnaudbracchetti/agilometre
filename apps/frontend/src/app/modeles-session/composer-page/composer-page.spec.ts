import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComposerPage } from './composer-page';

function activatedRouteAvecId(id: string | null): Partial<ActivatedRoute> {
  return {
    snapshot: {
      paramMap: convertToParamMap(id ? { id } : {}),
    } as ActivatedRoute['snapshot'],
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

const modeleFixture = {
  id: 'm1',
  nom: 'Diagnostic complet',
  selection: [{ questionId: 'q1', libelle: 'Question 1', themeId: 't1', themeLibelle: 'Thème A' }],
};

describe('ComposerPage — mode édition (route /:id)', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<ComposerPage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposerPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('m1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(ComposerPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/referentiel').flush(referentielFixture);
    httpMock.expectOne('/api/modeles-session/m1').flush(modeleFixture);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge le Référentiel et la Sélection du Modèle', () => {
    const inputNom = fixture.nativeElement.querySelector('#nomRenomme') as HTMLInputElement;
    expect(inputNom.value).toBe('Diagnostic complet');
    expect(fixture.nativeElement.textContent).toContain('Question 2');
  });

  it('renomme automatiquement le Modèle ~600ms après la dernière modification du champ nom', () => {
    vi.useFakeTimers();
    fixture.componentInstance['onNomModifie']('Nouveau nom');
    vi.advanceTimersByTime(600);
    vi.useRealTimers();

    const req = httpMock.expectOne('/api/modeles-session/m1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Nouveau nom' });
    req.flush({ ...modeleFixture, nom: 'Nouveau nom' });

    expect(fixture.componentInstance['nom']()).toBe('Nouveau nom');
  });

  it('n’envoie qu’une seule requête si le champ change plusieurs fois avant la fin du debounce', () => {
    vi.useFakeTimers();
    fixture.componentInstance['onNomModifie']('N');
    vi.advanceTimersByTime(200);
    fixture.componentInstance['onNomModifie']('No');
    vi.advanceTimersByTime(200);
    fixture.componentInstance['onNomModifie']('Nouveau nom');
    vi.advanceTimersByTime(600);
    vi.useRealTimers();

    const req = httpMock.expectOne('/api/modeles-session/m1');
    req.flush({ ...modeleFixture, nom: 'Nouveau nom' });
  });

  it('n’envoie rien si le nom saisi est vide ou inchangé', () => {
    vi.useFakeTimers();
    fixture.componentInstance['onNomModifie']('');
    vi.advanceTimersByTime(600);
    fixture.componentInstance['onNomModifie']('Diagnostic complet');
    vi.advanceTimersByTime(600);
    vi.useRealTimers();
  });

  it('transmet le Référentiel et la Sélection chargés au SelectionEditor', () => {
    expect(fixture.componentInstance['themes']()).toEqual(referentielFixture.themes);
    expect(fixture.componentInstance['selection']()).toEqual(modeleFixture.selection);
  });

  it('onAjouterQuestion — appelle le service et met à jour la Sélection depuis la réponse', () => {
    fixture.componentInstance['onAjouterQuestion']({ questionId: 'q2' });

    const req = httpMock.expectOne('/api/modeles-session/m1/questions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionId: 'q2', position: undefined });
    req.flush({
      ...modeleFixture,
      selection: [
        ...modeleFixture.selection,
        { questionId: 'q2', libelle: 'Question 2', themeId: 't1', themeLibelle: 'Thème A' },
      ],
    });

    expect(fixture.componentInstance['selection']()).toHaveLength(2);
  });

  it('onAjouterTheme — appelle le service avec le thème entier', () => {
    fixture.componentInstance['onAjouterTheme']({ questionIds: ['q2'], position: 0 });

    const req = httpMock.expectOne('/api/modeles-session/m1/themes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionIds: ['q2'], position: 0 });
    req.flush(modeleFixture);
  });

  it('onRetirerQuestion — retire une Question et met à jour la Sélection depuis la réponse', () => {
    fixture.componentInstance['onRetirerQuestion']('q1');

    const req = httpMock.expectOne('/api/modeles-session/m1/questions/q1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...modeleFixture, selection: [] });

    expect(fixture.componentInstance['selection']()).toEqual([]);
  });

  it('onReordonnerQuestion — réordonne la Sélection', () => {
    fixture.componentInstance['onReordonnerQuestion']({ questionId: 'q1', position: 1 });

    const req = httpMock.expectOne('/api/modeles-session/m1/questions/q1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ position: 1 });
    req.flush(modeleFixture);
  });
});
