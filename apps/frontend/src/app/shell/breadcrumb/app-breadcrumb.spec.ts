import { TestBed } from '@angular/core/testing';
import { provideRouter, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { Role } from '@agilometre/shared';
import { AppBreadcrumb } from './app-breadcrumb';
import { routes } from '../../app.routes';
import { AuthService } from '../../auth/auth.service';

@Component({ selector: 'app-stub', template: 'stub' })
class StubPage {}

describe('AppBreadcrumb', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppBreadcrumb,
            children: [{ path: 'organisation', data: { breadcrumb: 'Organisation' }, component: StubPage }],
          },
        ]),
      ],
    });
  });

  it('affiche « Accueil › Organisation » pour la route active', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    const items: NodeListOf<HTMLElement> = harness.routeNativeElement!.querySelectorAll(
      '.app-breadcrumb li',
    );
    const texts = Array.from(items).map((el) => el.textContent?.trim());
    expect(texts).toEqual(['Accueil', '›', 'Organisation']);
  });
});

/**
 * Régression : app.routes.ts déclarait autrefois ses routes à plat (chemins complets comme
 * entrées indépendantes plutôt que des enfants), donc l'arbre d'ActivatedRouteSnapshot ne
 * contenait jamais qu'un seul niveau — buildBreadcrumbs (qui remonte les `firstChild`) ne pouvait
 * alors produire qu'un fil à un seul maillon, perdant les niveaux ancêtres. Ces tests utilisent
 * les vraies routes imbriquées pour garantir que le fil complet reste construit à chaque niveau.
 */
describe('AppBreadcrumb (routes réelles de l’application)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzNativeDateAdapter(),
        // Toutes ces routes vivent sous AppShell, protégée par authGuard depuis la carte #59 —
        // ce test porte sur le fil d'Ariane, pas sur l'authentification. `role: () => Role.Coach`
        // est nécessaire depuis #60 : AppShell filtre son menu par capacité (DroitsService, qui
        // lit `AuthService.role()`), Coach reste le seul Rôle qui les a toutes aujourd'hui.
        { provide: AuthService, useValue: { estConnecte: () => true, role: () => Role.Coach } },
      ],
    });
  });

  function libelles(harness: Awaited<ReturnType<typeof RouterTestingHarness.create>>): string[] {
    const items: NodeListOf<HTMLElement> = harness.routeNativeElement!.querySelectorAll(
      '.app-breadcrumb li',
    );
    return Array.from(items)
      .map((el) => el.textContent?.trim() ?? '')
      .filter((texte) => texte !== '›');
  }

  it('n’affiche « Sessions » qu’une seule fois sur la liste elle-même (/sessions)', async () => {
    const harness = await RouterTestingHarness.create('/sessions');

    expect(libelles(harness)).toEqual(['Accueil', 'Sessions']);
  });

  it('n’affiche « Organisation » qu’une seule fois sur /organisation', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    expect(libelles(harness)).toEqual(['Accueil', 'Organisation']);
  });

  it('accumule les trois niveaux jusqu’à /sessions/:id/pilotage', async () => {
    const harness = await RouterTestingHarness.create('/sessions/s1/pilotage');

    expect(libelles(harness)).toEqual([
      'Accueil',
      'Sessions',
      'Ajuster la session',
      'Piloter la séance',
    ]);
  });

  it('n’affiche « Profil d’équipe » qu’une seule fois sur /profil/equipe/:id (pas de doublon malgré l’héritage de data)', async () => {
    const harness = await RouterTestingHarness.create('/profil/equipe/eq1');

    expect(libelles(harness)).toEqual(['Accueil', 'Profil d’équipe']);
  });

  it('n’affiche « Profil d’équipe » qu’une seule fois sur /profil/entite/:id (pas de doublon malgré l’héritage de data)', async () => {
    const harness = await RouterTestingHarness.create('/profil/entite/e1');

    expect(libelles(harness)).toEqual(['Accueil', 'Profil d’équipe']);
  });
});
