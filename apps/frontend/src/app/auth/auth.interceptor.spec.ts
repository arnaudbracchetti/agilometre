import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: { jetonActuel: ReturnType<typeof vi.fn>; mettreAJourJeton: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    auth = { jetonActuel: vi.fn(), mettreAJourJeton: vi.fn(), logout: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('attache le jeton stocké en Authorization quand présent', () => {
    auth.jetonActuel.mockReturnValue('jeton-coach');
    http.get('/api/organisation/entites').subscribe();

    const req = httpMock.expectOne('/api/organisation/entites');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-coach');
    req.flush([]);
  });

  it('ne touche pas une requête qui porte déjà son propre Authorization (parcours participant)', () => {
    auth.jetonActuel.mockReturnValue('jeton-coach');
    http
      .get('/api/participant/moi', { headers: { Authorization: 'Bearer jeton-participant' } })
      .subscribe();

    const req = httpMock.expectOne('/api/participant/moi');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-participant');
    req.flush({});
  });

  it('capture le jeton glissant renvoyé via X-Auth-Token', () => {
    auth.jetonActuel.mockReturnValue('jeton-coach');
    http.get('/api/organisation/entites').subscribe();

    httpMock
      .expectOne('/api/organisation/entites')
      .flush([], { headers: { 'X-Auth-Token': 'jeton-renouvele' } });

    expect(auth.mettreAJourJeton).toHaveBeenCalledWith('jeton-renouvele');
  });

  it('sur 401 (hors login), déconnecte et redirige vers /connexion', () => {
    auth.jetonActuel.mockReturnValue('jeton-expire');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    http.get('/api/organisation/entites').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/organisation/entites')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/connexion');
  });

  it('un 401 sur /api/auth/login ne déclenche pas de redirection (identifiants invalides)', () => {
    auth.jetonActuel.mockReturnValue(null);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
