import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { CreerModifierCompteModal, DonneesCreerModifierCompte } from './creer-modifier-compte-modal';

const COMPTE: UtilisateurDto = {
  id: 'u1',
  email: 'ada@example.com',
  prenom: 'Ada',
  nom: 'Lovelace',
  role: Role.Direction,
  actif: true,
  habilitations: [],
};

describe('CreerModifierCompteModal', () => {
  let httpMock: HttpTestingController;
  let modalRef: { close: ReturnType<typeof vi.fn> };

  async function creerFixture(donnees: DonneesCreerModifierCompte) {
    modalRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CreerModifierCompteModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: NZ_MODAL_DATA, useValue: donnees },
        { provide: NzModalRef, useValue: modalRef },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(CreerModifierCompteModal);
  }

  afterEach(() => httpMock?.verify());

  it('mode création — POST /api/comptes avec le Rôle choisi, ferme le modal avec le compte créé', async () => {
    const fixture = await creerFixture({ compte: null });
    fixture.componentInstance['email'].set('grace@example.com');
    fixture.componentInstance['prenom'].set('Grace');
    fixture.componentInstance['nom'].set('Hopper');
    fixture.componentInstance['role'].set(Role.Membre);

    fixture.componentInstance['enregistrer']();
    const req = httpMock.expectOne('/api/comptes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'grace@example.com',
      prenom: 'Grace',
      nom: 'Hopper',
      role: Role.Membre,
    });
    req.flush(COMPTE);

    expect(modalRef.close).toHaveBeenCalledWith(COMPTE);
  });

  it('mode modification — PATCH /api/comptes/:id, jamais le Rôle si inchangé', async () => {
    const fixture = await creerFixture({ compte: COMPTE });

    expect(fixture.componentInstance['email']()).toBe('ada@example.com');

    fixture.componentInstance['prenom'].set('Ada M.');
    fixture.componentInstance['enregistrer']();

    const req = httpMock.expectOne('/api/comptes/u1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      email: 'ada@example.com',
      prenom: 'Ada M.',
      nom: 'Lovelace',
    });
    req.flush({ ...COMPTE, prenom: 'Ada M.' });

    expect(modalRef.close).toHaveBeenCalled();
  });

  it('mode modification — un Rôle changé déclenche un second appel PATCH /api/comptes/:id/role', async () => {
    const fixture = await creerFixture({ compte: COMPTE });
    fixture.componentInstance['role'].set(Role.Coach);

    fixture.componentInstance['enregistrer']();

    httpMock.expectOne('/api/comptes/u1').flush(COMPTE);
    const requeteRole = httpMock.expectOne('/api/comptes/u1/role');
    expect(requeteRole.request.method).toBe('PATCH');
    expect(requeteRole.request.body).toEqual({ role: Role.Coach });
    requeteRole.flush({ ...COMPTE, role: Role.Coach });

    expect(modalRef.close).toHaveBeenCalledWith({ ...COMPTE, role: Role.Coach });
  });

  it('un changement de Rôle refusé (409, Habilitations incohérentes) s’affiche dans une boîte de dialogue', async () => {
    const fixture = await creerFixture({ compte: COMPTE });
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.componentInstance['role'].set(Role.Coach);

    fixture.componentInstance['enregistrer']();

    httpMock.expectOne('/api/comptes/u1').flush(COMPTE);
    httpMock
      .expectOne('/api/comptes/u1/role')
      .flush({ message: 'conflit' }, { status: 409, statusText: 'Conflict' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nzContent: 'Ce Rôle est incompatible avec les Habilitations existantes — retirez-les d’abord.',
      }),
    );
    expect(modalRef.close).not.toHaveBeenCalled();
  });

  it('formulaire invalide si un champ requis est vide', async () => {
    const fixture = await creerFixture({ compte: null });
    fixture.componentInstance['email'].set('');

    expect(fixture.componentInstance['formulaireValide']()).toBe(false);
  });

  it('annuler ferme le modal sans appel réseau', async () => {
    const fixture = await creerFixture({ compte: null });

    fixture.componentInstance['annuler']();

    expect(modalRef.close).toHaveBeenCalledWith();
  });

  it('un clic sur le bouton Action n’envoie qu’une seule requête (régression : le bouton type="submit" de DialogActions déclenche à la fois (click)→(action) et le (ngSubmit) englobant)', async () => {
    const fixture = await creerFixture({ compte: null });
    fixture.componentInstance['email'].set('grace@example.com');
    fixture.componentInstance['prenom'].set('Grace');
    fixture.componentInstance['nom'].set('Hopper');
    fixture.detectChanges();

    const bouton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    bouton.click();

    httpMock.expectOne('/api/comptes').flush(COMPTE);
    expect(modalRef.close).toHaveBeenCalledTimes(1);
  });

  it('un email déjà utilisé (409) s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    const fixture = await creerFixture({ compte: null });
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.componentInstance['email'].set('grace@example.com');
    fixture.componentInstance['prenom'].set('Grace');
    fixture.componentInstance['nom'].set('Hopper');

    fixture.componentInstance['enregistrer']();
    httpMock
      .expectOne('/api/comptes')
      .flush({ message: 'conflit' }, { status: 409, statusText: 'Conflict' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: 'Un compte existe déjà avec cet email.' }),
    );
    expect(modalRef.close).not.toHaveBeenCalled();
  });
});
