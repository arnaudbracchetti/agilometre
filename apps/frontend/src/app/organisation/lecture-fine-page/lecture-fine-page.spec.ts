import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ProfilEquipeDto, SyntheseThemeDto } from '@agilometre/shared';
import { LectureFinePage } from './lecture-fine-page';

function activatedRouteAvecIds(id: string, themeId: string): Partial<ActivatedRoute> {
  return {
    snapshot: {
      paramMap: convertToParamMap({ id, themeId }),
    } as ActivatedRoute['snapshot'],
  };
}

function themeAvecQuestions(): SyntheseThemeDto {
  return {
    themeId: 't1',
    libelle: 'Thème collaboration',
    position: 0,
    palier: 3,
    tauxApproche: 0.8,
    margeAvantDescente: 0.2,
    effectif: 7,
    questions: [
      {
        questionId: 'q1',
        libelle: 'Question forte dispersion',
        effectif: 4,
        moyenne: 3,
        consensus: 'FAIBLE',
        repartition: { 1: 1, 2: 1, 3: 1, 4: 1 },
      },
      {
        questionId: 'q2',
        libelle: 'Question score faible',
        effectif: 3,
        moyenne: 1,
        consensus: 'FORT',
        repartition: { 1: 3, 2: 0, 3: 0, 4: 0 },
      },
    ],
  };
}

const PROFIL_PAR_DEFAUT: ProfilEquipeDto = {
  periodeDebut: '2026-04-01T00:00:00.000Z',
  periodeFin: '2026-07-01T00:00:00.000Z',
  themes: [themeAvecQuestions()],
};

describe('LectureFinePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<LectureFinePage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LectureFinePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteAvecIds('eq1', 't1') },
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

  function boutonAvecTexte(texte: string): HTMLButtonElement {
    return fixture.debugElement
      .queryAll(By.css('button'))
      .map((el) => el.nativeElement as HTMLButtonElement)
      .find((b) => b.textContent?.includes(texte))!;
  }

  it('affiche le libellé du Thème et son Palier', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Thème collaboration');
    expect(texte).toContain('Palier 3');
  });

  it('trie par Moyenne croissante par défaut', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const libelles = fixture.nativeElement.querySelectorAll('.lecture-fine__question-libelle');
    expect(libelles[0].textContent).toContain('Question score faible');
    expect(libelles[1].textContent).toContain('Question forte dispersion');
  });

  it('bascule vers le tri par dispersion décroissante au clic', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    boutonAvecTexte('Dispersion la plus forte').click();
    fixture.detectChanges();

    const libelles = fixture.nativeElement.querySelectorAll('.lecture-fine__question-libelle');
    // FAIBLE = désaccord le plus fort (écart-type le plus élevé) : en tête du tri "dispersion décroissante".
    expect(libelles[0].textContent).toContain('Question forte dispersion'); // consensus FAIBLE
    expect(libelles[1].textContent).toContain('Question score faible'); // consensus FORT
  });

  it('affiche la répartition en % par Niveau dans le panneau développé d’une Question', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Niveau 1');
    expect(texte).toContain('100 %'); // q2 : 3/3 réponses au Niveau 1
  });

  it('affiche un message si l’Équipe n’est pas accessible', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Le Profil de cette Équipe n’est pas accessible.',
    );
  });

  it('affiche un message si le Thème demandé n’est plus dans le Profil', () => {
    fixture = TestBed.createComponent(LectureFinePage);
    fixture.detectChanges();
    repondre({ themes: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Ce Thème n’est plus disponible sur la Période en cours.',
    );
  });
});
