import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalService } from 'ng-zorro-antd/modal';
import { CampagnePoulsDto } from '@agilometre/shared';
import { CampagneTab } from './campagne-tab';

const CAMPAGNE: CampagnePoulsDto = {
  id: 'campagne-1',
  equipeId: 'equipe-1',
  statut: 'BROUILLON',
  modeleCollecteId: 'modele-1',
  joursEnvoi: [1, 3],
  heureEnvoi: 480,
  questionsParEnvoi: 2,
  panel: [{ questionId: 'q1', libelle: 'Question 1', themeId: 't1', themeLibelle: 'Thème 1' }],
};

describe('CampagneTab', () => {
  let httpMock: HttpTestingController;

  async function creerFixture(equipeId: string) {
    await TestBed.configureTestingModule({
      imports: [CampagneTab],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CampagneTab);
    fixture.componentRef.setInput('equipeId', equipeId);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock?.verify());

  it("charge la Campagne de l'Équipe sélectionnée", async () => {
    const fixture = await creerFixture('equipe-1');
    httpMock.expectOne('/api/organisation/equipes/equipe-1/campagne-pouls').flush(CAMPAGNE);
    fixture.detectChanges();

    expect(fixture.componentInstance['campagne']()).toEqual(CAMPAGNE);
    expect(fixture.componentInstance['joursEnvoiLibelles']()).toBe('Lun, Mer');
    expect(fixture.componentInstance['heureEnvoiLibelle']()).toBe('08h00');
  });

  it('affiche null (aucune Campagne) sans erreur', async () => {
    const fixture = await creerFixture('equipe-1');
    httpMock.expectOne('/api/organisation/equipes/equipe-1/campagne-pouls').flush(null);
    fixture.detectChanges();

    expect(fixture.componentInstance['campagne']()).toBeNull();
  });

  it('une erreur de chargement s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    await TestBed.configureTestingModule({
      imports: [CampagneTab],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CampagneTab);
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.componentRef.setInput('equipeId', 'equipe-1');
    fixture.detectChanges();

    httpMock
      .expectOne('/api/organisation/equipes/equipe-1/campagne-pouls')
      .flush('erreur', { status: 500, statusText: 'Erreur' });

    expect(errorSpy).toHaveBeenCalled();
  });
});
