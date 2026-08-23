import { ActivatedRouteSnapshot } from '@angular/router';

export interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Marche l'arbre des ActivatedRouteSnapshot plutôt que celui des ActivatedRoute vivants : ces
 * derniers peuvent être incomplets pendant la construction du composant qui les injecte (le
 * snapshot, lui, est toujours entièrement peuplé une fois la navigation résolue).
 */
export function buildBreadcrumbs(
  route: ActivatedRouteSnapshot,
  url = '',
  breadcrumbs: Breadcrumb[] = [],
): Breadcrumb[] {
  const firstChild = route.firstChild;
  if (!firstChild) {
    return breadcrumbs;
  }

  const routeUrl = firstChild.url.map((segment) => segment.path).join('/');
  const nextUrl = routeUrl ? `${url}/${routeUrl}` : url;
  // Une route "index" à chemin vide (ex. celle qui affiche la liste sous `sessions`) n'a jamais
  // son propre `breadcrumb` — avec `paramsInheritanceStrategy: 'always'` (nécessaire pour que
  // `:id`/`:themeId` traversent les routes imbriquées), elle hérite du `data` de son parent, donc
  // `firstChild.data['breadcrumb']` renverrait le libellé du parent une deuxième fois sans ce garde.
  const estIndex = firstChild.routeConfig?.path === '';
  const label = firstChild.data['breadcrumb'] as string | undefined;
  if (label && !estIndex) {
    breadcrumbs.push({ label, url: nextUrl });
  }

  return buildBreadcrumbs(firstChild, nextUrl, breadcrumbs);
}
