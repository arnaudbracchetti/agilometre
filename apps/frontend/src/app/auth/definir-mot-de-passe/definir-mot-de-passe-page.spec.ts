import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { DefinirMotDePassePage } from './definir-mot-de-passe-page';

describe('DefinirMotDePassePage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  async function creerFixture(jeton: string | null = 'jeton-brut') {
    await TestBed.configureTestingModule({
      imports: [DefinirMotDePassePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(jeton ? { jeton } : {}) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    return TestBed.createComponent(DefinirMotDePassePage);
  }

  afterEach(() => httpMock?.verify());

  it('affiche « lien invalide » directement quand aucun jeton n’est présent dans l’URL', async () => {
    const fixture = await creerFixture(null);

    expect(fixture.componentInstance['jetonInvalide']()).toBe(true);
  });

  it('redirige vers /connexion après une définition réussie', async () => {
    const fixture = await creerFixture();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance['motDePasse'].set('mot-de-passe-solide');
    fixture.componentInstance['confirmation'].set('mot-de-passe-solide');

    fixture.componentInstance['definir']();
    httpMock.expectOne('/api/mot-de-passe/definir').flush(null);

    expect(navigateSpy).toHaveBeenCalledWith('/connexion');
  });

  it('une réponse 410 affiche « lien invalide » avec renvoi vers mot de passe oublié', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasse'].set('mot-de-passe-solide');
    fixture.componentInstance['confirmation'].set('mot-de-passe-solide');

    fixture.componentInstance['definir']();
    httpMock
      .expectOne('/api/mot-de-passe/definir')
      .flush({ message: 'Lien invalide ou expiré' }, { status: 410, statusText: 'Gone' });

    expect(fixture.componentInstance['jetonInvalide']()).toBe(true);
  });

  it('une réponse 400 (mot de passe trop court) affiche un message d’erreur, sans marquer le jeton invalide', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasse'].set('court123');
    fixture.componentInstance['confirmation'].set('court123');

    fixture.componentInstance['definir']();
    httpMock
      .expectOne('/api/mot-de-passe/definir')
      .flush({ message: 'trop court' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance['jetonInvalide']()).toBe(false);
    expect(fixture.componentInstance['erreur']()).toEqual(expect.any(String));
  });

  it('le formulaire est invalide si la confirmation ne correspond pas', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['motDePasse'].set('mot-de-passe-solide');
    fixture.componentInstance['confirmation'].set('autre-chose');

    expect(fixture.componentInstance['formulaireValide']()).toBe(false);
  });
});
