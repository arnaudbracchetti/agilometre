import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ProfilEquipeDto } from '@agilometre/shared';
import { ProfilPage } from './profil-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

const PROFIL_PAR_DEFAUT: ProfilEquipeDto = {
  periodeDebut: '2026-04-01T00:00:00.000Z',
  periodeFin: '2026-07-01T00:00:00.000Z',
  themes: [],
};

describe('ProfilPage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<ProfilPage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('eq1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function repondre(profil: Partial<ProfilEquipeDto> = {}): void {
    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil')
      .flush({ ...PROFIL_PAR_DEFAUT, ...profil });
  }

  it('affiche la Période en cours', () => {
    fixture = TestBed.createComponent(ProfilPage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('01/04/2026');
    expect(texte).toContain('01/07/2026');
  });

  it('affiche un message d’erreur si le Profil n’est plus accessible', () => {
    fixture = TestBed.createComponent(ProfilPage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Le Profil de cette Équipe n’est pas accessible.',
    );
  });

  it('affiche un Palier par Thème répondu et "Non évalué" pour un Thème sans Réponse', () => {
    fixture = TestBed.createComponent(ProfilPage);
    fixture.detectChanges();
    repondre({
      themes: [
        {
          themeId: 't1',
          libelle: 'Thème collaboration',
          palier: 3,
          tauxApproche: 0.8,
          margeAvantDescente: 0.2,
          effectif: 4,
          questions: [
            {
              questionId: 'q1',
              libelle: 'Question sur le daily',
              effectif: 4,
              moyenne: 2.5,
              consensus: 'MODERE',
              repartition: { 1: 0, 2: 2, 3: 2, 4: 0 },
            },
          ],
        },
        {
          themeId: 't2',
          libelle: 'Thème non évalué',
          palier: null,
          tauxApproche: null,
          margeAvantDescente: null,
          effectif: 0,
          questions: [],
        },
      ],
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Thème collaboration');
    expect(texte).toContain('Palier 3');
    expect(texte).toContain('Thème non évalué');
    expect(texte).toContain('Non évalué');
  });

  it('affiche le repère de couverture global', () => {
    fixture = TestBed.createComponent(ProfilPage);
    fixture.detectChanges();
    repondre({
      themes: [
        {
          themeId: 't1',
          libelle: 'Thème A',
          palier: 2,
          tauxApproche: 0.4,
          margeAvantDescente: 0.6,
          effectif: 3,
          questions: [
            {
              questionId: 'q1',
              libelle: 'Q1',
              effectif: 3,
              moyenne: 2,
              consensus: 'FORT',
              repartition: { 1: 0, 2: 3, 3: 0, 4: 0 },
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('1');
    expect(texte).toContain('Questions répondues');
    expect(texte).toContain('3');
    expect(texte).toContain('Réponses totales');
  });
});
