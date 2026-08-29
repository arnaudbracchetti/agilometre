import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  ArrowRightOutline,
  FallOutline,
  LeftOutline,
  RightOutline,
  RiseOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';
import { ProfilEntiteDto } from '@agilometre/shared';
import { ProfilEntitePage } from './profil-entite-page';

const PROFIL_PAR_DEFAUT: ProfilEntiteDto = {
  entiteNom: 'DSI',
  periodeDebut: '2026-04-01T00:00:00.000Z',
  periodeFin: '2026-07-01T00:00:00.000Z',
  seuilPalier: 0.6,
  palierGlobal: null,
  tauxApprocheGlobal: null,
  margeAvantDescenteGlobal: null,
  effectifGlobal: 0,
  aPeriodePrecedente: true,
  periodeEnCours: false,
  evolutionGlobale: null,
};

function paramMapAvec(id: string | null): BehaviorSubject<ReturnType<typeof convertToParamMap>> {
  return new BehaviorSubject(convertToParamMap(id ? { id } : {}));
}

describe('ProfilEntitePage', () => {
  let httpMock: HttpTestingController;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function creerFixture(idInitial: string | null) {
    paramMap$ = paramMapAvec(idInitial);
    return TestBed.configureTestingModule({
      imports: [ProfilEntitePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        provideNzIcons([WarningOutline, LeftOutline, RightOutline, RiseOutline, FallOutline, ArrowRightOutline]),
      ],
    })
      .compileComponents()
      .then(() => TestBed.createComponent(ProfilEntitePage));
  }

  beforeEach(() => {
    httpMock = undefined as unknown as HttpTestingController;
  });

  afterEach(() => {
    httpMock?.verify();
  });

  it('charge et affiche le Palier agrégé de l’Entité désignée par `:id`', async () => {
    const fixture = await creerFixture('ent1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/entites/ent1/profil?offset=0');
    req.flush({ ...PROFIL_PAR_DEFAUT, palierGlobal: 3, tauxApprocheGlobal: 0.5, margeAvantDescenteGlobal: 0.5, effectifGlobal: 4 });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Profil de l’Entité DSI');
    expect(texte).toContain('Palier global');
    expect(texte).not.toContain('Thème');
  });

  it('affiche le message d’état vide quand l’Entité n’a aucune réponse sur la Période', async () => {
    const fixture = await creerFixture('ent1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/api/organisation/entites/ent1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Aucune réponse enregistrée sur cette Période pour cette Entité.',
    );
  });

  it('affiche un message d’erreur si le Profil n’est pas accessible', async () => {
    const fixture = await creerFixture('ent1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/entites/ent1/profil?offset=0')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ce Profil d’Entité n’est pas accessible.');
  });

  it('navigue vers la Période précédente au clic', async () => {
    const fixture = await creerFixture('ent1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/ent1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    fixture.detectChanges();

    const precedente = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période précédente',
    ) as HTMLButtonElement;
    precedente.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/entites/ent1/profil?offset=1');
    req.flush({ ...PROFIL_PAR_DEFAUT, aPeriodePrecedente: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Période :');
  });

  it('affiche la flèche d’Évolution du Palier global à partir de `evolutionGlobale`', async () => {
    const fixture = await creerFixture('ent1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/ent1/profil?offset=0').flush({
      ...PROFIL_PAR_DEFAUT,
      palierGlobal: 3,
      tauxApprocheGlobal: 0.5,
      margeAvantDescenteGlobal: 0.5,
      effectifGlobal: 4,
      evolutionGlobale: 'hausse',
    });
    fixture.detectChanges();

    const fleche = fixture.nativeElement.querySelector('.palier-theme__evolution') as HTMLElement;
    expect(fleche).not.toBeNull();
    expect(fleche.classList).toContain('palier-theme__evolution--hausse');
  });
});
