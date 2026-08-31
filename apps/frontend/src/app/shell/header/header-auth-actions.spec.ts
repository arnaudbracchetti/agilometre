import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Role } from '@agilometre/shared';
import { HeaderAuthActions } from './header-auth-actions';

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

describe('HeaderAuthActions', () => {
  let httpMock: HttpTestingController;

  async function creerFixture() {
    await TestBed.configureTestingModule({
      imports: [HeaderAuthActions],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HeaderAuthActions);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  it('non connecté : propose « Se connecter », pas « Mon compte »/« Se déconnecter »', async () => {
    const fixture = await creerFixture();

    expect(fixture.nativeElement.textContent).toContain('Se connecter');
    expect(fixture.nativeElement.textContent).not.toContain('Mon compte');
    expect(fixture.nativeElement.textContent).not.toContain('Se déconnecter');
  });

  it('connecté : propose « Mon compte »/« Se déconnecter », pas « Se connecter »', async () => {
    localStorage.setItem('agilometre.jeton', jetonCoach());

    const fixture = await creerFixture();

    expect(fixture.nativeElement.textContent).toContain('Mon compte');
    expect(fixture.nativeElement.textContent).toContain('Se déconnecter');
    expect(fixture.nativeElement.textContent).not.toContain('Se connecter');
  });

  it('« Se déconnecter » déconnecte puis renvoie vers « / »', async () => {
    localStorage.setItem('agilometre.jeton', jetonCoach());
    const fixture = await creerFixture();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance['deconnecter']();

    expect(localStorage.getItem('agilometre.jeton')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });
});
