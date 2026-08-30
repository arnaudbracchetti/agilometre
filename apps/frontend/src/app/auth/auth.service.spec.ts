import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Role } from '@agilometre/shared';
import { AuthService } from './auth.service';

function jeton(role: Role, expEnSecondes = Math.floor(Date.now() / 1000) + 3600): string {
  const entete = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const charge = btoa(
    JSON.stringify({ sub: 'u1', email: 'coach@example.com', role, exp: expEnSecondes }),
  );
  return `${entete}.${charge}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('estConnecte est faux sans jeton stocké', () => {
    expect(service.estConnecte()).toBe(false);
    expect(service.role()).toBeNull();
  });

  it('login stocke le jeton et expose le Rôle décodé', () => {
    service.login('coach@example.com', 'motdepasse').subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'coach@example.com', motDePasse: 'motdepasse' });
    req.flush({ jeton: jeton(Role.Coach) });

    expect(service.estConnecte()).toBe(true);
    expect(service.role()).toBe(Role.Coach);
    expect(service.jetonActuel()).toEqual(expect.any(String));
  });

  it('logout efface le jeton et le Rôle', () => {
    service.login('coach@example.com', 'motdepasse').subscribe();
    httpMock.expectOne('/api/auth/login').flush({ jeton: jeton(Role.Coach) });

    service.logout();

    expect(service.estConnecte()).toBe(false);
    expect(service.jetonActuel()).toBeNull();
  });

  it('un jeton expiré stocké ne compte pas comme connecté au démarrage', () => {
    localStorage.setItem('agilometre.jeton', jeton(Role.Coach, Math.floor(Date.now() / 1000) - 10));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const nouveauService = TestBed.inject(AuthService);

    expect(nouveauService.estConnecte()).toBe(false);
  });

  it('mettreAJourJeton remplace le jeton stocké (renouvellement glissant)', () => {
    service.login('coach@example.com', 'motdepasse').subscribe();
    httpMock.expectOne('/api/auth/login').flush({ jeton: jeton(Role.Coach) });
    const premierJeton = service.jetonActuel();

    service.mettreAJourJeton(jeton(Role.Coach, Math.floor(Date.now() / 1000) + 7200));

    expect(service.jetonActuel()).not.toBe(premierJeton);
    expect(service.estConnecte()).toBe(true);
  });
});
