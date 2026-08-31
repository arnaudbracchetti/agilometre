import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { DownOutline } from '@ant-design/icons-angular/icons';
import { Role } from '@agilometre/shared';
import { AppShell } from './app-shell';

@Component({ selector: 'app-stub', template: 'stub' })
class StubPage {}

/** Même patron que auth.service.spec.ts — un jeton Coach, pour que `liensNav` (filtré par
 * capacité, voir app-shell.ts) affiche les liens Coach de ce test plutôt qu'un menu vide. */
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

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.setItem('agilometre.jeton', jetonCoach());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([DownOutline]),
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [{ path: 'organisation', data: { breadcrumb: 'Organisation' }, component: StubPage }],
          },
        ]),
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('assemble le bandeau applicatif, le fil d’Ariane et le contenu routé', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    expect(harness.routeNativeElement!.querySelector('.app-header')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.app-breadcrumb')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-stub')).toBeTruthy();
  });

  it('marque le lien de navigation « Administration » actif quand une de ses sous-entrées l’est', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    const link: HTMLElement = harness.routeNativeElement!.querySelector('.app-header__link--dropdown')!;
    expect(link.classList).toContain('app-header__link--active');
  });
});
