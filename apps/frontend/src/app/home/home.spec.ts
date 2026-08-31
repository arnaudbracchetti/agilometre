import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  ApartmentOutline,
  DownOutline,
  MailOutline,
  ScheduleOutline,
  TeamOutline,
  UnorderedListOutline,
} from '@ant-design/icons-angular/icons';
import { Role } from '@agilometre/shared';
import { Home } from './home';

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

describe('Home', () => {
  let httpMock: HttpTestingController;

  async function creerFixture() {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideNzIcons([
          ApartmentOutline,
          DownOutline,
          MailOutline,
          ScheduleOutline,
          TeamOutline,
          UnorderedListOutline,
        ]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  it('visiteur non connecté : menu applicatif vide, bandeau propose « Se connecter »', async () => {
    const fixture = await creerFixture();

    expect(fixture.componentInstance['liensNav']()).toEqual([]);
    const bandeau: HTMLElement = fixture.nativeElement.querySelector('.app-header');
    expect(bandeau.textContent).toContain('Se connecter');
    expect(bandeau.textContent).not.toContain('Se déconnecter');
  });

  it('Coach connecté : reprend le menu applicatif des écrans authentifiés, bandeau propose « Mon compte »/« Se déconnecter »', async () => {
    localStorage.setItem('agilometre.jeton', jetonCoach());

    const fixture = await creerFixture();

    expect(fixture.componentInstance['liensNav']()).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Administration' })]),
    );
    const bandeau: HTMLElement = fixture.nativeElement.querySelector('.app-header');
    expect(bandeau.textContent).toContain('Mon compte');
    expect(bandeau.textContent).toContain('Se déconnecter');
    expect(bandeau.textContent).not.toContain('Se connecter');
  });
});
