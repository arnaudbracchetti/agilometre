import { ActivatedRouteSnapshot } from '@angular/router';
import { buildBreadcrumbs } from './breadcrumbs';

function snapshot(
  urlSegments: string[],
  data: Record<string, unknown>,
  firstChild: ActivatedRouteSnapshot | null = null,
  routeConfigPath: string | null = null,
): ActivatedRouteSnapshot {
  return {
    firstChild,
    url: urlSegments.map((path) => ({ path })),
    data,
    routeConfig: routeConfigPath === null ? null : { path: routeConfigPath },
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

  it('ne duplique pas le libellé d’un parent hérité par sa route index à chemin vide', () => {
    // Avec `paramsInheritanceStrategy: 'always'`, une route index (`path: ''`) sans `breadcrumb`
    // à elle hérite du `data` de son parent — `firstChild.data['breadcrumb']` renvoie alors le
    // même libellé que le parent qui vient d'être poussé, d'où ce garde sur `routeConfig.path`.
    const index = snapshot([], { breadcrumb: 'Sessions' }, null, '');
    const sessions = snapshot(['sessions'], { breadcrumb: 'Sessions' }, index);
    const root = snapshot([], {}, sessions);

    expect(buildBreadcrumbs(root)).toEqual([{ label: 'Sessions', url: '/sessions' }]);
  });
});
