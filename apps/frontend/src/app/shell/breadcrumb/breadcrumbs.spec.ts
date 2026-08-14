import { ActivatedRouteSnapshot } from '@angular/router';
import { buildBreadcrumbs } from './breadcrumbs';

function snapshot(
  urlSegments: string[],
  data: Record<string, unknown>,
  firstChild: ActivatedRouteSnapshot | null = null,
): ActivatedRouteSnapshot {
  return {
    firstChild,
    url: urlSegments.map((path) => ({ path })),
    data,
  } as unknown as ActivatedRouteSnapshot;
}

describe('buildBreadcrumbs', () => {
  it('renvoie un tableau vide sans enfant', () => {
    expect(buildBreadcrumbs(snapshot([], {}))).toEqual([]);
  });

  it('ignore les niveaux sans donnée breadcrumb', () => {
    const leaf = snapshot(['organisation'], { breadcrumb: 'Organisation' });
    const root = snapshot([], {}, leaf);

    expect(buildBreadcrumbs(root)).toEqual([{ label: 'Organisation', url: '/organisation' }]);
  });

  it('accumule plusieurs niveaux avec leur URL complète', () => {
    const entite = snapshot(['e1'], { breadcrumb: 'DSI' });
    const entites = snapshot(['organisation'], { breadcrumb: 'Organisation' }, entite);
    const root = snapshot([], {}, entites);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Organisation', url: '/organisation' },
      { label: 'DSI', url: '/organisation/e1' },
    ]);
  });
});
