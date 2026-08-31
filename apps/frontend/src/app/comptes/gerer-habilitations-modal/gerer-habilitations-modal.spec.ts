import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { DeleteOutline } from '@ant-design/icons-angular/icons';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { GererHabilitationsModal } from './gerer-habilitations-modal';

const COMPTE: UtilisateurDto = {
  id: 'u1',
  email: 'ada@example.com',
  prenom: 'Ada',
  nom: 'Lovelace',
  role: Role.Direction,
  actif: true,
  habilitations: [{ id: 'h1', entiteId: 'e1', equipeId: null }],
};

describe('GererHabilitationsModal', () => {
  let httpMock: HttpTestingController;
  let modalRef: { close: ReturnType<typeof vi.fn> };

  async function creerFixture(compte: UtilisateurDto = COMPTE) {
    modalRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [GererHabilitationsModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([DeleteOutline]),
        { provide: NZ_MODAL_DATA, useValue: { compte } },
        { provide: NzModalRef, useValue: modalRef },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GererHabilitationsModal);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([
      { id: 'e1', nom: 'Vente' },
      { id: 'e2', nom: 'Développement industriel' },
    ]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock?.verify());

  it('affiche les Entités déjà habilitées, résolues par leur nom', async () => {
    const fixture = await creerFixture();

    expect(fixture.componentInstance['habilitationsAffichees']()).toEqual([
      { id: 'h1', nom: 'Vente' },
    ]);
  });

  it('ne propose que les Entités pas encore habilitées', async () => {
    const fixture = await creerFixture();

    expect(fixture.componentInstance['entitesDisponibles']()).toEqual([
      { id: 'e2', nom: 'Développement industriel' },
    ]);
  });

  it('accorder une Habilitation — POST /api/comptes/:id/habilitations, met à jour la liste', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['entiteSelectionnee'].set('e2');

    fixture.componentInstance['ajouter']();

    const req = httpMock.expectOne('/api/comptes/u1/habilitations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ entiteId: 'e2' });
    req.flush({
      ...COMPTE,
      habilitations: [
        { id: 'h1', entiteId: 'e1', equipeId: null },
        { id: 'h2', entiteId: 'e2', equipeId: null },
      ],
    });

    expect(fixture.componentInstance['habilitationsAffichees']()).toEqual([
      { id: 'h1', nom: 'Vente' },
      { id: 'h2', nom: 'Développement industriel' },
    ]);
  });

  it('retirer une Habilitation — DELETE /api/comptes/:id/habilitations/:habilitationId', async () => {
    const fixture = await creerFixture();

    fixture.componentInstance['retirer']('h1');

    const req = httpMock.expectOne('/api/comptes/u1/habilitations/h1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...COMPTE, habilitations: [] });

    expect(fixture.componentInstance['habilitationsAffichees']()).toEqual([]);
  });

  it('un échec s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.componentInstance['entiteSelectionnee'].set('e2');

    fixture.componentInstance['ajouter']();
    httpMock
      .expectOne('/api/comptes/u1/habilitations')
      .flush({ message: 'conflit' }, { status: 409, statusText: 'Conflict' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: 'Impossible d’accorder cette Habilitation.' }),
    );
  });

  it('fermer ferme le modal avec le compte à jour', async () => {
    const fixture = await creerFixture();

    fixture.componentInstance['fermer']();

    expect(modalRef.close).toHaveBeenCalledWith(COMPTE);
  });
});
