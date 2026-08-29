import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import {
  ApartmentOutline,
  ArrowRightOutline,
  FallOutline,
  LeftOutline,
  RightOutline,
  RiseOutline,
  SearchOutline,
  TeamOutline,
  UserOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';
import { vi } from 'vitest';
import { ProfilEquipeDto } from '@agilometre/shared';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
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
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        provideNzIcons([
          ApartmentOutline,
          TeamOutline,
          UserOutline,
          SearchOutline,
          WarningOutline,
          LeftOutline,
          RightOutline,
          RiseOutline,
          FallOutline,
          ArrowRightOutline,
        ]),
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

  it('invite à sélectionner une Équipe quand aucun `:id` n’est présent dans la route', async () => {
    const fixture = await creerFixture(null);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sélectionnez une Équipe');
  });

  it('charge et affiche le Profil de l’Équipe désignée par `:id`', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0');
    req.flush(PROFIL_PAR_DEFAUT);
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Profil de l’Équipe Équipe Alpha');
    expect(texte).toContain('Dernière période complète');
  });

  it('affiche un message d’erreur si le Profil n’est pas accessible', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil?offset=0')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ce Profil d’Équipe n’est pas accessible.');
  });

  it('recharge le Profil quand `:id` change (navigation vers une autre Équipe)', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ id: 'eq2' }));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq2/profil?offset=0');
    req.flush({ ...PROFIL_PAR_DEFAUT, equipeNom: 'Équipe Beta' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Profil de l’Équipe Équipe Beta');
  });

  it('sélectionner une Équipe dans l’arbre navigue vers son Profil', async () => {
    const fixture = await creerFixture(null);
    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    const arbre = fixture.debugElement.query(By.directive(ArbreOrganisation))
      .componentInstance as ArbreOrganisation;
    (arbre as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick({
      eventName: 'click',
      node: { key: 'e1', origin: { type: 'entite' } },
    } as unknown as NzFormatEmitEvent);
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    (arbre as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick({
      eventName: 'click',
      node: { key: 'eq1', origin: { type: 'equipe' } },
    } as unknown as NzFormatEmitEvent);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/profil-equipe', 'eq1']);
  });

  it('navigue vers la Période précédente au clic, garde « suivante » activée en Période la plus récente', async () => {
    const fixture = await creerFixture('eq1');
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
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
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/equipes/eq1/profil?offset=0').flush(PROFIL_PAR_DEFAUT);
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
    httpMock.expectOne('/api/organisation/entites').flush([]);
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
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/equipes/eq1/profil?offset=0')
      .flush({ ...PROFIL_PAR_DEFAUT, aPeriodePrecedente: false });
    fixture.detectChanges();

    const precedente = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).getAttribute('aria-label') === 'Période précédente',
    ) as HTMLButtonElement;
    expect(precedente.disabled).toBe(true);

    precedente.click();
    fixture.detectChanges();

    httpMock.expectNone('/api/organisation/equipes/eq1/profil?offset=1');
  });
});
