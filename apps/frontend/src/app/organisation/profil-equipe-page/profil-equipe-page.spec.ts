import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
import { ProfilEquipeDto } from '@agilometre/shared';
import { ProfilEquipePage } from './profil-equipe-page';

const PROFIL_PAR_DEFAUT: ProfilEquipeDto = {
  equipeNom: 'Équipe Alpha',
  periodeDebut: '2026-04-01T00:00:00.000Z',
  periodeFin: '2026-07-01T00:00:00.000Z',
  seuilPalier: 0.6,
  themes: [],
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

/** Chaque changement d'`:id` déclenche aussi `GET .../sessions` (#62), indépendamment de `profil`
 * — à flusher dans chaque test pour ne pas laisser de requête en attente (`httpMock.verify()`). */
function flushSessions(mock: HttpTestingController, equipeId: string): void {
  mock.expectOne(`/api/organisation/equipes/${equipeId}/sessions`).flush([]);
}

describe('ProfilEquipePage', () => {
  let httpMock: HttpTestingController;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function creerFixture(idInitial: string | null) {
    paramMap$ = paramMapAvec(idInitial);
    return TestBed.configureTestingModule({
      imports: [ProfilEquipePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        provideNzIcons([WarningOutline, LeftOutline, RightOutline, RiseOutline, FallOutline, ArrowRightOutline]),
      ],
    })
      .compileComponents()
      .then(() => TestBed.createComponent(ProfilEquipePage));
  }

  beforeEach(() => {
    httpMock = undefined as unknown as HttpTestingController;
  });

  afterEach(() => {
    httpMock?.verify();
  });

  it('charge et affiche le Profil de l’Équipe désignée par `:id`', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0');
    req.flush(PROFIL_PAR_DEFAUT);
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Profil de l’Équipe Équipe Alpha');
    expect(texte).toContain('Dernière période complète');
  });

  it('affiche un message d’erreur si le Profil n’est pas accessible', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil?offset=0')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ce Profil d’Équipe n’est pas accessible.');
  });

  it('recharge le Profil quand `:id` change (navigation vers une autre Équipe)', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ id: 'eq2' }));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq2/profil?offset=0');
    req.flush({ ...PROFIL_PAR_DEFAUT, equipeNom: 'Équipe Beta' });
    flushSessions(httpMock, 'eq2');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Profil de l’Équipe Équipe Beta');
  });

  it('navigue vers la Période précédente au clic, garde « suivante » activée en Période la plus récente', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    const boutons = fixture.nativeElement.querySelectorAll('button');
    const precedente = Array.from(boutons).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période précédente',
    ) as HTMLButtonElement;
    const suivante = Array.from(boutons).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période suivante',
    ) as HTMLButtonElement;
    // Depuis la dernière Période complète (offset 0), « suivante » reste activée : elle mène à
    // la Période en cours (offset -1).
    expect(suivante.disabled).toBe(false);

    precedente.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=1');
    req.flush({
      ...PROFIL_PAR_DEFAUT,
      periodeDebut: '2026-01-01T00:00:00.000Z',
      periodeFin: '2026-04-01T00:00:00.000Z',
      aPeriodePrecedente: false,
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Période :');
    expect(texte).not.toContain('Dernière période complète');
    expect(precedente.disabled).toBe(true);
    expect(suivante.disabled).toBe(false);
  });

  it('navigue vers la Période en cours via « suivante », affiche le badge « Incomplète »', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    const suivante = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période suivante',
    ) as HTMLButtonElement;

    suivante.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=-1');
    req.flush({
      ...PROFIL_PAR_DEFAUT,
      periodeDebut: '2026-07-01T00:00:00.000Z',
      periodeFin: '2026-10-01T00:00:00.000Z',
      periodeEnCours: true,
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Période en cours');
    expect(texte).toContain('Incomplète');
    expect(suivante.disabled).toBe(true);
  });

  it('affiche la flèche d’Évolution du Palier global à partir de `evolutionGlobale`', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush({
      ...PROFIL_PAR_DEFAUT,
      // Le bloc "Palier global" de `app-synthese-themes` n'est rendu que si `themes` est non vide.
      themes: [
        {
          themeId: 't1',
          libelle: 'Thème A',
          position: 0,
          palier: 3,
          tauxApproche: 0.5,
          margeAvantDescente: 0.5,
          effectif: 1,
          questions: [],
        },
      ],
      palierGlobal: 3,
      tauxApprocheGlobal: 0.5,
      margeAvantDescenteGlobal: 0.5,
      evolutionGlobale: 'hausse',
    });
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    const fleche = fixture.nativeElement.querySelector(
      '.palier-theme__evolution',
    ) as HTMLElement;
    expect(fleche).not.toBeNull();
    expect(fleche.classList).toContain('palier-theme__evolution--hausse');
  });

  it('ne déclenche aucune requête au clic sur « précédente » quand `aPeriodePrecedente` est faux', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil?offset=0')
      .flush({ ...PROFIL_PAR_DEFAUT, aPeriodePrecedente: false });
    flushSessions(httpMock, 'eq1');
    fixture.detectChanges();

    const precedente = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période précédente',
    ) as HTMLButtonElement;
    expect(precedente.disabled).toBe(true);

    precedente.click();
    fixture.detectChanges();

    httpMock.expectNone('/api/organisation/equipes/eq1/profil?offset=1');
  });

  it('liste les Sessions de l’Équipe, chacune en lien vers sa synthèse', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    httpMock.expectOne('/api/organisation/equipes/eq1/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Équipe Alpha',
        date: '2026-05-01T00:00:00.000Z',
        statut: 'CLOTUREE',
        verrouillee: true,
        nbQuestions: 3,
        modeleCollecteNom: 'Diagnostic',
      },
    ]);
    fixture.detectChanges();

    const lien: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.profil-equipe__sessions-ligne',
    );
    expect(lien).not.toBeNull();
    expect(lien.getAttribute('href')).toBe('/sessions/s1/synthese');
    expect(lien.textContent).toContain('Diagnostic');
  });

  it('affiche un état vide quand l’Équipe n’a aucune Session ouverte', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    httpMock.expectOne('/api/organisation/equipes/eq1/sessions').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucune Session ouverte pour l’instant.');
  });
});
