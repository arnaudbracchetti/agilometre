import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { MonComptePage } from './mon-compte-page';

const COMPTE: UtilisateurDto = {
  id: 'u1',
  email: 'ada@example.com',
  prenom: 'Ada',
  nom: 'Lovelace',
  role: Role.Direction,
  actif: true,
};

describe('MonComptePage', () => {
  let httpMock: HttpTestingController;

  async function creerFixture() {
    await TestBed.configureTestingModule({
      imports: [MonComptePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MonComptePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/mon-compte').flush(COMPTE);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock?.verify());

  it('charge et affiche les informations du compte au démarrage', async () => {
    const fixture = await creerFixture();

    expect(fixture.componentInstance['compte']()).toEqual(COMPTE);
  });

  it('formulaire invalide si le nouveau mot de passe est trop court', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasseActuel'].set('ancien');
    fixture.componentInstance['nouveauMotDePasse'].set('court');
    fixture.componentInstance['confirmation'].set('court');

    expect(fixture.componentInstance['formulaireValide']()).toBe(false);
  });

  it('formulaire invalide si la confirmation ne correspond pas au nouveau mot de passe', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasseActuel'].set('ancien');
    fixture.componentInstance['nouveauMotDePasse'].set('nouveau-mot-de-passe');
    fixture.componentInstance['confirmation'].set('autre-chose');

    expect(fixture.componentInstance['formulaireValide']()).toBe(false);
  });

  it('envoie POST /api/mot-de-passe/changer puis vide les champs en cas de succès', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasseActuel'].set('ancien-mot-de-passe');
    fixture.componentInstance['nouveauMotDePasse'].set('nouveau-mot-de-passe');
    fixture.componentInstance['confirmation'].set('nouveau-mot-de-passe');

    fixture.componentInstance['changer']();
    const req = httpMock.expectOne('/api/mot-de-passe/changer');
    expect(req.request.body).toEqual({
      motDePasseActuel: 'ancien-mot-de-passe',
      nouveauMotDePasse: 'nouveau-mot-de-passe',
    });
    req.flush(null);

    expect(fixture.componentInstance['motDePasseActuel']()).toBe('');
    expect(fixture.componentInstance['nouveauMotDePasse']()).toBe('');
  });

  it('un échec s’affiche dans une boîte de dialogue (modal.error), pas un toast', async () => {
    const fixture = await creerFixture();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const errorSpy = vi.spyOn(modal, 'error').mockReturnValue({} as ReturnType<NzModalService['error']>);
    fixture.componentInstance['motDePasseActuel'].set('mauvais');
    fixture.componentInstance['nouveauMotDePasse'].set('nouveau-mot-de-passe');
    fixture.componentInstance['confirmation'].set('nouveau-mot-de-passe');

    fixture.componentInstance['changer']();
    httpMock
      .expectOne('/api/mot-de-passe/changer')
      .flush({ message: 'incorrect' }, { status: 400, statusText: 'Bad Request' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nzContent: 'Mot de passe actuel incorrect, ou nouveau mot de passe trop court.',
      }),
    );
  });
});
