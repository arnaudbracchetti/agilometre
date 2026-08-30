import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { Role } from '@agilometre/shared';
import { LoginPage } from './login-page';

function jetonCoach(): string {
  const entete = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const charge = btoa(
    JSON.stringify({
      sub: 'u1',
      email: 'coach@example.com',
      role: Role.Coach,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${entete}.${charge}.signature`;
}

describe('LoginPage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function creerFixture(retour: string | null = null) {
    return TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(retour ? { retour } : {}) } },
        },
      ],
    })
      .compileComponents()
      .then(() => TestBed.createComponent(LoginPage));
  }

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  it('redirige vers "/" après une connexion réussie sans paramètre "retour"', async () => {
    const fixture = await creerFixture();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const composant = fixture.componentInstance;
    composant['email'].set('coach@example.com');
    composant['motDePasse'].set('motdepasse');
    composant['seConnecter']();

    httpMock.expectOne('/api/auth/login').flush({ jeton: jetonCoach() });

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('redirige vers la route demandée quand "retour" est fourni', async () => {
    const fixture = await creerFixture('/organisation');
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance['seConnecter']();
    httpMock.expectOne('/api/auth/login').flush({ jeton: jetonCoach() });

    expect(navigateSpy).toHaveBeenCalledWith('/organisation');
  });

  it('affiche un message d’erreur pour des identifiants invalides, sans naviguer', async () => {
    const fixture = await creerFixture();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance['seConnecter']();
    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Identifiants invalides' }, { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance['erreur']()).toBe('Email ou mot de passe incorrect.');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
