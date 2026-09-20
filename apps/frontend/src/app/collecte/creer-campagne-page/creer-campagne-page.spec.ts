import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideNzI18n, fr_FR } from 'ng-zorro-antd/i18n';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { CampagnePoulsDto, LigneBibliothequeModeleCollecteDto } from '@agilometre/shared';
import { CreerCampagnePage, DonneesCreerCampagnePage } from './creer-campagne-page';

const MODELES: LigneBibliothequeModeleCollecteDto[] = [
  {
    id: 'modele-1',
    nom: 'Diagnostic',
    nbQuestionsActives: 2,
    themesCouverts: ['Thème 1'],
    misAJourLe: new Date().toISOString(),
  },
];

const CAMPAGNE: CampagnePoulsDto = {
  id: 'campagne-1',
  equipeId: 'equipe-1',
  statut: 'BROUILLON',
  modeleCollecteId: 'modele-1',
  joursEnvoi: [1, 3],
  heureEnvoi: 480,
  questionsParEnvoi: 2,
  panel: [],
};

describe('CreerCampagnePage', () => {
  let httpMock: HttpTestingController;
  let modalRef: { close: ReturnType<typeof vi.fn> };
  let modalErrorSpy: ReturnType<typeof vi.fn>;

  async function creerFixture(donnees: DonneesCreerCampagnePage) {
    modalRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CreerCampagnePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzI18n(fr_FR),
        provideNzNativeDateAdapter(),
        { provide: NZ_MODAL_DATA, useValue: donnees },
        { provide: NzModalRef, useValue: modalRef },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CreerCampagnePage);
    const modal = fixture.debugElement.injector.get(NzModalService);
    modalErrorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.detectChanges();
    httpMock.expectOne('/api/modeles-collecte').flush(MODELES);
    return fixture;
  }

  afterEach(() => httpMock?.verify());

  it('formulaire invalide tant que Modèle, jours, heure et Questions par envoi ne sont pas tous renseignés', async () => {
    const fixture = await creerFixture({ equipeId: 'equipe-1' });

    expect(fixture.componentInstance['formulaireValide']()).toBe(false);
  });

  it('POST .../campagne-pouls avec les minutes calculées depuis l’heure choisie, ferme le modal avec la Campagne créée', async () => {
    const fixture = await creerFixture({ equipeId: 'equipe-1' });
    fixture.componentInstance['onModeleChange']('modele-1');
    httpMock.expectOne('/api/modeles-collecte/modele-1').flush({ id: 'modele-1', nom: 'Diagnostic', selection: [] });
    fixture.componentInstance['joursEnvoi'].set([1, 3]);
    fixture.componentInstance['heureEnvoi'].set(new Date(2026, 0, 1, 8, 0));
    fixture.componentInstance['questionsParEnvoi'].set(2);

    expect(fixture.componentInstance['formulaireValide']()).toBe(true);

    fixture.componentInstance['creer']();
    const req = httpMock.expectOne('/api/organisation/equipes/equipe-1/campagne-pouls');
    expect(req.request.body).toEqual({
      modeleCollecteId: 'modele-1',
      joursEnvoi: [1, 3],
      heureEnvoi: 480,
      questionsParEnvoi: 2,
    });
    req.flush(CAMPAGNE);

    expect(modalRef.close).toHaveBeenCalledWith(CAMPAGNE);
  });

  it('une erreur de création s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    const fixture = await creerFixture({ equipeId: 'equipe-1' });
    fixture.componentInstance['onModeleChange']('modele-1');
    httpMock.expectOne('/api/modeles-collecte/modele-1').flush({ id: 'modele-1', nom: 'Diagnostic', selection: [] });
    fixture.componentInstance['joursEnvoi'].set([1]);
    fixture.componentInstance['heureEnvoi'].set(new Date(2026, 0, 1, 8, 0));
    fixture.componentInstance['questionsParEnvoi'].set(1);

    fixture.componentInstance['creer']();
    const req = httpMock.expectOne('/api/organisation/equipes/equipe-1/campagne-pouls');
    req.flush('erreur', { status: 500, statusText: 'Erreur' });

    expect(modalErrorSpy).toHaveBeenCalled();
    expect(fixture.componentInstance['creationEnCours']()).toBe(false);
  });
});
