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
        provideNzIcons([ApartmentOutline, TeamOutline, UserOutline, SearchOutline, WarningOutline]),
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

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/profil');
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
      .expectOne('/api/organisation/equipes/eq1/profil')
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
    httpMock.expectOne('/api/organisation/equipes/eq1/profil').flush(PROFIL_PAR_DEFAUT);
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ id: 'eq2' }));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/equipes/eq2/profil');
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
});
