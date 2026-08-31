import { vi } from 'vitest';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  CheckCircleOutline,
  EditOutline,
  SafetyCertificateOutline,
  SearchOutline,
  StopOutline,
} from '@ant-design/icons-angular/icons';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { ComptesPage } from './comptes-page';
import { CreerModifierCompteModal } from '../creer-modifier-compte-modal/creer-modifier-compte-modal';
import { GererHabilitationsModal } from '../gerer-habilitations-modal/gerer-habilitations-modal';

const COMPTE: UtilisateurDto = {
  id: 'u1',
  email: 'ada@example.com',
  prenom: 'Ada',
  nom: 'Lovelace',
  role: Role.Direction,
  actif: true,
  habilitations: [],
};

describe('ComptesPage', () => {
  let httpMock: HttpTestingController;

  async function creerFixture() {
    await TestBed.configureTestingModule({
      imports: [ComptesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([SearchOutline, EditOutline, StopOutline, CheckCircleOutline, SafetyCertificateOutline]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ComptesPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/comptes').flush([COMPTE]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock?.verify());

  it('charge et affiche les comptes au démarrage', async () => {
    const fixture = await creerFixture();

    expect(fixture.componentInstance['comptes']()).toEqual([COMPTE]);
  });

  it('filtre par email/prénom/nom', async () => {
    const fixture = await creerFixture();

    fixture.componentInstance['filtre'].set('grace');

    expect(fixture.componentInstance['comptesFiltres']()).toEqual([]);
  });

  it('« Créer un compte » ouvre CreerModifierCompteModal en mode création', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({ afterClose: of(undefined) } as ReturnType<NzModalService['create']>);

    fixture.componentInstance['ouvrirCreation']();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: CreerModifierCompteModal, nzData: { compte: null } }),
    );
  });

  it('« Modifier » ouvre CreerModifierCompteModal avec le compte sélectionné', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({ afterClose: of(undefined) } as ReturnType<NzModalService['create']>);

    fixture.componentInstance['ouvrirModification'](COMPTE);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: CreerModifierCompteModal, nzData: { compte: COMPTE } }),
    );
  });

  it('« Gérer les Habilitations » ouvre GererHabilitationsModal pour une Direction', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({ afterClose: of(undefined) } as ReturnType<NzModalService['create']>);

    fixture.componentInstance['ouvrirHabilitations'](COMPTE);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: GererHabilitationsModal, nzData: { compte: COMPTE } }),
    );
    // La fermeture rafraîchit toujours la liste (les mutations d'Habilitations sont déjà
    // persistées à chaque geste dans la modale, contrairement à Créer/Modifier) — cette requête
    // doit être consommée pour ne pas polluer les tests suivants.
    httpMock.expectOne('/api/comptes').flush([COMPTE]);
  });

  it('« Désactiver » ouvre une boîte de dialogue de confirmation (modal.confirm), pas un popconfirm', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const confirmSpy = vi
      .spyOn(modal, 'confirm')
      .mockReturnValue({} as ReturnType<NzModalService['confirm']>);

    fixture.componentInstance['confirmerDesactivation'](COMPTE);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nzTitle: 'Désactiver ce compte ?',
        nzOkDanger: true,
      }),
    );
  });

  it('désactive un compte via POST /api/comptes/:id/desactiver puis rafraîchit la liste', async () => {
    const fixture = await creerFixture();

    fixture.componentInstance['desactiver'](COMPTE);
    httpMock.expectOne('/api/comptes/u1/desactiver').flush({ ...COMPTE, actif: false });
    httpMock.expectOne('/api/comptes').flush([{ ...COMPTE, actif: false }]);

    expect(fixture.componentInstance['comptes']()[0].actif).toBe(false);
  });

  it('un échec de désactivation s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);

    fixture.componentInstance['desactiver'](COMPTE);
    httpMock
      .expectOne('/api/comptes/u1/desactiver')
      .flush({ message: 'erreur' }, { status: 500, statusText: 'Internal Server Error' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: 'Impossible de désactiver ce compte.' }),
    );
  });

  it('n’affiche pas le bouton « Gérer les Habilitations » pour un compte Coach', async () => {
    const coach = { ...COMPTE, role: Role.Coach };
    await TestBed.configureTestingModule({
      imports: [ComptesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([SearchOutline, EditOutline, StopOutline, CheckCircleOutline, SafetyCertificateOutline]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ComptesPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/comptes').flush([coach]);
    fixture.detectChanges();

    const icone = fixture.nativeElement.querySelector('span[nztype="safety-certificate"]');
    expect(icone).toBeFalsy();
  });
});
